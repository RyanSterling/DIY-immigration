import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, unlink, readFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateFdf } from "./fdfGenerator.js";
import type { FillStats } from "../types.js";

const execFileAsync = promisify(execFile);

/**
 * Check if pdftk is available on the system.
 */
export async function isPdftkAvailable(): Promise<boolean> {
  try {
    await execFileAsync("pdftk", ["--version"]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Drop XFA layer from a PDF to enable AcroForm filling.
 * USCIS forms are hybrid XFA/AcroForm - XFA must be removed first.
 */
export async function dropXfa(pdfBuffer: Buffer): Promise<Buffer> {
  const tempDir = await mkdtemp(join(tmpdir(), "pdf-service-drop-xfa-"));
  const inputPdf = join(tempDir, "input.pdf");
  const outputPdf = join(tempDir, "output.pdf");

  try {
    await writeFile(inputPdf, pdfBuffer);
    console.log(`[dropXfa] Dropping XFA from PDF (${pdfBuffer.length} bytes)`);

    await execFileAsync("pdftk", [inputPdf, "output", outputPdf, "drop_xfa"], {
      timeout: 30000,
    });

    const cleanedPdf = await readFile(outputPdf);
    console.log(`[dropXfa] XFA dropped successfully (${cleanedPdf.length} bytes)`);

    return cleanedPdf;
  } finally {
    try {
      await unlink(inputPdf).catch(() => {});
      await unlink(outputPdf).catch(() => {});
      const { rmdir } = await import("node:fs/promises");
      await rmdir(tempDir).catch(() => {});
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Fill a PDF document using pdftk (for XFA PDFs).
 * pdftk can handle XFA forms that pdf-lib cannot.
 * Returns the filled PDF as a Buffer.
 */
export async function fillWithPdftk(
  pdfBuffer: Buffer,
  fields: Record<string, string | boolean>,
  options?: { flatten?: boolean }
): Promise<{ pdfBuffer: Buffer; stats: FillStats }> {
  // Create a temporary directory for our files
  const tempDir = await mkdtemp(join(tmpdir(), "pdf-service-"));
  const inputPdf = join(tempDir, "input.pdf");
  const fdfFile = join(tempDir, "data.fdf");
  const outputPdf = join(tempDir, "output.pdf");

  const errors: string[] = [];
  let filledCount = 0;
  let skippedCount = 0;

  try {
    // Write input PDF to temp file
    await writeFile(inputPdf, pdfBuffer);
    console.log(`[fillWithPdftk] Wrote input PDF to ${inputPdf} (${pdfBuffer.length} bytes)`);

    // Generate FDF with field data
    const fdfContent = generateFdf(fields);
    // Write FDF as binary to avoid encoding issues
    await writeFile(fdfFile, fdfContent, "binary");
    console.log(`[fillWithPdftk] Wrote FDF to ${fdfFile} (${fdfContent.length} chars, ${Object.keys(fields).length} fields)`);

    // Count fields for stats (we can't know exactly which succeeded with pdftk)
    filledCount = Object.keys(fields).length;

    // Build pdftk command
    const args = ["pdftk", inputPdf, "fill_form", fdfFile, "output", outputPdf];

    if (options?.flatten) {
      args.push("flatten");
    }

    // Execute pdftk
    console.log(`[fillWithPdftk] Executing: ${args.join(" ")}`);
    try {
      const { stdout, stderr } = await execFileAsync(args[0], args.slice(1), {
        timeout: 30000, // 30 second timeout
      });
      if (stdout) console.log(`[fillWithPdftk] stdout: ${stdout}`);
      if (stderr) console.log(`[fillWithPdftk] stderr: ${stderr}`);
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : String(error);
      errors.push(`pdftk error: ${errorMsg}`);

      // If pdftk fails, try without flatten as fallback
      if (options?.flatten) {
        console.warn("[fillWithPdftk] Retrying without flatten...");
        const retryArgs = ["pdftk", inputPdf, "fill_form", fdfFile, "output", outputPdf];
        try {
          await execFileAsync(retryArgs[0], retryArgs.slice(1), {
            timeout: 30000,
          });
          errors.push("Warning: Flatten failed, returning non-flattened PDF");
        } catch (retryError) {
          const retryErrorMsg =
            retryError instanceof Error ? retryError.message : String(retryError);
          throw new Error(`pdftk failed: ${retryErrorMsg}`);
        }
      } else {
        throw new Error(`pdftk failed: ${errorMsg}`);
      }
    }

    // Read the output PDF
    const filledPdfBuffer = await readFile(outputPdf);

    return {
      pdfBuffer: filledPdfBuffer,
      stats: {
        filledCount,
        skippedCount,
        errors,
      },
    };
  } finally {
    // Clean up temp files
    try {
      await unlink(inputPdf).catch(() => {});
      await unlink(fdfFile).catch(() => {});
      await unlink(outputPdf).catch(() => {});
      // Remove temp directory
      const { rmdir } = await import("node:fs/promises");
      await rmdir(tempDir).catch(() => {});
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Dump form field names from a PDF using pdftk.
 * Returns a list of field names.
 */
export async function dumpFieldsWithPdftk(
  pdfBuffer: Buffer
): Promise<string[]> {
  const tempDir = await mkdtemp(join(tmpdir(), "pdf-service-"));
  const inputPdf = join(tempDir, "input.pdf");

  try {
    await writeFile(inputPdf, pdfBuffer);

    const { stdout } = await execFileAsync("pdftk", [
      inputPdf,
      "dump_data_fields",
    ]);

    // Parse the output to extract field names
    const fieldNames: string[] = [];
    const lines = stdout.split("\n");

    for (const line of lines) {
      const match = line.match(/^FieldName:\s*(.+)$/);
      if (match) {
        fieldNames.push(match[1].trim());
      }
    }

    return fieldNames;
  } finally {
    try {
      await unlink(inputPdf).catch(() => {});
      const { rmdir } = await import("node:fs/promises");
      await rmdir(tempDir).catch(() => {});
    } catch {
      // Ignore cleanup errors
    }
  }
}
