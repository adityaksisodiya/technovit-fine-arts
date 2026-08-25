import { createAdminClient } from "@/lib/supabase/server";
import {
  PhotoStatus,
  ModerationAction,
  AuditEntityType,
  AdminRole,
  type Photo,
  type AdminUser,
} from "@/types";
import { hasRequiredRole } from "@/lib/auth/admin";

export interface ModerationStats {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
}

export interface ModeratePhotoParams {
  photoId: string;
  action: "approve" | "reject";
  reason?: string;
  adminUser: AdminUser;
  ipAddress?: string;
}

export type ModeratePhotoResult =
  | { success: true; photo: Photo }
  | {
      success: false;
      code: "UNAUTHORIZED" | "PHOTO_NOT_FOUND" | "ALREADY_MODERATED" | "DB_ERROR";
      error: string;
    };

/**
 * Fetches all photos currently waiting in the moderation queue (status = 'pending').
 * Ordered FIFO (oldest first) so submissions are reviewed chronologically.
 */
export async function getPendingPhotos(): Promise<Photo[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("photos")
    .select("*")
    .eq("status", PhotoStatus.PENDING)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch pending photos for moderation queue:", error);
    throw new Error(`Failed to fetch pending photos: ${error.message}`);
  }

  return (data as Photo[]) || [];
}

/**
 * Fetches high-level moderation statistics for the admin dashboard.
 */
export async function getModerationStats(): Promise<ModerationStats> {
  const supabase = createAdminClient();

  const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
    supabase
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("status", PhotoStatus.PENDING),
    supabase
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("status", PhotoStatus.APPROVED),
    supabase
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("status", PhotoStatus.REJECTED),
  ]);

  return {
    pendingCount: pendingRes.count ?? 0,
    approvedCount: approvedRes.count ?? 0,
    rejectedCount: rejectedRes.count ?? 0,
  };
}

/**
 * Atomically transitions a photo from 'pending' to 'approved' or 'rejected'.
 *
 * Guarantees:
 * - Server-side authorization check (minimum MODERATOR role).
 * - Atomic optimistic state transition: only updates if current status is strictly 'pending'.
 * - Safe against concurrent clicks/moderators: returns ALREADY_MODERATED if another admin decided first.
 * - Writes immutable audit trail to `moderation_history` and `audit_log`.
 * - Preserves B2 object references (rejection does NOT delete objects).
 */
export async function moderatePhoto(
  params: ModeratePhotoParams
): Promise<ModeratePhotoResult> {
  const { photoId, action, reason, adminUser, ipAddress } = params;

  // 1. Enforce minimum role privilege
  if (!hasRequiredRole(adminUser.role, AdminRole.MODERATOR)) {
    return {
      success: false,
      code: "UNAUTHORIZED",
      error: "You do not have permission to moderate photos.",
    };
  }

  const supabase = createAdminClient();
  const newStatus =
    action === "approve" ? PhotoStatus.APPROVED : PhotoStatus.REJECTED;
  const modAction =
    action === "approve"
      ? ModerationAction.APPROVED
      : ModerationAction.REJECTED;

  // 2. Perform atomic state transition (WHERE status = 'pending')
  const { data: updatedPhoto, error: updateError } = await supabase
    .from("photos")
    .update({
      status: newStatus,
      moderated_at: new Date().toISOString(),
      moderated_by: adminUser.id,
    })
    .eq("id", photoId)
    .eq("status", PhotoStatus.PENDING)
    .select("*")
    .maybeSingle();

  if (updateError) {
    console.error(`Database error during photo moderation [${photoId}]:`, updateError);
    return {
      success: false,
      code: "DB_ERROR",
      error: `Failed to update photo status: ${updateError.message}`,
    };
  }

  // 3. If no row updated, determine if photo was not found or already moderated
  if (!updatedPhoto) {
    const { data: existingPhoto } = await supabase
      .from("photos")
      .select("id, status")
      .eq("id", photoId)
      .maybeSingle();

    if (!existingPhoto) {
      return {
        success: false,
        code: "PHOTO_NOT_FOUND",
        error: "Photo record was not found.",
      };
    }

    return {
      success: false,
      code: "ALREADY_MODERATED",
      error: `This photo was already moderated (current status: ${existingPhoto.status}).`,
    };
  }

  // 4. Record entry in moderation_history (immutable audit log of photo state changes)
  const { error: historyError } = await supabase.from("moderation_history").insert({
    photo_id: photoId,
    admin_id: adminUser.id,
    previous_status: PhotoStatus.PENDING,
    new_status: newStatus,
    action: modAction,
    reason: reason?.trim() || null,
  });

  if (historyError) {
    console.error(`Failed to record moderation_history for photo [${photoId}]:`, historyError);
  }

  // 5. Record entry in general audit_log
  const { error: auditError } = await supabase.from("audit_log").insert({
    admin_id: adminUser.id,
    action: action === "approve" ? "photo.approve" : "photo.reject",
    entity_type: AuditEntityType.PHOTO,
    entity_id: photoId,
    old_values: { status: PhotoStatus.PENDING },
    new_values: { status: newStatus, reason: reason?.trim() || null },
    ip_address: ipAddress || null,
  });

  if (auditError) {
    console.error(`Failed to record audit_log for photo [${photoId}]:`, auditError);
  }

  return {
    success: true,
    photo: updatedPhoto as Photo,
  };
}
