/**
 * Schema definitions and validation for skill inputs/outputs.
 * Ensures data integrity between pipeline phases.
 */

import type { StepConfig, FieldConfig, ConditionalRule } from "./types";
import { VALID_CANONICAL_FIELDS_SET, LIMITS } from "./config";

// =============================================================================
// Analysis JSON Types (Output of analyze-pdf-form)
// =============================================================================

/**
 * Form metadata extracted from PDF.
 */
export interface AnalysisFormInfo {
  /** Form identifier (e.g., "i-765") */
  id: string;
  /** Official form number (e.g., "I-765") */
  formNumber: string;
  /** Form title */
  title: string;
  /** Revision date */
  revision: string;
  /** Total number of pages */
  totalPages: number;
  /** OMB control number (optional) */
  ombNumber?: string;
  /** Form expiration date (optional) */
  expires?: string;
}

/**
 * Mapping from item number to PDF field name.
 */
export interface AnalysisFieldMapping {
  /** Item number on the form (e.g., "1.a") */
  itemNumber: string;
  /** Label text for the field */
  fieldLabel: string;
  /** Internal PDF field name */
  pdfFieldName: string;
  /** PDF field type (Tx, Btn, Ch, etc.) */
  fieldType: string;
}

/**
 * Conditional display logic found in the form.
 */
export interface AnalysisConditional {
  /** Unique identifier for this conditional */
  id: string;
  /** Location description (e.g., "Part 2, after Item 3") */
  location: string;
  /** Original text from the form */
  originalText: string;
  /** Field name that triggers the condition */
  triggerField: string;
  /** Item number of the trigger field */
  triggerItemNumber: string;
  /** Comparison operator */
  triggerOperator: "equals" | "notEquals" | "isEmpty" | "isNotEmpty";
  /** Value to compare against (optional) */
  triggerValue?: string | boolean;
  /** Item numbers affected by this condition */
  affectedItems: string[];
  /** Action to take when condition is true */
  action: "show" | "hide";
}

/**
 * A field within a section.
 */
export interface AnalysisField {
  /** Item number on the form */
  itemNumber: string;
  /** Field name (camelCase) */
  name: string;
  /** Field type (text, checkbox, radio, select, date, etc.) */
  type: string;
  /** Display label */
  label: string;
  /** Width hint (1-1, 1-2, 1-3, 1-4) */
  width?: string;
  /** Help text */
  helpText?: string;
  /** Options for select/radio/checkbox */
  options?: Array<{ value: string; label: string }>;
  /** Suggested canonical field for autofill */
  autofillKey?: string;
}

/**
 * A section of the form (Part, Subpart, etc.).
 */
export interface AnalysisSection {
  /** Section identifier (e.g., "part-1") */
  id: string;
  /** Section title */
  title: string;
  /** Item range description (e.g., "Items 1-10") */
  itemRange?: string;
  /** First page of this section */
  pageStart?: number;
  /** Fields in this section */
  fields?: AnalysisField[];
  /** Nested subsections */
  subsections?: AnalysisSection[];
}

/**
 * Complete analysis JSON structure (output of analyze-pdf-form).
 */
export interface AnalysisJSON {
  /** Form metadata */
  formInfo: AnalysisFormInfo;
  /** Form structure */
  structure: {
    sections: AnalysisSection[];
  };
  /** Conditional logic rules */
  conditionals?: AnalysisConditional[];
  /** PDF field name mappings */
  pdfFieldMappings?: AnalysisFieldMapping[];
  /** Analysis metadata */
  metadata?: {
    analyzedAt: string;
    pdfInfo: {
      hasFormFields: boolean;
      totalFields: number;
      fieldNamePattern?: string;
    };
  };
}

// =============================================================================
// Validation Result Types
// =============================================================================

/**
 * Result of schema validation.
 */
export interface SchemaValidationResult {
  /** Whether validation passed (no errors) */
  isValid: boolean;
  /** Error-level issues that must be fixed */
  errors: string[];
  /** Warning-level issues that should be reviewed */
  warnings: string[];
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validate analysis JSON structure before passing to generate phase.
 *
 * @param data - The parsed JSON data to validate
 * @returns Validation result with errors and warnings
 *
 * @example
 * const result = validateAnalysisJSON(parsedJson);
 * if (!result.isValid) {
 *   console.error("Cannot proceed:", result.errors);
 * }
 */
export function validateAnalysisJSON(data: unknown): SchemaValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if data is an object
  if (!data || typeof data !== "object") {
    return {
      isValid: false,
      errors: ["Analysis data is not an object"],
      warnings,
    };
  }

  const analysis = data as Record<string, unknown>;

  // ============================================
  // Required: formInfo
  // ============================================
  if (!analysis.formInfo) {
    errors.push("Missing required field: formInfo");
  } else {
    const info = analysis.formInfo as Record<string, unknown>;
    if (!info.id) errors.push("Missing formInfo.id");
    if (!info.formNumber) errors.push("Missing formInfo.formNumber");
    if (!info.title) errors.push("Missing formInfo.title");
    if (!info.revision) warnings.push("Missing formInfo.revision - will use default");
    if (typeof info.totalPages !== "number") {
      warnings.push("Missing or invalid formInfo.totalPages");
    }
  }

  // ============================================
  // Required: structure
  // ============================================
  if (!analysis.structure) {
    errors.push("Missing required field: structure");
  } else {
    const structure = analysis.structure as Record<string, unknown>;
    if (!Array.isArray(structure.sections)) {
      errors.push("structure.sections must be an array");
    } else if (structure.sections.length === 0) {
      warnings.push("structure.sections is empty - no form sections found");
    } else {
      // Validate each section has required fields
      const sections = structure.sections as Array<Record<string, unknown>>;
      sections.forEach((section, index) => {
        if (!section.id) {
          errors.push(`Section ${index}: missing id`);
        }
        if (!section.title) {
          warnings.push(`Section ${index}: missing title`);
        }
      });
    }
  }

  // ============================================
  // Optional but important: pdfFieldMappings
  // ============================================
  if (!analysis.pdfFieldMappings) {
    warnings.push(
      "No pdfFieldMappings found - PDF field sync will not work without manual mapping"
    );
  } else if (!Array.isArray(analysis.pdfFieldMappings)) {
    errors.push("pdfFieldMappings must be an array");
  } else if (analysis.pdfFieldMappings.length === 0) {
    warnings.push("pdfFieldMappings is empty - no PDF fields were mapped");
  }

  // ============================================
  // Optional: conditionals
  // ============================================
  if (!analysis.conditionals) {
    warnings.push(
      "No conditionals found - conditional field logic may need manual review"
    );
  } else if (!Array.isArray(analysis.conditionals)) {
    errors.push("conditionals must be an array");
  }

  // ============================================
  // Optional: metadata
  // ============================================
  if (analysis.metadata) {
    const meta = analysis.metadata as Record<string, unknown>;
    if (meta.pdfInfo) {
      const pdfInfo = meta.pdfInfo as Record<string, unknown>;
      if (pdfInfo.hasFormFields === false) {
        warnings.push(
          "PDF appears to have no fillable fields - analysis may be incomplete"
        );
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate FormTemplate structure before passing to validate/seed phases.
 *
 * @param template - The template object to validate
 * @returns Validation result with errors and warnings
 *
 * @example
 * const result = validateFormTemplateSchema(template);
 * if (!result.isValid) {
 *   console.error("Template has structural issues:", result.errors);
 * }
 */
export function validateFormTemplateSchema(
  template: unknown
): SchemaValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if template is an object
  if (!template || typeof template !== "object") {
    return {
      isValid: false,
      errors: ["Template is not an object"],
      warnings,
    };
  }

  const t = template as Record<string, unknown>;

  // ============================================
  // Required top-level fields
  // ============================================
  if (!t.id || typeof t.id !== "string") {
    errors.push("Missing or invalid: id (must be a string)");
  }
  if (!t.title || typeof t.title !== "string") {
    errors.push("Missing or invalid: title (must be a string)");
  }
  if (!t.formNumber || typeof t.formNumber !== "string") {
    errors.push("Missing or invalid: formNumber (must be a string)");
  }
  if (!t.revision || typeof t.revision !== "string") {
    errors.push("Missing or invalid: revision (must be a string)");
  }
  if (!Array.isArray(t.steps)) {
    errors.push("Missing or invalid: steps (must be an array)");
  }
  if (!t.pdfFieldMappings || typeof t.pdfFieldMappings !== "object") {
    errors.push("Missing or invalid: pdfFieldMappings (must be an object)");
  }
  if (!t.autofillMappings || typeof t.autofillMappings !== "object") {
    errors.push("Missing or invalid: autofillMappings (must be an object)");
  }

  // ============================================
  // Validate steps structure
  // ============================================
  if (Array.isArray(t.steps)) {
    if (t.steps.length === 0) {
      warnings.push("Template has no steps");
    }

    t.steps.forEach((step, index) => {
      const s = step as Record<string, unknown>;

      if (!s.id) {
        errors.push(`Step ${index}: missing id`);
      }
      if (!s.title) {
        errors.push(`Step ${index}: missing title`);
      }
      if (!Array.isArray(s.fields)) {
        errors.push(`Step ${index}: fields must be an array`);
      } else {
        // Check field count warning
        if (s.fields.length > LIMITS.maxFieldsPerStep) {
          warnings.push(
            `Step "${s.title || index}" has ${s.fields.length} fields ` +
              `(recommended max: ${LIMITS.maxFieldsPerStep})`
          );
        }

        // Validate each field has required properties
        s.fields.forEach((field, fieldIndex) => {
          const f = field as Record<string, unknown>;
          if (!f.name) {
            errors.push(`Step ${index}, field ${fieldIndex}: missing name`);
          }
          if (!f.type) {
            errors.push(`Step ${index}, field ${fieldIndex}: missing type`);
          }
        });
      }
    });
  }

  // ============================================
  // Validate autofill mappings use valid canonical fields
  // ============================================
  if (t.autofillMappings && typeof t.autofillMappings === "object") {
    const mappings = t.autofillMappings as Record<string, string>;
    for (const [formField, canonicalField] of Object.entries(mappings)) {
      if (!VALID_CANONICAL_FIELDS_SET.has(canonicalField)) {
        errors.push(
          `Invalid canonical field "${canonicalField}" in autofillMappings for "${formField}". ` +
            `Must be one of the valid canonical field keys.`
        );
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate that all conditional rules reference existing fields.
 *
 * @param steps - Array of step configurations to validate
 * @returns Array of broken references (field and the invalid reference)
 *
 * @example
 * const brokenRefs = validateConditionalReferences(template.steps);
 * if (brokenRefs.length > 0) {
 *   console.error("Fields with broken conditionals:", brokenRefs);
 * }
 */
export function validateConditionalReferences(
  steps: StepConfig[]
): Array<{ field: string; referencedField: string }> {
  // Collect all field names
  const allFieldNames = new Set<string>();
  for (const step of steps) {
    for (const field of step.fields) {
      allFieldNames.add(field.name);
    }
  }

  // Find broken references
  const brokenReferences: Array<{ field: string; referencedField: string }> = [];

  for (const step of steps) {
    for (const field of step.fields) {
      if (field.showWhen && field.showWhen.length > 0) {
        for (const rule of field.showWhen as ConditionalRule[]) {
          if (!allFieldNames.has(rule.field)) {
            brokenReferences.push({
              field: field.name,
              referencedField: rule.field,
            });
          }
        }
      }
    }
  }

  return brokenReferences;
}

/**
 * Quick check if an object looks like a valid analysis JSON.
 * Does not perform deep validation, just checks top-level structure.
 *
 * @param data - Object to check
 * @returns True if it looks like analysis JSON
 */
export function isAnalysisJSON(data: unknown): data is AnalysisJSON {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.formInfo === "object" &&
    typeof obj.structure === "object" &&
    obj.structure !== null &&
    Array.isArray((obj.structure as Record<string, unknown>).sections)
  );
}
