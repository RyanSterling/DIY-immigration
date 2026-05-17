import { useFormContext, useWatch } from 'react-hook-form';
import { ChevronDownIcon, ChevronRightIcon, TrashIcon, Bars3Icon } from '@heroicons/react/24/outline';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Input } from '~/components/forms/Input';
import { KeyValueEditor } from '../editors/KeyValueEditor';
import { OptionsEditor } from '../editors/OptionsEditor';
import { ShowWhenEditor } from '../editors/ShowWhenEditor';
import { AutofillMappingEditor } from '../editors/AutofillMappingEditor';
import { StatusBadge } from './StatusBadge';
import type { FormTemplateValues } from '../formTemplateSchema';
import type { FormFieldType } from '~/hooks/useAdminFormTemplates';
import type { ItemStatus } from '../useDirtyStatus';

// =============================================================================
// Constants
// =============================================================================

const FIELD_TYPES: { value: FormFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Select' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'radio', label: 'Radio' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'file', label: 'File' },
];

const WIDTH_OPTIONS = [
  { value: '', label: 'Full Width' },
  { value: '1/2', label: 'Half Width' },
  { value: '1/3', label: 'One Third' },
  { value: '2/3', label: 'Two Thirds' },
  { value: '1/4', label: 'One Quarter' },
  { value: '3/4', label: 'Three Quarters' },
];

// =============================================================================
// Props
// =============================================================================

interface FieldAccordionItemProps {
  fieldId: string;
  sectionIndex: number;
  fieldIndex: number;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  getFieldStatus: (sectionIndex: number, fieldIndex: number) => ItemStatus;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Accordion item for editing a single form field.
 * Uses useFormContext() to register fields with the parent FormProvider.
 */
export function FieldAccordionItem({
  fieldId,
  sectionIndex,
  fieldIndex,
  isExpanded,
  onToggle,
  onDelete,
  getFieldStatus,
}: FieldAccordionItemProps) {
  const { register } = useFormContext<FormTemplateValues>();
  const basePath = `sections.${sectionIndex}.fields.${fieldIndex}` as const;

  // DND Kit sortable hook for field reordering
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: fieldId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : undefined,
  };

  // Watch field values for display in header and conditional rendering
  const fieldName = useWatch({ name: `${basePath}.name` });
  const fieldLabel = useWatch({ name: `${basePath}.label` });
  const fieldType = useWatch({ name: `${basePath}.fieldType` }) as FormFieldType;

  const needsOptions = ['select', 'radio', 'checkbox'].includes(fieldType);

  return (
    <div ref={setNodeRef} style={style} className="border border-gray-200 rounded-md">
      {/* Field Header */}
      <div className="w-full flex items-center px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-t-md">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="p-1 mr-2 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
          title="Drag to reorder"
        >
          <Bars3Icon className="h-4 w-4" />
        </div>

        {/* Toggle Button */}
        <button
          type="button"
          onClick={onToggle}
          className="flex-1 flex items-center gap-3 text-left"
        >
          {isExpanded ? (
            <ChevronDownIcon className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRightIcon className="h-4 w-4 text-gray-500" />
          )}
          <span className="font-medium text-gray-900">{fieldName || '(unnamed)'}</span>
          <span className="text-sm text-gray-500">({fieldType})</span>
          <StatusBadge status={getFieldStatus(sectionIndex, fieldIndex)} />
          <span className="text-sm text-gray-400">{fieldLabel}</span>
        </button>
      </div>

      {/* Field Content */}
      {isExpanded && (
        <div className="p-4 space-y-4 border-t border-gray-200">
          {/* Basic Properties */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Name"
              placeholder="fieldName"
              {...register(`${basePath}.name`)}
            />
            <Input
              label="Label"
              placeholder="Field Label"
              {...register(`${basePath}.label`)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Field Type</label>
              <select
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm"
                {...register(`${basePath}.fieldType`)}
              >
                {FIELD_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Placeholder"
              placeholder="Placeholder text"
              {...register(`${basePath}.placeholder`)}
            />
          </div>

          <Input
            label="Help Text"
            placeholder="Help text shown below the field"
            {...register(`${basePath}.helpText`)}
          />

          <Input
            label="Default Value"
            placeholder="Default value"
            {...register(`${basePath}.defaultValue`)}
          />

          {/* Layout Properties */}
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Layout</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Width</label>
                <select
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm"
                  {...register(`${basePath}.width`)}
                >
                  {WIDTH_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  {...register(`${basePath}.hideLabel`)}
                />
                <label className="text-sm text-gray-700">Hide Label</label>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  {...register(`${basePath}.disabled`)}
                />
                <label className="text-sm text-gray-700">Disabled</label>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                {...register(`${basePath}.isRequired`)}
              />
              <label className="text-sm text-gray-700">Required</label>
            </div>
          </div>

          {/* Options (for select/radio/checkbox) */}
          {needsOptions && (
            <div className="border-t border-gray-200 pt-4">
              <OptionsEditor name={`${basePath}.options`} />
            </div>
          )}

          {/* PDF Mappings */}
          <div className="border-t border-gray-200 pt-4">
            <KeyValueEditor name={`${basePath}.pdfMappings`} label="PDF Mappings" />
          </div>

          {/* ShowWhen Conditions */}
          <div className="border-t border-gray-200 pt-4">
            <ShowWhenEditor name={`${basePath}.showWhen`} />
          </div>

          {/* Autofill Mapping */}
          <div className="border-t border-gray-200 pt-4">
            <AutofillMappingEditor name={`${basePath}.autofillMapping`} />
          </div>

          {/* Delete Button */}
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onDelete}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md"
            >
              <TrashIcon className="h-4 w-4" />
              Delete Field
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
