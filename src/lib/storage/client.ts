import { S3Client } from "@aws-sdk/client-s3";
import { getB2Config } from "./config";

/**
 * Global cache for the S3 client in development to prevent multiple instances
 * during Next.js hot module reloading.
 */
const globalForB2 = globalThis as unknown as {
  b2Client: S3Client | undefined;
};

/**
 * Creates or retrieves the singleton S3-compatible client for Backblaze B2.
 *
 * This client runs strictly on the server.
 * Uses Backblaze B2 Application Key credentials and S3-compatible endpoint.
 * Full standard TLS/HTTPS security is enforced.
 */
export function getB2Client(): S3Client {
  if (globalForB2.b2Client) {
    return globalForB2.b2Client;
  }

  const config = getB2Config();

  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.keyId,
      secretAccessKey: config.applicationKey,
    },
  });

  if (process.env.NODE_ENV !== "production") {
    globalForB2.b2Client = client;
  }

  return client;
}

/**
 * Returns the configured Backblaze B2 bucket name.
 */
export function getB2BucketName(): string {
  const config = getB2Config();
  return config.bucketName;
}

