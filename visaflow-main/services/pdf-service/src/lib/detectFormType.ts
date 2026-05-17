import { PDFDocument } from "pdf-lib";
import type { FormTypeInfo } from "../types.js";

/**
 * Detect the form type of a PDF document.
 * Determines whether the PDF uses AcroForm, XFA, or both,
 * and recommends the appropriate engine for filling.
 */
export async function detectFormType(pdfBuffer: Buffer): Promise<FormTypeInfo> {
  // Check for XFA by looking for XFA-related strings in the raw PDF content
  const pdfString = pdfBuffer.toString("latin1");
  const hasXFA =
    pdfString.includes("/XFA") ||
    pdfString.includes("<xdp:xdp") ||
    pdfString.includes("xmlns:xfa");

  // Try to load with pdf-lib and count AcroForm fields
  let hasAcroForm = false;
  let acroFormFieldCount = 0;

  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer, {
      ignoreEncryption: true,
    });

    // Wrap getForm and getFields in try-catch as they can throw on malformed PDFs
    try {
      const form = pdfDoc.getForm();
      const fields = form.getFields();
      acroFormFieldCount = fields.length;
      hasAcroForm = acroFormFieldCount > 0;
    } catch (formError) {
      // Some PDFs have malformed field/form dictionaries (e.g., "Expected instance of PDFDict")
      console.warn(
        "[detectFormType] Could not enumerate fields (may have malformed form structure):",
        formError instanceof Error ? formError.message : String(formError)
      );
      hasAcroForm = false; // Assume no usable AcroForm
    }
  } catch (error) {
    // If pdf-lib can't load it, might be XFA-only
    console.warn(
      "[detectFormType] pdf-lib could not load PDF:",
      error instanceof Error ? error.message : String(error)
    );
  }

  // Determine if XFA-only (no usable AcroForm fields)
  const isXFAOnly = hasXFA && !hasAcroForm;

  // Recommend engine:
  // - Use pdftk for XFA forms (XFA-only or hybrid with XFA taking precedence)
  // - Use pdf-lib for pure AcroForm PDFs
  const recommendedEngine: "pdf-lib" | "pdftk" = hasXFA ? "pdftk" : "pdf-lib";

  return {
    hasXFA,
    hasAcroForm,
    acroFormFieldCount,
    isXFAOnly,
    recommendedEngine,
  };
}
