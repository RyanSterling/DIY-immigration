---
name: file-processing-pipeline
description: Prepare documents for external API processing by compressing images and converting PDFs. Use when integrating with APIs that have file size/format limits (OCR, AI vision, document signing, etc.).
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# File Processing Pipeline

Implement a document processing pipeline that prepares files for external APIs with size or format constraints.

## When to Use

- Integrating with APIs that have file size limits (AWS Textract: 10MB, OpenAI Vision: 20MB)
- Converting PDFs to images for vision/OCR APIs
- Compressing user uploads before sending to external services
- Any scenario where original files must be preserved while processed versions are used temporarily

## Quick Reference

**Location:** `backend/src/lib/<service>-processor.ts`

**Key dependencies:**
```json
{
  "sharp": "^0.33.0",
  "pdf2pic": "^3.1.0"
}
```

**Note:** `pdf2pic` requires GraphicsMagick or ImageMagick on the system.

## Architecture Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                     Processing Flow                          │
├─────────────────────────────────────────────────────────────┤
│  1. Check file metadata (size, type)                        │
│  2. Determine if processing needed                          │
│  3. If needed: download → process → upload processed        │
│  4. Return S3 key to use (original or processed)            │
│  5. External API uses the returned key                      │
│  6. After success: cleanup processed file                   │
└─────────────────────────────────────────────────────────────┘

Storage Structure:
  Original:  {orgId}/{clientId}/{docId}/{filename}
  Processed: {orgId}/{clientId}/{docId}/processed/{output}.png
```

## Patterns

### 1. Main Processing Function

```typescript
import { getObjectMetadata, getObject, putObject, deleteFile } from './s3/index.js';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';

const API_SIZE_LIMIT = 10 * 1024 * 1024; // Configure per API
const TARGET_SIZE = 9.5 * 1024 * 1024;   // Buffer below limit

export async function prepareForApi(
  s3Key: string,
  documentId: string
): Promise<string> {
  // 1. Get file metadata
  const metadata = await getObjectMetadata(s3Key);
  const contentType = metadata.contentType?.toLowerCase() || '';
  const fileSize = metadata.contentLength;

  // 2. Determine if processing needed
  const isPdf = contentType === 'application/pdf';
  const isImage = contentType.startsWith('image/');
  const isOverLimit = fileSize > API_SIZE_LIMIT;

  // No processing needed
  if (isImage && !isOverLimit) {
    return s3Key;
  }

  // 3. Download and process
  const originalBuffer = await getObject(s3Key);
  let processedBuffer: Buffer;
  let processedContentType: string;

  if (isPdf) {
    processedBuffer = await convertPdfToImage(originalBuffer);
    processedContentType = 'image/png';

    // Compress if still over limit
    if (processedBuffer.length > API_SIZE_LIMIT) {
      processedBuffer = await compressImage(processedBuffer, TARGET_SIZE);
      processedContentType = 'image/jpeg';
    }
  } else {
    processedBuffer = await compressImage(originalBuffer, TARGET_SIZE);
    processedContentType = 'image/jpeg';
  }

  // 4. Verify under limit
  if (processedBuffer.length > API_SIZE_LIMIT) {
    throw new Error(
      `Cannot reduce file below ${API_SIZE_LIMIT / 1024 / 1024}MB limit. ` +
      `Please upload a smaller file.`
    );
  }

  // 5. Upload processed file
  const processedKey = generateProcessedKey(s3Key);
  await putObject(processedKey, processedBuffer, processedContentType);

  // 6. Track in database
  await db
    .update(schema.documents)
    .set({ processedFilePath: processedKey, updatedAt: new Date() })
    .where(eq(schema.documents.id, documentId));

  return processedKey;
}
```

### 2. Image Compression (Progressive Quality + Resize)

```typescript
import sharp from 'sharp';

async function compressImage(
  buffer: Buffer,
  maxSizeBytes: number
): Promise<Buffer> {
  // Start with quality reduction
  let quality = 85;
  let result = await sharp(buffer).jpeg({ quality }).toBuffer();

  // Reduce quality until under limit
  while (result.length > maxSizeBytes && quality > 20) {
    quality -= 10;
    result = await sharp(buffer).jpeg({ quality }).toBuffer();
  }

  // If still too large, resize
  if (result.length > maxSizeBytes) {
    const metadata = await sharp(buffer).metadata();
    const scaleFactor = Math.sqrt(maxSizeBytes / result.length) * 0.9;
    const newWidth = Math.floor((metadata.width || 2000) * scaleFactor);
    const newHeight = Math.floor((metadata.height || 2000) * scaleFactor);

    result = await sharp(buffer)
      .resize(newWidth, newHeight, { fit: 'inside' })
      .jpeg({ quality: 70 })
      .toBuffer();
  }

  return result;
}
```

### 3. PDF-to-Image Conversion (Multi-page Stitching)

```typescript
import { fromBuffer } from 'pdf2pic';

async function convertPdfToImage(buffer: Buffer): Promise<Buffer> {
  const options = {
    density: 200,        // DPI (balance quality vs size)
    format: 'png' as const,
    width: 1700,         // ~A4 at 200 DPI
    height: 2200,
    preserveAspectRatio: true,
  };

  const converter = fromBuffer(buffer, options);
  const pages = await converter.bulk(-1, { responseType: 'buffer' });

  if (!pages || pages.length === 0) {
    throw new Error('Failed to convert PDF: no pages generated');
  }

  // Single page - return directly
  if (pages.length === 1) {
    return pages[0].buffer!;
  }

  // Multiple pages - stitch vertically
  const pageBuffers: Buffer[] = [];
  const pageMetadata: { width: number; height: number }[] = [];

  for (const page of pages) {
    pageBuffers.push(page.buffer!);
    const meta = await sharp(page.buffer!).metadata();
    pageMetadata.push({
      width: meta.width || options.width,
      height: meta.height || options.height,
    });
  }

  const maxWidth = Math.max(...pageMetadata.map(m => m.width));
  const totalHeight = pageMetadata.reduce((sum, m) => sum + m.height, 0);

  let currentY = 0;
  const compositeInputs = pageBuffers.map((buf, i) => {
    const y = currentY;
    currentY += pageMetadata[i].height;
    return { input: buf, top: y, left: 0 };
  });

  return sharp({
    create: {
      width: maxWidth,
      height: totalHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite(compositeInputs)
    .png()
    .toBuffer();
}
```

### 4. Processed File Key Generation

```typescript
function generateProcessedKey(originalKey: string): string {
  // Original: orgId/clientId/docId/filename.pdf
  // Processed: orgId/clientId/docId/processed/output.png
  const lastSlash = originalKey.lastIndexOf('/');
  const basePath = lastSlash > 0 ? originalKey.substring(0, lastSlash) : originalKey;
  return `${basePath}/processed/output.png`;
}
```

### 5. Cleanup After Processing

```typescript
export async function cleanupProcessedFile(documentId: string): Promise<void> {
  const [document] = await db
    .select({ processedFilePath: schema.documents.processedFilePath })
    .from(schema.documents)
    .where(eq(schema.documents.id, documentId))
    .limit(1);

  if (document?.processedFilePath) {
    try {
      await deleteFile(document.processedFilePath);
      await db
        .update(schema.documents)
        .set({ processedFilePath: null, updatedAt: new Date() })
        .where(eq(schema.documents.id, documentId));
    } catch (error) {
      // Log but don't fail - the main operation succeeded
      console.error('Failed to cleanup processed file:', error);
    }
  }
}
```

### 6. S3 Utility Functions Required

```typescript
// Add to backend/src/lib/s3/index.ts

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

export async function getObject(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: key,
  });
  const response = await s3Client.send(command);
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

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
```

## Database Schema Addition

Add a column to track processed files:

```typescript
// In schema.ts
processedFilePath: text("processed_file_path"),
```

## Integration Pattern

In your job handler or API route:

```typescript
export async function handleExternalApiJob(data: JobData): Promise<void> {
  const { documentId, s3Key } = data;

  try {
    // 1. Prepare file for API
    const apiReadyKey = await prepareForApi(s3Key, documentId);

    // 2. Call external API with processed file
    const result = await externalApi.process({
      bucket: env.AWS_S3_BUCKET,
      key: apiReadyKey,
    });

    // 3. Handle result...

    // 4. Cleanup processed file
    await cleanupProcessedFile(documentId);

  } catch (error) {
    // Handle error - original file is preserved
    throw error;
  }
}
```

## Configuration by API

| API | Size Limit | Recommended Target | Notes |
|-----|------------|-------------------|-------|
| AWS Textract | 10MB | 9.5MB | Supports PDF directly for some operations |
| OpenAI Vision | 20MB | 19MB | Supports PNG, JPEG, GIF, WebP |
| Google Vision | 20MB | 19MB | Base64 or GCS |
| DocuSign | 25MB | 24MB | PDF preferred |

## Instructions

When asked to add file processing for an external API:

1. **Check API limits** - Size limit, supported formats
2. **Add S3 utilities** if not present (getObjectMetadata, getObject, putObject)
3. **Add database column** for processedFilePath if not present
4. **Create processor module** - Copy and adapt patterns above
5. **Integrate into job/route** - Call prepareForApi before API, cleanup after
6. **Configure limits** - Set API_SIZE_LIMIT and TARGET_SIZE for the specific API

## Reference Implementation

- `backend/src/lib/document-processor.ts` - Full implementation for AWS Textract
- `backend/src/lib/s3/index.ts` - S3 utility functions
- `backend/src/jobs/textract/handler.ts` - Integration example
