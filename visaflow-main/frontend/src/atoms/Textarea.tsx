import type { ReactNode, Ref, TextareaHTMLAttributes } from 'react';
import type { RegisterOptions } from 'react-hook-form';
import { useFormContext } from 'react-hook-form';
import { cn } from '~/utils/cn';
import { InputWrapper } from '~/atoms/InputWrapper';
import { getErrorMessage } from '~/lib/form-utils';

export interface TextareaProps {
  description?: string | ReactNode;
  descriptionPosition?: 'top' | 'bottom';
  disabled?: boolean;
  hideLabel?: boolean;
  id?: string;
  label?: string;
  name: string;
  placeholder?: string;
  ref?: Ref<HTMLTextAreaElement>;
  required?: boolean | string;
  rows?: number;
  rules?: Pick<
    RegisterOptions,
    'maxLength' | 'minLength' | 'validate' | 'required'
  >;
  textareaProps?: TextareaHTMLAttributes<HTMLTextAreaElement>;
}

function Textarea({
  description,
  descriptionPosition = 'top',
  disabled = false,
  hideLabel = false,
  id,
  label,
  name,
  placeholder,
  ref,
  required = false,
  rows = 4,
  rules = {},
  textareaProps = {},
}: TextareaProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  const textareaId = id || name;
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
      ? 'text-red-900 ring-red-300 placeholder:text-red-300 focus:ring-2 focus:ring-inset focus:ring-red-500'
      : 'ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600',
    disabled && 'cursor-not-allowed bg-gray-100'
  );

  return (
    <InputWrapper
      description={description}
      descriptionPosition={descriptionPosition}
      disabled={disabled}
      error={errorMessage}
      hideLabel={hideLabel}
      id={textareaId}
      label={label}
      required={Boolean(required)}
    >
      <div className="mt-1">
        <textarea
          {...(description && {
            'aria-describedby': `${textareaId}-description`,
          })}
          aria-invalid={Boolean(errorMessage)}
          aria-required={Boolean(required)}
          id={textareaId}
          className={baseClasses}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          {...textareaProps}
          {...rhfRest}
          ref={(e) => {
            rhfRef(e);
            if (typeof ref === 'function') {
              ref(e);
            } else if (ref) {
              (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = e;
            }
          }}
        />
      </div>
    </InputWrapper>
  );
}

export { Textarea };
