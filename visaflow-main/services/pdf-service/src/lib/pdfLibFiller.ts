import {
  PDFDocument,
  PDFTextField,
  PDFCheckBox,
  PDFRadioGroup,
  PDFDropdown,
} from "pdf-lib";
import type { FillStats, PdfFieldInfo, PdfFieldType } from "../types.js";

/**
 * Fill a PDF document using pdf-lib (for AcroForm PDFs).
 * Returns the filled PDF as a Buffer.
 */
export async function fillWithPdfLib(
  pdfBuffer: Buffer,
  fields: Record<string, string | boolean>,
  options?: { flatten?: boolean }
): Promise<{ pdfBuffer: Buffer; stats: FillStats }> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, {
    ignoreEncryption: true,
  });

  // getForm() can throw on malformed AcroForm dictionaries
  let form;
  try {
    form = pdfDoc.getForm();
  } catch (formError) {
    console.error(
      "[fillWithPdfLib] Failed to get form:",
      formError instanceof Error ? formError.message : String(formError)
    );
    // Return the original PDF unchanged with an error
    return {
      pdfBuffer: Buffer.from(await pdfDoc.save()),
      stats: {
        filledCount: 0,
        skippedCount: Object.keys(fields).length,
        errors: [
          `Could not access PDF form: ${formError instanceof Error ? formError.message : String(formError)}`,
        ],
      },
    };
  }

  const errors: string[] = [];
  let filledCount = 0;
  let skippedCount = 0;

  for (const [fieldName, value] of Object.entries(fields)) {
    try {
      const field = form.getField(fieldName);

      if (field instanceof PDFTextField) {
        if (typeof value === "string") {
          field.setText(value);
          filledCount++;
        } else {
          field.setText(String(value));
          filledCount++;
        }
      } else if (field instanceof PDFCheckBox) {
        if (typeof value === "boolean") {
          if (value) {
            field.check();
          } else {
            field.uncheck();
          }
          filledCount++;
        } else if (typeof value === "string") {
          const isChecked =
            value.toLowerCase() === "true" ||
            value === "1" ||
            value.toLowerCase() === "yes" ||
            value.toLowerCase() === "on" ||
            value.toLowerCase() === "checked";
          if (isChecked) {
            field.check();
          } else {
            field.uncheck();
          }
          filledCount++;
        }
      } else if (field instanceof PDFRadioGroup) {
        if (typeof value === "string") {
          try {
            field.select(value);
            filledCount++;
          } catch (selectError) {
            // Try to find the option by partial match
            const options = field.getOptions();
            const matchingOption = options.find(
              (opt) =>
                opt.toLowerCase() === value.toLowerCase() ||
                opt.includes(value) ||
                value.includes(opt)
            );
            if (matchingOption) {
              field.select(matchingOption);
              filledCount++;
            } else {
              errors.push(
                `Radio field "${fieldName}" has no option matching "${value}". Available: ${options.join(", ")}`
              );
              skippedCount++;
            }
          }
        }
      } else if (field instanceof PDFDropdown) {
        if (typeof value === "string") {
          try {
            field.select(value);
            filledCount++;
          } catch (selectError) {
            // Try to find option by partial match
            const options = field.getOptions();
            const matchingOption = options.find(
              (opt) =>
                opt.toLowerCase() === value.toLowerCase() ||
                opt.includes(value) ||
                value.includes(opt)
            );
            if (matchingOption) {
              field.select(matchingOption);
              filledCount++;
            } else {
              // Some dropdowns allow custom values
              try {
                field.addOptions([value]);
                field.select(value);
                filledCount++;
              } catch {
                errors.push(
                  `Dropdown field "${fieldName}" has no option matching "${value}". Available: ${options.join(", ")}`
                );
                skippedCount++;
              }
            }
          }
        }
      } else {
        // Unknown field type - try to set as text
        skippedCount++;
        errors.push(
          `Field "${fieldName}" is of unsupported type: ${field.constructor.name}`
        );
      }
    } catch (error) {
      // Field not found or other error
      const errorMsg =
        error instanceof Error ? error.message : String(error);
      if (errorMsg.includes("No field named")) {
        skippedCount++;
        // Don't add to errors - missing fields are common and expected
      } else {
        errors.push(`Error filling field "${fieldName}": ${errorMsg}`);
        skippedCount++;
      }
    }
  }

  // Flatten if requested
  if (options?.flatten) {
    form.flatten();
  }

  // Try to save the PDF - may fail on corrupted PDFs
  let filledPdfBytes: Uint8Array;
  try {
    filledPdfBytes = await pdfDoc.save();
  } catch (saveError) {
    // If normal save fails, try with useObjectStreams: false which skips some validation
    console.warn(
      "[fillWithPdfLib] Normal save failed, trying with useObjectStreams: false:",
      saveError instanceof Error ? saveError.message : String(saveError)
    );

    try {
      filledPdfBytes = await pdfDoc.save({ useObjectStreams: false });
    } catch (fallbackError) {
      // If that also fails, the PDF is too corrupted
      console.error(
        "[fillWithPdfLib] Fallback save also failed:",
        fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
      );
      throw new Error(
        `Failed to save PDF: ${saveError instanceof Error ? saveError.message : String(saveError)}`
      );
    }
  }

  return {
    pdfBuffer: Buffer.from(filledPdfBytes),
    stats: {
      filledCount,
      skippedCount,
      errors,
    },
  };
}

/**
 * Inspect a PDF document and list all form fields.
 */
export async function inspectPdf(pdfBuffer: Buffer): Promise<PdfFieldInfo[]> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, {
    ignoreEncryption: true,
  });

  const form = pdfDoc.getForm();

  // getFields() can throw on malformed PDFs
  let fields;
  try {
    fields = form.getFields();
  } catch (error) {
    console.warn(
      "[inspectPdf] Could not enumerate fields:",
      error instanceof Error ? error.message : String(error)
    );
    return [];
  }

  return fields.map((field) => {
    const name = field.getName();
    let type: PdfFieldType = "text";
    let value: string | undefined;
    let options: string[] | undefined;

    if (field instanceof PDFTextField) {
      type = "text";
      value = field.getText() ?? undefined;
    } else if (field instanceof PDFCheckBox) {
      type = "checkbox";
      value = field.isChecked() ? "checked" : "unchecked";
    } else if (field instanceof PDFRadioGroup) {
      type = "radio";
      value = field.getSelected() ?? undefined;
      options = field.getOptions();
    } else if (field instanceof PDFDropdown) {
      type = "dropdown";
      const selected = field.getSelected();
      value = selected.length > 0 ? selected[0] : undefined;
      options = field.getOptions();
    }

    return { name, type, value, options };
  });
}
