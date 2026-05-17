import type { FieldErrors } from "react-hook-form";
import type { FormSection } from "~/hooks/useFormTemplates";
import type { ClientDetail } from "~/hooks/useClients";

/**
 * Builds autofill data by mapping template form fields to client data.
 * Uses the autofillMapping on each field to lookup the corresponding
 * canonical field value from the client's activeValues.
 */
export function buildAutofillData(
  sections: FormSection[],
  clientActiveValues: ClientDetail["activeValues"]
): Record<string, unknown> {
  const autofillData: Record<string, unknown> = {};

  if (!clientActiveValues) return autofillData;

  for (const section of sections) {
    for (const field of section.fields) {
      if (field.autofillMapping?.canonicalField) {
        const canonicalField = field.autofillMapping.canonicalField;
        const clientValue = clientActiveValues[canonicalField];

        if (clientValue) {
          let value: string | null = null;

          // Use normalized value when available
          if (clientValue.normalizedValue) {
            const normalized = clientValue.normalizedValue;

            // For dates, use ISO format for form date pickers
            if (normalized.iso) {
              value = normalized.iso;
            }
            // For gender, use lowercase display to match form radio options
            else if (canonicalField === "gender" && normalized.display) {
              value = normalized.display.toLowerCase();
            }
            // For other fields with normalized display value
            else if (normalized.display) {
              value = normalized.display;
            }
          }

          // Fallback to rawValue if no suitable normalized value
          if (!value && clientValue.rawValue) {
            value = clientValue.rawValue;
          }

          if (value) {
            autofillData[field.name] = value;
          }
        } else if (field.autofillMapping.fallbackValue) {
          autofillData[field.name] = field.autofillMapping.fallbackValue;
        }
      }
    }
  }

  return autofillData;
}

export function getErrorMessage(
  name: string,
  errors: FieldErrors
): string | undefined {
  // Handle nested field names (e.g., "items.0.name")
  const parts = name.split(".");
  let current: unknown = errors;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return (current as { message?: string })?.message;
}
