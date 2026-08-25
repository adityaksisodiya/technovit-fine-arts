/**
 * Client-Side Browser Image Pre-Compression Utility.
 *
 * Pre-processes images directly on the user's mobile/desktop device before upload:
 * - Downscales large camera photos to a max of 1600x1600 px (preserving aspect ratio)
 * - Converts to WebP at quality ~0.83 (with JPEG fallback for older browsers)
 * - Reduces multi-megabyte camera originals (e.g. 8-12 MB) down to < 3 MB (typically 200-500 KB)
 * - Guarantees the upload payload stays well within Vercel's 4.5 MB function limit
 * - Respects EXIF orientation automatically via browser Canvas rendering
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxInputSizeBytes?: number;
}

export interface CompressionResult {
  file: File;
  width: number;
  height: number;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  format: "image/webp" | "image/jpeg";
}

const DEFAULT_MAX_WIDTH = 1600;
const DEFAULT_MAX_HEIGHT = 1600;
const DEFAULT_QUALITY = 0.83; // 83% quality — optimal balance of clarity and file size
const DEFAULT_MAX_INPUT_SIZE = 10 * 1024 * 1024; // 10 MB maximum original input size
const MAX_DEGENERATE_DIMENSION = 16000; // Reject corrupt 16k+ pixel inputs

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Calculates scaled dimensions preserving aspect ratio.
 */
function calculateAspectFit(
  srcWidth: number,
  srcHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  if (srcWidth <= maxWidth && srcHeight <= maxHeight) {
    return { width: Math.round(srcWidth), height: Math.round(srcHeight) };
  }

  const ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
  return {
    width: Math.max(1, Math.round(srcWidth * ratio)),
    height: Math.max(1, Math.round(srcHeight * ratio)),
  };
}

/**
 * Checks if the current browser environment supports WebP canvas export.
 */
function isWebpSupported(): boolean {
  if (typeof document === "undefined") return false;
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL("image/webp").indexOf("data:image/webp") === 0;
}

/**
 * Compresses and resizes an image file in the browser before network transmission.
 */
export async function compressImageForUpload(
  inputFile: File,
  options?: CompressionOptions
): Promise<CompressionResult> {
  const maxWidth = options?.maxWidth ?? DEFAULT_MAX_WIDTH;
  const maxHeight = options?.maxHeight ?? DEFAULT_MAX_HEIGHT;
  const quality = options?.quality ?? DEFAULT_QUALITY;
  const maxInputSize = options?.maxInputSizeBytes ?? DEFAULT_MAX_INPUT_SIZE;

  // 1. Validate file existence and client-side size bounds
  if (!inputFile) {
    throw new Error("No image file provided.");
  }

  if (inputFile.size > maxInputSize) {
    throw new Error(
      `Selected file exceeds the 10 MB maximum limit (${(inputFile.size / (1024 * 1024)).toFixed(2)} MB).`
    );
  }

  if (inputFile.size < 100) {
    throw new Error("File is too small to be a valid image.");
  }

  const mimeType = inputFile.type.toLowerCase();
  if (mimeType && !ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error(
      "Unsupported file format. Please choose a JPEG, PNG, or WebP photo."
    );
  }

  // 2. Load image into an ImageBitmap or HTMLImageElement
  let sourceWidth = 0;
  let sourceHeight = 0;
  let drawable: ImageBitmap | HTMLImageElement;

  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(inputFile, {
        imageOrientation: "from-image", // Auto-correct EXIF orientation
      });
      sourceWidth = bitmap.width;
      sourceHeight = bitmap.height;
      drawable = bitmap;
    } catch {
      // Fallback to HTMLImageElement if createImageBitmap fails
      drawable = await loadImageElement(inputFile);
      sourceWidth = drawable.naturalWidth;
      sourceHeight = drawable.naturalHeight;
    }
  } else {
    drawable = await loadImageElement(inputFile);
    sourceWidth = drawable.naturalWidth;
    sourceHeight = drawable.naturalHeight;
  }

  // 3. Sanity check dimensions
  if (
    sourceWidth > MAX_DEGENERATE_DIMENSION ||
    sourceHeight > MAX_DEGENERATE_DIMENSION
  ) {
    if ("close" in drawable && typeof drawable.close === "function") {
      drawable.close();
    }
    throw new Error("Image dimensions are unreasonably large.");
  }

  // 4. Calculate target dimensions
  const targetDims = calculateAspectFit(
    sourceWidth,
    sourceHeight,
    maxWidth,
    maxHeight
  );

  // 5. Draw onto an offscreen canvas
  const canvas = document.createElement("canvas");
  canvas.width = targetDims.width;
  canvas.height = targetDims.height;

  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) {
    if ("close" in drawable && typeof drawable.close === "function") {
      drawable.close();
    }
    throw new Error("Could not initialize 2D canvas rendering context.");
  }

  // High quality downscaling filter
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // White background for transparent PNG conversions
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, targetDims.width, targetDims.height);

  ctx.drawImage(drawable, 0, 0, targetDims.width, targetDims.height);

  // Free bitmap memory if applicable
  if ("close" in drawable && typeof drawable.close === "function") {
    drawable.close();
  }

  // 6. Convert canvas to WebP (or JPEG fallback)
  const targetFormat = isWebpSupported() ? "image/webp" : "image/jpeg";
  const extension = targetFormat === "image/webp" ? ".webp" : ".jpg";

  const compressedBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to encode compressed image blob."));
        }
      },
      targetFormat,
      quality
    );
  });

  // 7. Wrap into standard File object with sanitized name
  const outputFileName = `photo_${Date.now()}${extension}`;
  const outputFile = new File([compressedBlob], outputFileName, {
    type: targetFormat,
    lastModified: Date.now(),
  });

  return {
    file: outputFile,
    width: targetDims.width,
    height: targetDims.height,
    originalSizeBytes: inputFile.size,
    compressedSizeBytes: outputFile.size,
    format: targetFormat,
  };
}

/**
 * Fallback loader using standard HTMLImageElement.
 */
function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image file into browser memory."));
    };

    img.src = objectUrl;
  });
}
