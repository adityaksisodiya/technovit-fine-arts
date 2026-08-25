import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminRole, type AdminUser, type AdminAuthResult } from "@/types";

/**
 * Role hierarchy weighting:
 * SUPER_ADMIN (3) > ADMIN (2) > MODERATOR (1)
 */
export const ROLE_HIERARCHY: Record<AdminRole, number> = {
  [AdminRole.MODERATOR]: 1,
  [AdminRole.ADMIN]: 2,
  [AdminRole.SUPER_ADMIN]: 3,
};

/**
 * Checks whether an administrator's role satisfies the required minimum role.
 */
export function hasRequiredRole(
  userRole: AdminRole,
  requiredRole: AdminRole
): boolean {
  const userWeight = ROLE_HIERARCHY[userRole] ?? 0;
  const requiredWeight = ROLE_HIERARCHY[requiredRole] ?? 0;
  return userWeight >= requiredWeight;
}

/**
 * Retrieves and validates the current administrator profile from the database.
 *
 * Flow:
 * 1. Checks Supabase Auth session via cookies
 * 2. Fetches record from `admin_users` table matching user ID
 * 3. Verifies `is_active === true`
 */
export async function getAdminAuthResult(): Promise<AdminAuthResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "UNAUTHENTICATED" };
    }

    const { data: adminRecord, error: dbError } = await supabase
      .from("admin_users")
      .select("id, email, display_name, role, is_active, created_at, updated_at")
      .eq("id", user.id)
      .maybeSingle();

    if (dbError) {
      return { success: false, error: "DB_ERROR" };
    }

    if (!adminRecord) {
      return { success: false, error: "NOT_AN_ADMIN" };
    }

    if (!adminRecord.is_active) {
      return { success: false, error: "DEACTIVATED" };
    }

    const admin: AdminUser = {
      id: adminRecord.id,
      email: adminRecord.email,
      display_name: adminRecord.display_name,
      role: adminRecord.role as AdminRole,
      is_active: adminRecord.is_active,
      created_at: adminRecord.created_at,
      updated_at: adminRecord.updated_at,
    };

    return { success: true, admin };
  } catch {
    return { success: false, error: "UNAUTHENTICATED" };
  }
}

/**
 * Returns the currently authenticated active administrator, or null.
 */
export async function getCurrentAdmin(): Promise<AdminUser | null> {
  const result = await getAdminAuthResult();
  if (result.success) {
    return result.admin;
  }
  return null;
}

/**
 * Server-side guard for Server Components and Route Handlers.
 * Throws a Next.js redirect to `/admin/login` if the user is not authenticated
 * or lacks the required administrative role.
 *
 * @param minRole Optional minimum required role (default: MODERATOR)
 * @param redirectPath Current path to return to after successful login
 */
export async function requireAdmin(
  minRole: AdminRole = AdminRole.MODERATOR,
  redirectPath?: string
): Promise<AdminUser> {
  const result = await getAdminAuthResult();

  if (!result.success) {
    const loginUrl = redirectPath
      ? `/admin/login?redirect=${encodeURIComponent(redirectPath)}`
      : "/admin/login";
    redirect(loginUrl);
  }

  const { admin } = result;

  if (!hasRequiredRole(admin.role, minRole)) {
    // Authenticated admin exists but lacks sufficient role privileges
    redirect("/admin/unauthorized");
  }

  return admin;
}
