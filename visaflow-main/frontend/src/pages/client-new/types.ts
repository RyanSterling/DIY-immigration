import type { UploadFile } from "~/components/forms/types";
import type { StepConfig } from "~/components/multi-step-form/types";

// Normalized value structure from backend
export interface NormalizedValue {
  display: string;     // Formatted for display (e.g., "04/09/2003", "Mexico")
  original: string;    // Original extracted text
  iso?: string;        // For dates: ISO format (YYYY-MM-DD)
  code?: string;       // For countries/gender: short code (e.g., "MEX", "M")
}

// Field value with source tracking
export interface ExtractedFieldValue {
  id: string;                          // temporary ID for UI keying
  value: string;                       // Display value (normalized if available, else raw)
  rawValue: string;                    // Original extracted value
  normalizedValue?: NormalizedValue | null;
  valueType: "text" | "date" | "number" | "boolean" | "country";  // Type of the field value
  source: "extraction" | "manual";
  documentId?: string;
  documentType?: string;
  confidenceScore?: number;
}

// Grouped field values by canonical field
export interface FieldValueSelection {
  canonicalField: string;
  values: ExtractedFieldValue[]; // all available values
  selectedValueId: string | null; // which value is selected
  manualValue: string; // if user chose to enter manually
  useManual: boolean; // true if using manualValue instead of selected
  noValueNeeded: boolean; // true if user explicitly wants no value for this field
  hasConflict: boolean; // true when multiple different values exist across documents
}

export interface ClientNewFormData {
  // Step 1: Documents
  documents: UploadFile[];
  uploadedDocumentIds: string[];

  // Step 2: Field selections from extracted data
  fieldSelections: Record<string, FieldValueSelection>;

  // Contact info (always manual entry)
  email: string;
  phone: string;
  address: string;
}

export const STEPS: StepConfig[] = [
  { id: "documents", title: "Document Upload", fields: [] },
  { id: "details", title: "Details Check", fields: [] },
];
