import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { getCountryOptions } from '@visaflow/shared';
import { cn } from '~/utils/cn';
import { InputWrapper } from '~/atoms/InputWrapper';
import { getErrorMessage } from '~/lib/form-utils';

export interface CountrySelectProps {
  name: string;
  label?: string;
  description?: string | ReactNode;
  descriptionPosition?: 'top' | 'bottom';
  disabled?: boolean;
  hideLabel?: boolean;
  placeholder?: string;
  id?: string;
  required?: boolean | string;
  endAdornment?: ReactNode;
  className?: string;
}

export function CountrySelect({
  name,
  label,
  description,
  descriptionPosition = 'bottom',
  disabled = false,
  hideLabel = false,
  placeholder = 'Select a country...',
  id,
  required = false,
  endAdornment,
  className,
}: CountrySelectProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext();

  const selectId = id || name;
  const requiredMessage =
    typeof required === 'string' ? required : 'This field is required.';
  const errorMessage = getErrorMessage(name, errors);

  const { field } = useController({
    name,
    control,
    rules: {
      required: required ? requiredMessage : false,
    },
  });

  const countryOptions = useMemo(() => getCountryOptions(), []);

  const baseClasses = cn(
    'block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 shadow-sm sm:text-sm sm:leading-6',
    errorMessage
      ? 'text-red-900 ring-red-300 focus:ring-2 focus:ring-inset focus:ring-red-500'
      : 'ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600',
    endAdornment && 'pr-10',
    disabled && 'cursor-not-allowed bg-gray-100'
  );

  return (
    <InputWrapper
      description={description}
      descriptionPosition={descriptionPosition}
      disabled={disabled}
      error={errorMessage}
      hideLabel={hideLabel}
      id={selectId}
      label={label}
      required={Boolean(required)}
    >
      <div className={cn('relative mt-1', className)}>
        <select
          aria-describedby={description ? `${selectId}-description` : undefined}
          aria-invalid={Boolean(errorMessage)}
          aria-required={Boolean(required)}
          id={selectId}
          className={baseClasses}
          disabled={disabled}
          value={field.value || ''}
          onChange={(e) => field.onChange(e.target.value)}
          onBlur={field.onBlur}
          ref={field.ref}
        >
          <option value="">{placeholder}</option>
          {countryOptions.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
        {endAdornment && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-2">
            {endAdornment}
          </div>
        )}
      </div>
    </InputWrapper>
  );
}
