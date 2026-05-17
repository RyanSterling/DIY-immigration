import type { InputHTMLAttributes, ReactNode, Ref } from "react";
import type { RegisterOptions } from "react-hook-form";
import { useFormContext } from "react-hook-form";
import { cn } from "~/utils/cn";
import { InputWrapper } from "~/atoms/InputWrapper";
import { getErrorMessage } from "~/lib/form-utils";

export interface InputProps {
  description?: string | ReactNode;
  descriptionPosition?: "top" | "bottom";
  disabled?: boolean;
  endAdornment?: ReactNode;
  hideLabel?: boolean;
  id?: string;
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
  label?: string;
  name: string;
  placeholder?: string;
  ref?: Ref<HTMLInputElement>;
  required?: boolean | string;
  rules?: Pick<
    RegisterOptions,
    | "maxLength"
    | "minLength"
    | "validate"
    | "required"
    | "pattern"
    | "min"
    | "max"
  >;
  startAdornment?: ReactNode;
  type?: string;
}

function Input({
  description,
  descriptionPosition = "top",
  disabled = false,
  endAdornment,
  hideLabel = false,
  id,
  inputProps = {},
  label,
  name,
  placeholder,
  ref,
  required = false,
  rules = {},
  startAdornment,
  type = "text",
}: InputProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  const inputId = id || name;
  const requiredMessage =
    typeof required === "string" ? required : "This field is required.";
  const errorMessage = getErrorMessage(name, errors);

  const { ref: rhfRef, ...rhfRest } = register(name, {
    required: required ? requiredMessage : false,
    ...rules,
  });

  const baseClasses = cn(
    "block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 shadow-sm sm:text-sm sm:leading-6",
    errorMessage
      ? "text-red-900 ring-red-300 placeholder:text-red-300 focus:ring-2 focus:ring-inset focus:ring-red-500"
      : "ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600",
    startAdornment && "pl-8",
    endAdornment && "pr-8",
    disabled && "cursor-not-allowed bg-gray-100"
  );

  return (
    <InputWrapper
      description={description}
      descriptionPosition={descriptionPosition}
      disabled={disabled}
      error={errorMessage}
      hideLabel={hideLabel}
      id={inputId}
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
        <input
          {...(description && {
            "aria-describedby": `${inputId}-description`,
          })}
          aria-invalid={Boolean(errorMessage)}
          aria-required={Boolean(required)}
          type={type}
          id={inputId}
          className={baseClasses}
          placeholder={placeholder}
          disabled={disabled}
          {...inputProps}
          {...rhfRest}
          ref={(e) => {
            rhfRef(e);
            if (typeof ref === "function") {
              ref(e);
            } else if (ref) {
              (ref as React.MutableRefObject<HTMLInputElement | null>).current =
                e;
            }
          }}
        />
        {endAdornment && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-2">
            {endAdornment}
          </div>
        )}
      </div>
    </InputWrapper>
  );
}

export { Input };
