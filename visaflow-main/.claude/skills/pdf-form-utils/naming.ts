/**
 * PDF Form Field Naming Utilities
 *
 * This module provides utilities for converting PDF form field names to
 * camelCase identifiers and suggesting canonical field mappings based on
 * field labels.
 *
 * References canonical fields from shared package:
 * - Personal: first_name, last_name, middle_name, date_of_birth, place_of_birth, nationality, gender
 * - Passport: passport_number, passport_issue_date, passport_expiry_date, passport_issuing_country
 * - Visa: visa_number, visa_type, visa_issue_date, visa_expiry_date
 * - I-94: i94_number, i94_admission_date, i94_class_of_admission, i94_admit_until_date
 * - Marriage: marriage_date, marriage_place, spouse_first_name, spouse_last_name
 * - Employment/Education: current_employer, current_job_title, education_degree, education_institution
 */

/**
 * All canonical field keys from the shared package.
 * This serves as the target vocabulary for autofill mapping suggestions.
 */
export const CANONICAL_FIELD_KEYS = [
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

export type CanonicalFieldKey = (typeof CANONICAL_FIELD_KEYS)[number];

/**
 * Mapping of common USCIS field label patterns to canonical field names.
 * Keys are lowercase patterns that may appear in field labels.
 * Values are the corresponding canonical field keys.
 */
export const LABEL_TO_CANONICAL_MAP: Record<string, CanonicalFieldKey> = {
  // First name variations
  "given name": "first_name",
  "first name": "first_name",
  "family name": "last_name",
  "last name": "last_name",
  surname: "last_name",
  "middle name": "middle_name",
  "middle initial": "middle_name",

  // Date of birth variations
  "date of birth": "date_of_birth",
  dob: "date_of_birth",
  "birth date": "date_of_birth",
  birthday: "date_of_birth",

  // Place of birth variations
  "place of birth": "place_of_birth",
  "city of birth": "place_of_birth",
  "country of birth": "place_of_birth",
  birthplace: "place_of_birth",

  // Nationality/citizenship variations
  nationality: "nationality",
  citizenship: "nationality",
  "country of citizenship": "nationality",
  "country of nationality": "nationality",

  // Gender variations
  gender: "gender",
  sex: "gender",

  // Passport field variations
  "passport number": "passport_number",
  "passport no": "passport_number",
  "passport #": "passport_number",
  "travel document number": "passport_number",
  "passport issue date": "passport_issue_date",
  "passport issuance date": "passport_issue_date",
  "date of issuance": "passport_issue_date",
  "passport expiration date": "passport_expiry_date",
  "passport expiry date": "passport_expiry_date",
  "date of expiration": "passport_expiry_date",
  "passport expiration": "passport_expiry_date",
  "issuing country": "passport_issuing_country",
  "country of issuance": "passport_issuing_country",
  "passport issuing country": "passport_issuing_country",

  // Visa field variations
  "visa number": "visa_number",
  "visa no": "visa_number",
  "nonimmigrant visa number": "visa_number",
  "visa type": "visa_type",
  "visa classification": "visa_type",
  "visa category": "visa_type",
  "nonimmigrant visa type": "visa_type",
  "visa issue date": "visa_issue_date",
  "visa issuance date": "visa_issue_date",
  "visa expiration date": "visa_expiry_date",
  "visa expiry date": "visa_expiry_date",

  // I-94 field variations
  "i-94 number": "i94_number",
  "i94 number": "i94_number",
  "arrival/departure record number": "i94_number",
  "admission number": "i94_number",
  "date of admission": "i94_admission_date",
  "date of arrival": "i94_admission_date",
  "date of last arrival": "i94_admission_date",
  "most recent entry": "i94_admission_date",
  "class of admission": "i94_class_of_admission",
  "immigration status": "i94_class_of_admission",
  "current immigration status": "i94_class_of_admission",
  "status at entry": "i94_class_of_admission",
  "admit until date": "i94_admit_until_date",
  "authorized stay expiration": "i94_admit_until_date",
  "i-94 expiration": "i94_admit_until_date",
  "status expires": "i94_admit_until_date",

  // Marriage variations
  "date of marriage": "marriage_date",
  "marriage date": "marriage_date",
  "wedding date": "marriage_date",
  "place of marriage": "marriage_place",
  "marriage place": "marriage_place",
  "city of marriage": "marriage_place",
  "spouse first name": "spouse_first_name",
  "spouse's first name": "spouse_first_name",
  "spouse given name": "spouse_first_name",
  "spouse's given name": "spouse_first_name",
  "spouse last name": "spouse_last_name",
  "spouse's last name": "spouse_last_name",
  "spouse family name": "spouse_last_name",
  "spouse's family name": "spouse_last_name",
  "spouse surname": "spouse_last_name",

  // Employment variations
  employer: "current_employer",
  "current employer": "current_employer",
  "employer name": "current_employer",
  "company name": "current_employer",
  "name of employer": "current_employer",
  "job title": "current_job_title",
  "current job title": "current_job_title",
  occupation: "current_job_title",
  "current occupation": "current_job_title",
  position: "current_job_title",
  "job position": "current_job_title",

  // Education variations
  degree: "education_degree",
  "education degree": "education_degree",
  "degree earned": "education_degree",
  "highest degree": "education_degree",
  "level of education": "education_degree",
  institution: "education_institution",
  "education institution": "education_institution",
  "school name": "education_institution",
  university: "education_institution",
  college: "education_institution",
  "name of school": "education_institution",
};

/**
 * Converts a PDF form field name to camelCase.
 *
 * PDF field names often follow patterns like:
 * - "form1[0].Page1[0].Part2[0].Line1a[0]"
 * - "topmostSubform[0].Page1[0].Pt1Line10_FamilyName[0]"
 *
 * This function extracts the meaningful parts and converts them to camelCase.
 *
 * @param pdfFieldName - The raw PDF field name
 * @returns The converted camelCase identifier
 *
 * @example
 * pdfFieldNameToCamelCase("form1[0].Page1[0].Part2[0].Line1a[0]")
 * // Returns: "part2Line1a"
 *
 * pdfFieldNameToCamelCase("topmostSubform[0].Page1[0].Pt1Line10_FamilyName[0]")
 * // Returns: "pt1Line10FamilyName"
 */
export function pdfFieldNameToCamelCase(pdfFieldName: string): string {
  // Remove array indices like [0], [1], etc.
  let cleaned = pdfFieldName.replace(/\[\d+\]/g, "");

  // Split by dots to get path segments
  const segments = cleaned.split(".");

  // Filter out common non-descriptive segments
  const nonDescriptivePatterns = [
    /^form\d*$/i,
    /^topmostsubform$/i,
    /^page\d*$/i,
    /^subform$/i,
    /^table$/i,
    /^row$/i,
    /^cell$/i,
    /^#area$/i,
    /^#subform$/i,
  ];

  const meaningfulSegments = segments.filter((segment) => {
    const trimmed = segment.trim();
    if (!trimmed) return false;
    return !nonDescriptivePatterns.some((pattern) => pattern.test(trimmed));
  });

  // If no meaningful segments, use the last segment as fallback
  if (meaningfulSegments.length === 0 && segments.length > 0) {
    meaningfulSegments.push(segments[segments.length - 1]);
  }

  // Join meaningful segments and process
  const combined = meaningfulSegments.join("_");

  // Replace underscores, hyphens, and spaces with word boundaries
  // Then convert to camelCase
  const words = combined
    .replace(/[_\-\s]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2") // Split existing camelCase
    .toLowerCase()
    .split(" ")
    .filter((word) => word.length > 0);

  if (words.length === 0) {
    return "field";
  }

  // Convert to camelCase: first word lowercase, rest title case
  return words
    .map((word, index) => {
      if (index === 0) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join("");
}

/**
 * Suggests a canonical field based on a field label.
 *
 * This function performs fuzzy matching against known label patterns
 * to suggest the most appropriate canonical field for autofill mapping.
 *
 * @param label - The field label to analyze
 * @returns The suggested canonical field key, or null if no match found
 *
 * @example
 * suggestCanonicalField("Given Name (First Name)")
 * // Returns: "first_name"
 *
 * suggestCanonicalField("Passport Expiration Date")
 * // Returns: "passport_expiry_date"
 *
 * suggestCanonicalField("Random Unknown Field")
 * // Returns: null
 */
export function suggestCanonicalField(label: string): CanonicalFieldKey | null {
  if (!label || typeof label !== "string") {
    return null;
  }

  const normalizedLabel = label.toLowerCase().trim();

  // First, try exact match
  if (normalizedLabel in LABEL_TO_CANONICAL_MAP) {
    return LABEL_TO_CANONICAL_MAP[normalizedLabel];
  }

  // Second, try to find a pattern that's contained in the label
  // Sort by key length descending to match more specific patterns first
  const sortedPatterns = Object.keys(LABEL_TO_CANONICAL_MAP).sort(
    (a, b) => b.length - a.length
  );

  for (const pattern of sortedPatterns) {
    if (normalizedLabel.includes(pattern)) {
      return LABEL_TO_CANONICAL_MAP[pattern];
    }
  }

  // Third, try keyword-based matching for partial matches
  const keywordMatches: Array<{
    field: CanonicalFieldKey;
    score: number;
  }> = [];

  // Define keyword patterns for each canonical field
  const keywordPatterns: Array<{
    keywords: string[];
    field: CanonicalFieldKey;
    weight: number;
  }> = [
    // Name fields
    { keywords: ["first", "given"], field: "first_name", weight: 2 },
    { keywords: ["last", "family", "surname"], field: "last_name", weight: 2 },
    { keywords: ["middle"], field: "middle_name", weight: 2 },

    // Date of birth
    { keywords: ["birth", "dob"], field: "date_of_birth", weight: 1 },
    { keywords: ["birth", "place"], field: "place_of_birth", weight: 2 },
    { keywords: ["birth", "city"], field: "place_of_birth", weight: 2 },
    { keywords: ["birth", "country"], field: "place_of_birth", weight: 2 },

    // Nationality
    {
      keywords: ["nationality", "citizenship"],
      field: "nationality",
      weight: 2,
    },

    // Gender
    { keywords: ["gender", "sex"], field: "gender", weight: 2 },

    // Passport
    { keywords: ["passport", "number"], field: "passport_number", weight: 2 },
    {
      keywords: ["passport", "issue"],
      field: "passport_issue_date",
      weight: 2,
    },
    {
      keywords: ["passport", "expir"],
      field: "passport_expiry_date",
      weight: 2,
    },
    {
      keywords: ["passport", "country"],
      field: "passport_issuing_country",
      weight: 2,
    },
    { keywords: ["issuing", "country"], field: "passport_issuing_country", weight: 2 },

    // Visa
    { keywords: ["visa", "number"], field: "visa_number", weight: 2 },
    { keywords: ["visa", "type"], field: "visa_type", weight: 2 },
    { keywords: ["visa", "class"], field: "visa_type", weight: 2 },
    { keywords: ["visa", "issue"], field: "visa_issue_date", weight: 2 },
    { keywords: ["visa", "expir"], field: "visa_expiry_date", weight: 2 },

    // I-94
    { keywords: ["i-94", "i94", "arrival"], field: "i94_number", weight: 2 },
    { keywords: ["admission", "date"], field: "i94_admission_date", weight: 2 },
    { keywords: ["arrival", "date"], field: "i94_admission_date", weight: 2 },
    {
      keywords: ["class", "admission"],
      field: "i94_class_of_admission",
      weight: 2,
    },
    {
      keywords: ["immigration", "status"],
      field: "i94_class_of_admission",
      weight: 2,
    },
    { keywords: ["admit", "until"], field: "i94_admit_until_date", weight: 2 },
    {
      keywords: ["authorized", "stay"],
      field: "i94_admit_until_date",
      weight: 2,
    },

    // Marriage
    { keywords: ["marriage", "date"], field: "marriage_date", weight: 2 },
    { keywords: ["wedding", "date"], field: "marriage_date", weight: 2 },
    { keywords: ["marriage", "place"], field: "marriage_place", weight: 2 },
    { keywords: ["spouse", "first"], field: "spouse_first_name", weight: 2 },
    { keywords: ["spouse", "given"], field: "spouse_first_name", weight: 2 },
    { keywords: ["spouse", "last"], field: "spouse_last_name", weight: 2 },
    { keywords: ["spouse", "family"], field: "spouse_last_name", weight: 2 },

    // Employment
    { keywords: ["employer"], field: "current_employer", weight: 2 },
    { keywords: ["company", "name"], field: "current_employer", weight: 2 },
    { keywords: ["job", "title"], field: "current_job_title", weight: 2 },
    { keywords: ["occupation"], field: "current_job_title", weight: 2 },
    { keywords: ["position"], field: "current_job_title", weight: 1 },

    // Education
    { keywords: ["degree"], field: "education_degree", weight: 2 },
    { keywords: ["education", "level"], field: "education_degree", weight: 2 },
    { keywords: ["school", "name"], field: "education_institution", weight: 2 },
    { keywords: ["university"], field: "education_institution", weight: 2 },
    { keywords: ["college"], field: "education_institution", weight: 1 },
    { keywords: ["institution"], field: "education_institution", weight: 1 },
  ];

  for (const { keywords, field, weight } of keywordPatterns) {
    let matchCount = 0;
    for (const keyword of keywords) {
      if (normalizedLabel.includes(keyword)) {
        matchCount++;
      }
    }

    if (matchCount > 0) {
      // Score based on how many keywords matched and their weight
      const score = matchCount * weight;
      keywordMatches.push({ field, score });
    }
  }

  if (keywordMatches.length > 0) {
    // Sort by score descending and return the best match
    keywordMatches.sort((a, b) => b.score - a.score);
    return keywordMatches[0].field;
  }

  return null;
}

/**
 * Batch process multiple field labels to suggest canonical mappings.
 *
 * @param labels - Array of field labels
 * @returns Map of label to suggested canonical field (null if no match)
 */
export function suggestCanonicalFieldsForLabels(
  labels: string[]
): Map<string, CanonicalFieldKey | null> {
  const result = new Map<string, CanonicalFieldKey | null>();
  for (const label of labels) {
    result.set(label, suggestCanonicalField(label));
  }
  return result;
}

/**
 * Extract descriptive parts from a PDF field path for display purposes.
 *
 * @param pdfFieldName - The raw PDF field name
 * @returns A human-readable description of the field
 *
 * @example
 * extractFieldDescription("form1[0].Page1[0].Part2[0].Line1a_FamilyName[0]")
 * // Returns: "Part 2 - Line 1a: Family Name"
 */
export function extractFieldDescription(pdfFieldName: string): string {
  // Remove array indices
  let cleaned = pdfFieldName.replace(/\[\d+\]/g, "");

  // Split by dots
  const segments = cleaned.split(".");

  // Find part and line info
  let part = "";
  let line = "";
  let fieldName = "";

  for (const segment of segments) {
    // Match Part/Pt patterns
    const partMatch = segment.match(/(?:Part|Pt)(\d+)/i);
    if (partMatch) {
      part = `Part ${partMatch[1]}`;
    }

    // Match Line patterns
    const lineMatch = segment.match(/Line(\d+[a-z]?)/i);
    if (lineMatch) {
      line = `Line ${lineMatch[1]}`;
    }

    // Extract field name from underscore-separated or camelCase
    const nameMatch = segment.match(/(?:Line\d+[a-z]?[_\s]*)(.+)$/i);
    if (nameMatch) {
      // Convert underscores and camelCase to spaces
      fieldName = nameMatch[1]
        .replace(/_/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .trim();
    }
  }

  // Build description
  const parts: string[] = [];
  if (part) parts.push(part);
  if (line) parts.push(line);

  let description = parts.join(" - ");
  if (fieldName) {
    description += description ? `: ${fieldName}` : fieldName;
  }

  return description || pdfFieldNameToCamelCase(pdfFieldName);
}
