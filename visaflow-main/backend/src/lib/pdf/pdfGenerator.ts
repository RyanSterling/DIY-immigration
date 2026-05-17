import { generateDownloadUrl, getObject, putObject } from "../s3/index.js";
import { db, schema } from "../../db/index.js";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { env } from "../env.js";

/**
 * PDF field mapping structure.
 * Maps form field values to PDF field names.
 * Format: { "formValue": "pdfFieldName" } for checkboxes/radios
 * or { "default": "pdfFieldName" } for text fields
 */
type PdfMappings = Record<string, string> | null;

interface FormFieldWithMapping {
  id: string;
  name: string;
  fieldType: string;
  pdfMappings: PdfMappings;
}

interface FormResponse {
  fieldName: string;
  value: string | null;
  fieldType: string;
  pdfMappings: PdfMappings;
}

export interface GeneratePdfOptions {
  formInstanceId: string;
  generationType: "draft" | "review" | "final";
  organizationId: string;
  userId: string;
}

export interface GeneratePdfResult {
  pdfId: string;
  pdfUrl: string;
  filePath: string;
  fileName: string;
}

// PDF Service types
interface PdfServiceFillRequest {
  pdf: string; // Base64-encoded PDF
  fields: Record<string, string | boolean>;
  options?: {
    flatten?: boolean;
  };
}

interface PdfServiceFillResponse {
  success: boolean;
  pdf?: string; // Base64-encoded filled PDF
  engine: "pdf-lib" | "pdftk";
  stats: {
    filledCount: number;
    skippedCount: number;
    errors: string[];
  };
  error?: string;
}

/**
 * Call the PDF microservice.
 */
async function callPdfService<T>(
  endpoint: string,
  body: object
): Promise<T> {
  const url = `${env.PDF_SERVICE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Add API key authentication if configured
  if (env.PDF_SERVICE_API_KEY) {
    headers["Authorization"] = `Bearer ${env.PDF_SERVICE_API_KEY}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PDF service error (${response.status}): ${errorText}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Check if a field type is text-like (single value mapping).
 */
function isTextLikeField(fieldType: string): boolean {
  return ["text", "textarea", "email", "phone", "number", "date"].includes(fieldType);
}

/**
 * Parse checkbox values (could be comma-separated string or JSON array).
 */
function parseCheckboxValues(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map(String);
    }
  } catch {
    // Not JSON, treat as comma-separated or single value
  }
  return value.split(",").map((v) => v.trim());
}

/**
 * Build PDF field data from form responses.
 * Translates form field values to PDF field name -> value pairs.
 */
function buildPdfFieldData(
  formResponses: FormResponse[]
): Record<string, string | boolean> {
  const pdfFields: Record<string, string | boolean> = {};

  for (const response of formResponses) {
    if (!response.pdfMappings || response.value === null || response.value === "") {
      continue;
    }

    const fieldType = response.fieldType;

    if (isTextLikeField(fieldType)) {
      // Text fields use "default" mapping or first available
      const pdfFieldName = response.pdfMappings["default"] || Object.values(response.pdfMappings)[0];
      if (pdfFieldName) {
        pdfFields[pdfFieldName] = response.value;
      }
    } else if (fieldType === "radio") {
      // Radio: find the PDF field for the selected value and select it
      const pdfFieldName = response.pdfMappings[response.value];
      if (pdfFieldName) {
        // For radio buttons implemented as checkboxes, check the selected one
        pdfFields[pdfFieldName] = true;
        // Uncheck others in the group
        for (const [optValue, optFieldName] of Object.entries(response.pdfMappings)) {
          if (optValue !== response.value && optFieldName !== pdfFieldName) {
            pdfFields[optFieldName] = false;
          }
        }
      }
    } else if (fieldType === "checkbox") {
      // Checkbox: may have multiple selected values (comma-separated or array)
      const selectedValues = parseCheckboxValues(response.value);
      for (const [optionValue, pdfFieldName] of Object.entries(response.pdfMappings)) {
        const isChecked = selectedValues.includes(optionValue);
        pdfFields[pdfFieldName] = isChecked;
      }
    } else if (fieldType === "select") {
      // Dropdown/select field
      const pdfFieldName = response.pdfMappings["default"] || Object.values(response.pdfMappings)[0];
      if (pdfFieldName) {
        pdfFields[pdfFieldName] = response.value;
      }
    }
  }

  return pdfFields;
}

/**
 * Generate a filled PDF for a form instance.
 *
 * This function:
 * 1. Fetches the form instance and template from the database
 * 2. Downloads the blank PDF template from S3
 * 3. Calls the PDF microservice to fill the form
 * 4. Uploads the filled PDF to S3
 * 5. Creates a database record for tracking
 */
export async function generateFilledPdf(options: GeneratePdfOptions): Promise<GeneratePdfResult> {
  const { formInstanceId, generationType, organizationId, userId } = options;

  // 1. Get the form instance with template info
  const [instance] = await db
    .select({
      instance: schema.formInstances,
      template: schema.formTemplates,
    })
    .from(schema.formInstances)
    .innerJoin(schema.formTemplates, eq(schema.formInstances.formTemplateId, schema.formTemplates.id))
    .where(
      and(
        eq(schema.formInstances.id, formInstanceId),
        eq(schema.formInstances.organizationId, organizationId),
        isNull(schema.formInstances.deletedAt)
      )
    )
    .limit(1);

  if (!instance) {
    throw new Error("Form instance not found");
  }

  if (!instance.template.pdfTemplateUrl) {
    throw new Error("Form template does not have a PDF template URL");
  }

  // 2. Get all form fields with their PDF mappings
  const sections = await db
    .select({ id: schema.formSections.id })
    .from(schema.formSections)
    .where(eq(schema.formSections.formTemplateId, instance.template.id));

  const sectionIds = sections.map((s) => s.id);

  const fieldsRaw =
    sectionIds.length > 0
      ? await db
          .select({
            id: schema.formFields.id,
            name: schema.formFields.name,
            fieldType: schema.formFields.fieldType,
            pdfMappings: schema.formFields.pdfMappings,
          })
          .from(schema.formFields)
          .where(inArray(schema.formFields.formSectionId, sectionIds))
      : [];

  const fields: FormFieldWithMapping[] = fieldsRaw.map((f) => ({
    ...f,
    pdfMappings: f.pdfMappings as PdfMappings,
  }));

  // 3. Get all form responses
  const responses = await db
    .select({
      formFieldId: schema.formResponses.formFieldId,
      value: schema.formResponses.value,
    })
    .from(schema.formResponses)
    .where(eq(schema.formResponses.formInstanceId, formInstanceId));

  // Build field ID to response map
  const responseMap = new Map<string, string | null>();
  for (const response of responses) {
    responseMap.set(response.formFieldId, response.value);
  }

  // Build field data with responses and mappings
  const formResponses: FormResponse[] = fields.map((field) => ({
    fieldName: field.name,
    value: responseMap.get(field.id) ?? null,
    fieldType: field.fieldType,
    pdfMappings: field.pdfMappings,
  }));

  console.log(
    `[generateFilledPdf] Processing ${instance.template.formNumber}: ${formResponses.length} fields, ` +
      `${formResponses.filter((r) => r.value).length} with values`
  );

  // 4. Download the template PDF from S3
  const templatePdfKey = instance.template.pdfTemplateUrl;
  let pdfBytes: Buffer;

  try {
    pdfBytes = await getObject(templatePdfKey);
    console.log(`[generateFilledPdf] Downloaded template PDF: ${pdfBytes.length} bytes`);
  } catch (error) {
    console.error(`[generateFilledPdf] Failed to download template PDF from ${templatePdfKey}:`, error);
    throw new Error(`Failed to download PDF template: ${error instanceof Error ? error.message : String(error)}`);
  }

  // 5. Build PDF field data and call PDF service
  const pdfFields = buildPdfFieldData(formResponses);
  const pdfBase64 = pdfBytes.toString("base64");

  console.log(`[generateFilledPdf] Calling PDF service with ${Object.keys(pdfFields).length} fields`);

  let filledPdfBytes: Buffer;

  try {
    const fillRequest: PdfServiceFillRequest = {
      pdf: pdfBase64,
      fields: pdfFields,
      options: { flatten: generationType === "final" },
    };

    const fillResponse = await callPdfService<PdfServiceFillResponse>("/fill", fillRequest);

    if (!fillResponse.success || !fillResponse.pdf) {
      throw new Error(fillResponse.error || "PDF service returned unsuccessful response");
    }

    console.log(
      `[generateFilledPdf] PDF service result (engine: ${fillResponse.engine}): ` +
        `${fillResponse.stats.filledCount} filled, ${fillResponse.stats.skippedCount} skipped, ` +
        `${fillResponse.stats.errors.length} errors`
    );

    if (fillResponse.stats.errors.length > 0) {
      console.warn(`[generateFilledPdf] PDF service warnings:`, fillResponse.stats.errors);
    }

    filledPdfBytes = Buffer.from(fillResponse.pdf, "base64");
    console.log(`[generateFilledPdf] Received filled PDF: ${filledPdfBytes.length} bytes`);
  } catch (error) {
    console.error(`[generateFilledPdf] PDF service call failed:`, error);
    throw new Error(`Failed to fill PDF: ${error instanceof Error ? error.message : String(error)}`);
  }

  // 6. Generate file path and upload to S3
  const timestamp = Date.now();
  const fileName = `${instance.template.formNumber}_${generationType}_${timestamp}.pdf`;
  const filePath = generateFormPdfKey(organizationId, instance.instance.clientId, formInstanceId, fileName);

  try {
    await putObject(filePath, filledPdfBytes, "application/pdf");
    console.log(`[generateFilledPdf] Uploaded filled PDF to: ${filePath}`);
  } catch (error) {
    console.error(`[generateFilledPdf] Failed to upload filled PDF:`, error);
    throw new Error(`Failed to upload filled PDF: ${error instanceof Error ? error.message : String(error)}`);
  }

  // 7. Create record in database
  const [pdfRecord] = await db
    .insert(schema.formGeneratedPdfs)
    .values({
      organizationId,
      clientId: instance.instance.clientId,
      formInstanceId,
      filePath,
      fileName,
      fileSizeBytes: filledPdfBytes.length,
      pageCount: null,
      generationType,
      isFinal: generationType === "final",
      formDataSnapshot: Object.fromEntries(formResponses.map((r) => [r.fieldName, r.value])),
      generatedBy: userId,
    })
    .returning();

  // 8. Generate download URL
  const pdfUrl = await generateDownloadUrl(filePath);

  console.log(`[generateFilledPdf] Complete. PDF ID: ${pdfRecord.id}`);

  return {
    pdfId: pdfRecord.id,
    pdfUrl,
    filePath,
    fileName,
  };
}

/**
 * Generate S3 key for a generated form PDF
 * Format: {orgId}/forms/{clientId}/{instanceId}/{filename}
 */
export function generateFormPdfKey(
  organizationId: string,
  clientId: string,
  formInstanceId: string,
  filename: string
): string {
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${organizationId}/forms/${clientId}/${formInstanceId}/${sanitizedFilename}`;
}

/**
 * List all PDF field names in a PDF document.
 * Calls the PDF microservice inspect endpoint.
 */
export async function listPdfFields(pdfBytes: Buffer): Promise<
  Array<{
    name: string;
    type: string;
    value: string | undefined;
  }>
> {
  interface InspectResponse {
    fields: Array<{
      name: string;
      type: string;
      value?: string;
      options?: string[];
    }>;
    formType: {
      hasXFA: boolean;
      hasAcroForm: boolean;
      acroFormFieldCount: number;
      isXFAOnly: boolean;
      recommendedEngine: "pdf-lib" | "pdftk";
    };
  }

  const pdfBase64 = pdfBytes.toString("base64");
  const response = await callPdfService<InspectResponse>("/inspect", { pdf: pdfBase64 });

  return response.fields.map((field) => ({
    name: field.name,
    type: field.type,
    value: field.value,
  }));
}
