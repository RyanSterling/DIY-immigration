import { useState } from 'react';
import { Modal } from '~/components/Modal';
import { Input } from '~/components/forms/Input';
import Button from '~/components/Button';
import { createDefaultSection, type FormSectionValues } from '../formTemplateSchema';

// =============================================================================
// Props
// =============================================================================

interface AddSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (section: FormSectionValues) => void;
  nextOrderIndex: number;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Modal for adding a new section to the template.
 * Creates a section using createDefaultSection() from formTemplateSchema.
 */
export function AddSectionModal({ isOpen, onClose, onAdd, nextOrderIndex }: AddSectionModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    sectionKey: '',
    description: '',
    helpText: '',
    isRequired: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newSection = createDefaultSection(nextOrderIndex);
    onAdd({
      ...newSection,
      title: formData.title,
      sectionKey: formData.sectionKey,
      description: formData.description || null,
      helpText: formData.helpText || null,
      isRequired: formData.isRequired,
    });
    handleClose();
  };

  const handleClose = () => {
    setFormData({ title: '', sectionKey: '', description: '', helpText: '', isRequired: false });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Section" className="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Title"
          value={formData.title}
          onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="Section Title"
          required
        />
        <Input
          label="Section Key"
          value={formData.sectionKey}
          onChange={(e) => setFormData((prev) => ({ ...prev, sectionKey: e.target.value }))}
          placeholder="section_key"
          required
        />
        <Input
          label="Description (optional)"
          value={formData.description}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Section description"
        />
        <Input
          label="Help Text (optional)"
          value={formData.helpText}
          onChange={(e) => setFormData((prev) => ({ ...prev, helpText: e.target.value }))}
          placeholder="Help text for the section"
        />
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.isRequired}
            onChange={(e) => setFormData((prev) => ({ ...prev, isRequired: e.target.checked }))}
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <label className="text-sm text-gray-700">Section is required</label>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Add Section
          </Button>
        </div>
      </form>
    </Modal>
  );
}
