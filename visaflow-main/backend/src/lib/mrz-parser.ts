/**
 * MRZ (Machine Readable Zone) Parser for Passports
 * Implements ICAO Doc 9303 TD3 format parsing for passport MRZ codes.
 *
 * TD3 Format (2 lines of 44 characters each):
 * Line 1: P<CTYSURNAME<<GIVEN<NAMES<<<<<<<<<<<<<<<<<<
 * Line 2: PASSPORTNBRCTYDOBGSEXEXPDATEOPTIONAL<<<<<CD
 *
 * Positions (0-indexed):
 * Line 1:
 *   0: Document type (P)
 *   1: Document type additional (<)
 *   2-4: Issuing country (ISO alpha-3)
 *   5-43: Name (SURNAME<<GIVEN<NAMES, padded with <)
 *
 * Line 2:
 *   0-8: Passport number
 *   9: Passport number check digit
 *   10-12: Nationality (ISO alpha-3)
 *   13-18: Date of birth (YYMMDD)
 *   19: DOB check digit
 *   20: Sex (M/F/<)
 *   21-26: Expiry date (YYMMDD)
 *   27: Expiry date check digit
 *   28-42: Optional data (personal number, etc.)
 *   43: Overall check digit
 */

export interface MRZData {
  documentType: string;
  issuingCountry: string;
  lastName: string;
  firstName: string;
  passportNumber: string;
  nationality: string;
  dateOfBirth: { raw: string; display: string; iso: string } | null;
  gender: string;
  expiryDate: { raw: string; display: string; iso: string } | null;
}

/**
 * Parse a passport MRZ code (TD3 format).
 * Handles both single-string (with newline/space) and already-split formats.
 */
export function parseMRZ(mrzCode: string): MRZData | null {
  if (!mrzCode) return null;

  // Normalize the MRZ code - remove extra whitespace and split into lines
  const cleaned = mrzCode.trim().replace(/\s+/g, ' ');

  // Try to split into two lines
  let lines: string[];

  // Check if it contains a newline
  if (mrzCode.includes('\n')) {
    lines = mrzCode.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  } else if (cleaned.length === 88) {
    // Two 44-character lines concatenated
    lines = [cleaned.substring(0, 44), cleaned.substring(44, 88)];
  } else if (cleaned.length === 90) {
    // Two 44-character lines with space between
    lines = [cleaned.substring(0, 44), cleaned.substring(45, 89)];
  } else {
    // Try splitting on space if it looks like two lines
    const parts = cleaned.split(' ');
    if (parts.length >= 2 && parts[0].length >= 40 && parts[1].length >= 40) {
      lines = [parts[0], parts.slice(1).join('')];
    } else {
      console.warn('[MRZ] Could not parse MRZ code - unexpected format:', mrzCode.length, 'chars');
      return null;
    }
  }

  if (lines.length < 2) {
    console.warn('[MRZ] Could not parse MRZ code - need 2 lines, got:', lines.length);
    return null;
  }

  const line1 = lines[0].padEnd(44, '<');
  const line2 = lines[1].padEnd(44, '<');

  // Validate document type
  if (line1[0] !== 'P') {
    console.warn('[MRZ] Not a passport MRZ - document type:', line1[0]);
    return null;
  }

  // Extract fields from line 1
  const issuingCountry = line1.substring(2, 5).replace(/</g, '');
  const namePart = line1.substring(5, 44);

  // Parse name: SURNAME<<GIVEN<NAMES or SURNAME<<GIVEN
  const nameParts = namePart.split('<<');
  const lastName = nameParts[0]?.replace(/</g, ' ').trim() || '';
  const firstName = nameParts.slice(1).join(' ').replace(/</g, ' ').trim() || '';

  // Extract fields from line 2
  const passportNumber = line2.substring(0, 9).replace(/</g, '');
  const nationality = line2.substring(10, 13).replace(/</g, '');
  const dobRaw = line2.substring(13, 19);
  const gender = line2[20] === '<' ? 'U' : line2[20]; // U for unspecified
  const expiryRaw = line2.substring(21, 27);

  return {
    documentType: line1[0],
    issuingCountry,
    lastName,
    firstName,
    passportNumber,
    nationality,
    dateOfBirth: convertMRZDate(dobRaw, 'birth'),
    gender,
    expiryDate: convertMRZDate(expiryRaw, 'expiry'),
  };
}

/**
 * Convert MRZ date format (YYMMDD) to full date.
 *
 * Century rules:
 * - For birth dates: YY 00-30 = 2000s, YY 31-99 = 1900s
 * - For expiry dates: YY 00-50 = 2000s, YY 51-99 = 1900s (passports don't expire 50+ years out)
 *
 * Returns display (MM/DD/YYYY) and ISO (YYYY-MM-DD) formats.
 */
export function convertMRZDate(
  yymmdd: string,
  type: 'birth' | 'expiry'
): { raw: string; display: string; iso: string } | null {
  if (!yymmdd || yymmdd.length !== 6 || yymmdd === '<<<<<<') {
    return null;
  }

  const yy = parseInt(yymmdd.substring(0, 2), 10);
  const mm = parseInt(yymmdd.substring(2, 4), 10);
  const dd = parseInt(yymmdd.substring(4, 6), 10);

  if (isNaN(yy) || isNaN(mm) || isNaN(dd)) {
    return null;
  }

  // Validate month and day
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) {
    return null;
  }

  // Determine century
  let century: number;
  if (type === 'birth') {
    // Birth dates: 00-30 = 2000s, 31-99 = 1900s
    century = yy <= 30 ? 2000 : 1900;
  } else {
    // Expiry dates: 00-50 = 2000s, 51-99 = 1900s
    century = yy <= 50 ? 2000 : 1900;
  }

  const year = century + yy;

  // Format dates
  const mmStr = String(mm).padStart(2, '0');
  const ddStr = String(dd).padStart(2, '0');

  return {
    raw: yymmdd,
    display: `${mmStr}/${ddStr}/${year}`,
    iso: `${year}-${mmStr}-${ddStr}`,
  };
}

/**
 * Convert MRZ gender code to normalized format.
 */
export function convertMRZGender(code: string): { display: string; code: string } | null {
  switch (code.toUpperCase()) {
    case 'M':
      return { display: 'Male', code: 'M' };
    case 'F':
      return { display: 'Female', code: 'F' };
    case '<':
    case 'U':
    case 'X':
      return { display: 'Unspecified', code: 'X' };
    default:
      return null;
  }
}
