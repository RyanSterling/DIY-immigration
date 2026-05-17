/**
 * Shared type definitions for PDF form utilities.
 *
 * These types mirror the multi-step-form types from the frontend
 * for use in standalone skill utilities.
 */

// =============================================================================
// Field Types (from multi-step-form)
// =============================================================================

/** Option for select, radio, and checkbox group fields */
export interface FieldOption {
  /** Value stored in form data */
  value: string;
  /** Display label */
  label: string;
  /** Whether the option is disabled */
  disabled?: boolean;
}

/** Supported input field types */
export type FieldType =
  | "text"
  | "email"
  | "phone"
  | "number"
  | "textarea"
  | "select"
  | "checkbox"
  | "radio"
  | "date"
  | "file";

/** Conditional visibility rule */
export interface ConditionalRule {
  /** The field name to watch */
  field: string;
  /** Comparison operator */
  operator: "equals" | "notEquals" | "contains" | "isEmpty" | "isNotEmpty";
  /** Value to compare against (not used for isEmpty/isNotEmpty) */
  value?: string | number | boolean | string[];
}

/** Base field definition */
export interface BaseFieldConfig {
  /** Unique field name (used as form field key) */
  name: string;
  /** Display label */
  label: string;
  /** Field type */
  type: FieldType;
  /** Placeholder text */
  placeholder?: string;
  /** Help text displayed below the field */
  helpText?: string;
  /** Default value */
  defaultValue?: unknown;
  /** Whether field is disabled */
  disabled?: boolean;
  /** Visually hide the label (still accessible to screen readers) */
  hideLabel?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Field width fraction: '1-1' (full), '1-2' (half), '1-3' (third), '1-4' (quarter) */
  width?: "1-1" | "1-2" | "1-3" | "1-4";
  /** Conditional visibility rules (all must be true to show) */
  showWhen?: ConditionalRule[];
}

/** Text/Email/Phone/Number field */
export interface TextFieldConfig extends BaseFieldConfig {
  type: "text" | "email" | "phone" | "number";
}

/** Textarea field */
export interface TextareaFieldConfig extends BaseFieldConfig {
  type: "textarea";
  rows?: number;
}

/** Select dropdown field */
export interface SelectFieldConfig extends BaseFieldConfig {
  type: "select";
  options: FieldOption[];
  /** Allow empty selection */
  allowEmpty?: boolean;
  emptyOptionLabel?: string;
}

/** Checkbox field */
export interface CheckboxFieldConfig extends BaseFieldConfig {
  type: "checkbox";
  /** For checkbox groups */
  options?: FieldOption[];
}

/** Radio field */
export interface RadioFieldConfig extends BaseFieldConfig {
  type: "radio";
  options: FieldOption[];
  /** Display direction */
  direction?: "horizontal" | "vertical";
}

/** Date picker field */
export interface DateFieldConfig extends BaseFieldConfig {
  type: "date";
  minDate?: string;
  maxDate?: string;
}

/** File upload field */
export interface FileFieldConfig extends BaseFieldConfig {
  type: "file";
  accept?: Record<string, string[]>;
  maxSizeMb?: number;
  maxFiles?: number;
}

/** Union of all field configurations */
export type FieldConfig =
  | TextFieldConfig
  | TextareaFieldConfig
  | SelectFieldConfig
  | CheckboxFieldConfig
  | RadioFieldConfig
  | DateFieldConfig
  | FileFieldConfig;

// =============================================================================
// Step Configuration (from multi-step-form)
// =============================================================================

/** Button configuration for step navigation */
export interface StepButtonConfig {
  /** Button text */
  label?: string;
  /** Button variant */
  variant?: "primary" | "secondary" | "outline" | "ghost";
  /** Whether to hide the button */
  hidden?: boolean;
}

/** Single step definition */
export interface StepConfig {
  /** Unique step identifier */
  id: string;
  /** Step title */
  title: string;
  /** Step description (optional) */
  description?: string;
  /** Fields in this step */
  fields: FieldConfig[];
  /** If true, must be completed before navigating past it */
  required?: boolean;
  /** Custom next button config */
  nextButton?: StepButtonConfig;
  /** Custom previous button config */
  prevButton?: StepButtonConfig;
}

// =============================================================================
// Form Template Types
// =============================================================================

/** Complete form template configuration for PDF forms */
export interface FormTemplate {
  /** Unique identifier for the template */
  id: string;
  /** Display title for the form */
  title: string;
  /** USCIS form number (e.g., "I-765") */
  formNumber: string;
  /** Form revision date/version */
  revision: string;
  /** Steps configuration from multi-step-form */
  steps: StepConfig[];
  /** Mapping from form field names to PDF field names */
  pdfFieldMappings: Record<string, string>;
  /** Mapping from form field names to canonical field keys for autofill */
  autofillMappings: Record<string, string>;
}
