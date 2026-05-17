import { useMemo } from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { cn } from "~/utils/cn";
import type { ExtractedFieldValue } from "~/pages/client-new/types";
import type { ValueType } from "~/config/canonicalFields";
import {
  getDocumentTypeLabel,
  formatConfidence,
  getConfidenceBadgeClass,
} from "~/lib/document-utils";

interface FieldValueSelectorProps {
  label: string;
  values: ExtractedFieldValue[];
  selectedValueId: string | null;
  manualValue: string;
  useManual: boolean;
  noValueNeeded: boolean;
  onSelectionChange: (
    valueId: string | null,
    useManual: boolean,
    manualValue?: string,
    noValueNeeded?: boolean
  ) => void;
  valueType?: ValueType;
  className?: string;
  hasConflict?: boolean;
}

/**
 * Get input type based on value type
 */
function getInputType(valueType: ValueType): string {
  switch (valueType) {
    case "date":
      return "date";
    case "number":
      return "number";
    default:
      return "text";
  }
}

/**
 * Format display value with original in parentheses if normalized.
 * Example: "04/09/2003 (09 ABR/APR 2003)" or "Mexico (MEX)"
 */
function formatDisplayValue(value: ExtractedFieldValue): string {
  // If we have a normalized value with a different display than original, show both
  if (value.normalizedValue?.display && value.normalizedValue.original) {
    // Only show parentheses if display is different from original
    if (value.normalizedValue.display !== value.normalizedValue.original) {
      return `${value.normalizedValue.display} (${value.normalizedValue.original})`;
    }
  }
  // Fall back to the value (which is normalized display or raw value)
  return value.value;
}

export function FieldValueSelector({
  label,
  values,
  selectedValueId,
  manualValue,
  useManual,
  noValueNeeded,
  onSelectionChange,
  valueType = "text",
  className,
  hasConflict = false,
}: FieldValueSelectorProps) {
  const hasExtractedValues = values.length > 0;
  const inputType = getInputType(valueType);

  // Show conflict warning when there's a conflict and no selection has been made
  const showConflictWarning = hasConflict && selectedValueId === null && !useManual && !noValueNeeded;

  // Generate a unique name for the radio group
  const radioGroupName = useMemo(
    () => `field-selector-${label.toLowerCase().replace(/\s+/g, "-")}`,
    [label]
  );

  const handleRadioChange = (valueId: string) => {
    onSelectionChange(valueId, false, manualValue, false);
  };

  const handleManualSelect = () => {
    onSelectionChange(null, true, manualValue, false);
  };

  const handleManualInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSelectionChange(null, true, e.target.value, false);
  };

  const handleNoValueNeeded = () => {
    onSelectionChange(null, false, manualValue, true);
  };

  // If no extracted values, show simple input
  if (!hasExtractedValues) {
    return (
      <div className={cn("space-y-1", className)}>
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        <input
          type={inputType}
          value={manualValue}
          onChange={handleManualInputChange}
          className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-gray-300 shadow-sm placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
          placeholder={`Enter ${label.toLowerCase()}`}
        />
      </div>
    );
  }

  // Show radio options for extracted values + manual override
  return (
    <div
      className={cn(
        "space-y-2",
        showConflictWarning && "ring-2 ring-amber-400 ring-offset-2 rounded-lg p-3",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        {showConflictWarning && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
            <ExclamationTriangleIcon className="h-3.5 w-3.5" />
            Selection required
          </span>
        )}
      </div>

      <div className="space-y-2">
        {/* Extracted value options */}
        {values.map((value) => (
          <label
            key={value.id}
            className={cn(
              "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
              selectedValueId === value.id && !useManual
                ? "border-primary-500 bg-primary-50 ring-1 ring-primary-500"
                : "border-gray-200 hover:bg-gray-50"
            )}
          >
            <input
              type="radio"
              name={radioGroupName}
              checked={selectedValueId === value.id && !useManual}
              onChange={() => handleRadioChange(value.id)}
              className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-gray-900 wrap-break-word">
                  {formatDisplayValue(value)}
                </span>
                {value.confidenceScore !== undefined && (
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                      getConfidenceBadgeClass(value.confidenceScore)
                    )}
                  >
                    {formatConfidence(value.confidenceScore)}
                  </span>
                )}
              </div>
              {value.documentType && (
                <span className="text-sm text-gray-500">
                  from {getDocumentTypeLabel(value.documentType)}
                </span>
              )}
            </div>
          </label>
        ))}

        {/* Manual override option */}
        <label
          className={cn(
            "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
            useManual
              ? "border-primary-500 bg-primary-50 ring-1 ring-primary-500"
              : "border-gray-200 hover:bg-gray-50"
          )}
        >
          <input
            type="radio"
            name={radioGroupName}
            checked={useManual}
            onChange={handleManualSelect}
            className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-gray-700">Enter different value</span>
            </div>
            {useManual && (
              <input
                type={inputType}
                value={manualValue}
                onChange={handleManualInputChange}
                onClick={(e) => e.stopPropagation()}
                className="mt-2 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-gray-300 shadow-sm placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                placeholder={`Enter ${label.toLowerCase()}`}
                autoFocus
              />
            )}
          </div>
        </label>

        {/* No value needed option */}
        <label
          className={cn(
            "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
            noValueNeeded
              ? "border-primary-500 bg-primary-50 ring-1 ring-primary-500"
              : "border-gray-200 hover:bg-gray-50"
          )}
        >
          <input
            type="radio"
            name={radioGroupName}
            checked={noValueNeeded}
            onChange={handleNoValueNeeded}
            className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
          />
          <div className="flex-1 min-w-0">
            <span className="text-gray-700">No value needed</span>
            <p className="text-sm text-gray-500">This field will be left empty</p>
          </div>
        </label>
      </div>
    </div>
  );
}
