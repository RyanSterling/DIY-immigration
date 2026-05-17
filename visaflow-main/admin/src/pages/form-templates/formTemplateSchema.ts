import { z } from 'zod';

// =============================================================================
// Field Types
// =============================================================================

export const formFieldTypes = [
  'text',
  'textarea',
  'number',
  'date',
  'select',
  'checkbox',
  'radio',
  'email',
  'phone',
  'file',
] as const;

export const formFieldTypeSchema = z.enum(formFieldTypes);

// =============================================================================
// Autofill Mapping Schema
// =============================================================================

export const autofillMappingSchema = z.object({
  canonicalField: z.string().min(1, 'Canonical field is required'),
  transformationRule: z.string().nullable().optional(),
  fallbackValue: z.string().nullable().optional(),
});

// =============================================================================
// Option Schema (for select, radio, checkbox fields)
// =============================================================================

export const fieldOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
});

// =============================================================================
// ShowWhen Condition Schema (for conditional field visibility)
// =============================================================================

export const showWhenConditionSchema = z.object({
  field: z.string(),
  operator: z.enum(['equals', 'notEquals', 'contains', 'notContains', 'isEmpty', 'isNotEmpty']).optional(),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]).optional(),
});

// =============================================================================
// Form Field Schema
// =============================================================================

export const formFieldSchema = z.object({
  // Identity fields
  id: z.string().optional(), // Present for existing fields from DB
  _tempId: z.string().optional(), // Client-generated UUID for new fields (React key)
  _deleted: z.boolean().optional(), // Marks field for deletion on save

  // Core field properties
  name: z.string().min(1, 'Field name is required'),
  label: z.string().min(1, 'Field label is required'),
  fieldType: formFieldTypeSchema,

  // Display properties
  placeholder: z.string().nullable().optional(),
  helpText: z.string().nullable().optional(),
  defaultValue: z.string().nullable().optional(),
  width: z.string().nullable().optional(),
  className: z.string().nullable().optional(),

  // Boolean flags (default to false)
  isRequired: z.boolean().default(false),
  disabled: z.boolean().default(false),
  hideLabel: z.boolean().default(false),

  // Ordering
  orderIndex: z.coerce.number().int().min(0),

  // Complex nested fields
  options: z.array(fieldOptionSchema).nullable().optional(),
  showWhen: z.array(showWhenConditionSchema).nullable().optional(),
  pdfMappings: z.record(z.string(), z.unknown()).nullable().optional(),
  validationRules: z.record(z.string(), z.unknown()).nullable().optional(),
  fieldConfig: z.record(z.string(), z.unknown()).nullable().optional(),

  // Autofill mapping
  autofillMapping: autofillMappingSchema.nullable().optional(),
});

// =============================================================================
// Form Section Schema
// =============================================================================

export const formSectionSchema = z.object({
  // Identity fields
  id: z.string().optional(), // Present for existing sections from DB
  _tempId: z.string().optional(), // Client-generated UUID for new sections (React key)
  _deleted: z.boolean().optional(), // Marks section for deletion on save

  // Core section properties
  sectionKey: z.string().min(1, 'Section key is required'),
  title: z.string().min(1, 'Section title is required'),
  description: z.string().nullable().optional(),
  helpText: z.string().nullable().optional(),

  // Boolean flags
  isRequired: z.boolean().default(false),

  // Ordering
  orderIndex: z.coerce.number().int().min(0),

  // Complex nested fields
  buttonConfig: z.record(z.string(), z.unknown()).nullable().optional(),

  // Nested fields
  fields: z.array(formFieldSchema),
});

// =============================================================================
// Form Template Schema
// =============================================================================

export const formTemplateSchema = z.object({
  // Template metadata
  formNumber: z.string().min(1, 'Form number is required'),
  title: z.string().min(1, 'Title is required'),
  revision: z.string().nullable().optional(),
  pdfTemplateUrl: z.string().nullable().optional(),
  organizationId: z.string().nullable().optional(),

  // Nested sections
  sections: z.array(formSectionSchema),
});

// =============================================================================
// Inferred TypeScript Types
// =============================================================================

export type FormFieldValues = z.infer<typeof formFieldSchema>;
export type FormSectionValues = z.infer<typeof formSectionSchema>;
export type FormTemplateValues = z.infer<typeof formTemplateSchema>;
export type AutofillMappingValues = z.infer<typeof autofillMappingSchema>;
export type FieldOptionValues = z.infer<typeof fieldOptionSchema>;
export type ShowWhenConditionValues = z.infer<typeof showWhenConditionSchema>;

// =============================================================================
// Default Value Factories
// =============================================================================

/**
 * Create a new field with sensible defaults and a generated _tempId
 */
export const createDefaultField = (orderIndex: number = 0): FormFieldValues => ({
  _tempId: crypto.randomUUID(),
  name: '',
  label: '',
  fieldType: 'text',
  placeholder: null,
  helpText: null,
  defaultValue: null,
  width: null,
  className: null,
  isRequired: false,
  disabled: false,
  hideLabel: false,
  orderIndex,
  options: null,
  showWhen: null,
  pdfMappings: null,
  validationRules: null,
  fieldConfig: null,
  autofillMapping: null,
});

/**
 * Create a new section with sensible defaults, a generated _tempId, and an empty fields array
 */
export const createDefaultSection = (orderIndex: number = 0): FormSectionValues => ({
  _tempId: crypto.randomUUID(),
  sectionKey: '',
  title: '',
  description: null,
  helpText: null,
  isRequired: false,
  orderIndex,
  buttonConfig: null,
  fields: [],
});

/**
 * Create empty template values for creating a new form template
 */
export const createDefaultTemplate = (): FormTemplateValues => ({
  formNumber: '',
  title: '',
  revision: null,
  pdfTemplateUrl: null,
  organizationId: null,
  sections: [],
});
