import type { ReactNode } from 'react';
import { useFormContext } from 'react-hook-form';
import { cn } from '~/utils/cn';
import { InputWrapper } from '~/atoms/InputWrapper';
import { getErrorMessage } from '~/lib/form-utils';
import type { FieldOption } from './types';

interface RadioProps {
  name: string;
  options: FieldOption[];
  label?: string;
  description?: string | ReactNode;
  descriptionPosition?: 'top' | 'bottom';
  direction?: 'horizontal' | 'vertical';
  disabled?: boolean;
  hideLabel?: boolean;
  required?: boolean | string;
  className?: string;
}

export function Radio({
  name,
  options,
  label,
  description,
  descriptionPosition = 'bottom',
  direction = 'vertical',
  disabled = false,
  hideLabel = false,
  required = false,
  className,
}: RadioProps) {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext();

  const requiredMessage =
    typeof required === 'string' ? required : 'Please select an option.';
  const errorMessage = getErrorMessage(name, errors);

  // Watch the current value to properly control checked state after reset()
  const currentValue = watch(name);

  const { ref: rhfRef, ...rhfRest } = register(name, {
    required: required ? requiredMessage : false,
  });

  return (
    <InputWrapper
      description={description}
      descriptionPosition={descriptionPosition}
      disabled={disabled}
      error={errorMessage}
      hideLabel={hideLabel}
      label={label}
      required={Boolean(required)}
    >
      <div
        className={cn(
          direction === 'horizontal' ? 'flex flex-wrap gap-4' : 'space-y-2',
          'mt-0.5',
          className
        )}
      >
        {options.map((option, index) => (
          <label
            key={option.value}
            className={cn(
              'flex cursor-pointer items-start gap-2',
              (disabled || option.disabled) && 'cursor-not-allowed opacity-50'
            )}
          >
            <input
              type="radio"
              value={option.value}
              checked={currentValue === option.value}
              disabled={disabled || option.disabled}
              aria-invalid={Boolean(errorMessage)}
              aria-required={Boolean(required)}
              className={cn(
                'h-4 w-4 shrink-0 border-gray-300 text-primary-600 focus:ring-primary-500',
                errorMessage && 'border-red-300'
              )}
              {...rhfRest}
              ref={index === 0 ? rhfRef : undefined}
            />
            <span className="text-sm text-gray-700">{option.label}</span>
          </label>
        ))}
      </div>
    </InputWrapper>
  );
}
