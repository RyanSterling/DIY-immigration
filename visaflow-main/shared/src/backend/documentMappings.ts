import type { CanonicalFieldKey } from "../canonicalFields";

/**
 * Maps document types to the canonical fields they can extract.
 */
export const DOCUMENT_FIELD_MAPPINGS: Record<string, CanonicalFieldKey[]> = {
  passport: [
    "first_name",
    "last_name",
    "date_of_birth",
    "place_of_birth",
    "nationality",
    "gender",
    "passport_number",
    "passport_issue_date",
    "passport_expiry_date",
    "passport_issuing_country",
  ],
  visa: [
    // Personal info (from visa)
    "first_name",
    "last_name",
    "date_of_birth",
    "nationality",
    "gender",
    // Core visa fields
    "visa_number",
    "visa_type",
    "visa_class",
    "visa_issue_date",
    "visa_expiry_date",
    "visa_issuing_post",
    "visa_issuing_country",
    "visa_number_of_entries",
    "visa_control_number",
    // Annotation sub-fields
    "visa_employer_name",
    "visa_petition_number",
    "visa_petition_end_date",
  ],
  birth_certificate: [
    "first_name",
    "last_name",
    "middle_name",
    "date_of_birth",
    "time_of_birth",
    "place_of_birth",
    "gender",
    "mothers_name",
    "fathers_name",
    "maternal_grandfather_name",
    "maternal_grandmother_name",
    "paternal_grandfather_name",
    "paternal_grandmother_name",
    "birth_certificate_number",
    "birth_certificate_issue_date",
    "birth_registration_date",
    "registry_office",
    "registrar_name",
  ],
  marriage_certificate: [
    "first_name",
    "last_name",
    "spouse_first_name",
    "spouse_last_name",
    "marriage_date",
    "marriage_place",
    "marriage_certificate_number",
    "marriage_certificate_issue_date",
  ],
  i94: [
    "first_name",
    "last_name",
    "date_of_birth",
    "nationality", // Country of Citizenship on I-94
    "passport_number", // Document Number on I-94 (travel document/passport)
    "i94_number",
    "i94_admission_date",
    "i94_class_of_admission",
    "i94_admit_until_date",
  ],
  resume: [
    "first_name",
    "last_name",
    "current_employer",
    "current_job_title",
    "education_degree",
    "education_institution",
  ],
};

/**
 * Get the fields that can be extracted from a document type.
 */
export function getFieldsForDocumentType(
  documentType: string
): CanonicalFieldKey[] {
  return DOCUMENT_FIELD_MAPPINGS[documentType] ?? [];
}
