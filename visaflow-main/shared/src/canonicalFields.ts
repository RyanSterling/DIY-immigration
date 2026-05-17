import type { CanonicalFieldDef, ValueType } from "./types";

/**
 * Canonical field definitions for extracted data.
 * These are the standardized field keys that transcend document types.
 * This is the single source of truth - used by both frontend and backend.
 */
export const CANONICAL_FIELDS = {
  // Personal Info
  first_name: { type: "text" as ValueType, displayName: "First Name" },
  last_name: { type: "text" as ValueType, displayName: "Last Name" },
  middle_name: { type: "text" as ValueType, displayName: "Middle Name" },
  date_of_birth: { type: "date" as ValueType, displayName: "Date of Birth" },
  place_of_birth: { type: "text" as ValueType, displayName: "Place of Birth" },
  nationality: { type: "country" as ValueType, displayName: "Nationality" },
  gender: { type: "text" as ValueType, displayName: "Gender" },

  // Passport
  passport_number: {
    type: "text" as ValueType,
    displayName: "Passport Number",
  },
  passport_issue_date: {
    type: "date" as ValueType,
    displayName: "Passport Issue Date",
  },
  passport_expiry_date: {
    type: "date" as ValueType,
    displayName: "Passport Expiry Date",
  },
  passport_issuing_country: {
    type: "country" as ValueType,
    displayName: "Passport Issuing Country",
  },
  travel_document_number: {
    type: "text" as ValueType,
    displayName: "Travel Document Number",
  },

  // Visa
  visa_number: { type: "text" as ValueType, displayName: "Visa Number" },
  visa_type: { type: "text" as ValueType, displayName: "Visa Type" },
  visa_class: { type: "text" as ValueType, displayName: "Visa Class" },
  visa_issue_date: {
    type: "date" as ValueType,
    displayName: "Visa Issue Date",
  },
  visa_expiry_date: {
    type: "date" as ValueType,
    displayName: "Visa Expiry Date",
  },
  visa_issuing_post: {
    type: "text" as ValueType,
    displayName: "Issuing Post",
  },
  visa_issuing_country: {
    type: "country" as ValueType,
    displayName: "Visa Issuing Country",
  },
  visa_number_of_entries: {
    type: "text" as ValueType,
    displayName: "Number of Entries",
  },
  visa_control_number: {
    type: "text" as ValueType,
    displayName: "Control Number",
  },
  // Visa annotation sub-fields (parsed from annotation text)
  visa_employer_name: {
    type: "text" as ValueType,
    displayName: "Employer Name",
  },
  visa_petition_number: {
    type: "text" as ValueType,
    displayName: "Petition Number",
  },
  visa_petition_end_date: {
    type: "date" as ValueType,
    displayName: "Petition End Date",
  },

  // I-94
  i94_number: { type: "text" as ValueType, displayName: "I-94 Number" },
  i94_admission_date: {
    type: "date" as ValueType,
    displayName: "I-94 Admission Date",
  },
  i94_class_of_admission: {
    type: "text" as ValueType,
    displayName: "Class of Admission",
  },
  i94_admit_until_date: {
    type: "date" as ValueType,
    displayName: "Admit Until Date",
  },

  // Birth Certificate
  mothers_name: { type: "text" as ValueType, displayName: "Mother's Name" },
  fathers_name: { type: "text" as ValueType, displayName: "Father's Name" },
  time_of_birth: { type: "text" as ValueType, displayName: "Time of Birth" },
  maternal_grandfather_name: {
    type: "text" as ValueType,
    displayName: "Maternal Grandfather",
  },
  maternal_grandmother_name: {
    type: "text" as ValueType,
    displayName: "Maternal Grandmother",
  },
  paternal_grandfather_name: {
    type: "text" as ValueType,
    displayName: "Paternal Grandfather",
  },
  paternal_grandmother_name: {
    type: "text" as ValueType,
    displayName: "Paternal Grandmother",
  },
  birth_certificate_number: {
    type: "text" as ValueType,
    displayName: "Certificate Number",
  },
  birth_certificate_issue_date: {
    type: "date" as ValueType,
    displayName: "Certificate Issue Date",
  },
  birth_registration_date: {
    type: "date" as ValueType,
    displayName: "Registration Date",
  },
  registry_office: {
    type: "text" as ValueType,
    displayName: "Registry Office",
  },
  registrar_name: { type: "text" as ValueType, displayName: "Registrar Name" },

  // Marriage Certificate
  marriage_date: { type: "date" as ValueType, displayName: "Marriage Date" },
  marriage_place: { type: "text" as ValueType, displayName: "Marriage Place" },
  spouse_first_name: {
    type: "text" as ValueType,
    displayName: "Spouse First Name",
  },
  spouse_last_name: {
    type: "text" as ValueType,
    displayName: "Spouse Last Name",
  },
  marriage_certificate_number: {
    type: "text" as ValueType,
    displayName: "Certificate Number",
  },
  marriage_certificate_issue_date: {
    type: "date" as ValueType,
    displayName: "Certificate Issue Date",
  },

  // Resume/CV
  current_employer: {
    type: "text" as ValueType,
    displayName: "Current Employer",
  },
  current_job_title: {
    type: "text" as ValueType,
    displayName: "Current Job Title",
  },
  education_degree: {
    type: "text" as ValueType,
    displayName: "Education Degree",
  },
  education_institution: {
    type: "text" as ValueType,
    displayName: "Education Institution",
  },
} as const;

export type CanonicalFieldKey = keyof typeof CANONICAL_FIELDS;

/**
 * Get the canonical field definition by key.
 */
export function getCanonicalField(key: CanonicalFieldKey): CanonicalFieldDef {
  return CANONICAL_FIELDS[key];
}

/**
 * Get the display name for a canonical field.
 */
export function getFieldDisplayName(key: CanonicalFieldKey): string {
  return CANONICAL_FIELDS[key]?.displayName ?? key;
}

/**
 * Get the value type for a canonical field.
 */
export function getFieldType(key: CanonicalFieldKey): ValueType {
  return CANONICAL_FIELDS[key]?.type ?? "text";
}

/**
 * Check if a canonical field key is valid.
 */
export function isValidCanonicalField(key: string): key is CanonicalFieldKey {
  return key in CANONICAL_FIELDS;
}
