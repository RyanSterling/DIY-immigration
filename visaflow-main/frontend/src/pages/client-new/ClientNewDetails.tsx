import { useCallback, useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { AccordionSection } from "~/components/forms/AccordionSection";
import { FieldCategory } from "~/components/forms/FieldCategory";
import { Input } from "~/atoms/Input";
import {
  FIELD_CATEGORIES,
  categoryHasData,
  type CanonicalFieldKey,
} from "~/config/canonicalFields";
import type { ClientNewFormData, FieldValueSelection } from "./types";

export default function ClientNewDetails() {
  const { watch, setValue } = useFormContext<ClientNewFormData>();
  const fieldSelections = watch("fieldSelections") || {};

  // Handle field selection changes
  const handleFieldChange = useCallback(
    (field: string, selection: Partial<FieldValueSelection>) => {
      const currentSelection = fieldSelections[field] || {
        canonicalField: field,
        values: [],
        selectedValueId: null,
        manualValue: "",
        useManual: false,
        noValueNeeded: false,
      };

      setValue("fieldSelections", {
        ...fieldSelections,
        [field]: {
          ...currentSelection,
          ...selection,
        },
      });
    },
    [fieldSelections, setValue]
  );

  // Determine which categories should be shown
  const visibleCategories = useMemo(() => {
    return FIELD_CATEGORIES.filter(
      (category) =>
        category.alwaysShow || categoryHasData(category, fieldSelections)
    );
  }, [fieldSelections]);

  // Check if we have any extracted data at all
  const hasExtractedData = useMemo(() => {
    return Object.values(fieldSelections).some(
      (selection) => selection?.values?.length > 0
    );
  }, [fieldSelections]);

  // Count total unresolved conflicts across all fields
  const totalUnresolvedConflicts = useMemo(() => {
    return Object.values(fieldSelections).filter(
      (selection) =>
        selection?.hasConflict &&
        selection.selectedValueId === null &&
        !selection.useManual &&
        !selection.noValueNeeded
    ).length;
  }, [fieldSelections]);

  return (
    <div className="space-y-6">
      <p className="text-gray-600 text-sm">
        {hasExtractedData
          ? "Review the extracted information below. When multiple documents have different values for the same field, select the correct one or enter a custom value."
          : "Enter the client's information. You can add more details after uploading documents."}
      </p>

      {/* Conflict warning banner */}
      {totalUnresolvedConflicts > 0 && (
        <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-medium">
              {totalUnresolvedConflicts} field
              {totalUnresolvedConflicts !== 1 ? "s have" : " has"} conflicting
              values.
            </span>{" "}
            Please review and select the correct value for each highlighted field
            before creating the client.
          </p>
        </div>
      )}

      {/* Document-extracted field categories */}
      {visibleCategories.map((category, index) => (
        <FieldCategory
          key={category.id}
          title={category.title}
          fields={category.fields as CanonicalFieldKey[]}
          fieldSelections={fieldSelections}
          onFieldChange={handleFieldChange}
          defaultExpanded={index === 0} // First category expanded by default
        />
      ))}

      {/* Contact Information - always manual entry */}
      <AccordionSection title="Contact Information" defaultExpanded={true}>
        <div className="space-y-4">
          <Input
            name="email"
            label="Email Address"
            type="email"
            placeholder="client@example.com"
          />
          <Input
            name="phone"
            label="Phone Number"
            type="tel"
            placeholder="+1 (555) 123-4567"
          />
          <Input
            name="address"
            label="Address"
            placeholder="123 Main St, City, State 12345"
          />
        </div>
      </AccordionSection>
    </div>
  );
}
