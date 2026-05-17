import { cn } from '~/utils/cn';

interface StatusBadgeProps {
  status: 'enabled' | 'disabled';
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const isEnabled = status === 'enabled';

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        isEnabled
          ? 'bg-green-100 text-green-800'
          : 'bg-red-100 text-red-800',
        className
      )}
    >
      {isEnabled ? 'Enabled' : 'Disabled'}
    </span>
  );
}
