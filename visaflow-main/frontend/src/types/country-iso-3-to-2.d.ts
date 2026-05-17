declare module 'country-iso-3-to-2' {
  /**
   * Convert an ISO 3166-1 alpha-3 country code to ISO 3166-1 alpha-2.
   * @param alpha3 - The alpha-3 country code (e.g., "USA", "BRA")
   * @returns The alpha-2 country code (e.g., "US", "BR") or undefined if not found
   */
  export default function getCountryISO2(alpha3: string): string | undefined;
}
