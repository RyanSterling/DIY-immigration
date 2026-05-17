import { useState } from "react";
import Modal from "~/components/Modal";
import Button from "~/atoms/Button";
import ClientSelect from "~/components/ClientSelect";
import type { FormTemplateListItem } from "~/hooks/useFormTemplates";

interface StartFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: FormTemplateListItem | null;
  onConfirm: (templateId: string, clientId: string) => void;
  isLoading?: boolean;
  preselectedClientId?: string | null;
}

export default function StartFormModal({
  isOpen,
  onClose,
  template,
  onConfirm,
  isLoading = false,
  preselectedClientId = null,
}: StartFormModalProps) {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(
    preselectedClientId
  );

  const handleConfirm = () => {
    if (template && selectedClientId) {
      onConfirm(template.id, selectedClientId);
    }
  };

  const handleClose = () => {
    setSelectedClientId(preselectedClientId);
    onClose();
  };

  if (!template) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Start Form ${template.formNumber}`}
    >
      <div className="text-sm text-gray-600 mb-6">{template.title}</div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Client
        </label>
        <ClientSelect
          value={selectedClientId}
          onChange={setSelectedClientId}
          placeholder="Choose a client..."
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={handleClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleConfirm}
          isLoading={isLoading}
          disabled={!selectedClientId}
        >
          Start Form
        </Button>
      </div>
    </Modal>
  );
}
