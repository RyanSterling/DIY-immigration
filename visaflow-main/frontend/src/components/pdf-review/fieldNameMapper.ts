import type { FormTemplateDetail } from "~/hooks/useFormTemplates";
import type { FormFieldValue } from "react-acroform";

/**
 * Mapping between app field names and PDF field names.
 * Supports text, radio, checkbox, and select field types.
 */
export interface FieldMapping {
  appFieldName: string;
  fieldType: string;
  /** For text/select: single PDF field name. For radio/checkbox: map of option value → PDF field name */
  pdfMappings: Record<string, string>;
}

export interface FieldMappings {
  /** All field mappings by app field name */
  byAppField: Map<string, FieldMapping>;
  /** Lookup from PDF field name → { appFieldName, optionValue? } */
  byPdfField: Map<string, { appFieldName: string; optionValue?: string }>;
}

/** PDF form data type (keyed by PDF field name) */
export type PdfFormData = Record<string, FormFieldValue>;

/**
 * Normalize pdfMappings to a flat structure.
 * Handles both flat mappings and nested {"default": {...}} structure.
 */
function normalizePdfMappings(
  pdfMappings: Record<string, unknown>,
  fieldType: string
): Record<string, string> {
  // For radio/checkbox, check if there's a nested "default" object
  if (fieldType === "radio" || fieldType === "checkbox") {
    const defaultValue = pdfMappings["default"];
    if (defaultValue && typeof defaultValue === "object" && !Array.isArray(defaultValue)) {
      // Nested structure: {"default": {"male": "...", "female": "..."}}
      return defaultValue as Record<string, string>;
    }
  }

  // For text-like fields, or flat radio/checkbox mappings
  // Just ensure all values are strings
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(pdfMappings)) {
    if (typeof value === "string") {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Build bidirectional mapping structures from a form template.
 */
export function buildFieldMappings(template: FormTemplateDetail): FieldMappings {
  const byAppField = new Map<string, FieldMapping>();
  const byPdfField = new Map<string, { appFieldName: string; optionValue?: string }>();

  for (const section of template.sections) {
    for (const field of section.fields) {
      if (!field.pdfMappings) continue;

      // Normalize the pdfMappings to handle nested "default" structure
      const normalizedMappings = normalizePdfMappings(field.pdfMappings, field.fieldType);

      const mapping: FieldMapping = {
        appFieldName: field.name,
        fieldType: field.fieldType,
        pdfMappings: normalizedMappings,
      };
      byAppField.set(field.name, mapping);

      // Build reverse lookup
      if (isTextLikeField(field.fieldType)) {
        // Text fields use "default" key or first available
        const pdfFieldName = normalizedMappings["default"] || Object.values(normalizedMappings)[0];
        if (pdfFieldName) {
          byPdfField.set(pdfFieldName, { appFieldName: field.name });
        }
      } else if (field.fieldType === "radio" || field.fieldType === "checkbox") {
        // Radio/checkbox: each option maps to a different PDF field
        for (const [optionValue, pdfFieldName] of Object.entries(normalizedMappings)) {
          byPdfField.set(pdfFieldName, { appFieldName: field.name, optionValue });
        }
      }
    }
  }

  return { byAppField, byPdfField };
}

/**
 * Check if a field type behaves like a text field (single value mapping).
 */
function isTextLikeField(fieldType: string): boolean {
  return ["text", "textarea", "email", "phone", "number", "date", "select"].includes(fieldType);
}

/**
 * Transform app form data to PDF form data (keyed by PDF field names).
 */
export function appDataToPdfData(
  appData: Record<string, unknown>,
  mappings: FieldMappings
): PdfFormData {
  const pdfData: PdfFormData = {};

  for (const [appFieldName, value] of Object.entries(appData)) {
    if (value === undefined || value === null || value === "") continue;

    const mapping = mappings.byAppField.get(appFieldName);
    if (!mapping) continue;

    if (isTextLikeField(mapping.fieldType)) {
      // Text fields: map to PDF field directly
      const pdfFieldName = mapping.pdfMappings["default"] || Object.values(mapping.pdfMappings)[0];
      if (pdfFieldName) {
        pdfData[pdfFieldName] = String(value);
      }
    } else if (mapping.fieldType === "radio") {
      // Radio: set the matching option's PDF field to true, others to false
      const selectedValue = String(value);
      for (const [optionValue, pdfFieldName] of Object.entries(mapping.pdfMappings)) {
        pdfData[pdfFieldName] = optionValue === selectedValue;
      }
    } else if (mapping.fieldType === "checkbox") {
      // Checkbox: array of selected values
      const selectedValues = Array.isArray(value) ? value.map(String) : [String(value)];
      for (const [optionValue, pdfFieldName] of Object.entries(mapping.pdfMappings)) {
        pdfData[pdfFieldName] = selectedValues.includes(optionValue);
      }
    }
  }

  return pdfData;
}

/**
 * Transform a PDF field change back to app field format.
 * Returns { fieldName, value } to update in app state.
 */
export function pdfChangeToAppChange(
  pdfFieldName: string,
  pdfValue: FormFieldValue,
  mappings: FieldMappings,
  currentAppData: Record<string, unknown>
): { fieldName: string; value: unknown } | null {
  const lookup = mappings.byPdfField.get(pdfFieldName);
  if (!lookup) return null;

  const { appFieldName, optionValue } = lookup;
  const mapping = mappings.byAppField.get(appFieldName);
  if (!mapping) return null;

  if (isTextLikeField(mapping.fieldType)) {
    // Text field: direct value
    return { fieldName: appFieldName, value: pdfValue };
  }

  if (mapping.fieldType === "radio") {
    // Radio: if this PDF field is now true, set app value to this option
    if (pdfValue === true && optionValue) {
      return { fieldName: appFieldName, value: optionValue };
    }
    // If set to false, we might need to clear it (but typically another radio will be selected)
    return null;
  }

  if (mapping.fieldType === "checkbox") {
    // Checkbox: toggle the option in the array
    const currentValue = currentAppData[appFieldName];
    const currentArray = Array.isArray(currentValue) ? [...currentValue] : [];

    if (pdfValue === true && optionValue && !currentArray.includes(optionValue)) {
      return { fieldName: appFieldName, value: [...currentArray, optionValue] };
    } else if (pdfValue === false && optionValue) {
      return { fieldName: appFieldName, value: currentArray.filter(v => v !== optionValue) };
    }
    return null;
  }

  return null;
}

/**
 * Log unmapped PDF fields for debugging.
 * Compares PDF fields from document against template mappings.
 */
export function logUnmappedFields(
  pdfFields: Array<{ name: string }>,
  mappings: FieldMappings
): void {
  const unmapped = pdfFields.filter(f => !mappings.byPdfField.has(f.name));
  if (unmapped.length > 0) {
    console.log(
      `[fieldNameMapper] ${unmapped.length} PDF fields not mapped:`,
      unmapped.slice(0, 10).map(f => f.name)
    );
  }
}
