import { Hono } from "hono";
import { detectFormType } from "../lib/detectFormType.js";
import { inspectPdf } from "../lib/pdfLibFiller.js";
import { dumpFieldsWithPdftk, isPdftkAvailable } from "../lib/pdftkFiller.js";
import type { InspectRequest, InspectResponse, PdfFieldInfo } from "../types.js";

const inspectRoute = new Hono();

inspectRoute.post("/", async (c) => {
  try {
    const body = await c.req.json<InspectRequest>();

    if (!body.pdf) {
      return c.json({ error: "Missing required field: pdf" }, 400);
    }

    // Decode base64 PDF
    const pdfBuffer = Buffer.from(body.pdf, "base64");

    // Detect form type
    const formType = await detectFormType(pdfBuffer);

    // Choose inspection method based on form type
    let fields: PdfFieldInfo[];

    if (formType.hasXFA && (await isPdftkAvailable())) {
      // Use pdftk for XFA forms - it returns correct hierarchical field names
      console.log("[inspect] Using pdftk for XFA form inspection");
      const fieldNames = await dumpFieldsWithPdftk(pdfBuffer);

      // Convert field names to PdfFieldInfo format
      fields = fieldNames.map((name) => ({
        name,
        type: "text" as const,
        value: undefined,
        options: undefined,
      }));
    } else {
      // Use pdf-lib for AcroForm PDFs
      console.log("[inspect] Using pdf-lib for AcroForm inspection");
      fields = await inspectPdf(pdfBuffer);
    }

    const response: InspectResponse = {
      fields,
      formType,
    };

    return c.json(response);
  } catch (error) {
    console.error("[inspect] Error:", error);
    return c.json(
      {
        error: "Failed to inspect PDF",
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});

export { inspectRoute };
