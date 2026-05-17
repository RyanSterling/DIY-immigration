import { useState, useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { ChevronDownIcon, ClockIcon } from "@heroicons/react/24/outline";
import { cn } from "~/utils/cn";
import type { ValueType } from "~/config/canonicalFields";
import { Input } from "~/atoms/Input";
import { DatePicker } from "~/atoms/DatePicker";
import { CountrySelect } from "~/atoms/CountrySelect";
import { CountryDisplay } from "./CountrySelect";
import { getCountryOptions } from "@visaflow/shared";
import {
  getDocumentTypeLabel,
  formatConfidence,
  getConfidenceBadgeClass,
} from "~/lib/document-utils";

// Field value from the stacked values API
export interface StackedFieldValue {
  id: string;
  rawValue: string;
  valueType: string;
  normalizedValue: unknown;
  documentId: string | null;
  confidenceScore: string | null;
  source: string;
  isActive: boolean;
  createdAt: Date | string;
  documentType?: string;
}

interface ClientFieldInputProps {
  name: string;
  label: string;
  historicalValues?: StackedFieldValue[];
  onHistoricalSelect?: (value: StackedFieldValue) => void;
  valueType?: ValueType;
  disabled?: boolean;
  required?: boolean | string;
  className?: string;
}

/**
 * Format display value with normalization info
 */
function formatDisplayValue(value: StackedFieldValue): string {
  const normalized = value.normalizedValue as {
    display?: string;
    original?: string;
  } | null;

  if (normalized?.display && normalized.original) {
    if (normalized.display !== normalized.original) {
      return `${normalized.display} (${normalized.original})`;
    }
  }
  return value.rawValue;
}

/**
 * Get input value for a field, handling date format conversion and country codes
 */
function getInputValue(
  value: string,
  valueType: ValueType,
  historicalValue?: StackedFieldValue
): string {
  if (valueType === "date" && historicalValue) {
    const normalized = historicalValue.normalizedValue as {
      iso?: string;
    } | null;
    if (normalized?.iso) {
      return normalized.iso;
    }
  }

  if (valueType === "country" && historicalValue) {
    const normalized = historicalValue.normalizedValue as {
      code?: string;
    } | null;
    if (normalized?.code) {
      return normalized.code;
    }
  }

  return value;
}

export function ClientFieldInput({
  name,
  label,
  historicalValues = [],
  onHistoricalSelect,
  valueType = "text",
  disabled = false,
  required = false,
  className,
}: ClientFieldInputProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { setValue } = useFormContext();

  const hasHistory = historicalValues.length > 0;

  // Clock icon button for historical values
  const historyButton =
    hasHistory && !disabled ? (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        className="p-1 text-gray-400 hover:text-gray-600 rounded"
        title="View historical values"
      >
        <ClockIcon className="h-5 w-5" />
      </button>
    ) : undefined;

  // Handle selecting a historical value
  const handleSelectHistorical = (value: StackedFieldValue) => {
    const formattedValue = getInputValue(value.rawValue, valueType, value);
    setValue(name, formattedValue, { shouldValidate: true, shouldDirty: true });
    onHistoricalSelect?.(value);
    setIsExpanded(false);
  };

  // COLLAPSED VIEW - Use RHF atoms
  if (!hasHistory || !isExpanded) {
    switch (valueType) {
      case "date":
        return (
          <div className={className}>
            <DatePicker
              name={name}
              label={label}
              disabled={disabled}
              required={required}
              endAdornment={historyButton}
            />
          </div>
        );

      case "country":
        return (
          <CountrySelect
            name={name}
            label={label}
            disabled={disabled}
            required={required}
            endAdornment={historyButton}
            className={className}
          />
        );

      case "number":
        return (
          <div className={className}>
            <Input
              name={name}
              label={label}
              type="number"
              disabled={disabled}
              required={required}
              endAdornment={historyButton}
              placeholder={`Enter ${label.toLowerCase()}`}
            />
          </div>
        );

      default: // text
        return (
          <div className={className}>
            <Input
              name={name}
              label={label}
              type="text"
              disabled={disabled}
              required={required}
              endAdornment={historyButton}
              placeholder={`Enter ${label.toLowerCase()}`}
            />
          </div>
        );
    }
  }

  // EXPANDED VIEW - Historical values browser
  return (
    <ExpandedView
      name={name}
      label={label}
      valueType={valueType}
      historicalValues={historicalValues}
      onSelectHistorical={handleSelectHistorical}
      onCollapse={() => setIsExpanded(false)}
      className={className}
    />
  );
}

// Expanded view internal component
interface ExpandedViewProps {
  name: string;
  label: string;
  valueType: ValueType;
  historicalValues: StackedFieldValue[];
  onSelectHistorical: (value: StackedFieldValue) => void;
  onCollapse: () => void;
  className?: string;
}

function ExpandedView({
  name,
  label,
  valueType,
  historicalValues,
  onSelectHistorical,
  onCollapse,
  className,
}: ExpandedViewProps) {
  const { watch, setValue } = useFormContext();
  const currentValue = (watch(name) as string) || "";

  const isCountryField = valueType === "country";
  const inputType =
    valueType === "date" ? "date" : valueType === "number" ? "number" : "text";
  const radioGroupName = useMemo(() => `field-input-${name}`, [name]);
  const countryOptions = useMemo(() => getCountryOptions(), []);

  const handleSelectManual = () => {
    // Value is already in RHF state via the input, just close
    onCollapse();
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        <button
          type="button"
          onClick={onCollapse}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronDownIcon className="h-4 w-4 rotate-180" />
          Collapse
        </button>
      </div>

      <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
        {/* Historical values */}
        {historicalValues.map((value) => (
          <label
            key={value.id}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border bg-white p-3 transition-colors",
              value.isActive
                ? "border-primary-500 ring-1 ring-primary-500"
                : "border-gray-200 hover:bg-gray-50"
            )}
          >
            <input
              type="radio"
              name={radioGroupName}
              checked={value.isActive}
              onChange={() => onSelectHistorical(value)}
              className="mt-1 h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {isCountryField ? (
                  <CountryDisplay
                    code={value.rawValue}
                    className="font-medium text-gray-900"
                  />
                ) : (
                  <span className="break-words font-medium text-gray-900">
                    {formatDisplayValue(value)}
                  </span>
                )}
                {value.confidenceScore && (
                  <span
                    className={cn(
                      "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium",
                      getConfidenceBadgeClass(value.confidenceScore)
                    )}
                  >
                    {formatConfidence(value.confidenceScore)}
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                <span>
                  {value.source === "user_edit"
                    ? "Manual entry"
                    : `From ${getDocumentTypeLabel(value.documentType)}`}
                </span>
                <span className="text-gray-300">|</span>
                <span>{new Date(value.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </label>
        ))}

        {/* Manual override option */}
        <div className="border-t border-gray-200 pt-2">
          <div className="mb-2 text-sm text-gray-600">
            {isCountryField
              ? "Or select a different country:"
              : "Or enter a different value:"}
          </div>
          <div className="flex gap-2">
            {isCountryField ? (
              <select
                value={currentValue}
                onChange={(e) => setValue(name, e.target.value)}
                className="flex-1 rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
              >
                <option value="">Select a country...</option>
                {countryOptions.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={inputType}
                value={currentValue}
                onChange={(e) => setValue(name, e.target.value)}
                className="flex-1 rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                placeholder={`Enter ${label.toLowerCase()}`}
              />
            )}
            <button
              type="button"
              onClick={handleSelectManual}
              className="rounded-md bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-100"
            >
              Use this
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
