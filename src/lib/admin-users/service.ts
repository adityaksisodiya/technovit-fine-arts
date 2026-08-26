import { createAdminClient } from "@/lib/supabase/server";
import { AdminRole, AuditEntityType, type AdminUser } from "@/types";
import { hasRequiredRole } from "@/lib/auth/admin";

export interface CreateAdminParams {
  email: string;
  password?: string;
  displayName: string;
  role: AdminRole;
  currentAdmin: AdminUser;
  ipAddress?: string;
}

export interface UpdateRoleParams {
  targetUserId: string;
  newRole: AdminRole;
  currentAdmin: AdminUser;
  ipAddress?: string;
}

export interface ToggleActiveParams {
  targetUserId: string;
  isActive: boolean;
  currentAdmin: AdminUser;
  ipAddress?: string;
}

/**
 * Lists all registered administrative users.
 * Strictly requires SUPER_ADMIN role.
 */
export async function listAdminUsers(currentAdmin: AdminUser): Promise<AdminUser[]> {
  if (!hasRequiredRole(currentAdmin.role, AdminRole.SUPER_ADMIN)) {
    throw new Error("Access forbidden. SUPER_ADMIN privileges required.");
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("admin_users")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to list admin users:", error);
    throw new Error(`Failed to load admin users: ${error.message}`);
  }

  return (data as AdminUser[]) || [];
}

/**
 * Provisions a new administrative user in Supabase Auth and registers their role.
 * Strictly requires SUPER_ADMIN role.
 */
export async function createAdminAccount(
  params: CreateAdminParams
): Promise<{ success: boolean; admin?: AdminUser; error?: string }> {
  const { email, password, displayName, role, currentAdmin, ipAddress } = params;

  if (!hasRequiredRole(currentAdmin.role, AdminRole.SUPER_ADMIN)) {
    return { success: false, error: "Only Super Administrators can create admin accounts." };
  }

  const trimmedEmail = email.trim().toLowerCase();
  const trimmedName = displayName.trim();

  if (!trimmedEmail || !trimmedEmail.includes("@")) {
    return { success: false, error: "A valid email address is required." };
  }

  if (!password || password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters long." };
  }

  const supabase = createAdminClient();

  // 1. Create auth user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: trimmedEmail,
    password,
    email_confirm: true,
    user_metadata: { display_name: trimmedName },
  });

  if (authError || !authData.user) {
    console.error("Failed to create Supabase Auth user:", authError);
    return { success: false, error: authError?.message || "Failed to create authentication user." };
  }

  const nowIso = new Date().toISOString();

  // 2. Insert into admin_users table
  const { data: newAdmin, error: insertError } = await supabase
    .from("admin_users")
    .insert({
      id: authData.user.id,
      email: trimmedEmail,
      display_name: trimmedName || null,
      role,
      is_active: true,
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select("*")
    .single();

  if (insertError || !newAdmin) {
    console.error("Failed to insert admin_users record:", insertError);
    // Cleanup auth user on database failure
    await supabase.auth.admin.deleteUser(authData.user.id).catch(() => {});
    return { success: false, error: `Database registration failed: ${insertError?.message}` };
  }

  // 3. Write to audit log
  await supabase.from("audit_log").insert({
    admin_id: currentAdmin.id,
    action: "admin.create",
    entity_type: AuditEntityType.ADMIN,
    entity_id: newAdmin.id,
    old_values: null,
    new_values: { email: trimmedEmail, role, display_name: trimmedName },
    ip_address: ipAddress || null,
    created_at: nowIso,
  });

  return { success: true, admin: newAdmin as AdminUser };
}

/**
 * Changes an existing administrator's role.
 * Strictly requires SUPER_ADMIN role.
 */
export async function updateAdminUserRole(
  params: UpdateRoleParams
): Promise<{ success: boolean; error?: string }> {
  const { targetUserId, newRole, currentAdmin, ipAddress } = params;

  if (!hasRequiredRole(currentAdmin.role, AdminRole.SUPER_ADMIN)) {
    return { success: false, error: "Only Super Administrators can modify roles." };
  }

  const supabase = createAdminClient();

  // Fetch current user
  const { data: targetUser, error: fetchErr } = await supabase
    .from("admin_users")
    .select("*")
    .eq("id", targetUserId)
    .maybeSingle();

  if (fetchErr || !targetUser) {
    return { success: false, error: "Target administrator not found." };
  }

  // Prevent demoting the only super admin
  if (targetUser.id === currentAdmin.id && newRole !== AdminRole.SUPER_ADMIN) {
    const { count } = await supabase
      .from("admin_users")
      .select("*", { count: "exact", head: true })
      .eq("role", AdminRole.SUPER_ADMIN)
      .eq("is_active", true);

    if ((count ?? 0) <= 1) {
      return { success: false, error: "Cannot demote the only active Super Administrator." };
    }
  }

  const nowIso = new Date().toISOString();

  const { error: updateErr } = await supabase
    .from("admin_users")
    .update({
      role: newRole,
      updated_at: nowIso,
    })
    .eq("id", targetUserId);

  if (updateErr) {
    return { success: false, error: updateErr.message };
  }

  // Write audit log
  await supabase.from("audit_log").insert({
    admin_id: currentAdmin.id,
    action: "admin.role_change",
    entity_type: AuditEntityType.ADMIN,
    entity_id: targetUserId,
    old_values: { role: targetUser.role },
    new_values: { role: newRole },
    ip_address: ipAddress || null,
    created_at: nowIso,
  });

  return { success: true };
}

/**
 * Activates or deactivates an administrator account.
 * Strictly requires SUPER_ADMIN role.
 */
export async function toggleAdminUserActive(
  params: ToggleActiveParams
): Promise<{ success: boolean; error?: string }> {
  const { targetUserId, isActive, currentAdmin, ipAddress } = params;

  if (!hasRequiredRole(currentAdmin.role, AdminRole.SUPER_ADMIN)) {
    return { success: false, error: "Only Super Administrators can modify account status." };
  }

  if (targetUserId === currentAdmin.id && !isActive) {
    return { success: false, error: "You cannot deactivate your own Super Administrator account." };
  }

  const supabase = createAdminClient();

  const { data: targetUser, error: fetchErr } = await supabase
    .from("admin_users")
    .select("*")
    .eq("id", targetUserId)
    .maybeSingle();

  if (fetchErr || !targetUser) {
    return { success: false, error: "Target administrator not found." };
  }

  const nowIso = new Date().toISOString();

  const { error: updateErr } = await supabase
    .from("admin_users")
    .update({
      is_active: isActive,
      updated_at: nowIso,
    })
    .eq("id", targetUserId);

  if (updateErr) {
    return { success: false, error: updateErr.message };
  }

  // Write audit log
  await supabase.from("audit_log").insert({
    admin_id: currentAdmin.id,
    action: isActive ? "admin.activate" : "admin.deactivate",
    entity_type: AuditEntityType.ADMIN,
    entity_id: targetUserId,
    old_values: { is_active: targetUser.is_active },
    new_values: { is_active: isActive },
    ip_address: ipAddress || null,
    created_at: nowIso,
  });

  return { success: true };
}
