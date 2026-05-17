import { useController, useFormContext } from 'react-hook-form';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

interface KeyValuePair {
  key: string;
  value: string;
}

interface KeyValueEditorProps {
  name: string;
  label: string;
}

/**
 * Key-Value pair editor for PDF mappings.
 * Integrates with React Hook Form via useController.
 */
export function KeyValueEditor({ name, label }: KeyValueEditorProps) {
  const { control } = useFormContext();
  const {
    field: { value, onChange },
  } = useController({
    name,
    control,
  });

  const pairs: KeyValuePair[] = value
    ? Object.entries(value as Record<string, string>).map(([key, val]) => ({ key, value: val }))
    : [];

  const handleAddPair = () => {
    const newPairs = [...pairs, { key: '', value: '' }];
    onChange(Object.fromEntries(newPairs.map((p) => [p.key, p.value])));
  };

  const handleUpdatePair = (index: number, field: 'key' | 'value', newValue: string) => {
    const newPairs = [...pairs];
    newPairs[index] = { ...newPairs[index], [field]: newValue };
    onChange(Object.fromEntries(newPairs.filter((p) => p.key).map((p) => [p.key, p.value])));
  };

  const handleRemovePair = (index: number) => {
    const newPairs = pairs.filter((_, i) => i !== index);
    onChange(newPairs.length > 0 ? Object.fromEntries(newPairs.map((p) => [p.key, p.value])) : null);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {pairs.map((pair, index) => (
        <div key={index} className="flex gap-2">
          <input
            type="text"
            placeholder="Key"
            value={pair.key}
            onChange={(e) => handleUpdatePair(index, 'key', e.target.value)}
            className="flex-1 rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm"
          />
          <input
            type="text"
            placeholder="Value"
            value={pair.value}
            onChange={(e) => handleUpdatePair(index, 'value', e.target.value)}
            className="flex-1 rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm"
          />
          <button
            type="button"
            onClick={() => handleRemovePair(index)}
            className="p-2 text-gray-400 hover:text-red-600"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={handleAddPair}
        className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
      >
        <PlusIcon className="h-4 w-4" />
        Add Entry
      </button>
    </div>
  );
}
