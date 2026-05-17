/**
 * Country utilities using i18n-iso-countries library.
 * Provides consistent API for country code/name lookups.
 */
import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";

// Register English locale
countries.registerLocale(enLocale);

export interface CountryOption {
  code: string; // ISO alpha-3 code
  name: string; // English country name
}

/**
 * Get country name from ISO alpha-3 code.
 * @param alpha3Code - ISO 3166-1 alpha-3 code (e.g., "USA")
 * @returns Country name or null if not found
 */
export function getCountryName(alpha3Code: string | null | undefined): string | null {
  if (!alpha3Code) return null;
  const name = countries.getName(alpha3Code.toUpperCase(), "en");
  return name || null;
}

/**
 * Check if a string is a valid ISO alpha-3 country code.
 * @param code - Code to validate
 * @returns True if valid alpha-3 code
 */
export function isValidCountryCode(code: string | null | undefined): boolean {
  if (!code) return false;
  return countries.isValid(code.toUpperCase());
}

/**
 * Get all countries as options for a dropdown.
 * Sorted alphabetically by name.
 * @returns Array of { code, name } objects
 */
export function getCountryOptions(): CountryOption[] {
  const alpha3Codes = countries.getAlpha3Codes();
  const options: CountryOption[] = [];

  for (const alpha3 of Object.keys(alpha3Codes)) {
    const name = countries.getName(alpha3, "en");
    if (name) {
      options.push({ code: alpha3, name });
    }
  }

  return options.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Convert ISO alpha-2 code to alpha-3.
 * @param alpha2Code - ISO alpha-2 code (e.g., "US")
 * @returns ISO alpha-3 code or null
 */
export function alpha2ToAlpha3(alpha2Code: string | null | undefined): string | null {
  if (!alpha2Code) return null;
  const alpha3 = countries.alpha2ToAlpha3(alpha2Code.toUpperCase());
  return alpha3 || null;
}

/**
 * Convert ISO alpha-3 code to alpha-2.
 * @param alpha3Code - ISO alpha-3 code (e.g., "USA")
 * @returns ISO alpha-2 code or null
 */
export function alpha3ToAlpha2(alpha3Code: string | null | undefined): string | null {
  if (!alpha3Code) return null;
  const alpha2 = countries.alpha3ToAlpha2(alpha3Code.toUpperCase());
  return alpha2 || null;
}
