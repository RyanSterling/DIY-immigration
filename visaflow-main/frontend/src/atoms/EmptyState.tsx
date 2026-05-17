import { cn } from '~/utils/cn';

interface EmptyStateProps {
  collectionName: string;  // plural form, e.g., "clients"
  singularName?: string;   // optional singular, defaults to removing trailing 's'
  className?: string;
}

export function EmptyState({ collectionName, singularName, className }: EmptyStateProps) {
  const singular = singularName || collectionName.replace(/s$/, '');

  return (
    <div className={cn('min-h-[60vh] flex items-center justify-center', className)}>
      <p className="text-gray-500 text-center">
        No {collectionName} yet. Add your first {singular}!
      </p>
    </div>
  );
}
