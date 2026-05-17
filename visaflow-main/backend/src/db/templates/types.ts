// Field option for select/radio/checkbox
export interface SeedFieldOption {
  value: string;
  label: string;
  disabled?: boolean;
}

// Conditional display rule
export interface SeedConditionalRule {
  field: string;
  operator: "equals" | "notEquals" | "contains" | "isEmpty" | "isNotEmpty";
  value?: string | number | boolean | string[];
}

// Field configuration
export interface SeedFieldConfig {
  name: string;
  label: string;
  type:
    | "text"
    | "textarea"
    | "number"
    | "date"
    | "select"
    | "checkbox"
    | "radio"
    | "email"
    | "phone"
    | "file";
  placeholder?: string;
  helpText?: string;
  defaultValue?: string;
  width?: "1-1" | "1-2" | "1-3" | "1-4";
  showWhen?: SeedConditionalRule[];
  options?: SeedFieldOption[];
  rows?: number;
  allowEmpty?: boolean;
  emptyOptionLabel?: string;
  direction?: "horizontal" | "vertical";
}

// Step/section configuration
export interface SeedStepConfig {
  id: string;
  title: string;
  description?: string;
  helpText?: string;
  fields: SeedFieldConfig[];
}

// Full form template
export interface SeedFormTemplate {
  id: string;
  title: string;
  formNumber: string;
  revision: string;
  steps: SeedStepConfig[];
  pdfFieldMappings: Record<string, string>;
  autofillMappings: Record<string, string>;
}
