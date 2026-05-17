/**
 * Image processing utilities for document handling.
 * Reusable functions for image compression, PDF conversion, and formatting.
 */
import sharp from 'sharp';
import { fromBuffer } from 'pdf2pic';

/**
 * Format bytes as human-readable string (e.g., "2.50MB")
 */
export function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}

/**
 * Compress an image to fit within the target size.
 * Uses progressive quality reduction and resizing if needed.
 *
 * @param buffer - Image buffer to compress
 * @param maxSizeBytes - Maximum size in bytes
 * @param options - Optional configuration
 * @returns Compressed image buffer (JPEG format)
 */
export async function compressImage(
  buffer: Buffer,
  maxSizeBytes: number,
  options?: { logPrefix?: string }
): Promise<Buffer> {
  const prefix = options?.logPrefix ?? '[ImageUtils]';

  console.log(`${prefix} Compressing image to under ${formatBytes(maxSizeBytes)}`);

  // First try with quality reduction
  let quality = 85;
  let result = await sharp(buffer).jpeg({ quality }).toBuffer();

  console.log(`${prefix} Quality ${quality}: ${formatBytes(result.length)}`);

  // Reduce quality until under limit or minimum quality reached
  while (result.length > maxSizeBytes && quality > 20) {
    quality -= 10;
    result = await sharp(buffer).jpeg({ quality }).toBuffer();
    console.log(`${prefix} Quality ${quality}: ${formatBytes(result.length)}`);
  }

  // If still too large, also resize
  if (result.length > maxSizeBytes) {
    console.log(`${prefix} Still too large, resizing...`);

    const metadata = await sharp(buffer).metadata();
    const originalWidth = metadata.width || 2000;
    const originalHeight = metadata.height || 2000;

    // Calculate scale factor to achieve target size
    // Assuming size scales roughly with area (width * height)
    const scaleFactor = Math.sqrt(maxSizeBytes / result.length) * 0.9; // 0.9 for safety margin
    const newWidth = Math.floor(originalWidth * scaleFactor);
    const newHeight = Math.floor(originalHeight * scaleFactor);

    console.log(
      `${prefix} Resizing from ${originalWidth}x${originalHeight} to ${newWidth}x${newHeight}`
    );

    result = await sharp(buffer)
      .resize(newWidth, newHeight, { fit: 'inside' })
      .jpeg({ quality: 70 })
      .toBuffer();

    console.log(`${prefix} After resize: ${formatBytes(result.length)}`);
  }

  return result;
}

/**
 * Stitch multiple images vertically into a single image.
 *
 * @param buffers - Array of image buffers to stitch
 * @param options - Optional configuration
 * @returns Combined image buffer (PNG format)
 */
export async function stitchImagesVertically(
  buffers: Buffer[],
  options?: { logPrefix?: string }
): Promise<Buffer> {
  const prefix = options?.logPrefix ?? '[ImageUtils]';

  if (buffers.length === 0) {
    throw new Error('Cannot stitch zero images');
  }

  if (buffers.length === 1) {
    return buffers[0];
  }

  console.log(`${prefix} Stitching ${buffers.length} images vertically`);

  // Get dimensions of each image
  const pageMetadata: { width: number; height: number }[] = [];
  for (const buf of buffers) {
    const meta = await sharp(buf).metadata();
    pageMetadata.push({
      width: meta.width || 1700,
      height: meta.height || 2200,
    });
  }

  // Calculate total dimensions
  const maxWidth = Math.max(...pageMetadata.map((m) => m.width));
  const totalHeight = pageMetadata.reduce((sum, m) => sum + m.height, 0);

  console.log(`${prefix} Combined image dimensions: ${maxWidth}x${totalHeight}`);

  // Create a composite image
  let currentY = 0;
  const compositeInputs: sharp.OverlayOptions[] = buffers.map((buf, i) => {
    const y = currentY;
    currentY += pageMetadata[i].height;
    return {
      input: buf,
      top: y,
      left: 0,
    };
  });

  // Create blank canvas and composite all images
  const result = await sharp({
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

  console.log(`${prefix} Stitched image size: ${formatBytes(result.length)}`);

  return result;
}

/**
 * Helper to sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if an error is a transient conversion error that may succeed on retry
 */
function isTransientConversionError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    // write EOF, EPIPE, and similar stream errors are often transient
    return (
      message.includes('eof') ||
      message.includes('epipe') ||
      message.includes('broken pipe') ||
      message.includes('stream') ||
      (error as NodeJS.ErrnoException).code === 'EOF' ||
      (error as NodeJS.ErrnoException).code === 'EPIPE'
    );
  }
  return false;
}

/**
 * Convert a PDF to a single image by rendering all pages and stitching them vertically.
 * Includes retry logic for transient failures (e.g., write EOF errors).
 *
 * @param buffer - PDF buffer
 * @param options - Optional configuration including DPI and dimensions
 * @returns Image buffer (PNG format)
 */
export async function convertPdfToImage(
  buffer: Buffer,
  options?: {
    logPrefix?: string;
    density?: number;
    width?: number;
    height?: number;
  }
): Promise<Buffer> {
  const prefix = options?.logPrefix ?? '[ImageUtils]';
  const density = options?.density ?? 200; // DPI
  const width = options?.width ?? 1700; // Approximately A4 width at 200 DPI
  const height = options?.height ?? 2200; // Approximately A4 height at 200 DPI

  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 1000;

  console.log(`${prefix} Converting PDF to image (${formatBytes(buffer.length)})`);

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const converterOptions = {
        density,
        format: 'png' as const,
        width,
        height,
        preserveAspectRatio: true,
      };

      const converter = fromBuffer(buffer, converterOptions);

      // Get all pages using bulk conversion
      const pages = await converter.bulk(-1, { responseType: 'buffer' });

      if (!pages || pages.length === 0) {
        throw new Error('Failed to convert PDF: no pages generated');
      }

      console.log(`${prefix} PDF has ${pages.length} page(s)`);

      if (pages.length === 1) {
        // Single page - just return it
        const page = pages[0];
        if (!page.buffer) {
          throw new Error('Failed to convert PDF: page buffer is empty');
        }
        return page.buffer;
      }

      // Multiple pages - extract buffers and stitch
      const pageBuffers: Buffer[] = [];
      for (const page of pages) {
        if (!page.buffer) {
          throw new Error('Failed to convert PDF: page buffer is empty');
        }
        pageBuffers.push(page.buffer);
      }

      return await stitchImagesVertically(pageBuffers, { logPrefix: prefix });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const isTransient = isTransientConversionError(error);
      const errorCode = (error as NodeJS.ErrnoException).code;
      const errorMessage = lastError.message;

      console.error(
        `${prefix} PDF conversion failed (attempt ${attempt}/${MAX_RETRIES}): ` +
          `${errorMessage}${errorCode ? ` [code: ${errorCode}]` : ''}`
      );

      // Only retry for transient errors
      if (isTransient && attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * attempt; // Exponential backoff
        console.log(`${prefix} Retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      // Non-transient error or max retries reached - break out
      break;
    }
  }

  // All retries exhausted or non-transient error
  const errorCode = (lastError as NodeJS.ErrnoException)?.code;
  let diagnosticMessage = `PDF conversion failed after ${MAX_RETRIES} attempts: ${lastError?.message}`;

  // Add diagnostic hints based on error type
  if (errorCode === 'EOF' || lastError?.message.includes('EOF')) {
    diagnosticMessage +=
      '. This may indicate GraphicsMagick/ImageMagick is not installed or crashed during conversion. ' +
      'Ensure GraphicsMagick is installed and the PDF is not corrupted.';
  }

  throw new Error(diagnosticMessage);
}
