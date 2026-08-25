import { createAdminClient } from "@/lib/supabase/server";
import {
  STORAGE_HARD_STOP_BYTES,
  STORAGE_WARN_THRESHOLD_BYTES,
  STORAGE_CRITICAL_THRESHOLD_BYTES,
} from "./constants";

export interface StorageBudgetStatus {
  allowed: boolean;
  usedBytes: number;
  hardStopBytes: number;
  percentageUsed: number;
  isWarning: boolean;
  isCritical: boolean;
  message?: string;
}

/**
 * Checks current storage consumption against application safety limits.
 *
 * Queries the authoritative database aggregate in real-time with zero per-instance caching.
 */
export async function checkStorageBudget(
  incomingBytes = 0
): Promise<StorageBudgetStatus> {
  let usedBytes = 0;

  try {
    const supabase = createAdminClient();

    // Query active (pending + approved) photos to calculate consumed B2 storage
    const { data, error } = await supabase
      .from("photos")
      .select("file_size_bytes")
      .in("status", ["pending", "approved"]);

    if (!error && data) {
      usedBytes = data.reduce(
        (acc, row) => acc + (Number(row.file_size_bytes) || 0),
        0
      );
    }
  } catch (err) {
    console.error("Failed to query storage budget from database:", err);
  }

  const projectedBytes = usedBytes + incomingBytes;
  const percentageUsed = (projectedBytes / STORAGE_HARD_STOP_BYTES) * 100;
  const isWarning = projectedBytes >= STORAGE_WARN_THRESHOLD_BYTES;
  const isCritical = projectedBytes >= STORAGE_CRITICAL_THRESHOLD_BYTES;
  const isExceeded = projectedBytes >= STORAGE_HARD_STOP_BYTES;

  if (isExceeded) {
    return {
      allowed: false,
      usedBytes,
      hardStopBytes: STORAGE_HARD_STOP_BYTES,
      percentageUsed,
      isWarning: true,
      isCritical: true,
      message:
        "Upload storage capacity limit reached (7.5 GB hard-stop). Uploads are temporarily paused.",
    };
  }

  return {
    allowed: true,
    usedBytes,
    hardStopBytes: STORAGE_HARD_STOP_BYTES,
    percentageUsed,
    isWarning,
    isCritical,
  };
}
