import type { ExtractedField } from "~/hooks/usePendingDocuments";

/**
 * Maps canonical field names from Textract extraction to form field names.
 * Only includes fields that are used in the client creation form.
 */
const CANONICAL_TO_FORM_FIELD: Record<string, string> = {
  first_name: "firstName",
  last_name: "lastName",
  // email is not typically extracted from documents
  // Add more mappings as the form expands
};

/**
 * Maps extracted field values to form data.
 * Takes the first value for each field (could be enhanced to use confidence scores).
 */
export function mapExtractedValuesToFormData(
  fieldValues: ExtractedField[]
): Record<string, string> {
  const formData: Record<string, string> = {};

  for (const field of fieldValues) {
    const formFieldName = CANONICAL_TO_FORM_FIELD[field.canonicalField];
    if (formFieldName && !formData[formFieldName]) {
      // Take first value for each field
      // Could later implement confidence-based selection
      formData[formFieldName] = field.rawValue;
    }
  }

  return formData;
}

/**
 * Merges multiple extracted field arrays (from multiple documents) into one.
 * Deduplicates by canonical field, keeping the first occurrence.
 */
export function mergeExtractedFields(
  fieldArrays: ExtractedField[][]
): ExtractedField[] {
  const seen = new Set<string>();
  const merged: ExtractedField[] = [];

  for (const fields of fieldArrays) {
    for (const field of fields) {
      if (!seen.has(field.canonicalField)) {
        seen.add(field.canonicalField);
        merged.push(field);
      }
    }
  }

  return merged;
}
