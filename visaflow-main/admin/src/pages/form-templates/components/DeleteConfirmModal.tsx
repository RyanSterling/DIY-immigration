import { Modal } from '~/components/Modal';
import Button from '~/components/Button';

// =============================================================================
// Props
// =============================================================================

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemType: 'section' | 'field';
  itemName: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Confirmation modal for deleting sections or fields.
 */
export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  itemType,
  itemName,
}: DeleteConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Delete ${itemType === 'section' ? 'Section' : 'Field'}`}>
      <div className="space-y-4">
        <p className="text-gray-600">
          Are you sure you want to delete the {itemType}{' '}
          <span className="font-semibold text-gray-900">{itemName}</span>?
          {itemType === 'section' && ' This will also delete all fields within this section.'}
          {' '}This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}
