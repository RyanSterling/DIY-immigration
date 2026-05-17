import ReactCountryFlag from "react-country-flag";
import getCountryISO2 from "country-iso-3-to-2";

interface CountryFlagProps {
  countryCode?: string | null;
  showLabel?: boolean;
  className?: string;
}

/**
 * Convert ISO alpha-3 code to alpha-2, or pass through if already alpha-2.
 * react-country-flag requires alpha-2 codes, but MRZ extraction returns alpha-3.
 */
function toAlpha2(code: string | null | undefined): string | null {
  if (!code) return null;
  const upper = code.toUpperCase();
  // If already alpha-2 (2 chars), return as-is
  if (upper.length === 2) return upper;
  // Convert alpha-3 to alpha-2 using package
  return getCountryISO2(upper) || null;
}

export function CountryFlag({
  countryCode,
  showLabel = true,
  className,
}: CountryFlagProps) {
  const flagWidth = "1.5em";
  const alpha2Code = toAlpha2(countryCode);

  return (
    <span
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
    >
      {alpha2Code ? (
        <ReactCountryFlag
          countryCode={alpha2Code}
          svg
          style={{ width: flagWidth, height: "auto" }}
        />
      ) : (
        <span style={{ width: flagWidth, display: "inline-block" }} />
      )}
      {showLabel && <span>{countryCode || "-"}</span>}
    </span>
  );
}
