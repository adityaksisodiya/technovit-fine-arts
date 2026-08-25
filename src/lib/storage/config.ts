/**
 * Backblaze B2 S3-Compatible Storage Configuration.
 *
 * All B2 credentials must remain strictly server-side.
 * Never prefix these variables with NEXT_PUBLIC_.
 */

export interface B2Config {
  endpoint: string;
  region: string;
  bucketName: string;
  keyId: string;
  applicationKey: string;
}

/**
 * Normalizes an S3/B2 endpoint URL to ensure a valid HTTPS protocol scheme.
 */
function normalizeEndpoint(endpoint: string): string {
  const trimmed = endpoint.trim();
  if (!trimmed.startsWith("https://") && !trimmed.startsWith("http://")) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

/**
 * Validates and retrieves the Backblaze B2 configuration from environment variables.
 * Throws a descriptive error (without leaking values) if any required variable is missing.
 */
export function getB2Config(): B2Config {
  const endpoint = process.env.B2_ENDPOINT;
  const region = process.env.B2_REGION;
  const bucketName = process.env.B2_BUCKET_NAME;
  const keyId = process.env.B2_KEY_ID;
  const applicationKey = process.env.B2_APPLICATION_KEY;

  const missing: string[] = [];
  if (!endpoint) missing.push("B2_ENDPOINT");
  if (!region) missing.push("B2_REGION");
  if (!bucketName) missing.push("B2_BUCKET_NAME");
  if (!keyId) missing.push("B2_KEY_ID");
  if (!applicationKey) missing.push("B2_APPLICATION_KEY");

  if (missing.length > 0) {
    throw new Error(
      `Missing required Backblaze B2 environment variable(s): ${missing.join(", ")}. Please configure them in .env.local.`
    );
  }

  return {
    endpoint: normalizeEndpoint(endpoint!),
    region: region!.trim(),
    bucketName: bucketName!.trim(),
    keyId: keyId!.trim(),
    applicationKey: applicationKey!.trim(),
  };
}

/**
 * Checks whether all B2 environment variables are configured.
 * Useful for runtime health checks and fallback behavior without throwing.
 */
export function isB2Configured(): boolean {
  return Boolean(
    process.env.B2_ENDPOINT &&
      process.env.B2_REGION &&
      process.env.B2_BUCKET_NAME &&
      process.env.B2_KEY_ID &&
      process.env.B2_APPLICATION_KEY
  );
}
