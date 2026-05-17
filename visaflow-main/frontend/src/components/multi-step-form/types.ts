// =============================================================================
// Field Types
// =============================================================================

import type { FieldOption } from "~/atoms/types";

// Re-export for convenience
export type { FieldOption };

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
  /** Callback for "Process All" button - button only shows when provided */
  onProcessAll?: (
    files: import("~/components/forms/types").UploadFile[]
  ) => void;
  /** Whether files are currently being processed - shows loading state on button */
  isProcessing?: boolean;
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
// Step Configuration
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
  /** Help text displayed below the step header */
  helpText?: string;
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
// Form Configuration
// =============================================================================

/** Complete form configuration */
export interface MultiStepFormConfig {
  /** Form identifier */
  id: string;
  /** Form title (optional) */
  title?: string;
  /** Form description (optional) */
  description?: string;
  /** Array of steps */
  steps: StepConfig[];
  /** Save button configuration */
  saveButton?: StepButtonConfig;
  /** Submit button configuration (final step) */
  submitButton?: StepButtonConfig;
}

// =============================================================================
// Form State Types
// =============================================================================

/** Form data as a flat key-value object */
export type FormData = Record<string, unknown>;

/** Form save handler */
export type OnSaveHandler = (
  data: FormData,
  currentStep: number
) => Promise<void>;

/** Form submit handler */
export type OnSubmitHandler = (data: FormData) => Promise<void>;

/** MultiStepForm component props */
export interface MultiStepFormProps {
  /** Form configuration */
  config: MultiStepFormConfig;
  /** Initial form data */
  initialData?: FormData;
  /** Called when user clicks Save */
  onSave: OnSaveHandler;
  /** Called when user completes the final step */
  onSubmit: OnSubmitHandler;
  /** Called when step changes */
  onStepChange?: (stepIndex: number) => void;
  /** Called when form data changes (for dirty state tracking) */
  onChange?: () => void;
  /** URL search param key for storing the current step (default: 'step') */
  stepParamKey?: string;
  /** Set of initially completed step indices */
  initialCompletedSteps?: Set<number>;
  /** Whether form is in loading/saving state */
  isSaving?: boolean;
  /** Custom class name */
  className?: string;
}

// =============================================================================
// PDF Form Template (for USCIS form generation)
// =============================================================================

/**
 * Extended field config with PDF-specific properties.
 * Used in FormTemplate to map fields to PDF form fields and autofill sources.
 */
export interface FormTemplateFieldConfig extends BaseFieldConfig {
  /** The form's item number (e.g., "1.a", "2.b") */
  itemNumber?: string;
}

/**
 * Complete form template for a PDF form.
 * Generated by the PDF analysis pipeline and used to render forms
 * with bidirectional PDF sync capabilities.
 */
export interface FormTemplate {
  /** Unique form identifier (e.g., "i-765") */
  id: string;
  /** Form title (e.g., "Application for Employment Authorization") */
  title: string;
  /** Official form number (e.g., "I-765") */
  formNumber: string;
  /** Form revision date (e.g., "03/20/24") */
  revision: string;
  /** Form steps with fields */
  steps: StepConfig[];
  /**
   * Maps form field names to PDF internal field names.
   * Used for bidirectional sync between HTML form and PDF.
   * Example: { "familyName": "form1[0].Page1[0].Part1[0].Line1a[0]" }
   */
  pdfFieldMappings: Record<string, string>;
  /**
   * Maps form field names to canonical extraction field names.
   * Used for autofilling from extracted client documents.
   * Example: { "familyName": "last_name", "givenName": "first_name" }
   */
  autofillMappings: Record<string, string>;
}
