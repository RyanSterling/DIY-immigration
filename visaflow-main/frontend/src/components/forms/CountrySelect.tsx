import { useMemo } from "react";
import { getCountryOptions, getCountryName } from "@visaflow/shared";
import { cn } from "~/utils/cn";
import { CountryFlag } from "~/atoms/CountryFlag";

interface CountrySelectProps {
  value: string; // ISO alpha-3 code
  onChange: (code: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

/**
 * Country select dropdown component.
 * Displays all countries sorted alphabetically, stores ISO alpha-3 codes.
 */
export function CountrySelect({
  value,
  onChange,
  disabled = false,
  className,
  placeholder = "Select a country...",
}: CountrySelectProps) {
  // Get country options once (memoized)
  const countryOptions = useMemo(() => getCountryOptions(), []);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={cn(
        "block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-gray-300 shadow-sm focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6",
        disabled && "bg-gray-50 text-gray-500 cursor-not-allowed",
        className
      )}
    >
      <option value="">{placeholder}</option>
      {countryOptions.map((country) => (
        <option key={country.code} value={country.code}>
          {country.name}
        </option>
      ))}
    </select>
  );
}

interface CountryDisplayProps {
  code: string | null | undefined;
  showFlag?: boolean;
  className?: string;
}

/**
 * Display component for country values.
 * Shows flag icon and full country name.
 */
export function CountryDisplay({
  code,
  showFlag = true,
  className,
}: CountryDisplayProps) {
  const name = code ? getCountryName(code) : null;

  if (!code) {
    return <span className={cn("text-gray-400", className)}>-</span>;
  }

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {showFlag && <CountryFlag countryCode={code} showLabel={false} />}
      <span>{name || code}</span>
    </span>
  );
}
