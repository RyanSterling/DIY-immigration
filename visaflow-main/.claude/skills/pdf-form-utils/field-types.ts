/**
 * PDF Form Field Type Utilities
 *
 * This module provides mappings and inference functions for converting
 * PDF form field types to HTML form field types, along with width inference
 * for responsive form layouts.
 */

// Form field types supported by the application
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

// Width classes for form field layout
export type FieldWidth = "1-1" | "1-2" | "1-3" | "1-4";

/**
 * Maps PDF field types to form field types.
 * PDF field types are based on common PDF form field specifications.
 */
export const PDF_TO_FORM_TYPE_MAP: Record<string, FieldType> = {
  // Text-based PDF fields
  Tx: "text",
  Text: "text",
  TextField: "text",

  // Button/checkbox PDF fields
  Btn: "checkbox",
  Button: "checkbox",
  CheckBox: "checkbox",
  Ch: "select", // Choice field (dropdown/listbox)
  Choice: "select",
  Combo: "select",
  ComboBox: "select",
  Listbox: "select",
  List: "select",

  // Radio button fields
  Radio: "radio",
  RadioButton: "radio",

  // Signature fields (mapped to file for document upload)
  Sig: "file",
  Signature: "file",

  // Default fallback
  Unknown: "text",
};

/**
 * Keywords that indicate specific field types based on field labels.
 */
const FIELD_TYPE_KEYWORDS: Record<FieldType, string[]> = {
  email: ["email", "e-mail", "e_mail", "emailaddress"],
  phone: [
    "phone",
    "telephone",
    "tel",
    "mobile",
    "cell",
    "fax",
    "daytime",
    "evening",
  ],
  number: [
    "number",
    "amount",
    "quantity",
    "qty",
    "count",
    "total",
    "age",
    "year",
    "zip",
    "zipcode",
    "postal",
  ],
  textarea: [
    "description",
    "comment",
    "comments",
    "notes",
    "explanation",
    "details",
    "reason",
    "address",
    "street",
    "mailing",
    "physical",
    "residential",
  ],
  date: [
    "date",
    "dob",
    "birthdate",
    "birth_date",
    "expiration",
    "expiry",
    "issued",
    "valid",
    "from",
    "to",
    "start",
    "end",
    "arrival",
    "departure",
  ],
  checkbox: ["yes", "no", "agree", "consent", "confirm", "check"],
  radio: ["select one", "choose", "option"],
  select: ["country", "state", "status", "type", "category", "class"],
  file: ["upload", "attach", "document", "file", "signature"],
  text: [], // Default fallback, no specific keywords
};

/**
 * Keywords that indicate full-width fields (1-1).
 */
const FULL_WIDTH_KEYWORDS: string[] = [
  "address",
  "street",
  "mailing",
  "physical",
  "residential",
  "description",
  "explanation",
  "comment",
  "notes",
  "reason",
  "full name",
  "complete name",
  "employer name",
  "organization",
  "company",
  "institution",
];

/**
 * Keywords that indicate third-width fields (1-3).
 */
const THIRD_WIDTH_KEYWORDS: string[] = [
  "state",
  "province",
  "apt",
  "unit",
  "suite",
  "middle",
  "suffix",
  "prefix",
  "code",
  "ext",
  "extension",
];

/**
 * Keywords that indicate quarter-width fields (1-4).
 */
const QUARTER_WIDTH_KEYWORDS: string[] = [
  "zip",
  "postal",
  "country code",
  "area code",
  "initial",
  "mi",
  "m.i.",
];

/**
 * Normalizes a string for keyword matching.
 * Converts to lowercase and removes special characters.
 */
function normalizeForMatching(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
}

/**
 * Checks if a label contains any of the given keywords.
 */
function containsKeyword(label: string, keywords: string[]): boolean {
  const normalizedLabel = normalizeForMatching(label);
  return keywords.some((keyword) => normalizedLabel.includes(keyword));
}

/**
 * Infers the form field type based on PDF field type and field label.
 *
 * @param pdfFieldType - The PDF field type (e.g., "Tx", "Btn", "Ch")
 * @param fieldLabel - The label/name of the field for context-based inference
 * @returns The inferred form field type
 */
export function inferFieldType(
  pdfFieldType: string,
  fieldLabel: string
): FieldType {
  // First, try to get the base type from PDF field type
  const baseType = PDF_TO_FORM_TYPE_MAP[pdfFieldType] || "text";

  // If the PDF type gives us a specific non-text type, use it
  if (baseType !== "text") {
    // Special case: checkbox/radio distinction based on label
    if (baseType === "checkbox" && containsKeyword(fieldLabel, ["select one"])) {
      return "radio";
    }
    return baseType;
  }

  // For text fields, try to infer a more specific type from the label
  const normalizedLabel = normalizeForMatching(fieldLabel);

  // Check each field type's keywords in order of specificity
  const typeOrder: FieldType[] = [
    "email",
    "phone",
    "date",
    "number",
    "textarea",
    "select",
    "checkbox",
    "radio",
    "file",
  ];

  for (const type of typeOrder) {
    if (containsKeyword(normalizedLabel, FIELD_TYPE_KEYWORDS[type])) {
      return type;
    }
  }

  // Default to text if no specific type is inferred
  return "text";
}

/**
 * Infers the appropriate width for a form field based on its label and type.
 *
 * Width rules:
 * - Full width (1-1): textarea, long text fields, addresses
 * - Half width (1-2): most text fields, dates, numbers
 * - Third width (1-3): short codes, state abbreviations
 * - Quarter width (1-4): checkboxes, very short fields
 *
 * @param fieldLabel - The label/name of the field
 * @param fieldType - The form field type
 * @returns The inferred width class
 */
export function inferFieldWidth(
  fieldLabel: string,
  fieldType: FieldType
): FieldWidth {
  const normalizedLabel = normalizeForMatching(fieldLabel);

  // Textarea always gets full width
  if (fieldType === "textarea") {
    return "1-1";
  }

  // Checkboxes and radios are typically quarter width
  if (fieldType === "checkbox" || fieldType === "radio") {
    return "1-4";
  }

  // Check for full-width keywords
  if (containsKeyword(normalizedLabel, FULL_WIDTH_KEYWORDS)) {
    return "1-1";
  }

  // Check for quarter-width keywords
  if (containsKeyword(normalizedLabel, QUARTER_WIDTH_KEYWORDS)) {
    return "1-4";
  }

  // Check for third-width keywords
  if (containsKeyword(normalizedLabel, THIRD_WIDTH_KEYWORDS)) {
    return "1-3";
  }

  // File uploads get full width
  if (fieldType === "file") {
    return "1-1";
  }

  // Default: most fields get half width
  return "1-2";
}

/**
 * Convenience function to infer both type and width from PDF field properties.
 *
 * @param pdfFieldType - The PDF field type
 * @param fieldLabel - The label/name of the field
 * @returns Object containing inferred type and width
 */
export function inferFieldProperties(
  pdfFieldType: string,
  fieldLabel: string
): { type: FieldType; width: FieldWidth } {
  const type = inferFieldType(pdfFieldType, fieldLabel);
  const width = inferFieldWidth(fieldLabel, type);
  return { type, width };
}
