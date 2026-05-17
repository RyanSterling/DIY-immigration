import { useController, useFormContext } from 'react-hook-form';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

interface OptionItem {
  value: string;
  label: string;
}

interface OptionsEditorProps {
  name: string;
}

/**
 * Options editor for select, radio, and checkbox fields.
 * Integrates with React Hook Form via useController.
 */
export function OptionsEditor({ name }: OptionsEditorProps) {
  const { control } = useFormContext();
  const {
    field: { value, onChange },
  } = useController({
    name,
    control,
  });

  const options: OptionItem[] = Array.isArray(value) ? value : [];

  const handleAddOption = () => {
    onChange([...options, { value: '', label: '' }]);
  };

  const handleUpdateOption = (index: number, field: 'value' | 'label', newValue: string) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], [field]: newValue };
    onChange(newOptions);
  };

  const handleRemoveOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index);
    onChange(newOptions.length > 0 ? newOptions : null);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Options</label>
      {options.map((option, index) => (
        <div key={index} className="flex gap-2">
          <input
            type="text"
            placeholder="Value"
            value={option.value}
            onChange={(e) => handleUpdateOption(index, 'value', e.target.value)}
            className="flex-1 rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm"
          />
          <input
            type="text"
            placeholder="Label"
            value={option.label}
            onChange={(e) => handleUpdateOption(index, 'label', e.target.value)}
            className="flex-1 rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm"
          />
          <button
            type="button"
            onClick={() => handleRemoveOption(index)}
            className="p-2 text-gray-400 hover:text-red-600"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={handleAddOption}
        className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
      >
        <PlusIcon className="h-4 w-4" />
        Add Option
      </button>
    </div>
  );
}
