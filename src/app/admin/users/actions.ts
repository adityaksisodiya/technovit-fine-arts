"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/auth/admin";
import {
  createAdminAccount,
  updateAdminUserRole,
  toggleAdminUserActive,
} from "@/lib/admin-users";
import { getClientIp } from "@/lib/upload";
import { AdminRole } from "@/types";

/**
 * Server action for SUPER_ADMIN to provision a new administrator account.
 */
export async function createAdminUserAction(params: {
  email: string;
  password?: string;
  displayName: string;
  role: AdminRole;
}) {
  const currentAdmin = await requireAdmin(AdminRole.SUPER_ADMIN);
  const headerList = await headers();
  const ipAddress = getClientIp(headerList);

  const result = await createAdminAccount({
    ...params,
    currentAdmin,
    ipAddress,
  });

  if (result.success) {
    revalidatePath("/admin/users");
    revalidatePath("/admin/dashboard");
  }

  return result;
}

/**
 * Server action for SUPER_ADMIN to change an administrator's role.
 */
export async function updateAdminRoleAction(targetUserId: string, newRole: AdminRole) {
  const currentAdmin = await requireAdmin(AdminRole.SUPER_ADMIN);
  const headerList = await headers();
  const ipAddress = getClientIp(headerList);

  const result = await updateAdminUserRole({
    targetUserId,
    newRole,
    currentAdmin,
    ipAddress,
  });

  if (result.success) {
    revalidatePath("/admin/users");
    revalidatePath("/admin/dashboard");
  }

  return result;
}

/**
 * Server action for SUPER_ADMIN to activate or deactivate an administrator account.
 */
export async function toggleAdminActiveAction(targetUserId: string, isActive: boolean) {
  const currentAdmin = await requireAdmin(AdminRole.SUPER_ADMIN);
  const headerList = await headers();
  const ipAddress = getClientIp(headerList);

  const result = await toggleAdminUserActive({
    targetUserId,
    isActive,
    currentAdmin,
    ipAddress,
  });

  if (result.success) {
    revalidatePath("/admin/users");
    revalidatePath("/admin/dashboard");
  }

  return result;
}
