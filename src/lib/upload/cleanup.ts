import { createAdminClient } from "@/lib/supabase/server";
import { deleteStoragePrefix } from "./storage";

export interface CleanupResult {
  deletedCount: number;
  failedCount: number;
}

/**
 * Recovers demonstrably abandoned pending photo records from serverless crash scenarios.
 *
 * Design & Guarantees:
 * - Storage keys (`storage_display_key`, `storage_thumb_key`) are pre-generated
 *   when the pending row is admitted. Abandoned rows therefore already contain the exact object keys.
 * - For each abandoned row (>30 minutes old and unconfirmed `uploaded_at IS NULL`),
 *   this utility attempts to delete any partial B2 objects under `photos/{id}/` FIRST.
 * - Only if Backblaze B2 object deletion succeeds is the database row deleted.
 * - If B2 deletion encounters an error, the database row is PRESERVED as the durable reference
 *   for subsequent retry sweeps, strictly preventing permanent orphan objects in B2.
 *
 * Safety Constraints:
 * - Conservative timeout (default 30 minutes)
 * - Only targets status = 'pending' where uploaded_at was NEVER confirmed (IS NULL)
 * - Server-side only (uses service_role admin client)
 * - Never touches completed, approved, rejected, or active uploading photos (< cutoff)
 */
export async function cleanupAbandonedPendingPhotos(
  olderThanMinutes = 30
): Promise<CleanupResult> {
  const supabase = createAdminClient();
  const cutoffTime = new Date(
    Date.now() - olderThanMinutes * 60 * 1000
  ).toISOString();

  // 1. Identify demonstrably abandoned pending photos
  const { data: abandonedPhotos, error: queryError } = await supabase
    .from("photos")
    .select("id")
    .eq("status", "pending")
    .is("uploaded_at", null)
    .lt("created_at", cutoffTime);

  if (queryError || !abandonedPhotos || abandonedPhotos.length === 0) {
    return { deletedCount: 0, failedCount: 0 };
  }

  let deletedCount = 0;
  let failedCount = 0;

  // 2. Process each abandoned photo with B2-first, DB-second ordering
  for (const photo of abandonedPhotos) {
    try {
      // Step A: Purge any partial B2 objects using the deterministic prefix
      await deleteStoragePrefix(`photos/${photo.id}/`);

      // Step B: Only after B2 deletion succeeds, delete the DB row
      const { error: deleteError } = await supabase
        .from("photos")
        .delete()
        .eq("id", photo.id);

      if (deleteError) {
        console.error(
          `Failed to delete database row for abandoned photo ${photo.id}:`,
          deleteError
        );
        failedCount++;
      } else {
        deletedCount++;
      }
    } catch (b2Error) {
      console.error(
        `Failed to clean up B2 objects for abandoned photo ${photo.id}. Preserving DB row for retry:`,
        b2Error
      );
      failedCount++;
    }
  }

  return { deletedCount, failedCount };
}
