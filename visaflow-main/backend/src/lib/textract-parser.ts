import type { GetDocumentAnalysisCommandOutput, Block, AnalyzeIDCommandOutput } from '@aws-sdk/client-textract';
import type { ValueType } from '../db/schema.js';
import { CANONICAL_FIELDS, getFieldsForDocumentType, type CanonicalFieldKey } from '../config/canonicalFields.js';
import { normalizeDate, normalizeCountry, normalizeGender } from './normalizers.js';
import { parseMRZ, convertMRZGender } from './mrz-parser.js';
import { parseVisaMRZ as _parseVisaMRZ, convertVisaMRZGender, extractVisaMRZFromLines, type VisaMRZData as _VisaMRZData } from './visa-mrz-parser.js';

export interface ExtractedField {
  canonicalField: string;
  rawFieldName: string;
  rawValue: string;
  valueType: ValueType;
  normalizedValue?: Record<string, unknown>;
  confidenceScore?: number;
  boundingBox?: Record<string, unknown>;
}

/**
 * Field patterns to match Textract keys to canonical fields.
 * Multiple patterns can map to the same canonical field.
 */
const FIELD_PATTERNS: Record<CanonicalFieldKey, RegExp[]> = {
  // Personal Info
  first_name: [
    /first\s*name/i,
    /given\s*name/i,
    /first\s*\(?given\)?\s*name/i,  // I-94 format: "First (Given) Name"
    /forename/i,
    /nombre/i,
  ],
  last_name: [
    /last\s*name/i,
    /surname/i,
    /last\s*[\/\\]\s*surname/i,     // I-94 format: "Last/Surname"
    /family\s*name/i,
    /apellido/i,
  ],
  middle_name: [
    /middle\s*name/i,
    /second\s*name/i,
  ],
  date_of_birth: [
    /date\s*of\s*birth/i,
    /dob/i,
    /birth\s*date/i,
    /fecha.*nacimiento/i,
  ],
  place_of_birth: [
    /place\s*of\s*birth/i,
    /birth\s*place/i,
    /lugar.*nacimiento/i,
  ],
  nationality: [
    /nationality/i,
    /citizenship/i,
    /nacionalidad/i,
  ],
  gender: [
    /gender/i,
    /sex/i,
    /sexo/i,
  ],

  // Passport
  passport_number: [
    /passport\s*(no|number|#)/i,
    /document\s*(no|number)/i,
  ],
  passport_issue_date: [
    /date\s*of\s*issue/i,
    /issue\s*date/i,
    /issued/i,
  ],
  passport_expiry_date: [
    /expiry\s*date/i,
    /expiration\s*date/i,
    /date\s*of\s*expiry/i,
    /valid\s*until/i,
  ],
  passport_issuing_country: [
    /issuing\s*(country|authority|state)/i,
    /authority/i,
    /code/i,
  ],
  travel_document_number: [
    /travel\s*document\s*(no|number|#)/i,
    /re-?entry\s*permit\s*(no|number)/i,
    /refugee\s*travel\s*document\s*(no|number)/i,
  ],

  // Visa
  visa_number: [
    /visa\s*(no|number|#)/i,
  ],
  visa_type: [
    /visa\s*type/i,
    /visa\s*category/i,
  ],
  visa_class: [
    /visa\s*(type\s*\/?\s*)?class/i,
    /classification/i,
    /type\s*\/\s*class/i,
    /^type\s*\/\s*class$/i,  // Handles when Textract splits "Visa Type /Class" into separate KV pairs
  ],
  visa_issue_date: [
    /issue\s*date/i,
    /date\s*of\s*issue/i,
  ],
  visa_expiry_date: [
    /expiry\s*date/i,
    /expiration/i,
  ],
  visa_issuing_post: [
    /issuing\s*post/i,
    /post\s*name/i,
    /consulate/i,
    /embassy/i,
    /issued\s*at/i,
  ],
  visa_issuing_country: [
    /issuing\s*country/i,
  ],
  visa_number_of_entries: [
    /entries/i,
    /number\s*of\s*entries/i,
  ],
  visa_control_number: [
    /control\s*(no|number|#)?/i,
  ],
  // Visa annotation sub-fields (typically extracted via pattern matching, not key-value)
  visa_employer_name: [],  // Extracted from annotation via pattern
  visa_petition_number: [], // Extracted from annotation via pattern
  visa_petition_end_date: [], // Extracted from annotation via pattern

  // I-94
  i94_number: [
    /i-?94\s*(no|number|#|record)/i,
    /admission\s*(i-?94\s*)?(no|number|record)/i,  // "Admission I-94 Record Number"
    /record\s*number/i,
  ],
  i94_admission_date: [
    /admission\s*date/i,
    /date\s*of\s*admission/i,
    /arrival[\s\/]*issued?\s*date/i,  // "Arrival/Issued Date"
    /arrived/i,
    /arrival\s*date/i,
  ],
  i94_class_of_admission: [
    /class\s*of\s*admission/i,
    /class\s*admission/i,
    /admit.*class/i,
    /status/i,
  ],
  i94_admit_until_date: [
    /admit\s*until/i,
    /admitted\s*until/i,
    /admit\s*(?:until|thru)/i,
    /authorized\s*stay/i,
  ],

  // Birth Certificate
  mothers_name: [
    /mother['']?s?\s*name/i,
    /m[aã]e/i,                    // Portuguese: mãe
    /nombre.*madre/i,             // Spanish
    /nom.*m[eè]re/i,              // French
  ],
  fathers_name: [
    /father['']?s?\s*name/i,
    /pai/i,                       // Portuguese
    /nombre.*padre/i,             // Spanish
    /nom.*p[eè]re/i,              // French
  ],
  time_of_birth: [
    /time\s*of\s*birth/i,
    /birth\s*time/i,
    /hora\s*de\s*nascimento/i,    // Portuguese
  ],
  maternal_grandfather_name: [
    /maternal\s*grandfather/i,
    /av[ôo]\s*materno/i,          // Portuguese
  ],
  maternal_grandmother_name: [
    /maternal\s*grandmother/i,
    /av[óo]\s*materna/i,          // Portuguese
  ],
  paternal_grandfather_name: [
    /paternal\s*grandfather/i,
    /av[ôo]\s*paterno/i,          // Portuguese
  ],
  paternal_grandmother_name: [
    /paternal\s*grandmother/i,
    /av[óo]\s*paterna/i,          // Portuguese
  ],
  birth_certificate_number: [
    /certificate\s*(no|number|#)/i,
    /registration\s*(no|number)/i,
    /n[uú]mero\s*de\s*ordem/i,    // Portuguese: número de ordem
    /livro\s*n[º°]/i,             // Portuguese: Livro nº
  ],
  birth_certificate_issue_date: [
    /issue\s*date/i,
    /date\s*(of\s*)?issue/i,
    /registration\s*date/i,
    /data\s*de\s*registro/i,      // Portuguese
  ],
  birth_registration_date: [
    /registration\s*date/i,
    /date\s*of\s*registration/i,
    /data\s*de\s*registro/i,      // Portuguese
  ],
  registry_office: [
    /registry\s*office/i,
    /registrar\s*office/i,
    /cart[oó]rio/i,               // Portuguese
  ],
  registrar_name: [
    /registrar/i,
    /registered\s*by/i,
    /oficial/i,                   // Portuguese/Spanish
    /escrevente/i,                // Portuguese: scribe
  ],

  // Marriage Certificate
  marriage_date: [
    /marriage\s*date/i,
    /date\s*of\s*marriage/i,
    /wedding\s*date/i,
  ],
  marriage_place: [
    /marriage\s*place/i,
    /place\s*of\s*marriage/i,
    /location/i,
  ],
  spouse_first_name: [
    /spouse.*first\s*name/i,
    /partner.*first\s*name/i,
  ],
  spouse_last_name: [
    /spouse.*last\s*name/i,
    /partner.*last\s*name/i,
  ],
  marriage_certificate_number: [
    /license\s*(?:no|number|#)/i,
    /certificate\s*(?:no|number|#)/i,
    /marriage\s*(?:license|cert).*(?:no|number)/i,
  ],
  marriage_certificate_issue_date: [
    /issue\s*date/i,
    /date\s*(?:of\s*)?issue/i,
    /certified\s*date/i,
  ],

  // Resume/CV
  current_employer: [
    /employer/i,
    /company/i,
    /organization/i,
  ],
  current_job_title: [
    /job\s*title/i,
    /position/i,
    /role/i,
    /title/i,
  ],
  education_degree: [
    /degree/i,
    /qualification/i,
    /education/i,
  ],
  education_institution: [
    /institution/i,
    /university/i,
    /college/i,
    /school/i,
  ],
};

/**
 * Match a raw field name to a canonical field based on patterns.
 */
function matchCanonicalField(
  rawFieldName: string,
  allowedFields: CanonicalFieldKey[]
): CanonicalFieldKey | null {
  const normalizedName = rawFieldName.toLowerCase().trim();

  for (const canonicalField of allowedFields) {
    const patterns = FIELD_PATTERNS[canonicalField];
    if (patterns) {
      for (const pattern of patterns) {
        if (pattern.test(normalizedName)) {
          return canonicalField;
        }
      }
    }
  }

  return null;
}

// Fields that should be normalized as countries
const COUNTRY_FIELDS: CanonicalFieldKey[] = [
  'nationality',
  'passport_issuing_country',
  'visa_issuing_country',
  'place_of_birth',
];

/**
 * Parse AWS Textract response and extract canonical fields.
 */
export function parseTextractResponse(
  response: GetDocumentAnalysisCommandOutput,
  documentType: string
): ExtractedField[] {
  const blocks = response.Blocks ?? [];
  const allowedFields = getFieldsForDocumentType(documentType);
  const extractedFields: ExtractedField[] = [];

  // Build a map of block IDs to blocks for quick lookup
  const blockMap = new Map<string, Block>();
  for (const block of blocks) {
    if (block.Id) {
      blockMap.set(block.Id, block);
    }
  }

  // Find KEY_VALUE_SET blocks
  const keyValueSets = blocks.filter((block) => block.BlockType === 'KEY_VALUE_SET');

  for (const keyBlock of keyValueSets) {
    // Only process KEY blocks (not VALUE blocks)
    if (!keyBlock.EntityTypes?.includes('KEY')) {
      continue;
    }

    // Extract the key text
    const keyText = getBlockText(keyBlock, blockMap);
    if (!keyText) continue;

    // Match to canonical field
    const canonicalField = matchCanonicalField(keyText, allowedFields);
    if (!canonicalField) continue;

    // Find the corresponding value block
    const valueRelationship = keyBlock.Relationships?.find((r) => r.Type === 'VALUE');
    if (!valueRelationship?.Ids?.length) continue;

    const valueBlockId = valueRelationship.Ids[0];
    const valueBlock = blockMap.get(valueBlockId);
    if (!valueBlock) continue;

    // Extract the value text
    const valueText = getBlockText(valueBlock, blockMap);
    if (!valueText) continue;

    // Get field type and normalize value
    const fieldDef = CANONICAL_FIELDS[canonicalField];
    let normalizedValue: Record<string, unknown> | undefined;

    if (fieldDef.type === 'date') {
      // Normalize date fields
      const dateResult = normalizeDate(valueText);
      if (dateResult.display) {
        normalizedValue = {
          display: dateResult.display,  // US format: MM/DD/YYYY
          iso: dateResult.iso,           // ISO format: YYYY-MM-DD
          original: dateResult.original,
        };
      }
    } else if (COUNTRY_FIELDS.includes(canonicalField)) {
      // Normalize country/nationality fields
      const countryResult = normalizeCountry(valueText);
      if (countryResult.display) {
        normalizedValue = {
          display: countryResult.display,
          code: countryResult.code,
          original: countryResult.original,
        };
      }
    } else if (canonicalField === 'gender') {
      // Normalize gender field
      const genderResult = normalizeGender(valueText);
      if (genderResult.display) {
        normalizedValue = {
          display: genderResult.display,
          code: genderResult.code,
          original: genderResult.original,
        };
      }
    }

    // Get confidence score (average of key and value confidence)
    const keyConfidence = keyBlock.Confidence ?? 0;
    const valueConfidence = valueBlock.Confidence ?? 0;
    const avgConfidence = (keyConfidence + valueConfidence) / 2;

    // Get bounding box from value block
    const boundingBox = valueBlock.Geometry?.BoundingBox
      ? {
          width: valueBlock.Geometry.BoundingBox.Width,
          height: valueBlock.Geometry.BoundingBox.Height,
          left: valueBlock.Geometry.BoundingBox.Left,
          top: valueBlock.Geometry.BoundingBox.Top,
        }
      : undefined;

    extractedFields.push({
      canonicalField,
      rawFieldName: keyText,
      rawValue: valueText,
      valueType: fieldDef.type,
      normalizedValue,
      confidenceScore: avgConfidence / 100, // Convert to 0-1 scale
      boundingBox,
    });
  }

  return extractedFields;
}

/**
 * Extract text content from a block by following CHILD relationships.
 */
function getBlockText(block: Block, blockMap: Map<string, Block>): string {
  const childRelationship = block.Relationships?.find((r) => r.Type === 'CHILD');
  if (!childRelationship?.Ids?.length) {
    return '';
  }

  const textParts: string[] = [];

  for (const childId of childRelationship.Ids) {
    const childBlock = blockMap.get(childId);
    if (childBlock?.BlockType === 'WORD' && childBlock.Text) {
      textParts.push(childBlock.Text);
    } else if (childBlock?.BlockType === 'SELECTION_ELEMENT') {
      if (childBlock.SelectionStatus === 'SELECTED') {
        textParts.push('[X]');
      }
    }
  }

  return textParts.join(' ').trim();
}

// ============================================================================
// AnalyzeID + MRZ Hybrid Parsing for Passports
// ============================================================================

/**
 * Mapping from AnalyzeID field type names to canonical fields.
 * Includes variations for international passports which may use different labels.
 * Note: AWS has a typo - EXPIRATON_DATE instead of EXPIRATION_DATE
 */
const ANALYZE_ID_FIELD_MAP: Record<string, CanonicalFieldKey> = {
  // Document identifiers
  'DOCUMENT_NUMBER': 'passport_number',

  // Name fields - multiple variations for international passports
  'FIRST_NAME': 'first_name',
  'GIVEN_NAME': 'first_name',
  'GIVEN_NAMES': 'first_name',
  'LAST_NAME': 'last_name',
  'SURNAME': 'last_name',
  'FAMILY_NAME': 'last_name',
  'MIDDLE_NAME': 'middle_name',

  // Personal info
  'DATE_OF_BIRTH': 'date_of_birth',
  'PLACE_OF_BIRTH': 'place_of_birth',

  // Passport dates
  'DATE_OF_ISSUE': 'passport_issue_date',
  'EXPIRATON_DATE': 'passport_expiry_date', // AWS typo
  'EXPIRATION_DATE': 'passport_expiry_date',
  'DATE_OF_EXPIRY': 'passport_expiry_date',
};

/**
 * Fields where MRZ data should take priority over visual extraction.
 * These are more reliably extracted from the standardized MRZ format.
 */
const MRZ_PRIORITY_FIELDS: CanonicalFieldKey[] = [
  'passport_number',
  'nationality',
  'passport_issuing_country',
  'gender',
];

/**
 * Parse AnalyzeID response and merge with MRZ data for passport documents.
 * Uses a hybrid approach combining visual OCR from AnalyzeID with
 * structured MRZ parsing for the most complete data extraction.
 */
export function parsePassportWithMerge(response: AnalyzeIDCommandOutput): ExtractedField[] {
  const visualFields = extractAnalyzeIDFields(response);
  const mrzData = extractAndParseMRZFromResponse(response);
  const allowedFields = getFieldsForDocumentType('passport');

  return mergePassportData(visualFields, mrzData, allowedFields);
}

/**
 * Extract fields from AnalyzeID response's IdentityDocumentFields.
 */
function extractAnalyzeIDFields(
  response: AnalyzeIDCommandOutput
): Map<CanonicalFieldKey, ExtractedField> {
  const fields = new Map<CanonicalFieldKey, ExtractedField>();

  const identityDocs = response.IdentityDocuments ?? [];

  for (const doc of identityDocs) {
    const docFields = doc.IdentityDocumentFields ?? [];

    // Log all fields returned by AnalyzeID for debugging
    console.log('[AnalyzeID] Fields returned:', docFields.map(f => ({
      type: f.Type?.Text,
      value: f.ValueDetection?.Text,
      confidence: f.ValueDetection?.Confidence,
    })));

    for (const field of docFields) {
      // AWS returns field names like "first name" - normalize to "FIRST_NAME"
      const rawFieldType = field.Type?.Text;
      const fieldType = rawFieldType?.toUpperCase().replace(/\s+/g, '_');
      if (!fieldType) continue;

      const canonicalField = ANALYZE_ID_FIELD_MAP[fieldType];
      if (!canonicalField) {
        console.log(`[AnalyzeID] Unmapped field: "${rawFieldType}" -> "${fieldType}"`);
        continue;
      }

      console.log(`[AnalyzeID] Mapped: "${rawFieldType}" -> ${canonicalField} = "${field.ValueDetection?.Text}"`);

      const value = field.ValueDetection?.Text;
      if (!value) continue;

      const confidence = field.ValueDetection?.Confidence ?? 0;
      const fieldDef = CANONICAL_FIELDS[canonicalField];

      // Normalize value based on field type
      let normalizedValue: Record<string, unknown> | undefined;

      if (fieldDef.type === 'date') {
        const dateResult = normalizeDate(value);
        if (dateResult.display) {
          normalizedValue = {
            display: dateResult.display,
            iso: dateResult.iso,
            original: dateResult.original,
          };
        }
      } else if (COUNTRY_FIELDS.includes(canonicalField)) {
        const countryResult = normalizeCountry(value);
        if (countryResult.display) {
          normalizedValue = {
            display: countryResult.display,
            code: countryResult.code,
            original: countryResult.original,
          };
        }
      } else if (canonicalField === 'gender') {
        const genderResult = normalizeGender(value);
        if (genderResult.display) {
          normalizedValue = {
            display: genderResult.display,
            code: genderResult.code,
            original: genderResult.original,
          };
        }
      }

      fields.set(canonicalField, {
        canonicalField,
        rawFieldName: fieldType,
        rawValue: value,
        valueType: fieldDef.type,
        normalizedValue,
        confidenceScore: confidence / 100, // Convert to 0-1 scale
        // AnalyzeID doesn't provide bounding boxes
      });
    }
  }

  return fields;
}

/**
 * Extract and parse MRZ code from AnalyzeID response.
 */
function extractAndParseMRZFromResponse(response: AnalyzeIDCommandOutput) {
  const identityDocs = response.IdentityDocuments ?? [];

  for (const doc of identityDocs) {
    const docFields = doc.IdentityDocumentFields ?? [];

    for (const field of docFields) {
      const fieldType = field.Type?.Text?.toUpperCase();
      if (fieldType === 'MRZ_CODE') {
        const mrzValue = field.ValueDetection?.Text;
        if (mrzValue) {
          return parseMRZ(mrzValue);
        }
      }
    }
  }

  return null;
}

/**
 * Merge visual AnalyzeID fields with MRZ parsed data.
 *
 * Priority rules:
 * - Names: Prefer visual (preserves diacritics like ñ, ü)
 * - Passport Number: Prefer MRZ (standardized extraction)
 * - Nationality/Issuing Country: MRZ only (visual doesn't extract these)
 * - Dates: Prefer visual if available, MRZ as fallback
 * - Gender: Prefer MRZ (more reliable)
 */
function mergePassportData(
  visual: Map<CanonicalFieldKey, ExtractedField>,
  mrz: ReturnType<typeof parseMRZ>,
  allowedFields: CanonicalFieldKey[]
): ExtractedField[] {
  const merged = new Map<CanonicalFieldKey, ExtractedField>();

  // Helper to add a field if it's in the allowed list
  const addField = (field: ExtractedField) => {
    if (allowedFields.includes(field.canonicalField as CanonicalFieldKey)) {
      merged.set(field.canonicalField as CanonicalFieldKey, field);
    }
  };

  // Start with all visual fields (except MRZ priority fields)
  for (const [key, field] of visual) {
    if (!MRZ_PRIORITY_FIELDS.includes(key)) {
      addField(field);
    }
  }

  // Add MRZ data
  if (mrz) {
    // Passport number - prefer MRZ
    if (mrz.passportNumber) {
      addField({
        canonicalField: 'passport_number',
        rawFieldName: 'MRZ_PASSPORT_NUMBER',
        rawValue: mrz.passportNumber,
        valueType: 'text',
        confidenceScore: 0.99, // MRZ is highly reliable
      });
    } else if (visual.has('passport_number')) {
      // Fallback to visual
      addField(visual.get('passport_number')!);
    }

    // Nationality - MRZ only
    if (mrz.nationality) {
      const countryResult = normalizeCountry(mrz.nationality);
      addField({
        canonicalField: 'nationality',
        rawFieldName: 'MRZ_NATIONALITY',
        rawValue: mrz.nationality,
        valueType: 'text',
        normalizedValue: countryResult.display
          ? {
              display: countryResult.display,
              code: countryResult.code,
              original: mrz.nationality,
            }
          : undefined,
        confidenceScore: 0.99,
      });
    }

    // Issuing country - MRZ only
    if (mrz.issuingCountry) {
      const countryResult = normalizeCountry(mrz.issuingCountry);
      addField({
        canonicalField: 'passport_issuing_country',
        rawFieldName: 'MRZ_ISSUING_COUNTRY',
        rawValue: mrz.issuingCountry,
        valueType: 'text',
        normalizedValue: countryResult.display
          ? {
              display: countryResult.display,
              code: countryResult.code,
              original: mrz.issuingCountry,
            }
          : undefined,
        confidenceScore: 0.99,
      });
    }

    // Gender - prefer MRZ
    if (mrz.gender) {
      const genderResult = convertMRZGender(mrz.gender);
      if (genderResult) {
        addField({
          canonicalField: 'gender',
          rawFieldName: 'MRZ_GENDER',
          rawValue: mrz.gender,
          valueType: 'text',
          normalizedValue: {
            display: genderResult.display,
            code: genderResult.code,
            original: mrz.gender,
          },
          confidenceScore: 0.99,
        });
      }
    } else if (visual.has('gender')) {
      addField(visual.get('gender')!);
    }

    // Names - prefer visual (preserves diacritics), fallback to MRZ
    if (!visual.has('first_name') && mrz.firstName) {
      addField({
        canonicalField: 'first_name',
        rawFieldName: 'MRZ_FIRST_NAME',
        rawValue: mrz.firstName,
        valueType: 'text',
        confidenceScore: 0.95,
      });
    }
    if (!visual.has('last_name') && mrz.lastName) {
      addField({
        canonicalField: 'last_name',
        rawFieldName: 'MRZ_LAST_NAME',
        rawValue: mrz.lastName,
        valueType: 'text',
        confidenceScore: 0.95,
      });
    }

    // Date of birth - prefer visual, fallback to MRZ
    if (!visual.has('date_of_birth') && mrz.dateOfBirth) {
      addField({
        canonicalField: 'date_of_birth',
        rawFieldName: 'MRZ_DATE_OF_BIRTH',
        rawValue: mrz.dateOfBirth.raw,
        valueType: 'date',
        normalizedValue: {
          display: mrz.dateOfBirth.display,
          iso: mrz.dateOfBirth.iso,
          original: mrz.dateOfBirth.raw,
        },
        confidenceScore: 0.99,
      });
    }

    // Expiry date - prefer visual, fallback to MRZ
    if (!visual.has('passport_expiry_date') && mrz.expiryDate) {
      addField({
        canonicalField: 'passport_expiry_date',
        rawFieldName: 'MRZ_EXPIRY_DATE',
        rawValue: mrz.expiryDate.raw,
        valueType: 'date',
        normalizedValue: {
          display: mrz.expiryDate.display,
          iso: mrz.expiryDate.iso,
          original: mrz.expiryDate.raw,
        },
        confidenceScore: 0.99,
      });
    }
  } else {
    // No MRZ data - use visual for MRZ priority fields if available
    for (const key of MRZ_PRIORITY_FIELDS) {
      if (visual.has(key)) {
        addField(visual.get(key)!);
      }
    }
  }

  return Array.from(merged.values());
}

/**
 * Merge results from GetDocumentAnalysis with AnalyzeID + MRZ results for passports.
 *
 * Priority rules:
 * - Names: Prefer GetDocumentAnalysis (reads visual labels), fallback to AnalyzeID/MRZ
 * - Passport Number: Prefer MRZ (from analyzeIdFields), then GetDocumentAnalysis
 * - Nationality/Issuing Country: AnalyzeID/MRZ only (GetDocumentAnalysis doesn't extract these)
 * - Dates: Prefer GetDocumentAnalysis if available, AnalyzeID/MRZ as fallback
 * - Gender: Prefer MRZ (more reliable)
 *
 * @param formFields - Fields from GetDocumentAnalysis (form-based extraction)
 * @param analyzeIdFields - Fields from AnalyzeID + MRZ (identity document specialized)
 */
export function mergePassportResults(
  formFields: ExtractedField[],
  analyzeIdFields: ExtractedField[]
): ExtractedField[] {
  const merged = new Map<string, ExtractedField>();

  // Create lookup maps for both sources
  const formFieldMap = new Map(formFields.map(f => [f.canonicalField, f]));
  const analyzeIdFieldMap = new Map(analyzeIdFields.map(f => [f.canonicalField, f]));

  // Fields where AnalyzeID/MRZ should take priority (these are more reliable from structured extraction)
  const ANALYZE_ID_PRIORITY: string[] = [
    'passport_number',      // MRZ is highly reliable for this
    'nationality',          // Only available from MRZ
    'passport_issuing_country', // Only available from MRZ
    'gender',               // MRZ is more reliable
  ];

  // Fields where GetDocumentAnalysis should take priority (reads visual labels better)
  const FORM_PRIORITY: string[] = [
    'first_name',
    'last_name',
    'middle_name',
    'place_of_birth',
  ];

  // Collect all unique field names from both sources
  const allFieldNames = new Set([
    ...formFields.map(f => f.canonicalField),
    ...analyzeIdFields.map(f => f.canonicalField),
  ]);

  for (const fieldName of allFieldNames) {
    const formField = formFieldMap.get(fieldName);
    const analyzeIdField = analyzeIdFieldMap.get(fieldName);

    let selectedField: ExtractedField | undefined;

    if (ANALYZE_ID_PRIORITY.includes(fieldName)) {
      // For these fields, prefer AnalyzeID/MRZ
      selectedField = analyzeIdField ?? formField;
    } else if (FORM_PRIORITY.includes(fieldName)) {
      // For names and place of birth, prefer GetDocumentAnalysis (reads visual labels)
      // but only if the value is non-empty
      if (formField && formField.rawValue && formField.rawValue.trim()) {
        selectedField = formField;
      } else {
        selectedField = analyzeIdField ?? formField;
      }
    } else {
      // For other fields (dates, etc.), prefer GetDocumentAnalysis, fallback to AnalyzeID
      selectedField = formField ?? analyzeIdField;
    }

    if (selectedField) {
      merged.set(fieldName, selectedField);
    }
  }

  console.log('[MergePassport] Merged fields:', Array.from(merged.keys()));

  return Array.from(merged.values());
}

// ============================================================================
// Birth Certificate Enhanced Extraction
// ============================================================================

/**
 * Enhanced extraction for birth certificates using pattern matching on full text.
 * This is used as a fallback when standard key-value extraction misses fields.
 */
export function extractBirthCertificateEnhanced(
  response: GetDocumentAnalysisCommandOutput,
  _documentType: string
): ExtractedField[] {
  const fields: ExtractedField[] = [];
  const blocks = response.Blocks ?? [];

  // Get all LINE blocks and combine into full text
  const lineBlocks = blocks.filter(b => b.BlockType === 'LINE');
  const fullText = lineBlocks.map(b => b.Text ?? '').join(' ');

  console.log(`[BirthCert Enhanced] Processing ${lineBlocks.length} lines`);
  console.log(`[BirthCert Enhanced] Full text (first 2000 chars):`, fullText.substring(0, 2000));

  // Strategy 1: Extract name after "consta o assento de:" (Brazilian format)
  // Example: "número de ordem 221165 consta o assento de: ANA CAROLINA OLIVEIRA RODRIGUES nascida"
  const assentoMatch = fullText.match(/consta\s+o\s+assento\s+de:?\s*([A-ZÁÉÍÓÚÃÕÂÊÎÔÛÇ][A-ZÁÉÍÓÚÃÕÂÊÎÔÛÇ\s]+?)(?:\s+nascid[oa]|\s+filh[oa]|\s*,)/i);
  if (assentoMatch) {
    const fullName = assentoMatch[1].trim();
    const nameParts = fullName.split(/\s+/).filter(p => p.length > 1);
    if (nameParts.length >= 2) {
      fields.push({
        canonicalField: 'first_name',
        rawFieldName: 'consta_assento_first',
        rawValue: nameParts[0],
        valueType: 'text',
        confidenceScore: 0.95,
      });
      fields.push({
        canonicalField: 'last_name',
        rawFieldName: 'consta_assento_last',
        rawValue: nameParts[nameParts.length - 1],
        valueType: 'text',
        confidenceScore: 0.95,
      });
      if (nameParts.length > 2) {
        fields.push({
          canonicalField: 'middle_name',
          rawFieldName: 'consta_assento_middle',
          rawValue: nameParts.slice(1, -1).join(' '),
          valueType: 'text',
          confidenceScore: 0.90,
        });
      }
      console.log(`[BirthCert Enhanced] Extracted name from 'consta o assento': ${fullName}`);
    }
  }

  // Strategy 2: Extract date of birth from parentheses format
  // Example: "nascida no dia nove de abril de dois mil e três (09-04-2003)"
  const dateInParensMatch = fullText.match(/nascid[oa][^(]*\((\d{2}[-\/]\d{2}[-\/]\d{4})\)/i);
  if (dateInParensMatch) {
    const rawDate = dateInParensMatch[1];
    // Parse DD-MM-YYYY or DD/MM/YYYY (Brazilian format)
    const dateParts = rawDate.split(/[-\/]/);
    if (dateParts.length === 3) {
      const [day, month, year] = dateParts;
      const isoDate = `${year}-${month}-${day}`;
      const displayDate = `${month}/${day}/${year}`; // US format for display
      fields.push({
        canonicalField: 'date_of_birth',
        rawFieldName: 'nascido_parentheses_date',
        rawValue: rawDate,
        valueType: 'date',
        normalizedValue: {
          display: displayDate,
          iso: isoDate,
          original: rawDate,
        },
        confidenceScore: 0.95,
      });
      console.log(`[BirthCert Enhanced] Extracted DOB from parentheses: ${rawDate} -> ${displayDate}`);
    }
  }

  // Strategy 3: Extract place of birth and gender from "em CITY, STATE, do sexo GENDER"
  // Example: "16:50 horas. em FORTALEZA, CE, do sexo feminino"
  const placeGenderMatch = fullText.match(/em\s+([A-ZÁÉÍÓÚÃÕÂÊÎÔÛÇ][A-ZÁÉÍÓÚÃÕÂÊÎÔÛÇa-záéíóúãõâêîôûç\s,]+?),?\s+do\s+sexo\s+(feminino|masculino)/i);
  if (placeGenderMatch) {
    const place = placeGenderMatch[1].trim();
    const gender = placeGenderMatch[2].toLowerCase();

    if (place && !fields.some(f => f.canonicalField === 'place_of_birth')) {
      fields.push({
        canonicalField: 'place_of_birth',
        rawFieldName: 'em_place_pattern',
        rawValue: place,
        valueType: 'text',
        confidenceScore: 0.90,
      });
      console.log(`[BirthCert Enhanced] Extracted place of birth: ${place}`);
    }

    if (!fields.some(f => f.canonicalField === 'gender')) {
      const genderDisplay = gender === 'feminino' ? 'Female' : 'Male';
      const genderCode = gender === 'feminino' ? 'F' : 'M';
      fields.push({
        canonicalField: 'gender',
        rawFieldName: 'sexo_pattern',
        rawValue: gender,
        valueType: 'text',
        normalizedValue: {
          display: genderDisplay,
          code: genderCode,
          original: gender,
        },
        confidenceScore: 0.95,
      });
      console.log(`[BirthCert Enhanced] Extracted gender: ${gender} -> ${genderDisplay}`);
    }
  }

  // Strategy 4: Extract parent names from "filha de FATHER e de MOTHER sendo:"
  // Brazilian format uses "e de" (not just "e") between parent names
  // Example: "filha de JOÃO CARLOS RODRIGUES SILVA e de PATRICIA MARIA OLIVEIRA COSTA_ CORREIA sendo:"
  const parentMatch = fullText.match(/filh[oa]\s+de\s+([A-ZÁÉÍÓÚÃÕÂÊÎÔÛÇ][A-ZÁÉÍÓÚÃÕÂÊÎÔÛÇ\s_]+?)\s+e\s+de\s+([A-ZÁÉÍÓÚÃÕÂÊÎÔÛÇ][A-ZÁÉÍÓÚÃÕÂÊÎÔÛÇ\s_]+?)(?:\s+sendo|\s+av[oó]s|\s*:|\s*,)/i);
  if (parentMatch) {
    const fatherName = parentMatch[1].trim().replace(/_/g, ' '); // Fix OCR underscore errors
    const motherName = parentMatch[2].trim().replace(/_/g, ' ');

    if (fatherName && fatherName.length > 2) {
      fields.push({
        canonicalField: 'fathers_name',
        rawFieldName: 'filho_de_e_de_father',
        rawValue: fatherName,
        valueType: 'text',
        confidenceScore: 0.90,
      });
      console.log(`[BirthCert Enhanced] Extracted father's name: ${fatherName}`);
    }

    if (motherName && motherName.length > 2) {
      fields.push({
        canonicalField: 'mothers_name',
        rawFieldName: 'filho_de_e_de_mother',
        rawValue: motherName,
        valueType: 'text',
        confidenceScore: 0.90,
      });
      console.log(`[BirthCert Enhanced] Extracted mother's name: ${motherName}`);
    }
  }

  // Strategy 5: Fallback parent pattern for "filha de X e Y" (without "de" before mother)
  if (!fields.some(f => f.canonicalField === 'fathers_name')) {
    const parentFallback = fullText.match(/filh[oa]\s+de\s+([A-ZÁÉÍÓÚÃÕÂÊÎÔÛÇ][A-ZÁÉÍÓÚÃÕÂÊÎÔÛÇ\s_]+?)\s+e\s+([A-ZÁÉÍÓÚÃÕÂÊÎÔÛÇ][A-ZÁÉÍÓÚÃÕÂÊÎÔÛÇ\s_]+?)(?:\s+sendo|\s+av[oó]s|\s+nascid|\s*,|\s*\.)/i);
    if (parentFallback) {
      const fatherName = parentFallback[1].trim().replace(/_/g, ' ');
      const motherName = parentFallback[2].trim().replace(/_/g, ' ');

      if (fatherName && fatherName.length > 2) {
        fields.push({
          canonicalField: 'fathers_name',
          rawFieldName: 'filho_de_e_father',
          rawValue: fatherName,
          valueType: 'text',
          confidenceScore: 0.85,
        });
        console.log(`[BirthCert Enhanced] Extracted father's name (fallback): ${fatherName}`);
      }

      if (motherName && motherName.length > 2 && !fields.some(f => f.canonicalField === 'mothers_name')) {
        fields.push({
          canonicalField: 'mothers_name',
          rawFieldName: 'filho_de_e_mother',
          rawValue: motherName,
          valueType: 'text',
          confidenceScore: 0.85,
        });
        console.log(`[BirthCert Enhanced] Extracted mother's name (fallback): ${motherName}`);
      }
    }
  }

  // Strategy 6: Extract certificate metadata
  // "Livro nº A-251" and "número de ordem 221165"
  const livroMatch = fullText.match(/livro\s*n[º°]?\s*([A-Z]?-?\d+)/i);
  const folhasMatch = fullText.match(/folhas?\s+(\d+)/i);
  const ordemMatch = fullText.match(/n[uú]mero\s+de\s+ordem\s+(\d+)/i);

  if (!fields.some(f => f.canonicalField === 'birth_certificate_number')) {
    const parts: string[] = [];
    if (livroMatch) parts.push(`Livro ${livroMatch[1]}`);
    if (folhasMatch) parts.push(`Folha ${folhasMatch[1]}`);
    if (ordemMatch) parts.push(`Ordem ${ordemMatch[1]}`);

    if (parts.length > 0) {
      const certNumber = parts.join(', ');
      fields.push({
        canonicalField: 'birth_certificate_number',
        rawFieldName: 'livro_folha_ordem',
        rawValue: certNumber,
        valueType: 'text',
        confidenceScore: 0.90,
      });
      console.log(`[BirthCert Enhanced] Extracted certificate number: ${certNumber}`);
    }
  }

  // Strategy 7: Extract registrar/official name
  // Example: "OFICIAL: BEL GUSTAVO LINHARES BEUTTENMÜLLER NETO"
  const oficialMatch = fullText.match(/oficial:?\s+(?:bel\.?\s+)?([A-ZÁÉÍÓÚÃÕÂÊÎÔÛÇ][A-ZÁÉÍÓÚÃÕÂÊÎÔÛÇ\s]+?)(?:\s+oficiais|\s+substituto|\s*,|\s*\n)/i);
  if (oficialMatch && !fields.some(f => f.canonicalField === 'registrar_name')) {
    const registrarName = oficialMatch[1].trim();
    if (registrarName && registrarName.length > 2) {
      fields.push({
        canonicalField: 'registrar_name',
        rawFieldName: 'oficial_pattern',
        rawValue: registrarName,
        valueType: 'text',
        confidenceScore: 0.80,
      });
      console.log(`[BirthCert Enhanced] Extracted registrar name: ${registrarName}`);
    }
  }

  // Strategy 8: Extract time of birth
  // Example: "16:50 horas" or "às 16:50 horas"
  const timeMatch = fullText.match(/(?:[àa]s\s+)?(\d{1,2}:\d{2})\s*horas?/i);
  if (timeMatch && !fields.some(f => f.canonicalField === 'time_of_birth')) {
    fields.push({
      canonicalField: 'time_of_birth',
      rawFieldName: 'horas_pattern',
      rawValue: timeMatch[1],
      valueType: 'text',
      confidenceScore: 0.90,
    });
    console.log(`[BirthCert Enhanced] Extracted time of birth: ${timeMatch[1]}`);
  }

  // Strategy 9: Extract maternal grandparents
  // Brazilian format: "e maternos GRANDFATHER e GRANDMOTHER"
  // The text often has "maternos" followed by names on separate lines
  const maternalGrandparentsMatch = fullText.match(/(?:av[oó]s\s+)?maternos?\s+([A-ZÁÉÍÓÚÃÕÂÊÎÔÛÇ][A-ZÁÉÍÓÚÃÕÂÊÎÔÛÇ\s]+?)\s+e\s+([A-ZÁÉÍÓÚÃÕÂÊÎÔÛÇ][A-ZÁÉÍÓÚÃÕÂÊÎÔÛÇ\s]+?)(?:\s+Foi|\s+Observ|\s+declarante|\s*$)/i);
  if (maternalGrandparentsMatch) {
    const grandfather = maternalGrandparentsMatch[1].trim();
    const grandmother = maternalGrandparentsMatch[2].trim();

    if (grandfather && grandfather.length > 2 && !fields.some(f => f.canonicalField === 'maternal_grandfather_name')) {
      fields.push({
        canonicalField: 'maternal_grandfather_name',
        rawFieldName: 'avos_maternos_grandfather',
        rawValue: grandfather,
        valueType: 'text',
        confidenceScore: 0.85,
      });
      console.log(`[BirthCert Enhanced] Extracted maternal grandfather: ${grandfather}`);
    }

    if (grandmother && grandmother.length > 2 && !fields.some(f => f.canonicalField === 'maternal_grandmother_name')) {
      fields.push({
        canonicalField: 'maternal_grandmother_name',
        rawFieldName: 'avos_maternos_grandmother',
        rawValue: grandmother,
        valueType: 'text',
        confidenceScore: 0.85,
      });
      console.log(`[BirthCert Enhanced] Extracted maternal grandmother: ${grandmother}`);
    }
  }

  // Strategy 10: Extract registration date
  // Example: "Registro feito aos 28 de abril de 2003" or "Observações: Registro feito aos..."
  const registrationDateMatch = fullText.match(/registro\s+feito\s+aos?\s+(\d{1,2})\s+de\s+([a-záéíóúãõâêîôûç]+)\s+de\s+(\d{4})/i);
  if (registrationDateMatch && !fields.some(f => f.canonicalField === 'birth_registration_date')) {
    const day = registrationDateMatch[1];
    const monthName = registrationDateMatch[2].toLowerCase();
    const year = registrationDateMatch[3];

    // Portuguese month names to numbers
    const monthMap: Record<string, string> = {
      janeiro: '01', fevereiro: '02', março: '03', marco: '03', abril: '04',
      maio: '05', junho: '06', julho: '07', agosto: '08',
      setembro: '09', outubro: '10', novembro: '11', dezembro: '12',
    };

    const month = monthMap[monthName];
    if (month) {
      const paddedDay = day.padStart(2, '0');
      const isoDate = `${year}-${month}-${paddedDay}`;
      const displayDate = `${month}/${paddedDay}/${year}`;
      fields.push({
        canonicalField: 'birth_registration_date',
        rawFieldName: 'registro_feito_date',
        rawValue: `${day} de ${monthName} de ${year}`,
        valueType: 'date',
        normalizedValue: {
          display: displayDate,
          iso: isoDate,
          original: `${day} de ${monthName} de ${year}`,
        },
        confidenceScore: 0.90,
      });
      console.log(`[BirthCert Enhanced] Extracted registration date: ${displayDate}`);
    }
  }

  // Strategy 11: Extract registry office name
  // Example: "CARTÓRIO JOÃO DE DEUS"
  const cartorioMatch = fullText.match(/cart[oó]rio\s+([A-ZÁÉÍÓÚÃÕÂÊÎÔÛÇ][A-ZÁÉÍÓÚÃÕÂÊÎÔÛÇa-záéíóúãõâêîôûç\s]+?)(?:\s+rua|\s+registro|\s+oficial|\s*,|\s*$)/i);
  if (cartorioMatch && !fields.some(f => f.canonicalField === 'registry_office')) {
    const officeName = `Cartório ${cartorioMatch[1].trim()}`;
    fields.push({
      canonicalField: 'registry_office',
      rawFieldName: 'cartorio_pattern',
      rawValue: officeName,
      valueType: 'text',
      confidenceScore: 0.85,
    });
    console.log(`[BirthCert Enhanced] Extracted registry office: ${officeName}`);
  }

  console.log(`[BirthCert Enhanced] Extracted ${fields.length} fields from patterns`);
  return fields;
}

/**
 * Merge results from standard extraction with enhanced birth certificate extraction.
 *
 * Priority rules:
 * - Names (first_name, last_name): Prefer standard extraction if available
 * - Parent names: Prefer enhanced extraction (pattern-based is more reliable)
 * - Certificate metadata: Use enhanced if standard didn't find it
 */
export function mergeBirthCertificateResults(
  formFields: ExtractedField[],
  enhancedFields: ExtractedField[]
): ExtractedField[] {
  const merged = new Map<string, ExtractedField>();

  // Form extraction priority for structured fields
  const FORM_PRIORITY = ['first_name', 'last_name', 'middle_name', 'date_of_birth', 'place_of_birth', 'gender'];

  // Enhanced extraction priority for relationship patterns and metadata
  const ENHANCED_PRIORITY = [
    'mothers_name', 'fathers_name',
    'maternal_grandfather_name', 'maternal_grandmother_name',
    'paternal_grandfather_name', 'paternal_grandmother_name',
    'time_of_birth', 'birth_certificate_number', 'birth_registration_date',
    'registry_office', 'registrar_name',
  ];

  // Add form fields first
  for (const field of formFields) {
    merged.set(field.canonicalField, field);
  }

  // Merge enhanced fields with priority logic
  for (const field of enhancedFields) {
    const existing = merged.get(field.canonicalField);

    if (!existing) {
      // No existing value - use enhanced
      merged.set(field.canonicalField, field);
    } else if (ENHANCED_PRIORITY.includes(field.canonicalField)) {
      // Enhanced extraction is more reliable for these fields
      if (field.confidenceScore && field.confidenceScore > (existing.confidenceScore ?? 0)) {
        merged.set(field.canonicalField, field);
      }
    } else if (FORM_PRIORITY.includes(field.canonicalField)) {
      // For form priority fields, only use enhanced if existing is empty
      if (!existing.rawValue || existing.rawValue.trim() === '') {
        merged.set(field.canonicalField, field);
      }
    }
  }

  console.log('[MergeBirthCert] Merged fields:', Array.from(merged.keys()));

  return Array.from(merged.values());
}

// ============================================================================
// I-94 Enhanced Extraction
// ============================================================================

/**
 * Enhanced extraction for I-94 documents using pattern matching on full text.
 * Fallback when standard key-value extraction misses fields due to CBP's
 * specific label formats like "First (Given) Name:" and "Last/Surname:".
 */
export function extractI94Enhanced(
  response: GetDocumentAnalysisCommandOutput,
  _documentType: string
): ExtractedField[] {
  const fields: ExtractedField[] = [];
  const blocks = response.Blocks ?? [];

  // Get all LINE blocks and combine into full text
  const lineBlocks = blocks.filter(b => b.BlockType === 'LINE');
  const fullText = lineBlocks.map(b => b.Text ?? '').join(' ');

  console.log(`[I94 Enhanced] Processing ${lineBlocks.length} lines`);

  // Strategy 1: "First (Given) Name: VALUE" pattern
  // Match name followed by common terminators
  const firstNameMatch = fullText.match(/first\s*\(?given\)?\s*name[:\s]+([A-Z][A-Z\s]*?)(?:\s+birth|\s+date|\s+country|\s+last|\s+class|$)/i);
  if (firstNameMatch) {
    const value = firstNameMatch[1].trim();
    if (value && value.length > 1) {
      fields.push({
        canonicalField: 'first_name',
        rawFieldName: 'i94_first_given_name_pattern',
        rawValue: value,
        valueType: 'text',
        confidenceScore: 0.90,
      });
      console.log(`[I94 Enhanced] Extracted first_name: ${value}`);
    }
  }

  // Strategy 2: "Last/Surname: VALUE" pattern
  const lastNameMatch = fullText.match(/last\s*[\/\\]?\s*surname[:\s]+([A-Z][A-Z\s]*?)(?:\s+first|\s+birth|\s+date|\s+country|$)/i);
  if (lastNameMatch) {
    const value = lastNameMatch[1].trim();
    if (value && value.length > 1) {
      fields.push({
        canonicalField: 'last_name',
        rawFieldName: 'i94_last_surname_pattern',
        rawValue: value,
        valueType: 'text',
        confidenceScore: 0.90,
      });
      console.log(`[I94 Enhanced] Extracted last_name: ${value}`);
    }
  }

  // Strategy 3: I-94 Number pattern - "Admission (I-94) Record Number: 156156787A7"
  // I-94 numbers are typically 11 chars: 9-10 digits + optional letter + optional digit
  // Look for the specific number format rather than generic alphanumeric
  const i94NumberMatch = fullText.match(/(?:admission|record|i-?94)[^:]*(?:number|no|#)[:\s]+(\d{8,10}[A-Z]?\d?)/i);
  if (i94NumberMatch) {
    const value = i94NumberMatch[1].trim();
    fields.push({
      canonicalField: 'i94_number',
      rawFieldName: 'i94_number_pattern',
      rawValue: value,
      valueType: 'text',
      confidenceScore: 0.90,
    });
    console.log(`[I94 Enhanced] Extracted i94_number: ${value}`);
  }

  // Strategy 4: Arrival/Issued Date pattern - "Arrival/Issued Date: 2023 November 29"
  const arrivalDateMatch = fullText.match(/(?:arrival|issued)\s*(?:\/\s*issued)?\s*date[:\s]+(\d{4}\s+[A-Za-z]+\s+\d{1,2})/i);
  if (arrivalDateMatch) {
    const rawDate = arrivalDateMatch[1].trim();
    const dateResult = normalizeDate(rawDate);
    fields.push({
      canonicalField: 'i94_admission_date',
      rawFieldName: 'i94_arrival_date_pattern',
      rawValue: rawDate,
      valueType: 'date',
      normalizedValue: dateResult.display ? { display: dateResult.display, iso: dateResult.iso, original: dateResult.original } : undefined,
      confidenceScore: 0.90,
    });
    console.log(`[I94 Enhanced] Extracted i94_admission_date: ${rawDate} -> ${dateResult.display}`);
  }

  // Strategy 5: Class of Admission pattern
  const classMatch = fullText.match(/class\s*(?:of\s*)?admission[:\s]+([A-Z][A-Z0-9\-]*)/i);
  if (classMatch) {
    const value = classMatch[1].trim();
    if (value && value.length > 0) {
      fields.push({
        canonicalField: 'i94_class_of_admission',
        rawFieldName: 'i94_class_pattern',
        rawValue: value,
        valueType: 'text',
        confidenceScore: 0.90,
      });
      console.log(`[I94 Enhanced] Extracted i94_class_of_admission: ${value}`);
    }
  }

  // Strategy 6: Admit Until Date pattern - "Admit Until: 2025 November 28" or similar
  const admitUntilMatch = fullText.match(/admit\s*(?:until|thru)[:\s]+(\d{4}\s+[A-Za-z]+\s+\d{1,2})/i);
  if (admitUntilMatch) {
    const rawDate = admitUntilMatch[1].trim();
    const dateResult = normalizeDate(rawDate);
    fields.push({
      canonicalField: 'i94_admit_until_date',
      rawFieldName: 'i94_admit_until_pattern',
      rawValue: rawDate,
      valueType: 'date',
      normalizedValue: dateResult.display ? { display: dateResult.display, iso: dateResult.iso, original: dateResult.original } : undefined,
      confidenceScore: 0.90,
    });
    console.log(`[I94 Enhanced] Extracted i94_admit_until_date: ${rawDate} -> ${dateResult.display}`);
  }

  // Strategy 7: Date of Birth pattern - "Birth Date: 1990 January 15" or "Date of Birth:"
  const dobMatch = fullText.match(/(?:birth\s*date|date\s*of\s*birth)[:\s]+(\d{4}\s+[A-Za-z]+\s+\d{1,2})/i);
  if (dobMatch) {
    const rawDate = dobMatch[1].trim();
    const dateResult = normalizeDate(rawDate);
    fields.push({
      canonicalField: 'date_of_birth',
      rawFieldName: 'i94_birth_date_pattern',
      rawValue: rawDate,
      valueType: 'date',
      normalizedValue: dateResult.display ? { display: dateResult.display, iso: dateResult.iso, original: dateResult.original } : undefined,
      confidenceScore: 0.90,
    });
    console.log(`[I94 Enhanced] Extracted date_of_birth: ${rawDate} -> ${dateResult.display}`);
  }

  // Strategy 8: Country of Citizenship pattern - "Country of Citizenship: INDIA"
  const citizenshipMatch = fullText.match(/country\s*(?:of\s*)?citizenship[:\s]+([A-Z][A-Za-z\s]+?)(?:\s+birth|\s+date|\s+class|\s+admission|\s+i-?94|$)/i);
  if (citizenshipMatch) {
    const value = citizenshipMatch[1].trim();
    if (value && value.length > 1) {
      const countryResult = normalizeCountry(value);
      fields.push({
        canonicalField: 'nationality',
        rawFieldName: 'i94_country_of_citizenship_pattern',
        rawValue: value,
        valueType: 'text',
        normalizedValue: countryResult.display ? { display: countryResult.display, code: countryResult.code, original: countryResult.original } : undefined,
        confidenceScore: 0.90,
      });
      console.log(`[I94 Enhanced] Extracted nationality (citizenship): ${value} -> ${countryResult.display}`);
    }
  }

  // Strategy 9: Document Number pattern - "Document Number: AB1234567" (passport/travel doc number)
  const docNumberMatch = fullText.match(/document\s*(?:number|no)[:\s]+([A-Z0-9]+)/i);
  if (docNumberMatch) {
    const value = docNumberMatch[1].trim();
    if (value && value.length > 3) {
      fields.push({
        canonicalField: 'passport_number',
        rawFieldName: 'i94_document_number_pattern',
        rawValue: value,
        valueType: 'text',
        confidenceScore: 0.90,
      });
      console.log(`[I94 Enhanced] Extracted passport_number (document number): ${value}`);
    }
  }

  console.log(`[I94 Enhanced] Extracted ${fields.length} fields from patterns`);
  return fields;
}

/**
 * Merge results from standard extraction with enhanced I-94 extraction.
 * Priority: Enhanced patterns are more reliable for I-94's consistent CBP format.
 */
export function mergeI94Results(
  formFields: ExtractedField[],
  enhancedFields: ExtractedField[]
): ExtractedField[] {
  const merged = new Map<string, ExtractedField>();

  // Enhanced extraction is generally more reliable for I-94's specific format
  const ENHANCED_PRIORITY = ['first_name', 'last_name', 'i94_number'];

  // Add form fields first
  for (const field of formFields) {
    merged.set(field.canonicalField, field);
  }

  // Merge enhanced fields
  for (const field of enhancedFields) {
    const existing = merged.get(field.canonicalField);

    if (!existing) {
      // No existing value - use enhanced
      merged.set(field.canonicalField, field);
    } else if (ENHANCED_PRIORITY.includes(field.canonicalField)) {
      // Enhanced patterns are more reliable for these fields on I-94
      merged.set(field.canonicalField, field);
    } else if (field.confidenceScore && field.confidenceScore > (existing.confidenceScore ?? 0)) {
      // For other fields, prefer higher confidence
      merged.set(field.canonicalField, field);
    }
  }

  console.log('[MergeI94] Merged fields:', Array.from(merged.keys()));
  return Array.from(merged.values());
}

// ============================================================================
// Visa Enhanced Extraction
// ============================================================================

/**
 * Parse visa annotation text for sub-fields.
 * US visa annotations contain employer info, petition number, and petition end date.
 *
 * Example formats:
 * - "PN-F5 NETWORKS INC P#- I0E8694033003 PED - 05NOV2025"
 * - "**F5 NETWORKS INC P#-I0E8694033003 PED-05NOV2025"
 *
 * @param text - Full text from visa document containing annotation
 */
function parseVisaAnnotation(text: string): ExtractedField[] {
  const fields: ExtractedField[] = [];

  // Employer: PN-[NAME] or **[NAME] (** is sometimes used instead of PN-)
  // Pattern: Look for PN- or ** followed by company name until P# or PED or end
  const employerMatch = text.match(/(?:PN-|\*\*)\s*([A-Z0-9][A-Z0-9\s&.,'-]+?)(?:\s+P#|\s+PED|\s*$)/i);
  if (employerMatch) {
    const employerName = employerMatch[1].trim();
    if (employerName && employerName.length > 2) {
      fields.push({
        canonicalField: 'visa_employer_name',
        rawFieldName: 'annotation_employer',
        rawValue: employerName,
        valueType: 'text',
        confidenceScore: 0.90,
      });
      console.log(`[Visa Annotation] Extracted employer: ${employerName}`);
    }
  }

  // Petition number: P#-[NUMBER] or P#[NUMBER] or P# -[NUMBER]
  // Pattern: P# followed by optional space/dash, then alphanumeric petition number
  const petitionMatch = text.match(/P#\s*-?\s*([A-Z0-9]+)/i);
  if (petitionMatch) {
    const petitionNumber = petitionMatch[1].trim();
    if (petitionNumber && petitionNumber.length > 5) {
      fields.push({
        canonicalField: 'visa_petition_number',
        rawFieldName: 'annotation_petition_number',
        rawValue: petitionNumber,
        valueType: 'text',
        confidenceScore: 0.90,
      });
      console.log(`[Visa Annotation] Extracted petition number: ${petitionNumber}`);
    }
  }

  // Petition end date: PED-[DATE] or PED [DATE] or PED - [DATE]
  // Date formats: 05NOV2025, 05-NOV-2025, 2025NOV05, etc.
  const pedMatch = text.match(/PED\s*-?\s*(\d{1,2}[A-Z]{3}\d{4}|\d{4}[A-Z]{3}\d{1,2})/i);
  if (pedMatch) {
    const rawDate = pedMatch[1].trim();
    const dateResult = normalizeDate(rawDate);
    fields.push({
      canonicalField: 'visa_petition_end_date',
      rawFieldName: 'annotation_petition_end_date',
      rawValue: rawDate,
      valueType: 'date',
      normalizedValue: dateResult.display
        ? {
            display: dateResult.display,
            iso: dateResult.iso,
            original: dateResult.original,
          }
        : undefined,
      confidenceScore: 0.90,
    });
    console.log(`[Visa Annotation] Extracted petition end date: ${rawDate} -> ${dateResult.display}`);
  }

  return fields;
}

/**
 * Enhanced extraction for visa documents using pattern matching and MRZ parsing.
 * Visa MRZ (MRV-A/MRV-B format) provides reliable extraction for names, nationality, etc.
 *
 * Key insight: Visual OCR on visas often has errors (e.g., "ADNINI" instead of "TIWARI")
 * but the MRZ is standardized and more reliable.
 */
export function extractVisaEnhanced(
  response: GetDocumentAnalysisCommandOutput,
  _documentType: string
): ExtractedField[] {
  const fields: ExtractedField[] = [];
  const blocks = response.Blocks ?? [];

  // Get all LINE blocks and combine into full text
  const lineBlocks = blocks.filter(b => b.BlockType === 'LINE');
  const lines = lineBlocks.map(b => ({
    text: b.Text ?? '',
    confidence: b.Confidence,
  }));
  const fullText = lines.map(l => l.text).join(' ');

  console.log(`[Visa Enhanced] Processing ${lineBlocks.length} lines`);

  // Strategy 1: Find and parse visa MRZ (HIGHEST PRIORITY - names from MRZ override visual OCR)
  const mrzData = extractVisaMRZFromLines(lines);
  if (mrzData) {
    console.log(`[Visa Enhanced] Parsed MRZ - format: ${mrzData.format}, name: ${mrzData.lastName}, ${mrzData.firstName}`);

    // Names from MRZ (override visual OCR which may have errors)
    if (mrzData.firstName) {
      fields.push({
        canonicalField: 'first_name',
        rawFieldName: 'visa_mrz_first_name',
        rawValue: mrzData.firstName,
        valueType: 'text',
        confidenceScore: 0.99, // MRZ is highly reliable
      });
    }

    if (mrzData.lastName) {
      fields.push({
        canonicalField: 'last_name',
        rawFieldName: 'visa_mrz_last_name',
        rawValue: mrzData.lastName,
        valueType: 'text',
        confidenceScore: 0.99,
      });
    }

    // Visa number from MRZ
    if (mrzData.visaNumber) {
      fields.push({
        canonicalField: 'visa_number',
        rawFieldName: 'visa_mrz_number',
        rawValue: mrzData.visaNumber,
        valueType: 'text',
        confidenceScore: 0.99,
      });
    }

    // Nationality from MRZ
    if (mrzData.nationality) {
      const countryResult = normalizeCountry(mrzData.nationality);
      fields.push({
        canonicalField: 'nationality',
        rawFieldName: 'visa_mrz_nationality',
        rawValue: mrzData.nationality,
        valueType: 'text',
        normalizedValue: countryResult.display
          ? {
              display: countryResult.display,
              code: countryResult.code,
              original: mrzData.nationality,
            }
          : undefined,
        confidenceScore: 0.99,
      });
    }

    // Issuing country from MRZ
    if (mrzData.issuingCountry) {
      const countryResult = normalizeCountry(mrzData.issuingCountry);
      fields.push({
        canonicalField: 'visa_issuing_country',
        rawFieldName: 'visa_mrz_issuing_country',
        rawValue: mrzData.issuingCountry,
        valueType: 'text',
        normalizedValue: countryResult.display
          ? {
              display: countryResult.display,
              code: countryResult.code,
              original: mrzData.issuingCountry,
            }
          : undefined,
        confidenceScore: 0.99,
      });
    }

    // Gender from MRZ
    if (mrzData.gender) {
      const genderResult = convertVisaMRZGender(mrzData.gender);
      if (genderResult) {
        fields.push({
          canonicalField: 'gender',
          rawFieldName: 'visa_mrz_gender',
          rawValue: mrzData.gender,
          valueType: 'text',
          normalizedValue: {
            display: genderResult.display,
            code: genderResult.code,
            original: mrzData.gender,
          },
          confidenceScore: 0.99,
        });
      }
    }

    // Date of birth from MRZ
    if (mrzData.dateOfBirth) {
      fields.push({
        canonicalField: 'date_of_birth',
        rawFieldName: 'visa_mrz_dob',
        rawValue: mrzData.dateOfBirth.raw,
        valueType: 'date',
        normalizedValue: {
          display: mrzData.dateOfBirth.display,
          iso: mrzData.dateOfBirth.iso,
          original: mrzData.dateOfBirth.raw,
        },
        confidenceScore: 0.99,
      });
    }

    // Expiry date from MRZ
    if (mrzData.expiryDate) {
      fields.push({
        canonicalField: 'visa_expiry_date',
        rawFieldName: 'visa_mrz_expiry',
        rawValue: mrzData.expiryDate.raw,
        valueType: 'date',
        normalizedValue: {
          display: mrzData.expiryDate.display,
          iso: mrzData.expiryDate.iso,
          original: mrzData.expiryDate.raw,
        },
        confidenceScore: 0.99,
      });
    }
  } else {
    console.log(`[Visa Enhanced] No MRZ found in document`);
  }

  // Strategy 2: Parse annotation for sub-fields (employer, petition number, PED)
  // Look for annotation text which typically contains "PN-", "P#-", "PED"
  const annotationFields = parseVisaAnnotation(fullText);
  fields.push(...annotationFields);

  // Strategy 3: US visa class pattern (H-1B, B1/B2, F-1, L-1, O-1, etc.)
  // Look for patterns like "R H1B", "R B1/B2", "H-1B", etc.
  if (!fields.some(f => f.canonicalField === 'visa_class')) {
    const visaClassMatch = fullText.match(/(?:^|\s)R?\s*([A-Z]-?[0-9][A-Z]?(?:\/[A-Z]-?[0-9][A-Z]?)?)(?:\s|$)/i) ||
                          fullText.match(/(?:^|\s)([HFLJEOCRP]-?[0-9][A-Z]?[0-9]?)(?:\s|$)/i);
    if (visaClassMatch) {
      const visaClass = visaClassMatch[1].trim().toUpperCase();
      // Validate it looks like a real visa class
      if (/^[A-Z]-?[0-9]/.test(visaClass)) {
        fields.push({
          canonicalField: 'visa_class',
          rawFieldName: 'visa_class_pattern',
          rawValue: visaClass,
          valueType: 'text',
          confidenceScore: 0.85,
        });
        console.log(`[Visa Enhanced] Extracted visa class: ${visaClass}`);
      }
    }
  }

  // Strategy 4: Control number (typically 14 digits for US visas)
  if (!fields.some(f => f.canonicalField === 'visa_control_number')) {
    const controlNumberMatch = fullText.match(/(\d{14,15})/);
    if (controlNumberMatch) {
      fields.push({
        canonicalField: 'visa_control_number',
        rawFieldName: 'control_number_pattern',
        rawValue: controlNumberMatch[1],
        valueType: 'text',
        confidenceScore: 0.85,
      });
      console.log(`[Visa Enhanced] Extracted control number: ${controlNumberMatch[1]}`);
    }
  }

  // Strategy 5: Number of entries (M/MULTIPLE/S/SINGLE/1/UNLIMITED)
  if (!fields.some(f => f.canonicalField === 'visa_number_of_entries')) {
    const entriesMatch = fullText.match(/(?:entries|entry)[:\s]*([MS1]|MULTIPLE|SINGLE|UNLIMITED)/i) ||
                         fullText.match(/\b(MULTIPLE|SINGLE|UNLIMITED)\b/i);
    if (entriesMatch) {
      let entries = entriesMatch[1].toUpperCase();
      // Normalize to display format
      if (entries === 'M' || entries === 'MULTIPLE') entries = 'Multiple';
      else if (entries === 'S' || entries === '1' || entries === 'SINGLE') entries = 'Single';
      else if (entries === 'UNLIMITED') entries = 'Unlimited';

      fields.push({
        canonicalField: 'visa_number_of_entries',
        rawFieldName: 'entries_pattern',
        rawValue: entries,
        valueType: 'text',
        confidenceScore: 0.85,
      });
      console.log(`[Visa Enhanced] Extracted entries: ${entries}`);
    }
  }

  // Strategy 6: Issuing post from embassy/consulate patterns
  if (!fields.some(f => f.canonicalField === 'visa_issuing_post')) {
    // Look for city names that commonly appear as issuing posts
    // Pattern: "Issuing Post Name" followed by city, or just known embassy cities
    const issuingPostMatch = fullText.match(/(?:issuing\s*post|post\s*name)[:\s]*([A-Z][A-Za-z\s]+?)(?:\s+control|\s+surname|\s+\d|\s*$)/i);
    if (issuingPostMatch) {
      const post = issuingPostMatch[1].trim();
      if (post && post.length > 2) {
        fields.push({
          canonicalField: 'visa_issuing_post',
          rawFieldName: 'issuing_post_pattern',
          rawValue: post,
          valueType: 'text',
          confidenceScore: 0.85,
        });
        console.log(`[Visa Enhanced] Extracted issuing post: ${post}`);
      }
    }
  }

  // Strategy 7: Issue date pattern (visa-specific, not from MRZ)
  // Look for dates near "Issue Date" or within the visa body
  if (!fields.some(f => f.canonicalField === 'visa_issue_date')) {
    // Pattern: date in format DDMMMYYYY (e.g., 20NOV2023)
    const issueDateMatch = fullText.match(/(?:issue\s*date|issued)[:\s]*(\d{1,2}[A-Z]{3}\d{4})/i);
    if (issueDateMatch) {
      const rawDate = issueDateMatch[1];
      const dateResult = normalizeDate(rawDate);
      if (dateResult.display) {
        fields.push({
          canonicalField: 'visa_issue_date',
          rawFieldName: 'issue_date_pattern',
          rawValue: rawDate,
          valueType: 'date',
          normalizedValue: {
            display: dateResult.display,
            iso: dateResult.iso,
            original: dateResult.original,
          },
          confidenceScore: 0.85,
        });
        console.log(`[Visa Enhanced] Extracted issue date: ${rawDate} -> ${dateResult.display}`);
      }
    }
  }

  // Strategy 8: Birth date from visual text (if not from MRZ)
  // Pattern: DDMMMYYYY near "Birth Date"
  if (!fields.some(f => f.canonicalField === 'date_of_birth')) {
    const dobMatch = fullText.match(/(?:birth\s*date|dob)[:\s]*(\d{1,2}[A-Z]{3}\d{4})/i);
    if (dobMatch) {
      const rawDate = dobMatch[1];
      const dateResult = normalizeDate(rawDate);
      if (dateResult.display) {
        fields.push({
          canonicalField: 'date_of_birth',
          rawFieldName: 'birth_date_pattern',
          rawValue: rawDate,
          valueType: 'date',
          normalizedValue: {
            display: dateResult.display,
            iso: dateResult.iso,
            original: dateResult.original,
          },
          confidenceScore: 0.80,
        });
        console.log(`[Visa Enhanced] Extracted birth date: ${rawDate} -> ${dateResult.display}`);
      }
    }
  }

  // Strategy 9: Passport number from visa (linked travel document)
  // Improved pattern: requires at least one digit in the passport number
  if (!fields.some(f => f.canonicalField === 'passport_number')) {
    // Pattern requires passport number to contain at least one digit (not just letters)
    const passportMatch = fullText.match(/(?:passport\s*(?:no|number)?)[:\s]*([A-Z0-9]{6,12})/i);
    if (passportMatch) {
      const passportNum = passportMatch[1].trim().toUpperCase();
      // Validate: must have at least one digit and not be a common word
      const invalidValues = ['NUMBER', 'PASSPORT', 'PASPORT', 'PASAPORTE'];
      const hasDigit = /\d/.test(passportNum);
      const isValid = passportNum.length >= 6 && hasDigit && !invalidValues.includes(passportNum);

      if (isValid) {
        fields.push({
          canonicalField: 'passport_number',
          rawFieldName: 'visa_passport_number_pattern',
          rawValue: passportNum,
          valueType: 'text',
          confidenceScore: 0.80,
        });
        console.log(`[Visa Enhanced] Extracted passport number: ${passportNum}`);
      } else {
        console.log(`[Visa Enhanced] Rejected invalid passport number: ${passportNum} (hasDigit=${hasDigit}, isInvalid=${invalidValues.includes(passportNum)})`);
      }
    }
  }

  console.log(`[Visa Enhanced] Extracted ${fields.length} fields from patterns and MRZ`);
  return fields;
}

/**
 * Merge results from standard extraction with enhanced visa extraction.
 *
 * Priority rules:
 * - Names: Prefer MRZ (fixes OCR errors like "ADNINI" → "TIWARI")
 * - Visa number: Prefer MRZ if available
 * - Nationality: MRZ preferred (more reliable)
 * - Issuing country: MRZ only
 * - Gender: MRZ preferred
 * - Dates: Prefer visual if available, MRZ as fallback
 * - Visa type/class: Form only (not in MRZ)
 * - Annotation sub-fields: Pattern extraction only
 */
export function mergeVisaResults(
  formFields: ExtractedField[],
  enhancedFields: ExtractedField[]
): ExtractedField[] {
  const merged = new Map<string, ExtractedField>();

  // Fields where MRZ/enhanced extraction should take priority
  const MRZ_PRIORITY: string[] = [
    'first_name',
    'last_name',
    'visa_number',
    'nationality',
    'visa_issuing_country',
    'gender',
  ];

  // Fields where form/visual extraction should take priority (visual dates are often clearer)
  const FORM_PRIORITY: string[] = [
    'visa_issue_date',
    'visa_type',
  ];

  // Add form fields first
  for (const field of formFields) {
    merged.set(field.canonicalField, field);
  }

  // Merge enhanced fields with priority logic
  for (const field of enhancedFields) {
    const existing = merged.get(field.canonicalField);

    if (!existing) {
      // No existing value - use enhanced
      merged.set(field.canonicalField, field);
    } else if (MRZ_PRIORITY.includes(field.canonicalField)) {
      // For MRZ priority fields, prefer enhanced (MRZ) extraction
      // MRZ has confidence 0.99, so it will override most visual extractions
      if ((field.confidenceScore ?? 0) > (existing.confidenceScore ?? 0)) {
        merged.set(field.canonicalField, field);
        console.log(`[MergeVisa] Overriding ${field.canonicalField} with MRZ value: ${field.rawValue}`);
      }
    } else if (FORM_PRIORITY.includes(field.canonicalField)) {
      // For form priority fields, only use enhanced if existing is empty or low confidence
      if (!existing.rawValue || existing.rawValue.trim() === '' ||
          ((existing.confidenceScore ?? 0) < 0.5 && (field.confidenceScore ?? 0) > (existing.confidenceScore ?? 0))) {
        merged.set(field.canonicalField, field);
      }
    } else {
      // For other fields (annotation sub-fields, etc.), prefer higher confidence
      if ((field.confidenceScore ?? 0) > (existing.confidenceScore ?? 0)) {
        merged.set(field.canonicalField, field);
      }
    }
  }

  console.log('[MergeVisa] Merged fields:', Array.from(merged.keys()));
  return Array.from(merged.values());
}

// ============================================================================
// Marriage Certificate Enhanced Extraction
// ============================================================================

/**
 * Person extracted from a marriage certificate.
 * Utah-style certificates list two people with their origin/residence info.
 */
export interface MarriageCertificatePerson {
  fullName: string;
  firstName: string;
  lastName: string;
  origin?: string;      // e.g., "Arizona"
  residence?: string;   // e.g., "Salt Lake County, Utah"
}

/**
 * Raw extracted data from marriage certificate before name resolution.
 */
export interface MarriageCertificateRawData {
  certificateNumber?: string;
  marriageDate?: string;
  marriagePlace?: string;
  issueDate?: string;
  person1?: MarriageCertificatePerson;
  person2?: MarriageCertificatePerson;
}

/**
 * Enhanced extraction for marriage certificates using pattern matching on full text.
 * Specifically designed for Utah-style marriage certificates which have:
 * - License number pattern: "LIC No. 314113" or "License No: 314113"
 * - Two persons listed with format: "NAME, of COUNTRY, residing in LOCATION"
 * - Written-out marriage date: "28th day of August in the year of two thousand twenty four"
 * - Issue date: "this 16th day of August 2024"
 * - Marriage place: "city of CITY, county of COUNTY"
 */
export function extractMarriageCertificateEnhanced(
  response: GetDocumentAnalysisCommandOutput,
  _documentType: string
): { fields: ExtractedField[]; rawData: MarriageCertificateRawData } {
  const fields: ExtractedField[] = [];
  const rawData: MarriageCertificateRawData = {};
  const blocks = response.Blocks ?? [];

  // Get all LINE blocks and combine into full text
  const lineBlocks = blocks.filter(b => b.BlockType === 'LINE');
  const fullText = lineBlocks.map(b => b.Text ?? '').join(' ');

  console.log(`[MarriageCert Enhanced] Processing ${lineBlocks.length} lines`);
  console.log(`[MarriageCert Enhanced] Full text (first 2000 chars):`, fullText.substring(0, 2000));

  // Strategy 1: Extract certificate/license number
  // Patterns: "LIC No. 314113", "License No: 314113", "License Number 314113"
  const licenseMatch = fullText.match(/(?:lic(?:ense)?|certificate)\s*(?:no\.?|number|#)[:\s]*(\d+)/i);
  if (licenseMatch) {
    rawData.certificateNumber = licenseMatch[1];
    fields.push({
      canonicalField: 'marriage_certificate_number',
      rawFieldName: 'license_number_pattern',
      rawValue: licenseMatch[1],
      valueType: 'text',
      confidenceScore: 0.95,
    });
    console.log(`[MarriageCert Enhanced] Extracted certificate number: ${licenseMatch[1]}`);
  }

  // Strategy 2: Extract both person names
  // Utah format: "MICHAEL JAMES ANDERSON , of Arizona, United States and is currently residing in Provo, Utah"
  // The pattern handles: NAME , of ORIGIN and is currently residing in RESIDENCE of the age of
  const personPattern = /([A-Z][A-Z\s]+?)\s*,\s*of\s+([A-Za-z,\s]+?)(?:\s+and\s+is\s+currently\s+residing\s+in\s+|\s*,?\s*residing\s+in\s+)([A-Za-z,\s]+?)(?:\s+of\s+the\s+age|\s+years|\s*$)/gi;
  const persons: MarriageCertificatePerson[] = [];
  let personMatch;

  while ((personMatch = personPattern.exec(fullText)) !== null) {
    let fullName = personMatch[1].trim();
    // Remove common prefixes that get captured (like "you are hereby authorized to join in matrimony", "and")
    fullName = fullName.replace(/^.*?(?:join\s+in\s+matrimony\s+|matrimony\s+)/i, '').trim();
    fullName = fullName.replace(/^and\s+/i, '').trim();

    // Extract only the capitalized name parts (filter out lowercase words)
    const nameParts = fullName.split(/\s+/).filter(p => p.length > 1 && /^[A-Z]/.test(p));

    if (nameParts.length >= 2) {
      const person: MarriageCertificatePerson = {
        fullName,
        firstName: nameParts[0],
        lastName: nameParts[nameParts.length - 1],
        origin: personMatch[2].trim(),
        residence: personMatch[3].trim(),
      };
      persons.push(person);
      console.log(`[MarriageCert Enhanced] Extracted person: ${fullName} (from ${person.origin}, residing in ${person.residence})`);
    }
  }

  // Store raw person data for later name resolution
  if (persons.length >= 1) rawData.person1 = persons[0];
  if (persons.length >= 2) rawData.person2 = persons[1];

  // Strategy 3: Extract marriage date (written-out format)
  // Must be in context of "certify that on the" to distinguish from issue date
  // Pattern: "certify that on the 28th day of August in the year of two thousand twenty four"
  const marriageDateMatch = fullText.match(/certify\s+that\s+on\s+the\s+(\d{1,2}(?:st|nd|rd|th))\s+day\s+of\s+([a-z]+)\s+in\s+the\s+year\s+(?:of\s+)?([a-z\s]+?)(?:\s+in\s+the\s+city)/i);
  if (marriageDateMatch) {
    const rawDate = `${marriageDateMatch[1]} day of ${marriageDateMatch[2]} ${marriageDateMatch[3].trim()}`;
    rawData.marriageDate = rawDate;

    const dateResult = normalizeDate(rawDate);
    fields.push({
      canonicalField: 'marriage_date',
      rawFieldName: 'written_marriage_date_pattern',
      rawValue: rawDate,
      valueType: 'date',
      normalizedValue: dateResult.display
        ? {
            display: dateResult.display,
            iso: dateResult.iso,
            original: dateResult.original,
          }
        : undefined,
      confidenceScore: 0.95,
    });
    console.log(`[MarriageCert Enhanced] Extracted marriage date: ${rawDate} -> ${dateResult.display}`);
  } else {
    // Fallback: try simpler pattern with numeric year
    const simpleDateMatch = fullText.match(/certify\s+that\s+on\s+the\s+(\d{1,2}(?:st|nd|rd|th))\s+day\s+of\s+([a-z]+)[,\s]+(\d{4})/i);
    if (simpleDateMatch) {
      const rawDate = `${simpleDateMatch[1]} day of ${simpleDateMatch[2]} ${simpleDateMatch[3]}`;
      rawData.marriageDate = rawDate;

      const dateResult = normalizeDate(rawDate);
      fields.push({
        canonicalField: 'marriage_date',
        rawFieldName: 'written_marriage_date_pattern',
        rawValue: rawDate,
        valueType: 'date',
        normalizedValue: dateResult.display
          ? {
              display: dateResult.display,
              iso: dateResult.iso,
              original: dateResult.original,
            }
          : undefined,
        confidenceScore: 0.90,
      });
      console.log(`[MarriageCert Enhanced] Extracted marriage date (simple): ${rawDate} -> ${dateResult.display}`);
    }
  }

  // Strategy 4: Extract marriage place
  // Pattern: "in the city of Draper in said county of Salt Lake" or "city of Draper, county of Salt Lake"
  // The "in said county of" format is common in Utah certificates
  const placeMatch = fullText.match(/(?:in\s+the\s+)?city\s+of\s+([A-Za-z\s]+?)(?:\s+in\s+said\s+county\s+of\s+|\s*,?\s*county\s+of\s+)([A-Za-z\s]+?)(?:\s*,|\s+I\b|\s*$)/i);
  if (placeMatch) {
    const city = placeMatch[1].trim();
    const county = placeMatch[2].trim();
    const place = `${city}, ${county} County`;
    rawData.marriagePlace = place;

    fields.push({
      canonicalField: 'marriage_place',
      rawFieldName: 'city_county_pattern',
      rawValue: place,
      valueType: 'text',
      confidenceScore: 0.90,
    });
    console.log(`[MarriageCert Enhanced] Extracted marriage place: ${place}`);
  } else {
    // Fallback: just city
    const cityOnlyMatch = fullText.match(/(?:in\s+the\s+)?city\s+of\s+([A-Za-z\s]+?)(?:\s+in\s+said|\s*,|\s+I\b)/i);
    if (cityOnlyMatch) {
      const city = cityOnlyMatch[1].trim();
      rawData.marriagePlace = city;

      fields.push({
        canonicalField: 'marriage_place',
        rawFieldName: 'city_pattern',
        rawValue: city,
        valueType: 'text',
        confidenceScore: 0.85,
      });
      console.log(`[MarriageCert Enhanced] Extracted marriage place (city only): ${city}`);
    }
  }

  // Strategy 5: Extract issue date
  // Pattern: "this 16th day of August 2024" or "Given under my hand this 16th day of August, 2024"
  const issueDateMatch = fullText.match(/(?:this|given[^,]*this)\s+(\d{1,2}(?:st|nd|rd|th))\s+day\s+of\s+([a-z]+)[,\s]+(\d{4})/i);
  if (issueDateMatch) {
    const rawDate = `${issueDateMatch[1]} day of ${issueDateMatch[2]} ${issueDateMatch[3]}`;
    rawData.issueDate = rawDate;

    const dateResult = normalizeDate(rawDate);
    fields.push({
      canonicalField: 'marriage_certificate_issue_date',
      rawFieldName: 'issue_date_pattern',
      rawValue: rawDate,
      valueType: 'date',
      normalizedValue: dateResult.display
        ? {
            display: dateResult.display,
            iso: dateResult.iso,
            original: dateResult.original,
          }
        : undefined,
      confidenceScore: 0.90,
    });
    console.log(`[MarriageCert Enhanced] Extracted issue date: ${rawDate} -> ${dateResult.display}`);
  }

  console.log(`[MarriageCert Enhanced] Extracted ${fields.length} fields, ${persons.length} persons from patterns`);
  return { fields, rawData };
}

/**
 * Client name data for matching against extracted names.
 */
export interface ClientNameData {
  firstName?: string;
  lastName?: string;
}

/**
 * Extract country from origin string.
 * Handles formats like:
 * - "Brazil" -> "Brazil"
 * - "Arizona, United States" -> "United States"
 * - "United States of America" -> "United States of America"
 */
function extractCountryFromOrigin(origin: string): string | null {
  const cleaned = origin.trim();

  // If contains comma, take the last part (usually the country)
  if (cleaned.includes(',')) {
    const parts = cleaned.split(',');
    const lastPart = parts[parts.length - 1].trim();
    // Return if it looks like a country (not a US state abbreviation)
    if (lastPart.length > 2) {
      return lastPart;
    }
  }

  // Check if it's a known country name directly
  const knownCountries = [
    'Brazil', 'Mexico', 'Canada', 'United States', 'United States of America',
    'China', 'India', 'Japan', 'Korea', 'Philippines', 'Vietnam', 'Thailand',
    'United Kingdom', 'France', 'Germany', 'Italy', 'Spain', 'Portugal',
    'Argentina', 'Colombia', 'Peru', 'Chile', 'Ecuador', 'Venezuela',
    'Guatemala', 'Honduras', 'El Salvador', 'Nicaragua', 'Costa Rica', 'Panama',
    'Cuba', 'Dominican Republic', 'Haiti', 'Jamaica', 'Trinidad and Tobago',
    'Australia', 'New Zealand', 'South Africa', 'Nigeria', 'Egypt', 'Kenya',
    'Russia', 'Ukraine', 'Poland', 'Turkey', 'Iran', 'Iraq', 'Saudi Arabia',
    'Israel', 'Pakistan', 'Bangladesh', 'Indonesia', 'Malaysia', 'Singapore',
  ];

  for (const country of knownCountries) {
    if (cleaned.toLowerCase().includes(country.toLowerCase())) {
      return country;
    }
  }

  // If no match and no comma, it might be a single country name
  // Return it if it's not a US state
  const usStates = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
    'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
    'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
    'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
    'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
    'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma',
    'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
    'West Virginia', 'Wisconsin', 'Wyoming', 'District of Columbia',
  ];

  const isUsState = usStates.some(state =>
    cleaned.toLowerCase() === state.toLowerCase()
  );

  if (isUsState) {
    // It's a US state, so the person is from the United States
    return 'United States';
  }

  // Return the original if it looks like a country name (no comma, reasonable length)
  if (!cleaned.includes(',') && cleaned.length > 2 && cleaned.length < 50) {
    return cleaned;
  }

  return null;
}

/**
 * Resolve which person from the marriage certificate is the primary (client) vs spouse.
 * Uses name matching against the client's existing data.
 *
 * Scoring:
 * - +1 point if first name matches client
 * - +2 points if last name matches client (weighted higher - more distinctive)
 *
 * @returns Fields with properly assigned first_name/last_name and spouse_first_name/spouse_last_name
 */
export function resolveMarriagePrimaryAndSpouse(
  rawData: MarriageCertificateRawData,
  clientName: ClientNameData
): ExtractedField[] {
  const fields: ExtractedField[] = [];

  const { person1, person2 } = rawData;

  // If we don't have two persons, can't do name resolution
  if (!person1 && !person2) {
    console.log(`[MarriageCert Resolve] No persons extracted, skipping name resolution`);
    return fields;
  }

  // If we only have one person, assign them as primary by default
  if (!person1 || !person2) {
    const person = person1 || person2!;
    fields.push({
      canonicalField: 'first_name',
      rawFieldName: 'resolved_primary_first',
      rawValue: person.firstName,
      valueType: 'text',
      confidenceScore: 0.85,
    });
    fields.push({
      canonicalField: 'last_name',
      rawFieldName: 'resolved_primary_last',
      rawValue: person.lastName,
      valueType: 'text',
      confidenceScore: 0.85,
    });
    console.log(`[MarriageCert Resolve] Only one person found, assigned as primary: ${person.fullName}`);
    return fields;
  }

  // Score each person against client name
  function scoreMatch(person: MarriageCertificatePerson, client: ClientNameData): number {
    let score = 0;

    const personFirstLower = person.firstName.toLowerCase();
    const personLastLower = person.lastName.toLowerCase();
    const clientFirstLower = client.firstName?.toLowerCase() || '';
    const clientLastLower = client.lastName?.toLowerCase() || '';

    // First name match: +1 point
    if (clientFirstLower && personFirstLower === clientFirstLower) {
      score += 1;
    }

    // Last name match: +2 points (more distinctive)
    if (clientLastLower && personLastLower === clientLastLower) {
      score += 2;
    }

    return score;
  }

  const score1 = scoreMatch(person1, clientName);
  const score2 = scoreMatch(person2, clientName);

  console.log(`[MarriageCert Resolve] Person1 "${person1.fullName}" score: ${score1}`);
  console.log(`[MarriageCert Resolve] Person2 "${person2.fullName}" score: ${score2}`);

  // Determine primary and spouse based on scores
  let primary: MarriageCertificatePerson;
  let spouse: MarriageCertificatePerson;

  if (score1 > score2) {
    primary = person1;
    spouse = person2;
    console.log(`[MarriageCert Resolve] Person1 is primary (higher score)`);
  } else if (score2 > score1) {
    primary = person2;
    spouse = person1;
    console.log(`[MarriageCert Resolve] Person2 is primary (higher score)`);
  } else {
    // Tie or no client data - default to first-listed as primary
    primary = person1;
    spouse = person2;
    console.log(`[MarriageCert Resolve] Tie/no client data, defaulting Person1 as primary`);
  }

  // Add primary person fields
  fields.push({
    canonicalField: 'first_name',
    rawFieldName: 'resolved_primary_first',
    rawValue: primary.firstName,
    valueType: 'text',
    confidenceScore: 0.95,
  });
  fields.push({
    canonicalField: 'last_name',
    rawFieldName: 'resolved_primary_last',
    rawValue: primary.lastName,
    valueType: 'text',
    confidenceScore: 0.95,
  });

  // Extract nationality from primary person's origin (e.g., "Brazil", "Arizona, United States")
  if (primary.origin) {
    // Try to extract country from origin
    const originCountry = extractCountryFromOrigin(primary.origin);
    if (originCountry) {
      const countryResult = normalizeCountry(originCountry);
      fields.push({
        canonicalField: 'nationality',
        rawFieldName: 'resolved_primary_nationality',
        rawValue: originCountry,
        valueType: 'text',
        normalizedValue: countryResult.display
          ? {
              display: countryResult.display,
              code: countryResult.code,
              original: originCountry,
            }
          : undefined,
        confidenceScore: 0.85,
      });
      console.log(`[MarriageCert Resolve] Extracted primary nationality: ${originCountry} -> ${countryResult.display}`);
    }
  }

  // Add spouse fields
  fields.push({
    canonicalField: 'spouse_first_name',
    rawFieldName: 'resolved_spouse_first',
    rawValue: spouse.firstName,
    valueType: 'text',
    confidenceScore: 0.95,
  });
  fields.push({
    canonicalField: 'spouse_last_name',
    rawFieldName: 'resolved_spouse_last',
    rawValue: spouse.lastName,
    valueType: 'text',
    confidenceScore: 0.95,
  });

  console.log(`[MarriageCert Resolve] Assigned primary: ${primary.fullName}, spouse: ${spouse.fullName}`);

  return fields;
}

/**
 * Merge results from standard extraction with enhanced marriage certificate extraction.
 *
 * Priority rules:
 * - Certificate number: Prefer enhanced (pattern-based is more reliable for Utah format)
 * - Names: Use resolved names from enhanced extraction
 * - Dates: Prefer enhanced for written-out dates, form for standard formats
 * - Place: Prefer enhanced (city/county pattern extraction)
 */
export function mergeMarriageCertificateResults(
  formFields: ExtractedField[],
  enhancedFields: ExtractedField[]
): ExtractedField[] {
  const merged = new Map<string, ExtractedField>();

  // Enhanced extraction priority for pattern-matched fields
  const ENHANCED_PRIORITY = [
    'marriage_certificate_number',
    'marriage_certificate_issue_date',
    'marriage_date',
    'marriage_place',
    'first_name',
    'last_name',
    'spouse_first_name',
    'spouse_last_name',
    'nationality',
  ];

  // Add form fields first
  for (const field of formFields) {
    merged.set(field.canonicalField, field);
  }

  // Merge enhanced fields with priority logic
  for (const field of enhancedFields) {
    const existing = merged.get(field.canonicalField);

    if (!existing) {
      // No existing value - use enhanced
      merged.set(field.canonicalField, field);
    } else if (ENHANCED_PRIORITY.includes(field.canonicalField)) {
      // Enhanced extraction is more reliable for these fields
      // Use enhanced if confidence is higher or form value is empty
      if ((field.confidenceScore ?? 0) > (existing.confidenceScore ?? 0) ||
          !existing.rawValue || existing.rawValue.trim() === '') {
        merged.set(field.canonicalField, field);
        console.log(`[MergeMarriageCert] Overriding ${field.canonicalField} with enhanced value: ${field.rawValue}`);
      }
    }
  }

  console.log('[MergeMarriageCert] Merged fields:', Array.from(merged.keys()));
  return Array.from(merged.values());
}
