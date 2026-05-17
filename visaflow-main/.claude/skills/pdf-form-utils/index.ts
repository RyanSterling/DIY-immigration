/**
 * PDF Form Utilities - Main Export
 *
 * Re-exports all utilities for PDF form field naming, type inference,
 * validation, configuration, and type definitions.
 *
 * Modules:
 * - config.ts: Centralized configuration (paths, limits, defaults, canonical fields)
 * - schema.ts: Schema validation for skill boundaries
 * - naming.ts: Field naming and canonical field mapping
 * - field-types.ts: Type and width inference from PDF fields
 * - validation-rules.ts: FormTemplate validation rules
 * - types.ts: Shared type definitions
 */

// =============================================================================
// Configuration (config.ts)
// =============================================================================

export {
  PATHS,
  LIMITS,
  DEFAULTS,
  getFormPaths,
  VALID_CANONICAL_FIELDS,
  VALID_CANONICAL_FIELDS_SET,
  isValidCanonicalField,
  type CanonicalFieldKey,
} from "./config";

// =============================================================================
// Schema Validation (schema.ts)
// =============================================================================

export type {
  AnalysisFormInfo,
  AnalysisFieldMapping,
  AnalysisConditional,
  AnalysisField,
  AnalysisSection,
  AnalysisJSON,
  SchemaValidationResult,
} from "./schema";

export {
  validateAnalysisJSON,
  validateFormTemplateSchema,
  validateConditionalReferences,
  isAnalysisJSON,
} from "./schema";

// =============================================================================
// Naming Utilities (naming.ts)
// =============================================================================

export {
  CANONICAL_FIELD_KEYS,
  type CanonicalFieldKey as CanonicalFieldKeyFromNaming,
  LABEL_TO_CANONICAL_MAP,
  pdfFieldNameToCamelCase,
  suggestCanonicalField,
  suggestCanonicalFieldsForLabels,
  extractFieldDescription,
} from "./naming";

// =============================================================================
// Field Type Inference (field-types.ts)
// =============================================================================

export type { FieldType, FieldWidth } from "./field-types";
export {
  PDF_TO_FORM_TYPE_MAP,
  inferFieldType,
  inferFieldWidth,
  inferFieldProperties,
} from "./field-types";

// =============================================================================
// Form Template Validation (validation-rules.ts)
// =============================================================================

export type { ValidationIssue, ValidationResult } from "./validation-rules";
export { validateFormTemplate, type FormTemplate } from "./validation-rules";

// =============================================================================
// Type Definitions (types.ts)
// =============================================================================

export type {
  FieldOption,
  FieldType as FieldTypeFromTypes,
  ConditionalRule,
  BaseFieldConfig,
  TextFieldConfig,
  TextareaFieldConfig,
  SelectFieldConfig,
  CheckboxFieldConfig,
  RadioFieldConfig,
  DateFieldConfig,
  FileFieldConfig,
  FieldConfig,
  StepButtonConfig,
  StepConfig,
  FormTemplate as FormTemplateFromTypes,
} from "./types";
