import { useState } from 'react';
import { Modal } from '~/components/Modal';
import { Input } from '~/components/forms/Input';
import Button from '~/components/Button';
import { createDefaultField, type FormFieldValues } from '../formTemplateSchema';
import type { FormFieldType } from '~/hooks/useAdminFormTemplates';

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

// =============================================================================
// Props
// =============================================================================

interface AddFieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (field: FormFieldValues) => void;
  nextOrderIndex: number;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Modal for adding a new field to a section.
 * Creates a field using createDefaultField() from formTemplateSchema.
 */
export function AddFieldModal({ isOpen, onClose, onAdd, nextOrderIndex }: AddFieldModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    label: '',
    fieldType: 'text' as FormFieldType,
    placeholder: '',
    isRequired: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newField = createDefaultField(nextOrderIndex);
    onAdd({
      ...newField,
      name: formData.name,
      label: formData.label,
      fieldType: formData.fieldType,
      placeholder: formData.placeholder || null,
      isRequired: formData.isRequired,
    });
    handleClose();
  };

  const handleClose = () => {
    setFormData({ name: '', label: '', fieldType: 'text', placeholder: '', isRequired: false });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Field" className="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          value={formData.name}
          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="fieldName"
          required
        />
        <Input
          label="Label"
          value={formData.label}
          onChange={(e) => setFormData((prev) => ({ ...prev, label: e.target.value }))}
          placeholder="Field Label"
          required
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Field Type</label>
          <select
            value={formData.fieldType}
            onChange={(e) => setFormData((prev) => ({ ...prev, fieldType: e.target.value as FormFieldType }))}
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm"
          >
            {FIELD_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        <Input
          label="Placeholder (optional)"
          value={formData.placeholder}
          onChange={(e) => setFormData((prev) => ({ ...prev, placeholder: e.target.value }))}
          placeholder="Placeholder text"
        />
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.isRequired}
            onChange={(e) => setFormData((prev) => ({ ...prev, isRequired: e.target.checked }))}
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <label className="text-sm text-gray-700">Field is required</label>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Add Field
          </Button>
        </div>
      </form>
    </Modal>
  );
}
