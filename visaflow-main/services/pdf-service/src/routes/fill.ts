import { Hono } from "hono";
import { detectFormType } from "../lib/detectFormType.js";
import { fillWithPdfLib } from "../lib/pdfLibFiller.js";
import { fillWithPdftk, isPdftkAvailable, dropXfa } from "../lib/pdftkFiller.js";
import type { FillRequest, FillResponse } from "../types.js";

const fillRoute = new Hono();

fillRoute.post("/", async (c) => {
  try {
    const body = await c.req.json<FillRequest>();

    if (!body.pdf) {
      return c.json({ error: "Missing required field: pdf" }, 400);
    }

    if (!body.fields || typeof body.fields !== "object") {
      return c.json({ error: "Missing or invalid field: fields" }, 400);
    }

    // Decode base64 PDF
    const pdfBuffer = Buffer.from(body.pdf, "base64");

    // Detect form type to determine which engine to use
    const formType = await detectFormType(pdfBuffer);
    let engine: "pdf-lib" | "pdftk" = formType.recommendedEngine;
    let result: { pdfBuffer: Buffer; stats: { filledCount: number; skippedCount: number; errors: string[] } };

    const pdftkAvailable = await isPdftkAvailable();

    if (engine === "pdftk") {
      if (pdftkAvailable) {
        console.log("[fill] Using pdftk engine for XFA form");

        // CRITICAL: Drop XFA layer first for hybrid forms
        let bufferToFill: Buffer = pdfBuffer;
        let dropXfaWarning: string | undefined;

        if (formType.hasXFA) {
          console.log("[fill] Dropping XFA layer from hybrid PDF...");
          try {
            bufferToFill = await dropXfa(pdfBuffer) as Buffer;
            console.log("[fill] XFA layer dropped successfully");
          } catch (dropError) {
            console.error("[fill] Failed to drop XFA:", dropError);
            dropXfaWarning = `Warning: Failed to drop XFA layer: ${dropError instanceof Error ? dropError.message : String(dropError)}`;
            // Continue with original buffer
          }
        }

        result = await fillWithPdftk(bufferToFill, body.fields, body.options);
        if (dropXfaWarning) {
          result.stats.errors.push(dropXfaWarning);
        }
      } else {
        // Fall back to pdf-lib if pdftk not available
        console.warn(
          "[fill] pdftk not available, falling back to pdf-lib (may not work for XFA)"
        );
        engine = "pdf-lib";
        try {
          result = await fillWithPdfLib(pdfBuffer, body.fields, body.options);
          result.stats.errors.push(
            "Warning: XFA form detected but pdftk not available. Results may be incomplete."
          );
        } catch (pdfLibError) {
          // pdf-lib failed on XFA form - provide helpful error
          const errorMsg = pdfLibError instanceof Error ? pdfLibError.message : String(pdfLibError);
          throw new Error(
            `XFA form cannot be processed: pdftk is required but not available. ` +
            `Please run the pdf-service in Docker (docker-compose --profile pdf up). ` +
            `Original error: ${errorMsg}`
          );
        }
      }
    } else {
      console.log("[fill] Using pdf-lib engine for AcroForm");
      try {
        result = await fillWithPdfLib(pdfBuffer, body.fields, body.options);
      } catch (pdfLibError) {
        // If pdf-lib fails (e.g., corrupted PDF), try pdftk as fallback
        if (pdftkAvailable) {
          console.warn(
            "[fill] pdf-lib failed, falling back to pdftk:",
            pdfLibError instanceof Error ? pdfLibError.message : String(pdfLibError)
          );
          engine = "pdftk";
          result = await fillWithPdftk(pdfBuffer, body.fields, body.options);
          result.stats.errors.push(
            `Warning: pdf-lib failed (${pdfLibError instanceof Error ? pdfLibError.message : String(pdfLibError)}), used pdftk instead.`
          );
        } else {
          // No fallback available, re-throw
          throw pdfLibError;
        }
      }
    }

    // Encode result as base64
    const filledPdfBase64 = result.pdfBuffer.toString("base64");

    const response: FillResponse = {
      success: true,
      pdf: filledPdfBase64,
      engine,
      stats: result.stats,
    };

    return c.json(response);
  } catch (error) {
    console.error("[fill] Error:", error);
    const response: FillResponse = {
      success: false,
      engine: "pdf-lib",
      stats: {
        filledCount: 0,
        skippedCount: 0,
        errors: [error instanceof Error ? error.message : String(error)],
      },
      error: error instanceof Error ? error.message : String(error),
    };

    return c.json(response, 500);
  }
});

export { fillRoute };
