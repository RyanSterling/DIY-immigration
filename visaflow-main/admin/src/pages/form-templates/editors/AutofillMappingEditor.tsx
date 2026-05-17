import { useController, useFormContext } from 'react-hook-form';
import { Input } from '~/components/forms/Input';

interface AutofillMappingValue {
  canonicalField: string;
  transformationRule?: string | null;
  fallbackValue?: string | null;
}

interface AutofillMappingEditorProps {
  name: string;
}

/**
 * Autofill mapping editor for connecting form fields to canonical data fields.
 * Integrates with React Hook Form via useController.
 */
export function AutofillMappingEditor({ name }: AutofillMappingEditorProps) {
  const { control } = useFormContext();
  const {
    field: { value, onChange },
  } = useController({
    name,
    control,
  });

  const mapping = value as AutofillMappingValue | null | undefined;
  const hasMapping = !!mapping?.canonicalField;

  const handleToggle = () => {
    if (hasMapping) {
      onChange(null);
    } else {
      onChange({ canonicalField: '', transformationRule: null, fallbackValue: null });
    }
  };

  const handleFieldChange = (field: keyof AutofillMappingValue, newValue: string) => {
    onChange({
      ...mapping,
      [field]: newValue || null,
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={hasMapping}
          onChange={handleToggle}
          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        <label className="text-sm font-medium text-gray-700">Enable Autofill Mapping</label>
      </div>
      {hasMapping && (
        <div className="ml-6 space-y-3">
          <Input
            label="Canonical Field"
            value={mapping?.canonicalField || ''}
            onChange={(e) => handleFieldChange('canonicalField', e.target.value)}
            placeholder="e.g., client.firstName"
          />
          <Input
            label="Transformation Rule (optional)"
            value={mapping?.transformationRule || ''}
            onChange={(e) => handleFieldChange('transformationRule', e.target.value)}
            placeholder="e.g., uppercase"
          />
          <Input
            label="Fallback Value (optional)"
            value={mapping?.fallbackValue || ''}
            onChange={(e) => handleFieldChange('fallbackValue', e.target.value)}
            placeholder="Default value if canonical field is empty"
          />
        </div>
      )}
    </div>
  );
}
