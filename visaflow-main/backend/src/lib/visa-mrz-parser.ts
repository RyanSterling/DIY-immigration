/**
 * Visa MRZ (Machine Readable Zone) Parser
 * Implements ICAO Doc 9303 MRV-A and MRV-B format parsing for visa MRZ codes.
 *
 * MRV-A Format (US Visas - 2 lines of 44 characters each):
 * Line 1: V<CTYSURNAME<<GIVEN<NAMES<<<<<<<<<<<<<<<<<<<
 * Line 2: VISANUMBER<CNTYDOB<DSEXEXPIRY<OPTIONAL<<<<CD
 *
 * Example (US H-1B Visa):
 * Line 1: VNUSATIWARI<<TENARI<<<<<<<<<<<<<<<<<<<<<<<
 * Line 2: 09196204<3NPL9107119M2510310H8KDU09SUT630236
 *
 * Positions (0-indexed):
 * Line 1:
 *   0: Document type (V = Visa)
 *   1: Document subtype (< or letter, e.g., N for nonimmigrant)
 *   2-4: Issuing country (ISO alpha-3)
 *   5-43: Name (SURNAME<<GIVEN<NAMES, padded with <)
 *
 * Line 2:
 *   0-8: Visa/document number
 *   9: Document number check digit
 *   10-12: Nationality (ISO alpha-3)
 *   13-18: Date of birth (YYMMDD)
 *   19: DOB check digit
 *   20: Sex (M/F/<)
 *   21-26: Expiry date (YYMMDD)
 *   27: Expiry date check digit
 *   28-42: Optional data
 *   43: Overall check digit (or part of optional data)
 *
 * MRV-B Format (2 lines of 36 characters each) - less common, for smaller visas
 */

export interface VisaMRZData {
  documentType: string;       // "V"
  documentSubtype: string;    // "N" for nonimmigrant, etc.
  issuingCountry: string;     // ISO alpha-3 (e.g., "USA")
  lastName: string;           // From MRZ (more reliable than visual OCR)
  firstName: string;
  visaNumber: string;         // Document number
  nationality: string;        // ISO alpha-3
  dateOfBirth: { raw: string; display: string; iso: string } | null;
  gender: string;             // M/F/X
  expiryDate: { raw: string; display: string; iso: string } | null;
  format: 'MRV-A' | 'MRV-B';
}

/**
 * Check if a line looks like a visa MRZ line.
 * MRZ lines start with V and are 44 chars (MRV-A) or 36 chars (MRV-B).
 */
export function isVisaMRZLine(line: string): boolean {
  if (!line || line.length < 36) return false;
  const trimmed = line.trim().toUpperCase();
  // First line of visa MRZ starts with V
  return trimmed.startsWith('V') && (trimmed.length >= 36);
}

/**
 * Detect the MRZ format based on line length.
 * Uses the longer of the two lines to determine format (handles OCR truncation).
 */
export function detectVisaMRZFormat(line1: string, line2?: string): 'MRV-A' | 'MRV-B' | null {
  if (!line1) return null;
  const len1 = line1.trim().length;
  const len2 = line2?.trim().length ?? 0;
  const maxLen = Math.max(len1, len2);

  if (maxLen >= 44) return 'MRV-A';
  if (maxLen >= 36) return 'MRV-B';
  return null;
}

/**
 * Parse a visa MRZ code (MRV-A or MRV-B format).
 * Handles both single-string (with newline/space) and already-split formats.
 */
export function parseVisaMRZ(mrzCode: string): VisaMRZData | null {
  if (!mrzCode) return null;

  // Normalize the MRZ code - remove extra whitespace and split into lines
  const cleaned = mrzCode.trim().replace(/\s+/g, ' ');

  // Try to split into two lines
  let lines: string[];

  // Check if it contains a newline
  if (mrzCode.includes('\n')) {
    lines = mrzCode.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  } else if (cleaned.length === 88) {
    // Two 44-character lines concatenated (MRV-A)
    lines = [cleaned.substring(0, 44), cleaned.substring(44, 88)];
  } else if (cleaned.length === 72) {
    // Two 36-character lines concatenated (MRV-B)
    lines = [cleaned.substring(0, 36), cleaned.substring(36, 72)];
  } else if (cleaned.length >= 80) {
    // Try 44+44 with potential separator
    const parts = cleaned.split(/\s+/);
    if (parts.length >= 2) {
      lines = parts;
    } else {
      console.warn('[VisaMRZ] Could not parse MRZ code - unexpected format:', cleaned.length, 'chars');
      return null;
    }
  } else {
    // Try splitting on space if it looks like two lines
    const parts = cleaned.split(' ');
    if (parts.length >= 2 && parts[0].length >= 36) {
      lines = [parts[0], parts.slice(1).join('')];
    } else {
      console.warn('[VisaMRZ] Could not parse MRZ code - unexpected format:', cleaned.length, 'chars');
      return null;
    }
  }

  if (lines.length < 2) {
    console.warn('[VisaMRZ] Could not parse MRZ code - need 2 lines, got:', lines.length);
    return null;
  }

  // Detect format based on BOTH lines (use longer line to handle OCR truncation)
  const format = detectVisaMRZFormat(lines[0], lines[1]);
  if (!format) {
    console.warn('[VisaMRZ] Could not detect MRZ format');
    return null;
  }

  const lineLength = format === 'MRV-A' ? 44 : 36;
  // Pad lines to expected length (handles OCR truncation)
  const line1 = lines[0].padEnd(lineLength, '<');
  const line2 = lines[1].padEnd(lineLength, '<');

  // Validate document type - must be 'V' for visa
  if (line1[0].toUpperCase() !== 'V') {
    console.warn('[VisaMRZ] Not a visa MRZ - document type:', line1[0]);
    return null;
  }

  // Extract fields from line 1
  const documentSubtype = line1[1] === '<' ? '' : line1[1];
  const issuingCountry = line1.substring(2, 5).replace(/</g, '');
  const namePart = line1.substring(5, lineLength);

  // Parse name: SURNAME<<GIVEN<NAMES or SURNAME<<GIVEN
  // Handle OCR errors where << separator might be missing or corrupted
  let lastName = '';
  let firstName = '';

  // First try standard format with << separator
  const namePartsStandard = namePart.split('<<');
  if (namePartsStandard.length >= 2 && namePartsStandard[1].replace(/</g, '').trim()) {
    // Standard format: SURNAME<<GIVEN<NAMES
    lastName = namePartsStandard[0]?.replace(/</g, ' ').trim() || '';
    firstName = namePartsStandard.slice(1).join(' ').replace(/</g, ' ').trim() || '';
  } else {
    // Fallback: OCR might have corrupted << to < or names run together
    // Try to find name boundary by looking for common patterns
    // Remove trailing < padding first
    const nameClean = namePart.replace(/<+$/, '');
    const nameWords = nameClean.split('<').filter(w => w.length > 0);

    if (nameWords.length >= 2) {
      // Heuristic: surnames typically have 1-2 parts, given names follow
      // For "OLIVEIRA<RODRIGUES<ANA<CAROLINA", assume last 1-2 words are given names
      if (nameWords.length === 2) {
        lastName = nameWords[0];
        firstName = nameWords[1];
      } else if (nameWords.length === 3) {
        // Could be "SURNAME SURNAME GIVEN" or "SURNAME GIVEN GIVEN"
        lastName = nameWords.slice(0, 2).join(' ');
        firstName = nameWords[2];
      } else {
        // For 4+ words, assume first 2 are surname, rest are given names
        lastName = nameWords.slice(0, 2).join(' ');
        firstName = nameWords.slice(2).join(' ');
      }
    } else if (nameWords.length === 1) {
      lastName = nameWords[0];
    }

    console.log(`[VisaMRZ] Name parsing fallback used: '${nameClean}' -> lastName='${lastName}', firstName='${firstName}'`);
  }

  // Extract fields from line 2
  const visaNumber = line2.substring(0, 9).replace(/</g, '');
  const nationality = line2.substring(10, 13).replace(/</g, '');
  const dobRaw = line2.substring(13, 19);
  const gender = line2[20] === '<' ? 'U' : line2[20].toUpperCase();
  const expiryRaw = line2.substring(21, 27);

  return {
    documentType: 'V',
    documentSubtype,
    issuingCountry,
    lastName,
    firstName,
    visaNumber,
    nationality,
    dateOfBirth: convertVisaMRZDate(dobRaw, 'birth'),
    gender,
    expiryDate: convertVisaMRZDate(expiryRaw, 'expiry'),
    format,
  };
}

/**
 * Convert MRZ date format (YYMMDD) to full date.
 *
 * Century rules:
 * - For birth dates: YY 00-30 = 2000s, YY 31-99 = 1900s
 * - For expiry dates: YY 00-50 = 2000s, YY 51-99 = 1900s
 *
 * Returns display (MM/DD/YYYY) and ISO (YYYY-MM-DD) formats.
 */
export function convertVisaMRZDate(
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
export function convertVisaMRZGender(code: string): { display: string; code: string } | null {
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

/**
 * Extract visa MRZ lines from a list of text lines.
 * Returns the combined MRZ if found.
 */
export function extractVisaMRZFromLines(lines: Array<{ text: string; confidence?: number }>): VisaMRZData | null {
  // Look for lines that look like MRZ (start with V, all caps, contain <)
  const mrzCandidates: string[] = [];

  for (const line of lines) {
    const text = line.text.trim().toUpperCase();

    // MRZ lines typically:
    // - Start with V (first line) or contain mostly alphanumeric + <
    // - Are 36-44 characters long
    // - Contain < characters
    if (text.length >= 36 && text.includes('<')) {
      // First line starts with V
      if (text.startsWith('V') && /^V[A-Z<]/.test(text)) {
        mrzCandidates.push(text);
      }
      // Second line is mostly alphanumeric with <
      else if (/^[A-Z0-9<]{36,}$/.test(text)) {
        mrzCandidates.push(text);
      }
    }
  }

  console.log(`[VisaMRZ] Found ${mrzCandidates.length} MRZ candidate lines`);

  if (mrzCandidates.length >= 2) {
    // Find the first line (starts with V) and second line (doesn't start with V)
    const line1 = mrzCandidates.find(l => l.startsWith('V'));
    const line2 = mrzCandidates.find(l => !l.startsWith('V'));

    if (line1 && line2) {
      const combined = `${line1}\n${line2}`;
      console.log(`[VisaMRZ] Attempting to parse: ${line1.substring(0, 20)}... / ${line2.substring(0, 20)}...`);
      return parseVisaMRZ(combined);
    }
  }

  return null;
}
