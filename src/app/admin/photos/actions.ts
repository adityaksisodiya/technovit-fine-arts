"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/auth/admin";
import {
  updatePhotoStatusByAdmin,
  purgePhotoPermanent,
  getAdminPhotoDetails,
} from "@/lib/admin-photos";
import { getClientIp } from "@/lib/upload";
import { AdminRole, PhotoStatus } from "@/types";

/**
 * Server action to update a photo's status (approve, reject, soft delete, restore).
 */
export async function updatePhotoStatusAction(
  photoId: string,
  newStatus: PhotoStatus,
  reason?: string
) {
  const admin = await requireAdmin(AdminRole.ADMIN);
  const headerList = await headers();
  const ipAddress = getClientIp(headerList);

  const result = await updatePhotoStatusByAdmin({
    photoId,
    newStatus,
    reason,
    adminUser: admin,
    ipAddress,
  });

  if (result.success) {
    revalidatePath("/admin/photos");
    revalidatePath("/admin/moderation");
    revalidatePath("/admin/dashboard");
    revalidatePath("/");
  }

  return result;
}

/**
 * Server action to permanently purge a photo and its B2 storage objects.
 * Requires SUPER_ADMIN.
 */
export async function purgePhotoAction(photoId: string) {
  const admin = await requireAdmin(AdminRole.SUPER_ADMIN);
  const headerList = await headers();
  const ipAddress = getClientIp(headerList);

  const result = await purgePhotoPermanent({
    photoId,
    adminUser: admin,
    ipAddress,
  });

  if (result.success) {
    revalidatePath("/admin/photos");
    revalidatePath("/admin/moderation");
    revalidatePath("/admin/dashboard");
    revalidatePath("/");
  }

  return result;
}

/**
 * Server action to fetch comprehensive details, history, and audit records for a photo.
 */
export async function getPhotoDetailsAction(photoId: string) {
  await requireAdmin(AdminRole.ADMIN);
  return await getAdminPhotoDetails(photoId);
}

/**
 * Server action to fetch available locations for photo assignment dropdown.
 */
export async function getAvailableLocationsAction() {
  await requireAdmin(AdminRole.ADMIN);
  const { getAdminLocations } = await import("@/lib/map/service");
  return await getAdminLocations();
}

/**
 * Server action to assign or remove photo location.
 */
export async function updatePhotoLocationAction(photoId: string, locationId: string | null) {
  const { assignPhotoLocationAction } = await import("@/lib/map/actions");
  return await assignPhotoLocationAction(photoId, locationId);
}
