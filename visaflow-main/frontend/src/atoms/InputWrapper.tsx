import type { ReactNode } from 'react';
import { cn } from '~/utils/cn';

interface InputWrapperProps {
  children: ReactNode;
  className?: string;
  description?: string | ReactNode;
  descriptionPosition?: 'top' | 'bottom';
  disabled?: boolean;
  error?: string;
  hideLabel?: boolean;
  htmlFor?: string;
  id?: string;
  label?: string;
  required?: boolean;
}

export function InputWrapper({
  children,
  className,
  description,
  descriptionPosition = 'top',
  disabled,
  error,
  hideLabel,
  htmlFor,
  id,
  label,
  required,
}: InputWrapperProps) {
  const labelId = id || htmlFor;

  return (
    <div className={cn('space-y-1', disabled && 'opacity-50', className)}>
      {label && (
        <label
          htmlFor={labelId}
          className={cn(
            'block text-sm font-medium text-gray-700',
            hideLabel && 'sr-only'
          )}
        >
          {label}
          {required && (
            <>
              <span className="text-red-500">*</span>
              <span className="sr-only"> (Required)</span>
            </>
          )}
        </label>
      )}
      {description && descriptionPosition === 'top' && (
        <p
          id={labelId ? `${labelId}-description` : undefined}
          className="text-sm text-gray-500"
        >
          {description}
        </p>
      )}
      {children}
      {description && descriptionPosition === 'bottom' && (
        <p
          id={labelId ? `${labelId}-description` : undefined}
          className="text-sm text-gray-500"
        >
          {description}
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
