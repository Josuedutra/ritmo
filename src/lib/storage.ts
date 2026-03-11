import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl as awsGetSignedUrl } from "@aws-sdk/s3-request-presigner";
import { logger } from "@/lib/logger";

const BUCKET_NAME = "ritmo-attachments";

// Lazy-initialized R2 client (avoids build-time errors when env vars are missing)
let _r2Client: S3Client | null = null;

function getR2Client(): S3Client | null {
  if (_r2Client) return _r2Client;

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null;
  }

  _r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return _r2Client;
}

interface UploadResult {
  success: boolean;
  path?: string;
  error?: string;
}

interface SignedUrlResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload file to Cloudflare R2
 *
 * Files are stored with org scoping: proposals/{organizationId}/{quoteId}/{filename}
 */
export async function uploadFile(
  organizationId: string,
  quoteId: string,
  filename: string,
  file: Buffer,
  contentType: string
): Promise<UploadResult> {
  const log = logger.child({ service: "storage" });
  const r2 = getR2Client();

  if (!r2) {
    log.warn("R2 not configured - storage disabled");
    return { success: false, error: "Storage not configured" };
  }

  const path = `proposals/${organizationId}/${quoteId}/${filename}`;

  try {
    await r2.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: path,
        Body: file,
        ContentType: contentType,
      })
    );

    log.info({ path }, "File uploaded successfully");
    return { success: true, path };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error({ error: message, path }, "Upload failed");
    return { success: false, error: message };
  }
}

/**
 * Get signed URL for file download
 *
 * URL expires after expiresIn seconds (default 1 hour)
 */
export async function getSignedUrl(
  path: string,
  expiresIn: number = 3600
): Promise<SignedUrlResult> {
  const log = logger.child({ service: "storage" });
  const r2 = getR2Client();

  if (!r2) {
    log.warn("R2 not configured - storage disabled");
    return { success: false, error: "Storage not configured" };
  }

  try {
    const url = await awsGetSignedUrl(
      r2,
      new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: path,
      }),
      { expiresIn }
    );

    return { success: true, url };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error({ error: message, path }, "Failed to create signed URL");
    return { success: false, error: message };
  }
}

/**
 * Delete file from storage
 */
export async function deleteFile(path: string): Promise<{ success: boolean; error?: string }> {
  const log = logger.child({ service: "storage" });
  const r2 = getR2Client();

  if (!r2) {
    return { success: false, error: "Storage not configured" };
  }

  try {
    await r2.send(
      new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: path,
      })
    );

    log.info({ path }, "File deleted");
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error({ error: message }, "Delete failed");
    return { success: false, error: message };
  }
}

/**
 * Download a file from R2 and return it as a Buffer
 */
export async function downloadFile(
  path: string
): Promise<{ success: boolean; buffer?: Buffer; error?: string }> {
  const log = logger.child({ service: "storage" });
  const r2 = getR2Client();

  if (!r2) {
    return { success: false, error: "Storage not configured" };
  }

  try {
    const response = await r2.send(
      new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: path,
      })
    );

    if (!response.Body) {
      return { success: false, error: "Empty response from storage" };
    }

    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    log.info({ path, bytes: buffer.length }, "File downloaded from R2");
    return { success: true, buffer };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error({ error: message, path }, "Download failed");
    return { success: false, error: message };
  }
}

/**
 * Upload a PDF attachment from inbound email to R2.
 *
 * Used by the inbound route to store BCC email attachments.
 * Path format: proposals/{orgId}/{quoteId}/{timestamp}-{filename}
 */
export async function uploadAttachment(
  orgId: string,
  quoteId: string,
  filename: string,
  buffer: Buffer,
  contentType: string
): Promise<UploadResult> {
  const timestamp = Date.now();
  return uploadFile(orgId, quoteId, `${timestamp}-${filename}`, buffer, contentType);
}
