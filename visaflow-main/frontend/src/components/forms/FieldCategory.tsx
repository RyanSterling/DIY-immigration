import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { AccordionSection } from "./AccordionSection";
import { FieldValueSelector } from "./FieldValueSelector";
import {
  CANONICAL_FIELDS,
  getFieldDisplayName,
  getFieldType,
  type CanonicalFieldKey,
} from "~/config/canonicalFields";
import type { FieldValueSelection } from "~/pages/client-new/types";

interface FieldCategoryProps {
  title: string;
  fields: CanonicalFieldKey[];
  fieldSelections: Record<string, FieldValueSelection>;
  onFieldChange: (
    field: string,
    selection: Partial<FieldValueSelection>
  ) => void;
  defaultExpanded?: boolean;
  className?: string;
}

export function FieldCategory({
  title,
  fields,
  fieldSelections,
  onFieldChange,
  defaultExpanded = false,
  className,
}: FieldCategoryProps) {
  // Count how many fields have data
  const fieldsWithData = fields.filter(
    (field) =>
      fieldSelections[field]?.values?.length > 0 ||
      fieldSelections[field]?.manualValue
  ).length;

  // Count unresolved conflicts in this category
  const unresolvedConflicts = fields.filter((field) => {
    const selection = fieldSelections[field];
    if (!selection) return false;
    return (
      selection.hasConflict &&
      selection.selectedValueId === null &&
      !selection.useManual &&
      !selection.noValueNeeded
    );
  }).length;

  const handleFieldSelectionChange = (
    field: string,
    valueId: string | null,
    useManual: boolean,
    manualValue?: string,
    noValueNeeded?: boolean
  ) => {
    onFieldChange(field, {
      selectedValueId: valueId,
      useManual,
      manualValue: manualValue ?? fieldSelections[field]?.manualValue ?? "",
      noValueNeeded: noValueNeeded ?? false,
    });
  };

  return (
    <AccordionSection
      title={title}
      defaultExpanded={defaultExpanded}
      rightContent={
        <div className="flex items-center gap-3">
          {unresolvedConflicts > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
              <ExclamationTriangleIcon className="h-3.5 w-3.5" />
              {unresolvedConflicts} conflict{unresolvedConflicts !== 1 ? "s" : ""}
            </span>
          )}
          {fieldsWithData > 0 && (
            <span className="text-sm text-gray-500">
              {fieldsWithData} field{fieldsWithData !== 1 ? "s" : ""} with data
            </span>
          )}
        </div>
      }
      className={className}
    >
      <div className="space-y-6">
        {fields.map((field) => {
          // Only show fields that exist in CANONICAL_FIELDS
          if (!(field in CANONICAL_FIELDS)) {
            return null;
          }

          const selection = fieldSelections[field] ?? {
            canonicalField: field,
            values: [],
            selectedValueId: null,
            manualValue: "",
            useManual: false,
            noValueNeeded: false,
          };

          return (
            <FieldValueSelector
              key={field}
              label={getFieldDisplayName(field)}
              values={selection.values}
              selectedValueId={selection.selectedValueId}
              manualValue={selection.manualValue}
              useManual={selection.useManual}
              noValueNeeded={selection.noValueNeeded ?? false}
              valueType={getFieldType(field)}
              hasConflict={selection.hasConflict}
              onSelectionChange={(valueId, useManual, manualValue, noValueNeeded) =>
                handleFieldSelectionChange(field, valueId, useManual, manualValue, noValueNeeded)
              }
            />
          );
        })}
      </div>
    </AccordionSection>
  );
}
