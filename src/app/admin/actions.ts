"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";
import { cleanupAbandonedPendingPhotos } from "@/lib/upload/cleanup";
import { AdminRole } from "@/types";

/**
 * Server Action to sign out an administrator.
 */
export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export interface CleanupActionResult {
  success: boolean;
  deletedCount: number;
  failedCount: number;
  error?: string;
}

/**
 * Server Action for administrators to purge abandoned pending uploads (>30 min old).
 * Enforces minimum ADMIN role.
 */
export async function runAbandonedUploadCleanupAction(
  olderThanMinutes = 30
): Promise<CleanupActionResult> {
  try {
    await requireAdmin(AdminRole.ADMIN);
    const result = await cleanupAbandonedPendingPhotos(olderThanMinutes);
    return { success: true, ...result };
  } catch (err: unknown) {
    return {
      success: false,
      deletedCount: 0,
      failedCount: 0,
      error: err instanceof Error ? err.message : "Failed to run cleanup.",
    };
  }
}
