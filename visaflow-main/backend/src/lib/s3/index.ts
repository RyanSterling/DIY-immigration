import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../env.js';

const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

const UPLOAD_URL_EXPIRY = 60 * 15; // 15 minutes
const DOWNLOAD_URL_EXPIRY = 60 * 60; // 1 hour

/**
 * Generate a pre-signed URL for uploading a file to S3
 * @param key - S3 object key (path)
 * @param contentType - MIME type of the file
 * @returns Pre-signed URL for PUT operation
 */
export async function generateUploadUrl(
  key: string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(s3Client, command, { expiresIn: UPLOAD_URL_EXPIRY });
}

/**
 * Generate a pre-signed URL for downloading a file from S3
 * @param key - S3 object key (path)
 * @returns Pre-signed URL for GET operation
 */
export async function generateDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn: DOWNLOAD_URL_EXPIRY });
}

/**
 * Delete a file from S3
 * @param key - S3 object key (path)
 */
export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * Generate S3 key for a document
 * Format: {orgId}/{clientId}/{documentId}/{filename} (with client)
 * Format: {orgId}/pending/{documentId}/{filename} (without client)
 */
export function generateDocumentKey(
  organizationId: string,
  clientId: string | null,
  documentId: string,
  filename: string
): string {
  // Sanitize filename to remove special characters
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  if (clientId) {
    return `${organizationId}/${clientId}/${documentId}/${sanitizedFilename}`;
  }
  // Pending documents go to a special folder
  return `${organizationId}/pending/${documentId}/${sanitizedFilename}`;
}


/**
 * Generate S3 key for a form template PDF
 * Format: form-templates/{templateId}/{filename}
 */
export function generateFormTemplateKey(
  templateId: string,
  filename: string
): string {
  // Sanitize filename to remove special characters
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `form-templates/${templateId}/${sanitizedFilename}`;
}

/**
 * Get object metadata (size, content type) without downloading
 * @param key - S3 object key (path)
 * @returns Object metadata including size and content type
 */
export async function getObjectMetadata(key: string): Promise<{
  contentLength: number;
  contentType: string | undefined;
}> {
  const command = new HeadObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: key,
  });

  const response = await s3Client.send(command);
  return {
    contentLength: response.ContentLength ?? 0,
    contentType: response.ContentType,
  };
}

/**
 * Download a file from S3 as a Buffer
 * @param key - S3 object key (path)
 * @returns File contents as Buffer
 */
export async function getObject(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: key,
  });

  const response = await s3Client.send(command);

  if (!response.Body) {
    throw new Error(`No body returned for S3 object: ${key}`);
  }

  // Convert stream to buffer
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * Upload a buffer directly to S3
 * @param key - S3 object key (path)
 * @param buffer - File contents as Buffer
 * @param contentType - MIME type of the file
 */
export async function putObject(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await s3Client.send(command);
}

export { s3Client };
