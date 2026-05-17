import type { FormTemplateValues, FormSectionValues, FormFieldValues } from './formTemplateSchema';
import type { FullSaveTemplateInput, FullSaveSectionInput, FullSaveFieldInput } from '~/hooks/useAdminFormTemplates';

/**
 * Compare two objects shallowly, returning true if any values differ.
 * Used for detecting changes in template metadata.
 */
function hasMetadataChanges(
  original: Pick<FormTemplateValues, 'formNumber' | 'title' | 'revision' | 'pdfTemplateUrl' | 'organizationId'>,
  current: Pick<FormTemplateValues, 'formNumber' | 'title' | 'revision' | 'pdfTemplateUrl' | 'organizationId'>
): boolean {
  return (
    original.formNumber !== current.formNumber ||
    original.title !== current.title ||
    original.revision !== current.revision ||
    original.pdfTemplateUrl !== current.pdfTemplateUrl ||
    original.organizationId !== current.organizationId
  );
}

/**
 * Compare two section objects (excluding fields) for changes.
 */
function hasSectionChanges(
  original: FormSectionValues,
  current: FormSectionValues
): boolean {
  return (
    original.sectionKey !== current.sectionKey ||
    original.title !== current.title ||
    original.description !== current.description ||
    original.helpText !== current.helpText ||
    original.isRequired !== current.isRequired ||
    original.orderIndex !== current.orderIndex ||
    JSON.stringify(original.buttonConfig) !== JSON.stringify(current.buttonConfig)
  );
}

/**
 * Compare two field objects for changes.
 */
function hasFieldChanges(
  original: FormFieldValues,
  current: FormFieldValues
): boolean {
  return (
    original.name !== current.name ||
    original.label !== current.label ||
    original.fieldType !== current.fieldType ||
    original.placeholder !== current.placeholder ||
    original.helpText !== current.helpText ||
    original.defaultValue !== current.defaultValue ||
    original.width !== current.width ||
    original.className !== current.className ||
    original.isRequired !== current.isRequired ||
    original.disabled !== current.disabled ||
    original.hideLabel !== current.hideLabel ||
    original.orderIndex !== current.orderIndex ||
    JSON.stringify(original.options) !== JSON.stringify(current.options) ||
    JSON.stringify(original.showWhen) !== JSON.stringify(current.showWhen) ||
    JSON.stringify(original.pdfMappings) !== JSON.stringify(current.pdfMappings) ||
    JSON.stringify(original.validationRules) !== JSON.stringify(current.validationRules) ||
    JSON.stringify(original.fieldConfig) !== JSON.stringify(current.fieldConfig) ||
    JSON.stringify(original.autofillMapping) !== JSON.stringify(current.autofillMapping)
  );
}

/**
 * Convert a form field to the API input format.
 */
function fieldToInput(field: FormFieldValues, includeId: boolean = true): FullSaveFieldInput {
  return {
    ...(includeId && field.id ? { id: field.id } : {}),
    ...(field._deleted ? { _deleted: true } : {}),
    name: field.name,
    label: field.label,
    fieldType: field.fieldType,
    placeholder: field.placeholder,
    helpText: field.helpText,
    defaultValue: field.defaultValue,
    width: field.width,
    className: field.className,
    isRequired: field.isRequired,
    disabled: field.disabled,
    hideLabel: field.hideLabel,
    orderIndex: field.orderIndex,
    options: field.options,
    showWhen: field.showWhen,
    pdfMappings: field.pdfMappings,
    validationRules: field.validationRules,
    fieldConfig: field.fieldConfig,
    autofillMapping: field.autofillMapping,
  };
}

/**
 * Convert a form section to the API input format.
 */
function sectionToInput(section: FormSectionValues, fields: FullSaveFieldInput[], includeId: boolean = true): FullSaveSectionInput {
  return {
    ...(includeId && section.id ? { id: section.id } : {}),
    ...(section._deleted ? { _deleted: true } : {}),
    sectionKey: section.sectionKey,
    title: section.title,
    description: section.description,
    helpText: section.helpText,
    isRequired: section.isRequired,
    orderIndex: section.orderIndex,
    buttonConfig: section.buttonConfig,
    fields,
  };
}

export interface ComputeChangesResult {
  /** Whether there are any changes at all */
  hasChanges: boolean;
  /** Whether template metadata has changed */
  hasTemplateMetadataChanges: boolean;
  /** Whether any sections or fields have changed */
  hasSectionChanges: boolean;
  /** The payload to send to the API (only includes changed items) */
  payload: FullSaveTemplateInput;
}

/**
 * Compute the changes between the original template data and the current form values.
 * Returns a payload optimized to only include changed items.
 *
 * @param original - The original template data from the API (or null for new templates)
 * @param current - The current form values
 * @returns Object containing change flags and optimized API payload
 */
export function computeChanges(
  original: FormTemplateValues | null,
  current: FormTemplateValues
): ComputeChangesResult {
  const result: ComputeChangesResult = {
    hasChanges: false,
    hasTemplateMetadataChanges: false,
    hasSectionChanges: false,
    payload: {},
  };

  // If no original, everything is new
  if (!original) {
    result.hasChanges = true;
    result.hasTemplateMetadataChanges = true;
    result.hasSectionChanges = current.sections.length > 0;
    result.payload = {
      formNumber: current.formNumber,
      title: current.title,
      revision: current.revision,
      pdfTemplateUrl: current.pdfTemplateUrl,
      organizationId: current.organizationId,
      sections: current.sections.map((section) =>
        sectionToInput(section, section.fields.map((field) => fieldToInput(field, false)), false)
      ),
    };
    return result;
  }

  // Check template metadata changes
  if (hasMetadataChanges(original, current)) {
    result.hasChanges = true;
    result.hasTemplateMetadataChanges = true;
    result.payload.formNumber = current.formNumber;
    result.payload.title = current.title;
    result.payload.revision = current.revision;
    result.payload.pdfTemplateUrl = current.pdfTemplateUrl;
    result.payload.organizationId = current.organizationId;
  }

  // Build maps for quick lookup of original sections and fields by ID
  const originalSectionsById = new Map<string, FormSectionValues>();
  const originalFieldsById = new Map<string, { sectionId: string; field: FormFieldValues }>();

  for (const section of original.sections) {
    if (section.id) {
      originalSectionsById.set(section.id, section);
      for (const field of section.fields) {
        if (field.id) {
          originalFieldsById.set(field.id, { sectionId: section.id, field });
        }
      }
    }
  }

  // Track which original sections/fields are still present
  const seenSectionIds = new Set<string>();
  const seenFieldIds = new Set<string>();

  // Process current sections
  const sectionsPayload: FullSaveSectionInput[] = [];

  for (const currentSection of current.sections) {
    const fieldsPayload: FullSaveFieldInput[] = [];
    let sectionHasChanges = false;

    // Process fields in this section
    for (const currentField of currentSection.fields) {
      // Field marked for deletion
      if (currentField._deleted && currentField.id) {
        fieldsPayload.push({ id: currentField.id, _deleted: true });
        sectionHasChanges = true;
        continue;
      }

      // New field (no id, has _tempId)
      if (!currentField.id) {
        fieldsPayload.push(fieldToInput(currentField, false));
        sectionHasChanges = true;
        continue;
      }

      // Existing field - check for changes
      seenFieldIds.add(currentField.id);
      const originalFieldData = originalFieldsById.get(currentField.id);

      if (originalFieldData && hasFieldChanges(originalFieldData.field, currentField)) {
        fieldsPayload.push(fieldToInput(currentField, true));
        sectionHasChanges = true;
      }
    }

    // Section marked for deletion
    if (currentSection._deleted && currentSection.id) {
      sectionsPayload.push({ id: currentSection.id, _deleted: true });
      result.hasSectionChanges = true;
      continue;
    }

    // New section (no id, has _tempId)
    if (!currentSection.id) {
      sectionsPayload.push(sectionToInput(currentSection, fieldsPayload, false));
      result.hasSectionChanges = true;
      continue;
    }

    // Existing section - check for changes
    seenSectionIds.add(currentSection.id);
    const originalSection = originalSectionsById.get(currentSection.id);

    if (originalSection) {
      const sectionMetadataChanged = hasSectionChanges(originalSection, currentSection);

      if (sectionMetadataChanged || sectionHasChanges) {
        sectionsPayload.push(sectionToInput(currentSection, fieldsPayload, true));
        result.hasSectionChanges = true;
      }
    }
  }

  // Check for deleted sections (in original but not in current)
  for (const [sectionId] of originalSectionsById) {
    if (!seenSectionIds.has(sectionId)) {
      // Section was removed from the form - mark as deleted
      sectionsPayload.push({ id: sectionId, _deleted: true });
      result.hasSectionChanges = true;
    }
  }

  // Check for deleted fields (in original but not in current)
  for (const [fieldId, { sectionId }] of originalFieldsById) {
    if (!seenFieldIds.has(fieldId)) {
      // Field was removed - find the section in payload or add deletion
      const existingSectionPayload = sectionsPayload.find(s => s.id === sectionId);
      if (existingSectionPayload && existingSectionPayload.fields) {
        existingSectionPayload.fields.push({ id: fieldId, _deleted: true });
      } else if (!sectionsPayload.find(s => s.id === sectionId && s._deleted)) {
        // Section still exists but field was removed
        sectionsPayload.push({
          id: sectionId,
          fields: [{ id: fieldId, _deleted: true }],
        });
      }
      result.hasSectionChanges = true;
    }
  }

  // Only include sections in payload if there are changes
  if (result.hasSectionChanges) {
    result.payload.sections = sectionsPayload;
    result.hasChanges = true;
  }

  result.hasChanges = result.hasTemplateMetadataChanges || result.hasSectionChanges;

  return result;
}

/**
 * Simple check to see if there are any changes at all.
 * Useful for enabling/disabling the save button.
 */
export function hasAnyChanges(
  original: FormTemplateValues | null,
  current: FormTemplateValues
): boolean {
  return computeChanges(original, current).hasChanges;
}
