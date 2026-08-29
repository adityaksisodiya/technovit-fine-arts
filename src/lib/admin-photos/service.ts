import { createAdminClient } from "@/lib/supabase/server";
import { deleteStoragePrefix } from "@/lib/upload";
import {
  PhotoStatus,
  AdminRole,
  AuditEntityType,
  ModerationAction,
  type Photo,
  type AdminUser,
} from "@/types";
import { hasRequiredRole } from "@/lib/auth/admin";

export interface AdminPhotoItem extends Photo {
  moderator_name?: string | null;
  moderator_email?: string | null;
  location_name?: string | null;
}

export interface GetAdminPhotosOptions {
  status?: string; // 'all' | 'pending' | 'approved' | 'rejected' | 'deleted'
  search?: string;
  sortBy?: "created_at" | "file_size_bytes";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export interface AdminPhotosResult {
  photos: AdminPhotoItem[];
  totalCount: number;
  hasMore: boolean;
}

export interface PhotoHistoryItem {
  id: string;
  action: ModerationAction;
  previous_status: PhotoStatus;
  new_status: PhotoStatus;
  reason: string | null;
  created_at: string;
  admin_id: string | null;
  admin_name?: string | null;
  admin_email?: string | null;
}

export interface PhotoAuditItem {
  id: string;
  action: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  admin_id: string | null;
  admin_email?: string | null;
}

export interface PhotoDetailData {
  photo: AdminPhotoItem;
  history: PhotoHistoryItem[];
  auditLogs: PhotoAuditItem[];
}

/**
 * Retrieves paginated photos with filtering, sorting, and search for administrators.
 * Minimum required role: ADMIN.
 */
export async function getAdminPhotos(
  options: GetAdminPhotosOptions = {}
): Promise<AdminPhotosResult> {
  const {
    status = "all",
    search = "",
    sortBy = "created_at",
    sortOrder = "desc",
    limit = 25,
    offset = 0,
  } = options;

  const supabase = createAdminClient();

  let query = supabase
    .from("photos")
    .select("*", { count: "exact" });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  if (search.trim()) {
    const trimmed = search.trim();
    // Search by UUID or IP address or booth
    if (trimmed.includes("-") || trimmed.length === 36) {
      query = query.eq("id", trimmed);
    } else {
      query = query.ilike("uploaded_from_ip", `%${trimmed}%`);
    }
  }

  query = query
    .order(sortBy, { ascending: sortOrder === "asc" })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error("Failed to query admin photos:", error);
    throw new Error(`Failed to load photos: ${error.message}`);
  }

  const photos = (data as Photo[]) || [];

  // Fetch moderator details for photos that have been moderated
  const moderatorIds = Array.from(
    new Set(photos.map((p) => p.moderated_by).filter((id): id is string => Boolean(id)))
  );

  let adminMap: Record<string, { display_name: string | null; email: string }> = {};
  if (moderatorIds.length > 0) {
    const { data: admins } = await supabase
      .from("admin_users")
      .select("id, display_name, email")
      .in("id", moderatorIds);

    if (admins) {
      adminMap = Object.fromEntries(
        admins.map((a) => [a.id, { display_name: a.display_name, email: a.email }])
      );
    }
  }

  const enrichedPhotos: AdminPhotoItem[] = photos.map((p) => ({
    ...p,
    moderator_name: p.moderated_by ? adminMap[p.moderated_by]?.display_name : null,
    moderator_email: p.moderated_by ? adminMap[p.moderated_by]?.email : null,
  }));

  const totalCount = count ?? photos.length;
  const hasMore = offset + photos.length < totalCount;

  return {
    photos: enrichedPhotos,
    totalCount,
    hasMore,
  };
}

/**
 * Retrieves a single photo along with its complete moderation history and audit log.
 */
export async function getAdminPhotoDetails(
  photoId: string
): Promise<PhotoDetailData | null> {
  const supabase = createAdminClient();

  const { data: photo, error: photoErr } = await supabase
    .from("photos")
    .select("*")
    .eq("id", photoId)
    .maybeSingle();

  if (photoErr || !photo) {
    return null;
  }

  // Fetch moderation history
  const { data: historyData } = await supabase
    .from("moderation_history")
    .select("*")
    .eq("photo_id", photoId)
    .order("created_at", { ascending: false });

  // Fetch audit logs for this photo
  const { data: auditData } = await supabase
    .from("audit_log")
    .select("*")
    .eq("entity_id", photoId)
    .order("created_at", { ascending: false });

  // Resolve admin names
  const adminIds = Array.from(
    new Set([
      photo.moderated_by,
      ...(historyData || []).map((h) => h.admin_id),
      ...(auditData || []).map((a) => a.admin_id),
    ].filter((id): id is string => Boolean(id)))
  );

  let adminMap: Record<string, { display_name: string | null; email: string }> = {};
  if (adminIds.length > 0) {
    const { data: admins } = await supabase
      .from("admin_users")
      .select("id, display_name, email")
      .in("id", adminIds);

    if (admins) {
      adminMap = Object.fromEntries(
        admins.map((a) => [a.id, { display_name: a.display_name, email: a.email }])
      );
    }
  }

  let locationName: string | null = null;
  if (photo.location_id) {
    const { data: loc } = await supabase
      .from("locations")
      .select("name")
      .eq("id", photo.location_id)
      .maybeSingle();
    locationName = loc?.name || null;
  }

  const enrichedPhoto: AdminPhotoItem = {
    ...photo,
    moderator_name: photo.moderated_by ? adminMap[photo.moderated_by]?.display_name : null,
    moderator_email: photo.moderated_by ? adminMap[photo.moderated_by]?.email : null,
    location_name: locationName,
  };

  const enrichedHistory: PhotoHistoryItem[] = (historyData || []).map((h) => ({
    id: h.id,
    action: h.action as ModerationAction,
    previous_status: h.previous_status as PhotoStatus,
    new_status: h.new_status as PhotoStatus,
    reason: h.reason,
    created_at: h.created_at,
    admin_id: h.admin_id,
    admin_name: h.admin_id ? adminMap[h.admin_id]?.display_name : null,
    admin_email: h.admin_id ? adminMap[h.admin_id]?.email : null,
  }));

  const enrichedAudit: PhotoAuditItem[] = (auditData || []).map((a) => ({
    id: a.id,
    action: a.action,
    old_values: a.old_values as Record<string, unknown> | null,
    new_values: a.new_values as Record<string, unknown> | null,
    ip_address: a.ip_address,
    created_at: a.created_at,
    admin_id: a.admin_id,
    admin_email: a.admin_id ? adminMap[a.admin_id]?.email : null,
  }));

  return {
    photo: enrichedPhoto,
    history: enrichedHistory,
    auditLogs: enrichedAudit,
  };
}

export interface UpdatePhotoStatusParams {
  photoId: string;
  newStatus: PhotoStatus;
  reason?: string;
  adminUser: AdminUser;
  ipAddress?: string;
}

/**
 * Updates a photo's status (e.g. archive, soft delete, restore, re-approve) with audit history.
 * Enforces minimum ADMIN role.
 */
export async function updatePhotoStatusByAdmin(
  params: UpdatePhotoStatusParams
): Promise<{ success: boolean; photo?: Photo; error?: string }> {
  const { photoId, newStatus, reason, adminUser, ipAddress } = params;

  if (!hasRequiredRole(adminUser.role, AdminRole.ADMIN)) {
    return { success: false, error: "Insufficient privileges. ADMIN role required." };
  }

  const supabase = createAdminClient();

  // Fetch current photo
  const { data: currentPhoto, error: fetchErr } = await supabase
    .from("photos")
    .select("*")
    .eq("id", photoId)
    .maybeSingle();

  if (fetchErr || !currentPhoto) {
    return { success: false, error: "Photo not found." };
  }

  const previousStatus = currentPhoto.status as PhotoStatus;
  if (previousStatus === newStatus) {
    return { success: true, photo: currentPhoto };
  }

  const nowIso = new Date().toISOString();

  // Update photo record
  const { data: updatedPhoto, error: updateErr } = await supabase
    .from("photos")
    .update({
      status: newStatus,
      moderated_at: nowIso,
      moderated_by: adminUser.id,
      updated_at: nowIso,
    })
    .eq("id", photoId)
    .select("*")
    .single();

  if (updateErr || !updatedPhoto) {
    return { success: false, error: `Failed to update photo: ${updateErr?.message}` };
  }

  // Insert moderation history
  let action: ModerationAction = ModerationAction.APPROVED;
  if (newStatus === PhotoStatus.REJECTED) action = ModerationAction.REJECTED;
  else if (newStatus === PhotoStatus.DELETED) action = ModerationAction.DELETED;
  else if (newStatus === PhotoStatus.APPROVED) action = ModerationAction.APPROVED;
  else if (previousStatus === PhotoStatus.DELETED) action = ModerationAction.RESTORED;

  await supabase.from("moderation_history").insert({
    photo_id: photoId,
    admin_id: adminUser.id,
    previous_status: previousStatus,
    new_status: newStatus,
    action,
    reason: reason?.trim() || null,
    created_at: nowIso,
  });

  // Insert audit log
  await supabase.from("audit_log").insert({
    admin_id: adminUser.id,
    action: `photo.${action.toLowerCase()}`,
    entity_type: AuditEntityType.PHOTO,
    entity_id: photoId,
    old_values: { status: previousStatus },
    new_values: { status: newStatus, reason: reason?.trim() || null },
    ip_address: ipAddress || null,
    created_at: nowIso,
  });

  return { success: true, photo: updatedPhoto };
}

export interface PurgePhotoParams {
  photoId: string;
  adminUser: AdminUser;
  ipAddress?: string;
}

/**
 * Permanently deletes a photo: purges B2 objects first, then removes the database row.
 * Strictly requires SUPER_ADMIN role.
 */
export async function purgePhotoPermanent(
  params: PurgePhotoParams
): Promise<{ success: boolean; error?: string }> {
  const { photoId, adminUser, ipAddress } = params;

  if (!hasRequiredRole(adminUser.role, AdminRole.SUPER_ADMIN)) {
    return { success: false, error: "Permanent deletion requires SUPER_ADMIN privileges." };
  }

  const supabase = createAdminClient();

  const { data: photo, error: fetchErr } = await supabase
    .from("photos")
    .select("*")
    .eq("id", photoId)
    .maybeSingle();

  if (fetchErr || !photo) {
    return { success: false, error: "Photo not found." };
  }

  // Step 1: Purge B2 storage prefix first
  try {
    await deleteStoragePrefix(`photos/${photoId}/`);
  } catch (storageErr) {
    console.error(`Failed to delete B2 objects for photo ${photoId}:`, storageErr);
    return { success: false, error: "Failed to purge B2 storage objects. Database record preserved." };
  }

  // Step 2: Delete associated moderation_history and audit_log or rely on ON DELETE CASCADE / manual clean
  await supabase.from("moderation_history").delete().eq("photo_id", photoId);

  // Step 3: Delete photo row
  const { error: deleteErr } = await supabase
    .from("photos")
    .delete()
    .eq("id", photoId);

  if (deleteErr) {
    return { success: false, error: `Failed to remove database record: ${deleteErr.message}` };
  }

  // Record audit log for permanent purge
  await supabase.from("audit_log").insert({
    admin_id: adminUser.id,
    action: "photo.permanent_purge",
    entity_type: AuditEntityType.PHOTO,
    entity_id: photoId,
    old_values: {
      status: photo.status,
      file_size_bytes: photo.file_size_bytes,
      storage_display_key: photo.storage_display_key,
    },
    new_values: null,
    ip_address: ipAddress || null,
    created_at: new Date().toISOString(),
  });

  return { success: true };
}
