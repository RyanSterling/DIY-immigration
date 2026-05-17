import { useMemo, useCallback } from 'react';
import { useFormContext } from 'react-hook-form';
import type { FieldConfig, ConditionalRule } from './types';

export function useConditionalFields(fields: FieldConfig[]) {
  const { watch } = useFormContext();

  // Collect all field names that are watched for conditions
  const watchedFieldNames = useMemo(() => {
    const names = new Set<string>();
    for (const field of fields) {
      if (field.showWhen) {
        for (const rule of field.showWhen) {
          names.add(rule.field);
        }
      }
    }
    return Array.from(names);
  }, [fields]);

  // Watch all conditional fields at once
  const watchedValues = watch(watchedFieldNames);

  // Build a map of field name to current value
  const valuesMap = useMemo(() => {
    const map: Record<string, unknown> = {};
    watchedFieldNames.forEach((name, index) => {
      map[name] = watchedValues[index];
    });
    return map;
  }, [watchedFieldNames, watchedValues]);

  // Evaluate a single rule
  const evaluateRule = useCallback(
    (rule: ConditionalRule): boolean => {
      const fieldValue = valuesMap[rule.field];

      switch (rule.operator) {
        case 'equals':
          return fieldValue === rule.value;

        case 'notEquals':
          return fieldValue !== rule.value;

        case 'contains':
          if (Array.isArray(fieldValue)) {
            return fieldValue.includes(rule.value);
          }
          if (typeof fieldValue === 'string' && typeof rule.value === 'string') {
            return fieldValue.includes(rule.value);
          }
          return false;

        case 'isEmpty':
          return (
            fieldValue === undefined ||
            fieldValue === null ||
            fieldValue === '' ||
            (Array.isArray(fieldValue) && fieldValue.length === 0)
          );

        case 'isNotEmpty':
          return !(
            fieldValue === undefined ||
            fieldValue === null ||
            fieldValue === '' ||
            (Array.isArray(fieldValue) && fieldValue.length === 0)
          );

        default:
          return true;
      }
    },
    [valuesMap]
  );

  // Check if a specific field should be visible
  const isFieldVisible = useCallback(
    (fieldName: string): boolean => {
      const field = fields.find((f) => f.name === fieldName);
      if (!field || !field.showWhen || field.showWhen.length === 0) {
        return true; // No conditions = always visible
      }

      // All conditions must be true (AND logic)
      return field.showWhen.every(evaluateRule);
    },
    [fields, evaluateRule]
  );

  return { isFieldVisible };
}
