/**
 * Normalization utilities for extracted field values.
 * Converts various formats to US standard display formats.
 */
import { getCountryName, isValidCountryCode } from "@visaflow/shared";

// Month abbreviations in various languages (3-letter codes)
// Consolidated to avoid duplicate keys - common abbreviations only listed once
const MONTH_ABBREVIATIONS: Record<string, number> = {
  // English (also covers common Portuguese/French overlaps)
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  // Spanish abbreviations
  ene: 1, abr: 4, ago: 8, dic: 12,
  // Full Spanish months
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
  // French unique abbreviations
  fev: 2, fév: 2, avr: 4, mai: 5, juin: 6,
  juil: 7, aou: 8, aoû: 8, déc: 12,
  // Portuguese unique abbreviations
  set: 9, out: 10, dez: 12,
};

// Full month names in English
const MONTH_NAMES: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

// Ordinal number suffixes (1st, 2nd, 3rd, etc.) to numeric values
const ORDINAL_SUFFIXES: Record<string, number> = {
  '1st': 1, '2nd': 2, '3rd': 3, '4th': 4, '5th': 5, '6th': 6, '7th': 7,
  '8th': 8, '9th': 9, '10th': 10, '11th': 11, '12th': 12, '13th': 13,
  '14th': 14, '15th': 15, '16th': 16, '17th': 17, '18th': 18, '19th': 19,
  '20th': 20, '21st': 21, '22nd': 22, '23rd': 23, '24th': 24, '25th': 25,
  '26th': 26, '27th': 27, '28th': 28, '29th': 29, '30th': 30, '31st': 31,
};

// Ordinal words (first, second, etc.) to numeric values
const ORDINAL_WORDS: Record<string, number> = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7,
  eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12, thirteenth: 13,
  fourteenth: 14, fifteenth: 15, sixteenth: 16, seventeenth: 17, eighteenth: 18,
  nineteenth: 19, twentieth: 20, 'twenty-first': 21, 'twenty-second': 22,
  'twenty-third': 23, 'twenty-fourth': 24, 'twenty-fifth': 25, 'twenty-sixth': 26,
  'twenty-seventh': 27, 'twenty-eighth': 28, 'twenty-ninth': 29, thirtieth: 30,
  'thirty-first': 31,
};

// Written-out year parts (for parsing "two thousand twenty four")
const WRITTEN_YEAR_UNITS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1000,
};

/**
 * Parse a written-out year like "two thousand twenty four" to 2024.
 */
function parseWrittenYear(yearText: string): number | null {
  const cleaned = yearText.toLowerCase().trim();

  // First check if it's a numeric year
  const numericMatch = cleaned.match(/^\d{4}$/);
  if (numericMatch) {
    return parseInt(numericMatch[0], 10);
  }

  // Parse written-out year
  // Examples: "two thousand twenty four", "two thousand and twenty four"
  const words = cleaned
    .replace(/\band\b/g, '')  // Remove "and"
    .replace(/\s+/g, ' ')     // Normalize spaces
    .trim()
    .split(' ');

  let total = 0;
  let current = 0;

  for (const word of words) {
    const value = WRITTEN_YEAR_UNITS[word];
    if (value === undefined) {
      // Skip unknown words (like "in", "the", "year", "of")
      continue;
    }

    if (value === 1000) {
      // "thousand" - multiply current accumulator by 1000
      current = current === 0 ? 1 : current;
      total += current * 1000;
      current = 0;
    } else if (value === 100) {
      // "hundred" - multiply current by 100
      current = current === 0 ? 1 : current;
      current *= 100;
    } else {
      // Regular number - add to current
      current += value;
    }
  }

  total += current;

  // Validate reasonable year range (1900-2100)
  if (total >= 1900 && total <= 2100) {
    return total;
  }

  return null;
}

/**
 * Parse a written-out date like "28th day of August in the year of two thousand twenty four".
 * Also handles simpler formats like "16th day of August 2024".
 */
function parseWrittenOutDate(value: string): { day: number; month: number; year: number } | null {
  const cleaned = value.toLowerCase().trim();

  // Pattern 1: "28th day of August in the year of two thousand twenty four"
  // Pattern 2: "16th day of August 2024"
  // Pattern 3: "first day of January 2025"

  // Extract ordinal day (number with suffix or written word)
  let day: number | null = null;

  // Try numeric ordinal first (e.g., "28th")
  const numericOrdinalMatch = cleaned.match(/(\d{1,2})(st|nd|rd|th)/);
  if (numericOrdinalMatch) {
    const ordinalKey = `${numericOrdinalMatch[1]}${numericOrdinalMatch[2]}`;
    day = ORDINAL_SUFFIXES[ordinalKey];
  }

  // Try written ordinal (e.g., "twenty-eighth", "first")
  if (!day) {
    for (const [word, num] of Object.entries(ORDINAL_WORDS)) {
      if (cleaned.includes(word)) {
        day = num;
        break;
      }
    }
  }

  if (!day) {
    return null;
  }

  // Extract month name
  let month: number | null = null;
  for (const [monthName, monthNum] of Object.entries(MONTH_NAMES)) {
    if (cleaned.includes(monthName)) {
      month = monthNum;
      break;
    }
  }

  if (!month) {
    return null;
  }

  // Extract year
  let year: number | null = null;

  // Try to find written year after month
  const yearPattern = cleaned.match(/(?:year\s+(?:of\s+)?)?(.+)$/);
  if (yearPattern) {
    // First try numeric year (e.g., "2024")
    const numericYearMatch = yearPattern[1].match(/\b(\d{4})\b/);
    if (numericYearMatch) {
      year = parseInt(numericYearMatch[1], 10);
    } else {
      // Try written year
      year = parseWrittenYear(yearPattern[1]);
    }
  }

  if (!year) {
    return null;
  }

  return { day, month, year };
}

// ISO 3166-1 alpha-3 country codes to full names
const COUNTRY_CODES: Record<string, string> = {
  // North America
  USA: 'United States', CAN: 'Canada', MEX: 'Mexico',
  // Central America
  GTM: 'Guatemala', BLZ: 'Belize', SLV: 'El Salvador', HND: 'Honduras',
  NIC: 'Nicaragua', CRI: 'Costa Rica', PAN: 'Panama',
  // South America
  ARG: 'Argentina', BOL: 'Bolivia', BRA: 'Brazil', CHL: 'Chile',
  COL: 'Colombia', ECU: 'Ecuador', GUY: 'Guyana', PRY: 'Paraguay',
  PER: 'Peru', SUR: 'Suriname', URY: 'Uruguay', VEN: 'Venezuela',
  // Caribbean
  CUB: 'Cuba', DOM: 'Dominican Republic', HTI: 'Haiti', JAM: 'Jamaica',
  PRI: 'Puerto Rico', TTO: 'Trinidad and Tobago',
  // Europe
  GBR: 'United Kingdom', FRA: 'France', DEU: 'Germany', ITA: 'Italy',
  ESP: 'Spain', PRT: 'Portugal', NLD: 'Netherlands', BEL: 'Belgium',
  CHE: 'Switzerland', AUT: 'Austria', POL: 'Poland', SWE: 'Sweden',
  NOR: 'Norway', DNK: 'Denmark', FIN: 'Finland', IRL: 'Ireland',
  GRC: 'Greece', CZE: 'Czech Republic', ROU: 'Romania', HUN: 'Hungary',
  UKR: 'Ukraine', RUS: 'Russia',
  // Asia
  CHN: 'China', JPN: 'Japan', KOR: 'South Korea', PRK: 'North Korea',
  IND: 'India', PAK: 'Pakistan', BGD: 'Bangladesh', PHL: 'Philippines',
  VNM: 'Vietnam', THA: 'Thailand', IDN: 'Indonesia', MYS: 'Malaysia',
  SGP: 'Singapore', TWN: 'Taiwan', HKG: 'Hong Kong', IRN: 'Iran',
  IRQ: 'Iraq', SAU: 'Saudi Arabia', ARE: 'United Arab Emirates',
  ISR: 'Israel', TUR: 'Turkey', AFG: 'Afghanistan',
  // Africa
  EGY: 'Egypt', NGA: 'Nigeria', ZAF: 'South Africa', KEN: 'Kenya',
  ETH: 'Ethiopia', GHA: 'Ghana', MAR: 'Morocco', DZA: 'Algeria',
  TUN: 'Tunisia', SEN: 'Senegal',
  // Oceania
  AUS: 'Australia', NZL: 'New Zealand', FJI: 'Fiji',
};

// Reverse mapping: country names to codes (for lookup)
const COUNTRY_NAMES_TO_CODES: Record<string, string> = {};
for (const [code, name] of Object.entries(COUNTRY_CODES)) {
  COUNTRY_NAMES_TO_CODES[name.toLowerCase()] = code;
}

// Nationality demonyms to ISO country codes
// Includes variations in English, Spanish, Portuguese, French
const NATIONALITY_TO_COUNTRY: Record<string, string> = {
  // Brazil
  brazilian: 'BRA',
  brasileiro: 'BRA',
  brasileira: 'BRA',
  brésilien: 'BRA',
  brésilienne: 'BRA',

  // Mexico
  mexican: 'MEX',
  mexicano: 'MEX',
  mexicana: 'MEX',

  // United States
  american: 'USA',
  estadounidense: 'USA',
  americano: 'USA',
  americana: 'USA',

  // Canada
  canadian: 'CAN',
  canadiense: 'CAN',
  canadien: 'CAN',
  canadienne: 'CAN',

  // China
  chinese: 'CHN',
  chino: 'CHN',
  china: 'CHN',
  chinois: 'CHN',
  chinoise: 'CHN',

  // India
  indian: 'IND',
  indio: 'IND',
  india: 'IND',
  indien: 'IND',
  indienne: 'IND',

  // Philippines
  filipino: 'PHL',
  filipina: 'PHL',
  philippin: 'PHL',
  philippine: 'PHL',

  // Colombia
  colombian: 'COL',
  colombiano: 'COL',
  colombiana: 'COL',
  colombien: 'COL',
  colombienne: 'COL',

  // El Salvador
  salvadoran: 'SLV',
  salvadoreño: 'SLV',
  salvadoreña: 'SLV',
  salvadorien: 'SLV',

  // Guatemala
  guatemalan: 'GTM',
  guatemalteco: 'GTM',
  guatemalteca: 'GTM',
  guatémaltèque: 'GTM',

  // Honduras
  honduran: 'HND',
  hondureño: 'HND',
  hondureña: 'HND',
  hondurien: 'HND',

  // Venezuela
  venezuelan: 'VEN',
  venezolano: 'VEN',
  venezolana: 'VEN',
  vénézuélien: 'VEN',

  // Cuba
  cuban: 'CUB',
  cubano: 'CUB',
  cubana: 'CUB',
  cubain: 'CUB',

  // Dominican Republic
  dominican: 'DOM',
  dominicano: 'DOM',
  dominicana: 'DOM',
  dominicain: 'DOM',

  // Peru
  peruvian: 'PER',
  peruano: 'PER',
  peruana: 'PER',
  péruvien: 'PER',

  // Ecuador
  ecuadorian: 'ECU',
  ecuatoriano: 'ECU',
  ecuatoriana: 'ECU',
  équatorien: 'ECU',

  // Haiti
  haitian: 'HTI',
  haitiano: 'HTI',
  haitiana: 'HTI',
  haïtien: 'HTI',
  haïtienne: 'HTI',

  // Jamaica
  jamaican: 'JAM',
  jamaicano: 'JAM',
  jamaiquino: 'JAM',
  jamaïcain: 'JAM',

  // United Kingdom
  british: 'GBR',
  británico: 'GBR',
  británica: 'GBR',
  britannique: 'GBR',

  // Germany
  german: 'DEU',
  alemán: 'DEU',
  alemana: 'DEU',
  allemand: 'DEU',
  allemande: 'DEU',

  // France
  french: 'FRA',
  francés: 'FRA',
  francesa: 'FRA',
  français: 'FRA',
  française: 'FRA',

  // Italy
  italian: 'ITA',
  italiano: 'ITA',
  italiana: 'ITA',
  italien: 'ITA',
  italienne: 'ITA',

  // Spain
  spanish: 'ESP',
  español: 'ESP',
  española: 'ESP',
  espagnol: 'ESP',
  espagnole: 'ESP',

  // Portugal
  portuguese: 'PRT',
  portugués: 'PRT',
  portuguesa: 'PRT',
  portugais: 'PRT',
  portugaise: 'PRT',

  // Japan
  japanese: 'JPN',
  japonés: 'JPN',
  japonesa: 'JPN',
  japonais: 'JPN',
  japonaise: 'JPN',

  // South Korea
  korean: 'KOR',
  coreano: 'KOR',
  coreana: 'KOR',
  coréen: 'KOR',
  coréenne: 'KOR',

  // Vietnam
  vietnamese: 'VNM',
  vietnamita: 'VNM',
  vietnamien: 'VNM',
  vietnamienne: 'VNM',

  // Nigeria
  nigerian: 'NGA',
  nigeriano: 'NGA',
  nigeriana: 'NGA',
  nigérian: 'NGA',

  // Argentina
  argentine: 'ARG',
  argentinian: 'ARG',
  argentino: 'ARG',
  argentina: 'ARG',
  argentin: 'ARG',

  // Chile
  chilean: 'CHL',
  chileno: 'CHL',
  chilena: 'CHL',
  chilien: 'CHL',
  chilienne: 'CHL',

  // Bolivia
  bolivian: 'BOL',
  boliviano: 'BOL',
  boliviana: 'BOL',
  bolivien: 'BOL',

  // Paraguay
  paraguayan: 'PRY',
  paraguayo: 'PRY',
  paraguaya: 'PRY',
  paraguayen: 'PRY',

  // Uruguay
  uruguayan: 'URY',
  uruguayo: 'URY',
  uruguaya: 'URY',
  uruguayen: 'URY',

  // Nicaragua
  nicaraguan: 'NIC',
  nicaragüense: 'NIC',
  nicaraguayen: 'NIC',

  // Costa Rica
  'costa rican': 'CRI',
  costarricense: 'CRI',
  costarricain: 'CRI',

  // Panama
  panamanian: 'PAN',
  panameño: 'PAN',
  panameña: 'PAN',
  panaméen: 'PAN',

  // Puerto Rico (US territory but often listed separately)
  'puerto rican': 'PRI',
  puertorriqueño: 'PRI',
  puertorriqueña: 'PRI',
  portoricain: 'PRI',

  // Trinidad and Tobago
  trinidadian: 'TTO',
  trinitense: 'TTO',
  trinidadien: 'TTO',

  // Ireland
  irish: 'IRL',
  irlandés: 'IRL',
  irlandesa: 'IRL',
  irlandais: 'IRL',

  // Poland
  polish: 'POL',
  polaco: 'POL',
  polaca: 'POL',
  polonais: 'POL',

  // Russia
  russian: 'RUS',
  ruso: 'RUS',
  rusa: 'RUS',
  russe: 'RUS',

  // Ukraine
  ukrainian: 'UKR',
  ucraniano: 'UKR',
  ucraniana: 'UKR',
  ukrainien: 'UKR',

  // Turkey
  turkish: 'TUR',
  turco: 'TUR',
  turca: 'TUR',
  turc: 'TUR',
  turque: 'TUR',

  // Egypt
  egyptian: 'EGY',
  egipcio: 'EGY',
  egipcia: 'EGY',
  égyptien: 'EGY',

  // South Africa
  'south african': 'ZAF',
  sudafricano: 'ZAF',
  sudafricana: 'ZAF',
  'sud-africain': 'ZAF',

  // Australia
  australian: 'AUS',
  australiano: 'AUS',
  australiana: 'AUS',
  australien: 'AUS',

  // New Zealand
  'new zealander': 'NZL',
  neozelandés: 'NZL',
  neozelandesa: 'NZL',
  'néo-zélandais': 'NZL',

  // Thailand
  thai: 'THA',
  tailandés: 'THA',
  tailandesa: 'THA',
  thaïlandais: 'THA',

  // Indonesia
  indonesian: 'IDN',
  indonesio: 'IDN',
  indonesia: 'IDN',
  indonésien: 'IDN',

  // Malaysia
  malaysian: 'MYS',
  malasio: 'MYS',
  malasia: 'MYS',
  malaisien: 'MYS',

  // Singapore
  singaporean: 'SGP',
  singapurense: 'SGP',
  singapourien: 'SGP',

  // Pakistan
  pakistani: 'PAK',
  paquistaní: 'PAK',
  pakistanais: 'PAK',

  // Bangladesh
  bangladeshi: 'BGD',
  bangladesí: 'BGD',
  bangladais: 'BGD',

  // Iran
  iranian: 'IRN',
  iraní: 'IRN',
  iranien: 'IRN',

  // Iraq
  iraqi: 'IRQ',
  iraquí: 'IRQ',
  irakien: 'IRQ',

  // Saudi Arabia
  saudi: 'SAU',
  'saudi arabian': 'SAU',
  saudí: 'SAU',
  saoudien: 'SAU',

  // Morocco
  moroccan: 'MAR',
  marroquí: 'MAR',
  marocain: 'MAR',

  // Kenya
  kenyan: 'KEN',
  keniata: 'KEN',
  keniano: 'KEN',
  kényan: 'KEN',

  // Ghana
  ghanaian: 'GHA',
  ghanés: 'GHA',
  ghanéen: 'GHA',

  // Ethiopia
  ethiopian: 'ETH',
  etíope: 'ETH',
  éthiopien: 'ETH',
};

// Gender variations
const GENDER_MAP: Record<string, { display: string; code: string }> = {
  m: { display: 'Male', code: 'M' },
  f: { display: 'Female', code: 'F' },
  male: { display: 'Male', code: 'M' },
  female: { display: 'Female', code: 'F' },
  masculino: { display: 'Male', code: 'M' },
  feminino: { display: 'Female', code: 'F' },  // Portuguese
  femenino: { display: 'Female', code: 'F' },  // Spanish
  homme: { display: 'Male', code: 'M' },
  femme: { display: 'Female', code: 'F' },
  hombre: { display: 'Male', code: 'M' },
  mujer: { display: 'Female', code: 'F' },
};

export interface NormalizedDate {
  display: string | null;  // MM/DD/YYYY format
  iso: string | null;      // YYYY-MM-DD for storage
  original: string;
}

export interface NormalizedCountry {
  display: string | null;  // Full country name
  code: string | null;     // ISO alpha-3 code
  original: string;
}

export interface NormalizedGender {
  display: string | null;  // "Male" or "Female"
  code: string | null;     // "M" or "F"
  original: string;
}

/**
 * Parse a month from a string that may contain multiple languages.
 * Handles formats like "ABR/APR" (bilingual passport format).
 */
function parseMonth(monthStr: string): number | null {
  const cleaned = monthStr.toLowerCase().trim();

  // Check if it's a bilingual format (e.g., "ABR/APR")
  if (cleaned.includes('/')) {
    const parts = cleaned.split('/');
    for (const part of parts) {
      const month = MONTH_ABBREVIATIONS[part.trim()] || MONTH_NAMES[part.trim()];
      if (month) return month;
    }
  }

  // Check direct match
  const month = MONTH_ABBREVIATIONS[cleaned] || MONTH_NAMES[cleaned];
  if (month) return month;

  // Check if it's a numeric month
  const numericMonth = parseInt(cleaned, 10);
  if (!isNaN(numericMonth) && numericMonth >= 1 && numericMonth <= 12) {
    return numericMonth;
  }

  return null;
}

/**
 * Format a date as US format (MM/DD/YYYY).
 */
function formatUSDate(day: number, month: number, year: number): string {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const yyyy = String(year).padStart(4, '0');
  return `${mm}/${dd}/${yyyy}`;
}

/**
 * Format a date as ISO format (YYYY-MM-DD).
 */
function formatISODate(day: number, month: number, year: number): string {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const yyyy = String(year).padStart(4, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Normalize a date value to US format (MM/DD/YYYY).
 * Handles various input formats including passport formats.
 */
export function normalizeDate(value: string): NormalizedDate {
  const original = value.trim();

  // Pattern 1: Passport format "DD MMM/MMM YYYY" (e.g., "09 ABR/APR 2003")
  const passportMatch = original.match(/^(\d{1,2})\s+([A-Za-z/]+)\s+(\d{4})$/i);
  if (passportMatch) {
    const day = parseInt(passportMatch[1], 10);
    const month = parseMonth(passportMatch[2]);
    const year = parseInt(passportMatch[3], 10);

    if (month && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
      return {
        display: formatUSDate(day, month, year),
        iso: formatISODate(day, month, year),
        original,
      };
    }
  }

  // Pattern 1b: Compact visa/immigration format "DDMMMYYYY" (e.g., "05NOV2025", "09APR2003")
  // No spaces between components
  const compactDateMatch = original.match(/^(\d{1,2})([A-Za-z]{3})(\d{4})$/i);
  if (compactDateMatch) {
    const day = parseInt(compactDateMatch[1], 10);
    const month = parseMonth(compactDateMatch[2]);
    const year = parseInt(compactDateMatch[3], 10);

    if (month && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
      return {
        display: formatUSDate(day, month, year),
        iso: formatISODate(day, month, year),
        original,
      };
    }
  }

  // Pattern 2: ISO format "YYYY-MM-DD"
  const isoMatch = original.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return {
        display: formatUSDate(day, month, year),
        iso: original,
        original,
      };
    }
  }

  // Pattern 3: US format "MM/DD/YYYY" or "MM-DD-YYYY"
  const usMatch = original.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (usMatch) {
    const first = parseInt(usMatch[1], 10);
    const second = parseInt(usMatch[2], 10);
    const year = parseInt(usMatch[3], 10);

    // If first number is > 12, it's likely European format (DD/MM/YYYY)
    if (first > 12 && second <= 12) {
      // European: day/month/year
      return {
        display: formatUSDate(first, second, year),
        iso: formatISODate(first, second, year),
        original,
      };
    } else if (first <= 12) {
      // US: month/day/year
      return {
        display: formatUSDate(second, first, year),
        iso: formatISODate(second, first, year),
        original,
      };
    }
  }

  // Pattern 4: Long format "Month DD, YYYY" or "DD Month YYYY"
  const longMatch1 = original.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/i);
  if (longMatch1) {
    const month = parseMonth(longMatch1[1]);
    const day = parseInt(longMatch1[2], 10);
    const year = parseInt(longMatch1[3], 10);

    if (month && day >= 1 && day <= 31) {
      return {
        display: formatUSDate(day, month, year),
        iso: formatISODate(day, month, year),
        original,
      };
    }
  }

  const longMatch2 = original.match(/^(\d{1,2})\s+([A-Za-z]+),?\s+(\d{4})$/i);
  if (longMatch2) {
    const day = parseInt(longMatch2[1], 10);
    const month = parseMonth(longMatch2[2]);
    const year = parseInt(longMatch2[3], 10);

    if (month && day >= 1 && day <= 31) {
      return {
        display: formatUSDate(day, month, year),
        iso: formatISODate(day, month, year),
        original,
      };
    }
  }

  // Pattern 5: I-94 format "YYYY Month DD" (e.g., "2023 November 29")
  const yearFirstMatch = original.match(/^(\d{4})\s+([A-Za-z]+)\s+(\d{1,2})$/i);
  if (yearFirstMatch) {
    const year = parseInt(yearFirstMatch[1], 10);
    const month = parseMonth(yearFirstMatch[2]);
    const day = parseInt(yearFirstMatch[3], 10);

    if (month && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
      return {
        display: formatUSDate(day, month, year),
        iso: formatISODate(day, month, year),
        original,
      };
    }
  }

  // Pattern 6: Written-out date format (e.g., "28th day of August in the year of two thousand twenty four")
  // This handles Utah marriage certificate style dates
  if (original.toLowerCase().includes('day of')) {
    const writtenDate = parseWrittenOutDate(original);
    if (writtenDate) {
      return {
        display: formatUSDate(writtenDate.day, writtenDate.month, writtenDate.year),
        iso: formatISODate(writtenDate.day, writtenDate.month, writtenDate.year),
        original,
      };
    }
  }

  // Could not parse - return null for display/iso but keep original
  return {
    display: null,
    iso: null,
    original,
  };
}

/**
 * Normalize a country value to full country name.
 * Handles ISO alpha-3 codes, full names, and nationality demonyms.
 * Uses i18n-iso-countries library for comprehensive country support.
 */
export function normalizeCountry(value: string): NormalizedCountry {
  const original = value.trim();
  const cleaned = original.toUpperCase();

  // 1. Check if it's an ISO alpha-3 code using the library
  if (cleaned.length === 3 && isValidCountryCode(cleaned)) {
    const displayName = getCountryName(cleaned);
    return {
      display: displayName,
      code: cleaned,
      original,
    };
  }

  // 2. Check legacy COUNTRY_CODES for backwards compatibility
  // (handles cases where the input might be in our old mapping)
  if (cleaned.length === 3 && COUNTRY_CODES[cleaned]) {
    return {
      display: COUNTRY_CODES[cleaned],
      code: cleaned,
      original,
    };
  }

  // 3. Check if it's a country name (try to find the code from legacy mapping)
  const lowerCleaned = original.toLowerCase();
  const code = COUNTRY_NAMES_TO_CODES[lowerCleaned];
  if (code) {
    const displayName = getCountryName(code) || COUNTRY_CODES[code];
    return {
      display: displayName,
      code,
      original,
    };
  }

  // 4. Check if it's a nationality demonym (e.g., "Brasileiro" -> "Brazil")
  let demonymCode = NATIONALITY_TO_COUNTRY[lowerCleaned];
  if (demonymCode) {
    const displayName = getCountryName(demonymCode) || COUNTRY_CODES[demonymCode];
    return {
      display: displayName,
      code: demonymCode,
      original,
    };
  }

  // 5. Try stripping parenthetical suffixes like "(A)" from "BRASILEIRO(A)"
  const withoutParens = lowerCleaned.replace(/\s*\([^)]*\)\s*/g, '').trim();
  if (withoutParens !== lowerCleaned) {
    demonymCode = NATIONALITY_TO_COUNTRY[withoutParens];
    if (demonymCode) {
      const displayName = getCountryName(demonymCode) || COUNTRY_CODES[demonymCode];
      return {
        display: displayName,
        code: demonymCode,
        original,
      };
    }
  }

  // Could not normalize - return original as display
  return {
    display: null,
    code: null,
    original,
  };
}

/**
 * Normalize a gender value to "Male" or "Female".
 */
export function normalizeGender(value: string): NormalizedGender {
  const original = value.trim();
  const cleaned = original.toLowerCase();

  const mapped = GENDER_MAP[cleaned];
  if (mapped) {
    return {
      display: mapped.display,
      code: mapped.code,
      original,
    };
  }

  // Could not normalize
  return {
    display: null,
    code: null,
    original,
  };
}
