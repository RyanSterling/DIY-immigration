import type { ReactNode } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { cn } from '~/utils/cn';
import { InputWrapper } from '~/atoms/InputWrapper';
import { getErrorMessage } from '~/lib/form-utils';
import type { FieldOption } from './types';

interface CheckboxProps {
  name: string;
  label: string;
  description?: string | ReactNode;
  disabled?: boolean;
  id?: string;
  required?: boolean | string;
  className?: string;
}

export function Checkbox({
  name,
  label,
  description,
  disabled = false,
  id,
  required = false,
  className,
}: CheckboxProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  const checkboxId = id || name;
  const requiredMessage =
    typeof required === 'string' ? required : 'This field is required.';
  const errorMessage = getErrorMessage(name, errors);

  const { ref: rhfRef, ...rhfRest } = register(name, {
    required: required ? requiredMessage : false,
  });

  return (
    <div className="space-y-1">
      <label
        className={cn(
          'flex cursor-pointer items-start gap-2',
          disabled && 'cursor-not-allowed opacity-50',
          className
        )}
      >
        <input
          id={checkboxId}
          type="checkbox"
          disabled={disabled}
          aria-invalid={Boolean(errorMessage)}
          aria-required={Boolean(required)}
          className={cn(
            'h-4 w-4 shrink-0 rounded border-gray-300 text-primary-600 focus:ring-primary-500 mt-0.5',
            errorMessage && 'border-red-300'
          )}
          {...rhfRest}
          ref={rhfRef}
        />
        <span className="text-sm text-gray-700">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </span>
      </label>
      {description && (
        <p className="ml-6 text-sm text-gray-500">{description}</p>
      )}
      {errorMessage && (
        <p className="text-sm text-red-600">{errorMessage}</p>
      )}
    </div>
  );
}

interface CheckboxGroupProps {
  name: string;
  options: FieldOption[];
  label?: string;
  description?: string | ReactNode;
  descriptionPosition?: 'top' | 'bottom';
  disabled?: boolean;
  hideLabel?: boolean;
  required?: boolean | string;
  className?: string;
}

export function CheckboxGroup({
  name,
  options,
  label,
  description,
  descriptionPosition = 'bottom',
  disabled = false,
  hideLabel = false,
  required = false,
  className,
}: CheckboxGroupProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext();

  const requiredMessage =
    typeof required === 'string' ? required : 'Please select at least one option.';
  const errorMessage = getErrorMessage(name, errors);

  const { field } = useController({
    name,
    control,
    rules: {
      validate: required
        ? (value: string[]) => (value && value.length > 0) || requiredMessage
        : undefined,
    },
  });

  const handleChange = (optionValue: string, checked: boolean) => {
    const currentValue = field.value ?? [];
    if (checked) {
      field.onChange([...currentValue, optionValue]);
    } else {
      field.onChange(currentValue.filter((v: string) => v !== optionValue));
    }
  };

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
      <div className={cn('mt-1 space-y-2', className)}>
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              'flex cursor-pointer items-start gap-2',
              (disabled || option.disabled) && 'cursor-not-allowed opacity-50'
            )}
          >
            <input
              type="checkbox"
              checked={(field.value ?? []).includes(option.value)}
              onChange={(e) => handleChange(option.value, e.target.checked)}
              disabled={disabled || option.disabled}
              className={cn(
                'h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500',
                errorMessage && 'border-red-300'
              )}
            />
            <span className="text-sm text-gray-700">{option.label}</span>
          </label>
        ))}
      </div>
    </InputWrapper>
  );
}
