import { getObjectMetadata, getObject, putObject, deleteFile } from './s3/index.js';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { formatBytes, compressImage, convertPdfToImage } from './image-utils.js';

// AWS Textract limit is 10MB (10,485,760 bytes)
// Use 9.5MB as target to have some buffer
const TEXTRACT_SIZE_LIMIT = 10 * 1024 * 1024; // 10MB
const TARGET_SIZE = 9.5 * 1024 * 1024; // 9.5MB

/**
 * Prepares a document for Textract processing by compressing images
 * or converting PDFs to images if needed.
 *
 * @param s3Key - Original S3 key of the uploaded document
 * @param documentId - Document ID for database updates
 * @returns S3 key to use for Textract (original or processed)
 */
export async function prepareForTextract(
  s3Key: string,
  documentId: string
): Promise<string> {
  console.log(`[DocumentProcessor] Checking if processing needed for: ${s3Key}`);

  // Get file metadata
  const metadata = await getObjectMetadata(s3Key);
  const contentType = metadata.contentType?.toLowerCase() || '';
  const fileSize = metadata.contentLength;

  console.log(`[DocumentProcessor] File size: ${formatBytes(fileSize)}, type: ${contentType}`);

  // Determine if processing is needed
  const isPdf = contentType === 'application/pdf';
  const isImage = contentType.startsWith('image/');
  const isOverLimit = fileSize > TEXTRACT_SIZE_LIMIT;

  // If it's an image under the limit, no processing needed
  if (isImage && !isOverLimit) {
    console.log(`[DocumentProcessor] No processing needed - image under limit`);
    return s3Key;
  }

  // If it's neither PDF nor image, we can't process it
  if (!isPdf && !isImage) {
    console.log(`[DocumentProcessor] Unknown file type: ${contentType}, using original`);
    return s3Key;
  }

  console.log(
    `[DocumentProcessor] Processing required - isPdf: ${isPdf}, isOverLimit: ${isOverLimit}`
  );

  // Download the original file
  const originalBuffer = await getObject(s3Key);
  console.log(`[DocumentProcessor] Downloaded ${formatBytes(originalBuffer.length)}`);

  const logPrefix = '[DocumentProcessor]';
  let processedBuffer: Buffer;
  let processedContentType: string;

  if (isPdf) {
    // Convert PDF to image
    processedBuffer = await convertPdfToImage(originalBuffer, { logPrefix });
    processedContentType = 'image/png';
    console.log(`${logPrefix} PDF converted to image: ${formatBytes(processedBuffer.length)}`);

    // If the converted image is still over limit, compress it
    if (processedBuffer.length > TEXTRACT_SIZE_LIMIT) {
      console.log(`${logPrefix} Converted image too large, compressing...`);
      processedBuffer = await compressImage(processedBuffer, TARGET_SIZE, { logPrefix });
      processedContentType = 'image/jpeg';
    }
  } else {
    // Compress the image
    processedBuffer = await compressImage(originalBuffer, TARGET_SIZE, { logPrefix });
    processedContentType = 'image/jpeg';
  }

  console.log(`${logPrefix} Final processed size: ${formatBytes(processedBuffer.length)}`);

  // Verify we're under the limit
  if (processedBuffer.length > TEXTRACT_SIZE_LIMIT) {
    throw new Error(
      `Cannot reduce file size below Textract limit. ` +
        `Original: ${formatBytes(fileSize)}, ` +
        `After processing: ${formatBytes(processedBuffer.length)}. ` +
        `Please upload a smaller file.`
    );
  }

  // Generate processed file path
  const processedKey = generateProcessedKey(s3Key);

  // Upload processed file
  await putObject(processedKey, processedBuffer, processedContentType);
  console.log(`[DocumentProcessor] Uploaded processed file to: ${processedKey}`);

  // Update document record with processed path
  await db
    .update(schema.documents)
    .set({
      processedFilePath: processedKey,
      updatedAt: new Date(),
    })
    .where(eq(schema.documents.id, documentId));

  console.log(`[DocumentProcessor] Updated document record with processed path`);

  return processedKey;
}

/**
 * Generate the S3 key for the processed file
 * Places it in a 'processed' subdirectory with a fixed name
 */
function generateProcessedKey(originalKey: string): string {
  // Original: orgId/clientId/docId/filename.pdf
  // Processed: orgId/clientId/docId/processed/textract.png
  const lastSlash = originalKey.lastIndexOf('/');
  const basePath = lastSlash > 0 ? originalKey.substring(0, lastSlash) : originalKey;
  return `${basePath}/processed/textract.png`;
}

/**
 * Clean up the processed file after successful extraction
 */
export async function cleanupProcessedFile(documentId: string): Promise<void> {
  const [document] = await db
    .select({ processedFilePath: schema.documents.processedFilePath })
    .from(schema.documents)
    .where(eq(schema.documents.id, documentId))
    .limit(1);

  if (document?.processedFilePath) {
    console.log(`[DocumentProcessor] Cleaning up processed file: ${document.processedFilePath}`);

    try {
      await deleteFile(document.processedFilePath);

      // Clear the processed file path from the database
      await db
        .update(schema.documents)
        .set({
          processedFilePath: null,
          updatedAt: new Date(),
        })
        .where(eq(schema.documents.id, documentId));

      console.log(`[DocumentProcessor] Cleanup complete`);
    } catch (error) {
      // Log but don't fail - the extraction succeeded
      console.error(`[DocumentProcessor] Failed to cleanup processed file:`, error);
    }
  }
}
