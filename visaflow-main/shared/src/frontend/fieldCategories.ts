import type { CanonicalFieldKey } from "../canonicalFields";

/**
 * Field categories for organizing the UI.
 */
export interface FieldCategory {
  id: string;
  title: string;
  fields: CanonicalFieldKey[];
  alwaysShow?: boolean; // If true, show even with no extracted data
}

export const FIELD_CATEGORIES: FieldCategory[] = [
  {
    id: "personal",
    title: "Personal Information",
    fields: [
      "first_name",
      "last_name",
      "middle_name",
      "date_of_birth",
      "place_of_birth",
      "nationality",
      "gender",
    ],
    alwaysShow: true,
  },
  {
    id: "passport",
    title: "Passport",
    fields: [
      "passport_number",
      "passport_issue_date",
      "passport_expiry_date",
      "passport_issuing_country",
    ],
  },
  {
    id: "visa",
    title: "Visa",
    fields: [
      "visa_number",
      "visa_type",
      "visa_class",
      "visa_issue_date",
      "visa_expiry_date",
      "visa_issuing_post",
      "visa_issuing_country",
      "visa_number_of_entries",
      "visa_control_number",
      "visa_employer_name",
      "visa_petition_number",
      "visa_petition_end_date",
    ],
  },
  {
    id: "i94",
    title: "I-94 Record",
    fields: [
      "i94_number",
      "i94_admission_date",
      "i94_class_of_admission",
      "i94_admit_until_date",
    ],
  },
  {
    id: "marriage",
    title: "Marriage Certificate",
    fields: [
      "marriage_date",
      "marriage_place",
      "spouse_first_name",
      "spouse_last_name",
      "marriage_certificate_number",
      "marriage_certificate_issue_date",
    ],
  },
  {
    id: "resume",
    title: "Employment & Education",
    fields: [
      "current_employer",
      "current_job_title",
      "education_degree",
      "education_institution",
    ],
  },
];

/**
 * Contact fields that are always manual entry (not extracted from documents).
 */
export const CONTACT_FIELDS = ["email", "phone", "address"] as const;
export type ContactFieldKey = (typeof CONTACT_FIELDS)[number];

export const CONTACT_FIELD_LABELS: Record<ContactFieldKey, string> = {
  email: "Email Address",
  phone: "Phone Number",
  address: "Address",
};

/**
 * Maps document types to the categories that should be shown when that document type is uploaded.
 */
export const DOCUMENT_TYPE_TO_CATEGORIES: Record<string, string[]> = {
  passport: ["personal", "passport"],
  visa: ["personal", "visa"],
  birth_certificate: ["personal"],
  marriage_certificate: ["personal", "marriage"],
  i94: ["personal", "i94"],
  resume: ["personal", "resume"],
};

/**
 * Check if a category has any extracted data.
 */
export function categoryHasData(
  category: FieldCategory,
  fieldSelections: Record<string, { values: unknown[] }>
): boolean {
  return category.fields.some(
    (field) =>
      fieldSelections[field]?.values && fieldSelections[field].values.length > 0
  );
}
