import { useFormContext, useWatch } from 'react-hook-form';
import { useMemo } from 'react';
import type { FormTemplateValues, FormSectionValues, FormFieldValues } from './formTemplateSchema';

export interface ItemStatus {
  /** Item is new (not yet saved to database) */
  isNew: boolean;
  /** Item is marked for deletion */
  isDeleted: boolean;
  /** Item has been modified from original */
  isDirty: boolean;
  /** Combined status - any of the above is true */
  hasChanges: boolean;
}

interface UseDirtyStatusOptions {
  /** Original values to compare against for dirty detection */
  originalValues: FormTemplateValues | null;
}

/**
 * Hook to get dirty/new/deleted status for sections and fields.
 * Uses React Hook Form's formState and compares against original values.
 */
export function useDirtyStatus({ originalValues }: UseDirtyStatusOptions) {
  const { control } = useFormContext<FormTemplateValues>();

  // Watch sections for changes
  const sections = useWatch({ control, name: 'sections' }) ?? [];

  // Build lookup maps for original data
  const originalMaps = useMemo(() => {
    if (!originalValues) {
      return { sections: new Map(), fields: new Map() };
    }

    const sectionsMap = new Map<string, FormSectionValues>();
    const fieldsMap = new Map<string, FormFieldValues>();

    for (const section of originalValues.sections) {
      if (section.id) {
        sectionsMap.set(section.id, section);
        for (const field of section.fields) {
          if (field.id) {
            fieldsMap.set(field.id, field);
          }
        }
      }
    }

    return { sections: sectionsMap, fields: fieldsMap };
  }, [originalValues]);

  /**
   * Get status for a section at the given index.
   */
  const getSectionStatus = (sectionIndex: number): ItemStatus => {
    const section = sections[sectionIndex];

    if (!section) {
      return { isNew: false, isDeleted: false, isDirty: false, hasChanges: false };
    }

    const isNew = !section.id && !!section._tempId;
    const isDeleted = !!section._deleted;

    // Check if dirty (modified from original)
    let isDirty = false;
    if (section.id && !isDeleted) {
      const original = originalMaps.sections.get(section.id);
      if (original) {
        isDirty = isSectionDirty(original, section);
      }
    }

    return {
      isNew,
      isDeleted,
      isDirty,
      hasChanges: isNew || isDeleted || isDirty,
    };
  };

  /**
   * Get status for a field at the given section and field indices.
   */
  const getFieldStatus = (sectionIndex: number, fieldIndex: number): ItemStatus => {
    const section = sections[sectionIndex];
    const field = section?.fields?.[fieldIndex];

    if (!field) {
      return { isNew: false, isDeleted: false, isDirty: false, hasChanges: false };
    }

    const isNew = !field.id && !!field._tempId;
    const isDeleted = !!field._deleted;

    // Check if dirty (modified from original)
    let isDirty = false;
    if (field.id && !isDeleted) {
      const original = originalMaps.fields.get(field.id);
      if (original) {
        isDirty = isFieldDirty(original, field);
      }
    }

    return {
      isNew,
      isDeleted,
      isDirty,
      hasChanges: isNew || isDeleted || isDirty,
    };
  };

  /**
   * Check if any section or field has changes.
   */
  const hasAnyChanges = useMemo(() => {
    for (let i = 0; i < sections.length; i++) {
      const sectionStatus = getSectionStatus(i);
      if (sectionStatus.hasChanges) return true;

      const section = sections[i];
      for (let j = 0; j < (section?.fields?.length ?? 0); j++) {
        const fieldStatus = getFieldStatus(i, j);
        if (fieldStatus.hasChanges) return true;
      }
    }
    return false;
  }, [sections, originalMaps]);

  return {
    getSectionStatus,
    getFieldStatus,
    hasAnyChanges,
  };
}

/**
 * Compare section properties (excluding fields) for changes.
 */
function isSectionDirty(original: FormSectionValues, current: FormSectionValues): boolean {
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
 * Compare field properties for changes.
 */
function isFieldDirty(original: FormFieldValues, current: FormFieldValues): boolean {
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
