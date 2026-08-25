import { createAdminClient } from "@/lib/supabase/server";
import { PhotoStatus } from "@/types";

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
  displayKey: string;
  thumbKey: string;
}

/**
 * Atomically enforces rate limiting, reserves storage against the 7.5 GB hard-stop,
 * pre-generates deterministic storage keys, and creates the pending photo row in Supabase
 * strictly via the `admit_and_create_pending_photo` stored procedure.
 *
 * Direct table INSERT fallback is intentionally prohibited to guarantee that all
 * admissions strictly pass through PostgreSQL advisory locks and storage budget checks.
 */
export async function admitAndCreatePendingPhoto(
  params: AdmitPhotoParams
): Promise<AdmitPhotoResult> {
  const supabase = createAdminClient();

  // Call the atomic PostgreSQL stored procedure (single authoritative entry point)
  const { data, error } = await supabase.rpc("admit_and_create_pending_photo", {
    p_uploaded_from_ip: params.ipAddress,
    p_file_size_bytes: params.fileSizeBytes,
    p_width: params.width,
    p_height: params.height,
    p_blurhash: params.blurhash || null,
    p_content_type: params.contentType,
    p_booth_id: params.boothId || null,
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

    if (
      errorMsg.includes("INVALID_FILE_SIZE") ||
      errorMsg.includes("INVALID_DIMENSIONS")
    ) {
      throw new UploadAdmissionError(
        errorMsg,
        "INVALID_INPUT",
        400
      );
    }

    throw new Error(`Upload admission failed: ${errorMsg}`);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || !row.id) {
    throw new Error("No photo row returned by admission procedure.");
  }

  return {
    photoId: row.id as string,
    status: row.status as PhotoStatus,
    displayKey: row.storage_display_key as string,
    thumbKey: row.storage_thumb_key as string,
  };
}
