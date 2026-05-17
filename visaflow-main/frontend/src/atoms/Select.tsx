import type { ReactNode, Ref } from 'react';
import type { RegisterOptions } from 'react-hook-form';
import { useFormContext } from 'react-hook-form';
import { cn } from '~/utils/cn';
import { InputWrapper } from '~/atoms/InputWrapper';
import { getErrorMessage } from '~/lib/form-utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  description?: string | ReactNode;
  descriptionPosition?: 'top' | 'bottom';
  disabled?: boolean;
  endAdornment?: ReactNode;
  hideLabel?: boolean;
  id?: string;
  label?: string;
  name: string;
  options: SelectOption[];
  placeholder?: string;
  ref?: Ref<HTMLSelectElement>;
  required?: boolean | string;
  rules?: Pick<
    RegisterOptions,
    'validate' | 'required'
  >;
  startAdornment?: ReactNode;
}

function Select({
  description,
  descriptionPosition = 'top',
  disabled = false,
  endAdornment,
  hideLabel = false,
  id,
  label,
  name,
  options,
  placeholder = 'Select an option',
  ref,
  required = false,
  rules = {},
  startAdornment,
}: SelectProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  const selectId = id || name;
  const requiredMessage =
    typeof required === 'string' ? required : 'This field is required.';
  const errorMessage = getErrorMessage(name, errors);

  const { ref: rhfRef, ...rhfRest } = register(name, {
    required: required ? requiredMessage : false,
    ...rules,
  });

  const baseClasses = cn(
    'block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 shadow-sm sm:text-sm sm:leading-6',
    errorMessage
      ? 'text-red-900 ring-red-300 focus:ring-2 focus:ring-inset focus:ring-red-500'
      : 'ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600',
    startAdornment && 'pl-8',
    endAdornment && 'pr-8',
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
      <div className="relative mt-1">
        {startAdornment && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2">
            <span className="h-5 w-auto min-w-5 text-center text-gray-400 sm:text-sm">
              {startAdornment}
            </span>
          </div>
        )}
        <select
          {...(description && {
            'aria-describedby': `${selectId}-description`,
          })}
          aria-invalid={Boolean(errorMessage)}
          aria-required={Boolean(required)}
          id={selectId}
          className={baseClasses}
          disabled={disabled}
          {...rhfRest}
          ref={(e) => {
            rhfRef(e);
            if (typeof ref === 'function') {
              ref(e);
            } else if (ref) {
              (ref as React.MutableRefObject<HTMLSelectElement | null>).current = e;
            }
          }}
        >
          <option disabled value="">
            {placeholder}
          </option>
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
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

export { Select };
