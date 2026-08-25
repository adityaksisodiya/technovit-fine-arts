import sharp from "sharp";
import { encode } from "blurhash";
import {
  DISPLAY_MAX_WIDTH,
  DISPLAY_MAX_HEIGHT,
  THUMBNAIL_MAX_WIDTH,
  THUMBNAIL_MAX_HEIGHT,
  THUMBNAIL_WEBP_QUALITY,
  BLURHASH_COMPONENT_X,
  BLURHASH_COMPONENT_Y,
  MAX_INPUT_PIXELS,
} from "./constants";

export interface ProcessedPhotoResult {
  displayBuffer: Buffer;
  thumbBuffer: Buffer;
  displayWidth: number;
  displayHeight: number;
  thumbWidth: number;
  thumbHeight: number;
  blurhash: string;
  totalProcessedSizeBytes: number;
}

/**
 * Generates a compact Blurhash placeholder string from raw pixel data.
 */
async function generateBlurhash(imageSource: Buffer): Promise<string> {
  try {
    const { data, info } = await sharp(imageSource)
      .resize(32, 32, { fit: "inside" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const clamped = new Uint8ClampedArray(data);
    const hash = encode(
      clamped,
      info.width,
      info.height,
      BLURHASH_COMPONENT_X,
      BLURHASH_COMPONENT_Y
    );
    return hash;
  } catch {
    return "";
  }
}

/**
 * Processes an incoming uploaded image into optimized display and thumbnail WebP variants.
 *
 * Avoids unnecessary double-lossy re-compression:
 * - If the incoming file is already a valid WebP within 1600x1600 px, it normalizes and strips metadata.
 * - Generates an optimized 400x400 px thumbnail WebP.
 * - Extracts a compact Blurhash placeholder.
 */
export async function processUploadedPhoto(
  inputBuffer: Buffer
): Promise<ProcessedPhotoResult> {
  const baseImage = sharp(inputBuffer, {
    failOn: "error",
    limitInputPixels: MAX_INPUT_PIXELS,
  }).rotate();

  const metadata = await baseImage.metadata();
  const format = metadata.format;
  const origWidth = metadata.width || 1600;
  const origHeight = metadata.height || 1600;

  // 1. Prepare display variant (max 1600x1600 px WebP)
  let displayBuffer: Buffer;
  let displayWidth: number;
  let displayHeight: number;

  if (
    format === "webp" &&
    origWidth <= DISPLAY_MAX_WIDTH &&
    origHeight <= DISPLAY_MAX_HEIGHT
  ) {
    // Already high-quality client-compressed WebP within bounds — pass through while stripping metadata
    const { data, info } = await baseImage
      .webp({ quality: 85, effort: 4 })
      .toBuffer({ resolveWithObject: true });
    displayBuffer = data;
    displayWidth = info.width;
    displayHeight = info.height;
  } else {
    // Resize down to 1600x1600 px WebP
    const { data, info } = await baseImage
      .clone()
      .resize(DISPLAY_MAX_WIDTH, DISPLAY_MAX_HEIGHT, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82, effort: 4 })
      .toBuffer({ resolveWithObject: true });
    displayBuffer = data;
    displayWidth = info.width;
    displayHeight = info.height;
  }

  // 2. Generate optimized 400x400 thumbnail WebP
  const { data: thumbBuffer, info: thumbInfo } = await baseImage
    .clone()
    .resize(THUMBNAIL_MAX_WIDTH, THUMBNAIL_MAX_HEIGHT, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({
      quality: THUMBNAIL_WEBP_QUALITY,
      effort: 4,
    })
    .toBuffer({ resolveWithObject: true });

  // 3. Generate compact blur placeholder
  const blurhash = await generateBlurhash(thumbBuffer);

  const totalProcessedSizeBytes = displayBuffer.length + thumbBuffer.length;

  return {
    displayBuffer,
    thumbBuffer,
    displayWidth,
    displayHeight,
    thumbWidth: thumbInfo.width,
    thumbHeight: thumbInfo.height,
    blurhash,
    totalProcessedSizeBytes,
  };
}
