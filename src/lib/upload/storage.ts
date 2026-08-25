import {
  HeadObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { getB2Client, getB2BucketName } from "@/lib/storage";

export interface HeadResult {
  exists: boolean;
  contentLength?: number;
  contentType?: string;
}

/**
 * Checks whether an object exists in Backblaze B2 and retrieves its metadata.
 */
export async function headStorageObject(key: string): Promise<HeadResult> {
  const client = getB2Client();
  const bucketName = getB2BucketName();

  try {
    const response = await client.send(
      new HeadObjectCommand({
        Bucket: bucketName,
        Key: key,
      })
    );

    return {
      exists: true,
      contentLength: response.ContentLength,
      contentType: response.ContentType,
    };
  } catch (error: unknown) {
    const err = error as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
      return { exists: false };
    }
    throw error;
  }
}

/**
 * Converts a Node.js Readable stream or S3 response Body to a Buffer.
 */
async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/**
 * Downloads an object from Backblaze B2 into memory as a Buffer.
 */
export async function downloadStorageObject(key: string): Promise<Buffer> {
  const client = getB2Client();
  const bucketName = getB2BucketName();

  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    })
  );

  if (!response.Body) {
    throw new Error(`Empty response body received when downloading object: ${key}`);
  }

  // AWS SDK v3 stream helper
  if (typeof (response.Body as { transformToByteArray?: () => Promise<Uint8Array> }).transformToByteArray === "function") {
    const byteArray = await (response.Body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
    return Buffer.from(byteArray);
  }

  return await streamToBuffer(response.Body as Readable);
}

/**
 * Uploads a processed buffer to Backblaze B2.
 */
export async function uploadStorageObject(
  key: string,
  buffer: Buffer,
  contentType = "image/webp"
): Promise<void> {
  const client = getB2Client();
  const bucketName = getB2BucketName();

  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ContentLength: buffer.length,
    })
  );
}

/**
 * Deletes a single object from Backblaze B2. Safely ignores if object does not exist.
 */
export async function deleteStorageObject(key: string): Promise<void> {
  const client = getB2Client();
  const bucketName = getB2BucketName();

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      })
    );
  } catch (error: unknown) {
    const err = error as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
      return;
    }
    // Log deletion error but don't crash if non-critical
    console.error(`Failed to delete B2 object ${key}:`, error);
  }
}

/**
 * Deletes all objects matching a given prefix in Backblaze B2 (e.g. photos/{photoId}/).
 */
export async function deleteStoragePrefix(prefix: string): Promise<void> {
  const client = getB2Client();
  const bucketName = getB2BucketName();

  try {
    const listResponse = await client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
      })
    );

    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      return;
    }

    const objectsToDelete = listResponse.Contents.filter((obj) => obj.Key).map(
      (obj) => ({ Key: obj.Key! })
    );

    if (objectsToDelete.length > 0) {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: {
            Objects: objectsToDelete,
          },
        })
      );
    }
  } catch (error) {
    console.error(`Failed to delete B2 prefix ${prefix}:`, error);
  }
}
