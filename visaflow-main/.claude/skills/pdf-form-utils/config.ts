/**
 * Centralized configuration for PDF form pipeline skills.
 * Single source of truth for paths, limits, defaults, and canonical fields.
 */

// =============================================================================
// Directory Paths
// =============================================================================

/**
 * Standard file paths used throughout the pipeline.
 * All paths are relative to the project root.
 */
export const PATHS = {
  /** Base directory for form templates (TypeScript) */
  templates: "frontend/src/templates",

  /** Generated JSON templates for database seeding */
  generatedTemplates: "frontend/src/templates/_generated",

  /** Analysis JSON output from analyze-pdf-form */
  analysis: "frontend/src/templates/_analysis",

  /** Source PDF forms */
  pdfForms: "backend/assets/forms",

  /** Pipeline checkpoint files */
  checkpoints: ".claude/checkpoints",

  /** Validation results */
  validation: "frontend/src/templates/_analysis",
} as const;

// =============================================================================
// Pipeline Limits
// =============================================================================

/**
 * Configurable limits for the pipeline.
 */
export const LIMITS = {
  /** Maximum refinement iterations before giving up */
  maxRefinementIterations: 3,

  /** Maximum fields per step (warning threshold) */
  maxFieldsPerStep: 20,

  /** Minimum coverage percentage to pass validation (warning) */
  minCoveragePercent: 90,

  /** Maximum file size for PDF analysis (MB) */
  maxPdfSizeMb: 50,
} as const;

// =============================================================================
// Default Values
// =============================================================================

/**
 * Default values for template generation.
 */
export const DEFAULTS = {
  /** Default field width */
  fieldWidth: "1-2" as const,

  /** Default textarea rows */
  textareaRows: 4,

  /** Default step required status */
  stepRequired: false,

  /** Default organizationId for templates (null = global) */
  organizationId: null as null,
} as const;

// =============================================================================
// File Naming Helpers
// =============================================================================

/**
 * Generate standard file paths for a form.
 *
 * @param formId - The form identifier (e.g., "i-765")
 * @returns Object with all standard file paths for this form
 *
 * @example
 * const paths = getFormPaths("i-765");
 * // paths.template = "frontend/src/templates/i-765.ts"
 * // paths.generatedJson = "frontend/src/templates/_generated/i-765.json"
 * // paths.analysisJson = "frontend/src/templates/_analysis/i-765.json"
 */
export function getFormPaths(formId: string) {
  return {
    /** TypeScript template file */
    template: `${PATHS.templates}/${formId}.ts`,
    /** Generated JSON for database seeding */
    generatedJson: `${PATHS.generatedTemplates}/${formId}.json`,
    /** Analysis JSON from analyze-pdf-form */
    analysisJson: `${PATHS.analysis}/${formId}.json`,
    /** Validation result JSON */
    validationJson: `${PATHS.analysis}/${formId}-validation.json`,
    /** Pipeline checkpoint markdown */
    checkpoint: `${PATHS.checkpoints}/${formId}-pipeline.md`,
    /** Processing checkpoint (for analyze-pdf-form) */
    processingCheckpoint: `${PATHS.analysis}/processing-${formId}.md`,
    /** Source PDF file */
    sourcePdf: `${PATHS.pdfForms}/${formId}.pdf`,
  };
}

// =============================================================================
// Canonical Fields
// =============================================================================

/**
 * Valid canonical field keys from shared/src/canonicalFields.ts
 *
 * This is the authoritative list for the pipeline. All autofill mappings
 * must reference one of these keys.
 *
 * Categories:
 * - Personal Info: first_name, last_name, middle_name, date_of_birth, place_of_birth, nationality, gender
 * - Passport: passport_number, passport_issue_date, passport_expiry_date, passport_issuing_country
 * - Visa: visa_number, visa_type, visa_issue_date, visa_expiry_date
 * - I-94: i94_number, i94_admission_date, i94_class_of_admission, i94_admit_until_date
 * - Marriage: marriage_date, marriage_place, spouse_first_name, spouse_last_name
 * - Employment/Education: current_employer, current_job_title, education_degree, education_institution
 */
export const VALID_CANONICAL_FIELDS = [
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
  // Marriage
  "marriage_date",
  "marriage_place",
  "spouse_first_name",
  "spouse_last_name",
  // Employment/Education
  "current_employer",
  "current_job_title",
  "education_degree",
  "education_institution",
] as const;

/**
 * Type for canonical field keys.
 */
export type CanonicalFieldKey = (typeof VALID_CANONICAL_FIELDS)[number];

/**
 * Set of valid canonical fields for efficient lookup.
 */
export const VALID_CANONICAL_FIELDS_SET = new Set<string>(VALID_CANONICAL_FIELDS);

/**
 * Check if a string is a valid canonical field key.
 */
export function isValidCanonicalField(field: string): field is CanonicalFieldKey {
  return VALID_CANONICAL_FIELDS_SET.has(field);
}
