"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { moderatePhoto, type ModeratePhotoResult } from "@/lib/moderation";
import { AdminRole } from "@/types";

/**
 * Server Action to approve a pending photo.
 * Changes status to 'approved', records moderation history and audit log.
 */
export async function approvePhotoAction(
  photoId: string
): Promise<ModeratePhotoResult> {
  const admin = await requireAdmin(AdminRole.MODERATOR);

  const result = await moderatePhoto({
    photoId,
    action: "approve",
    adminUser: admin,
  });

  if (result.success) {
    revalidatePath("/admin/moderation");
    revalidatePath("/admin/dashboard");
    revalidatePath("/");
  }

  return result;
}

/**
 * Server Action to reject a pending photo.
 * Changes status to 'rejected' with optional reason, preserves B2 objects.
 */
export async function rejectPhotoAction(
  photoId: string,
  reason?: string
): Promise<ModeratePhotoResult> {
  const admin = await requireAdmin(AdminRole.MODERATOR);

  const result = await moderatePhoto({
    photoId,
    action: "reject",
    reason,
    adminUser: admin,
  });

  if (result.success) {
    revalidatePath("/admin/moderation");
    revalidatePath("/admin/dashboard");
  }

  return result;
}
