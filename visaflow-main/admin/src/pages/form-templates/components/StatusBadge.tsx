import type { ItemStatus } from '../useDirtyStatus';

interface StatusBadgeProps {
  status: ItemStatus;
  /** Size variant */
  size?: 'sm' | 'md';
}

/**
 * Badge component to show the status of a section or field.
 * Shows: New (green), Modified (yellow), or Deleted (red).
 */
export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  if (!status.hasChanges) {
    return null;
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';

  if (status.isDeleted) {
    return (
      <span className={`inline-flex items-center rounded-full bg-red-100 text-red-700 font-medium ${sizeClasses}`}>
        Deleted
      </span>
    );
  }

  if (status.isNew) {
    return (
      <span className={`inline-flex items-center rounded-full bg-green-100 text-green-700 font-medium ${sizeClasses}`}>
        New
      </span>
    );
  }

  if (status.isDirty) {
    return (
      <span className={`inline-flex items-center rounded-full bg-yellow-100 text-yellow-700 font-medium ${sizeClasses}`}>
        Modified
      </span>
    );
  }

  return null;
}
