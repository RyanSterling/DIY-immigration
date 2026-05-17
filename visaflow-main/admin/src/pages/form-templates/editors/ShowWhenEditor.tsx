import { useController, useFormContext } from 'react-hook-form';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

type OperatorType = 'equals' | 'notEquals' | 'contains' | 'notContains' | 'isEmpty' | 'isNotEmpty';

interface ShowWhenCondition {
  field: string;
  operator: OperatorType;
  value?: string;
}

interface ShowWhenEditorProps {
  name: string;
}

/**
 * Conditional visibility editor for field show/hide rules.
 * Integrates with React Hook Form via useController.
 */
export function ShowWhenEditor({ name }: ShowWhenEditorProps) {
  const { control } = useFormContext();
  const {
    field: { value, onChange },
  } = useController({
    name,
    control,
  });

  const conditions: ShowWhenCondition[] = Array.isArray(value) ? value : [];

  const handleAddCondition = () => {
    onChange([...conditions, { field: '', operator: 'equals', value: '' }]);
  };

  const handleUpdateCondition = <K extends keyof ShowWhenCondition>(
    index: number,
    field: K,
    newValue: ShowWhenCondition[K]
  ) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], [field]: newValue };
    onChange(newConditions);
  };

  const handleRemoveCondition = (index: number) => {
    const newConditions = conditions.filter((_, i) => i !== index);
    onChange(newConditions.length > 0 ? newConditions : null);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Show When Conditions</label>
      {conditions.map((condition, index) => (
        <div key={index} className="flex gap-2">
          <input
            type="text"
            placeholder="Field name"
            value={condition.field}
            onChange={(e) => handleUpdateCondition(index, 'field', e.target.value)}
            className="flex-1 rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm"
          />
          <select
            value={condition.operator}
            onChange={(e) => handleUpdateCondition(index, 'operator', e.target.value as OperatorType)}
            className="rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm"
          >
            <option value="equals">Equals</option>
            <option value="notEquals">Not Equals</option>
            <option value="contains">Contains</option>
            <option value="notContains">Not Contains</option>
            <option value="isEmpty">Is Empty</option>
            <option value="isNotEmpty">Is Not Empty</option>
          </select>
          {!['isEmpty', 'isNotEmpty'].includes(condition.operator) && (
            <input
              type="text"
              placeholder="Value"
              value={condition.value || ''}
              onChange={(e) => handleUpdateCondition(index, 'value', e.target.value)}
              className="flex-1 rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm"
            />
          )}
          <button
            type="button"
            onClick={() => handleRemoveCondition(index)}
            className="p-2 text-gray-400 hover:text-red-600"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={handleAddCondition}
        className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
      >
        <PlusIcon className="h-4 w-4" />
        Add Condition
      </button>
    </div>
  );
}
