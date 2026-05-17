/**
 * Validation rules for checking FormTemplate completeness.
 *
 * This utility validates that a FormTemplate is properly configured
 * with all necessary mappings and references.
 */

import type {
  StepConfig,
  FieldConfig,
  ConditionalRule,
  FormTemplate,
} from "./types";

// Re-export FormTemplate for convenience
export type { FormTemplate };

// =============================================================================
// Types
// =============================================================================

/**
 * Validation issue found during template validation.
 */
export interface ValidationIssue {
  /** Severity of the issue */
  severity: "error" | "warning";
  /** The field name this issue relates to (if applicable) */
  field?: string;
  /** Human-readable description of the issue */
  message: string;
  /** Suggested fix for the issue (if applicable) */
  suggestion?: string;
}

/**
 * Result of validating a FormTemplate.
 */
export interface ValidationResult {
  /** Whether the template passed validation (no errors) */
  isValid: boolean;
  /** List of all validation issues found */
  issues: ValidationIssue[];
  /** Percentage of PDF fields that have mappings (0-100) */
  coverage: number;
}

// =============================================================================
// Known Canonical Fields
// =============================================================================

/**
 * List of valid canonical field keys.
 * These correspond to the standardized field keys from shared/src/canonicalFields.ts
 */
const VALID_CANONICAL_FIELDS = new Set([
  // Personal Info
  "first_name",
  "last_name",
  "middle_name",
  "date_of_birth",
  "place_of_birth",
  "nationality",
  "gender",
  // Passport
  "passport_number",
  "passport_issue_date",
  "passport_expiry_date",
  "passport_issuing_country",
  // Visa
  "visa_number",
  "visa_type",
  "visa_issue_date",
  "visa_expiry_date",
  // I-94
  "i94_number",
  "i94_admission_date",
  "i94_class_of_admission",
  "i94_admit_until_date",
  // Marriage Certificate
  "marriage_date",
  "marriage_place",
  "spouse_first_name",
  "spouse_last_name",
  // Resume/CV
  "current_employer",
  "current_job_title",
  "education_degree",
  "education_institution",
]);

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Extract all field names from the template steps.
 */
function extractFormFieldNames(steps: StepConfig[]): Set<string> {
  const fieldNames = new Set<string>();
  for (const step of steps) {
    for (const field of step.fields) {
      fieldNames.add(field.name);
    }
  }
  return fieldNames;
}

/**
 * Extract all conditional rule field references from the template.
 */
function extractConditionalReferences(steps: StepConfig[]): Map<string, string[]> {
  const references = new Map<string, string[]>();

  for (const step of steps) {
    for (const field of step.fields) {
      if (field.showWhen && field.showWhen.length > 0) {
        const referencedFields = field.showWhen.map((rule: ConditionalRule) => rule.field);
        references.set(field.name, referencedFields);
      }
    }
  }

  return references;
}

/**
 * Check if a field type matches expected patterns for its name.
 */
function checkFieldTypePattern(field: FieldConfig): ValidationIssue | null {
  const name = field.name.toLowerCase();
  const type = field.type;

  // Date fields should use date type
  if (
    (name.includes("date") || name.includes("dob") || name.endsWith("_at")) &&
    type !== "date"
  ) {
    return {
      severity: "warning",
      field: field.name,
      message: `Field "${field.name}" appears to be a date field but uses type "${type}"`,
      suggestion: `Consider using type "date" for better date input handling`,
    };
  }

  // Email fields should use email type
  if (name.includes("email") && type !== "email") {
    return {
      severity: "warning",
      field: field.name,
      message: `Field "${field.name}" appears to be an email field but uses type "${type}"`,
      suggestion: `Consider using type "email" for better validation`,
    };
  }

  // Phone fields should use phone type
  if (
    (name.includes("phone") || name.includes("tel") || name.includes("mobile")) &&
    type !== "phone"
  ) {
    return {
      severity: "warning",
      field: field.name,
      message: `Field "${field.name}" appears to be a phone field but uses type "${type}"`,
      suggestion: `Consider using type "phone" for better phone number handling`,
    };
  }

  return null;
}

// =============================================================================
// Main Validation Function
// =============================================================================

/**
 * Validate a FormTemplate for completeness and correctness.
 *
 * @param template - The FormTemplate to validate
 * @param pdfFieldCount - Total number of fields in the PDF form
 * @returns ValidationResult with issues and coverage percentage
 */
export function validateFormTemplate(
  template: FormTemplate,
  pdfFieldCount: number
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const formFieldNames = extractFormFieldNames(template.steps);
  const conditionalReferences = extractConditionalReferences(template.steps);

  // ==========================================================================
  // 1. Check PDF field coverage (error if missing)
  // ==========================================================================
  const mappedPdfFields = new Set(Object.values(template.pdfFieldMappings));
  const formFieldsWithMappings = new Set(Object.keys(template.pdfFieldMappings));

  // Check for form fields without PDF mappings
  for (const fieldName of formFieldNames) {
    if (!formFieldsWithMappings.has(fieldName)) {
      issues.push({
        severity: "error",
        field: fieldName,
        message: `Form field "${fieldName}" has no PDF field mapping`,
        suggestion: `Add a mapping in pdfFieldMappings: { "${fieldName}": "<pdf_field_name>" }`,
      });
    }
  }

  // Calculate coverage
  const coverage =
    pdfFieldCount > 0 ? (mappedPdfFields.size / pdfFieldCount) * 100 : 0;

  // Warn if coverage is low
  if (coverage < 100 && pdfFieldCount > 0) {
    const unmappedCount = pdfFieldCount - mappedPdfFields.size;
    issues.push({
      severity: "warning",
      message: `Only ${coverage.toFixed(1)}% of PDF fields are mapped (${mappedPdfFields.size}/${pdfFieldCount}). ${unmappedCount} PDF field(s) have no corresponding form field.`,
      suggestion: `Review the PDF to identify unmapped fields and add them to the template`,
    });
  }

  // ==========================================================================
  // 2. Validate autofill mappings use valid canonical fields (error if invalid)
  // ==========================================================================
  for (const [formField, canonicalField] of Object.entries(
    template.autofillMappings
  )) {
    // Check if the canonical field is valid
    if (!VALID_CANONICAL_FIELDS.has(canonicalField)) {
      issues.push({
        severity: "error",
        field: formField,
        message: `Autofill mapping for "${formField}" references invalid canonical field "${canonicalField}"`,
        suggestion: `Use one of the valid canonical fields: ${Array.from(VALID_CANONICAL_FIELDS).slice(0, 5).join(", ")}...`,
      });
    }

    // Check if the form field exists
    if (!formFieldNames.has(formField)) {
      issues.push({
        severity: "error",
        field: formField,
        message: `Autofill mapping references non-existent form field "${formField}"`,
        suggestion: `Either add the field to a step or remove this autofill mapping`,
      });
    }
  }

  // ==========================================================================
  // 3. Check field types match expected patterns (warning if suspicious)
  // ==========================================================================
  for (const step of template.steps) {
    for (const field of step.fields) {
      const typeIssue = checkFieldTypePattern(field);
      if (typeIssue) {
        issues.push(typeIssue);
      }
    }
  }

  // ==========================================================================
  // 4. Validate conditional logic references valid fields (error if broken)
  // ==========================================================================
  for (const [fieldName, referencedFields] of conditionalReferences) {
    for (const referencedField of referencedFields) {
      if (!formFieldNames.has(referencedField)) {
        issues.push({
          severity: "error",
          field: fieldName,
          message: `Field "${fieldName}" has conditional rule referencing non-existent field "${referencedField}"`,
          suggestion: `Either add field "${referencedField}" to the form or fix the conditional rule`,
        });
      }
    }
  }

  // ==========================================================================
  // 5. Check step field counts (warning if > 20 per step)
  // ==========================================================================
  const MAX_FIELDS_PER_STEP = 20;
  for (const step of template.steps) {
    if (step.fields.length > MAX_FIELDS_PER_STEP) {
      issues.push({
        severity: "warning",
        message: `Step "${step.title}" (${step.id}) has ${step.fields.length} fields, which exceeds the recommended maximum of ${MAX_FIELDS_PER_STEP}`,
        suggestion: `Consider breaking this step into multiple smaller steps for better UX`,
      });
    }
  }

  // ==========================================================================
  // Determine overall validity
  // ==========================================================================
  const hasErrors = issues.some((issue) => issue.severity === "error");

  return {
    isValid: !hasErrors,
    issues,
    coverage: Math.round(coverage * 100) / 100, // Round to 2 decimal places
  };
}
