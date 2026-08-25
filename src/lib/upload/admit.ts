import { createAdminClient } from "@/lib/supabase/server";
import { PhotoStatus } from "@/types";
import {
  STORAGE_HARD_STOP_BYTES,
  MAX_UPLOADS_PER_WINDOW,
} from "./constants";

export class UploadAdmissionError extends Error {
  code: string;
  statusCode: number;
  retryAfter?: number;

  constructor(
    message: string,
    code: string,
    statusCode: number,
    retryAfter?: number
  ) {
    super(message);
    this.name = "UploadAdmissionError";
    this.code = code;
    this.statusCode = statusCode;
    this.retryAfter = retryAfter;
  }
}

export interface AdmitPhotoParams {
  ipAddress: string;
  fileSizeBytes: number;
  width: number;
  height: number;
  blurhash: string;
  contentType: string;
  boothId?: string | null;
}

export interface AdmitPhotoResult {
  photoId: string;
  status: PhotoStatus;
}

/**
 * Atomically enforces rate limiting, reserves storage against the 7.5 GB hard-stop,
 * and creates the pending photo row in Supabase within a single transaction.
 */
export async function admitAndCreatePendingPhoto(
  params: AdmitPhotoParams
): Promise<AdmitPhotoResult> {
  const supabase = createAdminClient();

  // Call the atomic PostgreSQL stored procedure
  const { data, error } = await supabase.rpc("admit_and_create_pending_photo", {
    p_uploaded_from_ip: params.ipAddress,
    p_file_size_bytes: params.fileSizeBytes,
    p_width: params.width,
    p_height: params.height,
    p_blurhash: params.blurhash || null,
    p_content_type: params.contentType,
    p_booth_id: params.boothId || null,
    p_max_storage_bytes: STORAGE_HARD_STOP_BYTES,
    p_max_window_uploads: MAX_UPLOADS_PER_WINDOW,
  });

  if (error) {
    const errorMsg = error.message || "";

    if (errorMsg.includes("RATE_LIMIT_EXCEEDED")) {
      throw new UploadAdmissionError(
        "Too many photo uploads from your IP address. Please try again later.",
        "RATE_LIMIT_EXCEEDED",
        429,
        900
      );
    }

    if (errorMsg.includes("STORAGE_LIMIT_EXCEEDED")) {
      throw new UploadAdmissionError(
        "Upload storage capacity limit reached (7.5 GB hard-stop). Uploads are temporarily paused.",
        "STORAGE_LIMIT_EXCEEDED",
        503
      );
    }

    // Direct fallback insert (used before migration 00003 is applied)
    const { data: directData, error: directError } = await supabase
      .from("photos")
      .insert({
        status: PhotoStatus.PENDING,
        r2_original_key: null,
        r2_display_key: null,
        r2_thumbnail_key: null,
        blurhash: params.blurhash || null,
        width: params.width,
        height: params.height,
        file_size_bytes: params.fileSizeBytes,
        content_type: params.contentType,
        uploaded_from_ip: params.ipAddress,
        booth_id: params.boothId || null,
      })
      .select("id, status")
      .single();

    if (directError || !directData) {
      throw new Error(
        `Failed to create photo record: ${directError?.message || error.message}`
      );
    }

    return {
      photoId: directData.id as string,
      status: directData.status as PhotoStatus,
    };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || !row.id) {
    throw new Error("No photo row returned by admission procedure.");
  }

  return {
    photoId: row.id as string,
    status: row.status as PhotoStatus,
  };
}
