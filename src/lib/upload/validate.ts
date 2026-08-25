import sharp from "sharp";
import {
  MAX_SERVER_PAYLOAD_BYTES,
  MIN_UPLOAD_SIZE_BYTES,
  MIN_IMAGE_WIDTH,
  MIN_IMAGE_HEIGHT,
  MAX_IMAGE_WIDTH,
  MAX_IMAGE_HEIGHT,
  MAX_INPUT_PIXELS,
} from "./constants";

export interface ValidationResult<T> {
  valid: boolean;
  error?: string;
  data?: T;
}

export interface ImageMetadataResult {
  format: "jpeg" | "png" | "webp";
  width: number;
  height: number;
  space?: string;
  channels?: number;
}

/**
 * Validates the server-received payload size.
 */
export function validatePayloadSize(
  payloadSize: number
): ValidationResult<number> {
  if (typeof payloadSize !== "number" || isNaN(payloadSize)) {
    return { valid: false, error: "Valid payload size in bytes is required." };
  }

  if (payloadSize < MIN_UPLOAD_SIZE_BYTES) {
    return { valid: false, error: "File payload is too small (minimum 100 bytes)." };
  }

  if (payloadSize > MAX_SERVER_PAYLOAD_BYTES) {
    return {
      valid: false,
      error: `Upload payload exceeds the maximum allowable limit of ${(MAX_SERVER_PAYLOAD_BYTES / (1024 * 1024)).toFixed(1)} MB.`,
    };
  }

  return { valid: true, data: payloadSize };
}

/**
 * Validates raw file signature (magic bytes) to prevent extension spoofing & polyglots.
 */
export function detectMagicBytes(
  buffer: Buffer
): "image/jpeg" | "image/png" | "image/webp" | null {
  if (!buffer || buffer.length < 12) {
    return null;
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // WebP: RIFF (bytes 0-3: 52 49 46 46) + WEBP (bytes 8-11: 57 45 42 50)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

/**
 * Performs comprehensive content and structure validation on the image buffer using Sharp.
 */
export async function validateImageBuffer(
  buffer: Buffer
): Promise<ValidationResult<ImageMetadataResult>> {
  // 1. Magic bytes validation
  const detectedMime = detectMagicBytes(buffer);
  if (!detectedMime) {
    return {
      valid: false,
      error:
        "Invalid file content signature. The file is not a valid JPEG, PNG, or WebP image.",
    };
  }

  // 2. Structural decode validation using Sharp
  try {
    const image = sharp(buffer, {
      failOn: "error",
      limitInputPixels: MAX_INPUT_PIXELS,
    });

    const metadata = await image.metadata();

    if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format)) {
      return {
        valid: false,
        error: `Decoded image format '${metadata.format}' is not supported.`,
      };
    }

    const width = metadata.width;
    const height = metadata.height;

    if (!width || !height) {
      return {
        valid: false,
        error: "Unable to determine image dimensions.",
      };
    }

    // 3. Dimension bounds check
    if (width < MIN_IMAGE_WIDTH || height < MIN_IMAGE_HEIGHT) {
      return {
        valid: false,
        error: `Image dimensions (${width}x${height}) are too small. Minimum is ${MIN_IMAGE_WIDTH}x${MIN_IMAGE_HEIGHT} px.`,
      };
    }

    if (width > MAX_IMAGE_WIDTH || height > MAX_IMAGE_HEIGHT) {
      return {
        valid: false,
        error: `Image dimensions (${width}x${height}) exceed the maximum allowable ${MAX_IMAGE_WIDTH}x${MAX_IMAGE_HEIGHT} px.`,
      };
    }

    // 4. Pixel budget check (decompression bomb protection)
    const totalPixels = width * height;
    if (totalPixels > MAX_INPUT_PIXELS) {
      return {
        valid: false,
        error: "Image exceeds the maximum allowable pixel budget.",
      };
    }

    return {
      valid: true,
      data: {
        format: metadata.format as "jpeg" | "png" | "webp",
        width,
        height,
        space: metadata.space,
        channels: metadata.channels,
      },
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Image decoding failed.";
    return {
      valid: false,
      error: `Malformed or corrupt image file: ${message}`,
    };
  }
}
