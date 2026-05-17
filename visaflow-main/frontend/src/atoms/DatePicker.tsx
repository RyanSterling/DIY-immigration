import type { ReactNode } from 'react';
import { DatePicker as MuiDatePicker } from '@mui/x-date-pickers/DatePicker';
import { parse, format, isValid } from 'date-fns';
import { useController, useFormContext } from 'react-hook-form';
import { InputWrapper } from '~/atoms/InputWrapper';
import { getErrorMessage } from '~/lib/form-utils';

interface DatePickerProps {
  name: string;
  label?: string;
  description?: string | ReactNode;
  descriptionPosition?: 'top' | 'bottom';
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
  hideLabel?: boolean;
  placeholder?: string;
  id?: string;
  required?: boolean | string;
  endAdornment?: ReactNode;
}

function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  const parsed = parse(dateStr, 'yyyy-MM-dd', new Date());
  return isValid(parsed) ? parsed : null;
}

function formatDate(date: Date | null): string {
  if (!date || !isValid(date)) return '';
  return format(date, 'yyyy-MM-dd');
}

export function DatePicker({
  name,
  label,
  description,
  descriptionPosition = 'bottom',
  minDate,
  maxDate,
  disabled = false,
  hideLabel = false,
  placeholder = 'Select date',
  id,
  required = false,
  endAdornment,
}: DatePickerProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext();

  const dateId = id || name;
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

  const dateValue = parseDate(field.value);
  const minDateValue = parseDate(minDate);
  const maxDateValue = parseDate(maxDate);

  return (
    <InputWrapper
      description={description}
      descriptionPosition={descriptionPosition}
      disabled={disabled}
      error={errorMessage}
      hideLabel={hideLabel}
      htmlFor={dateId}
      label={label}
      required={Boolean(required)}
    >
      <div className="relative mt-1">
        <MuiDatePicker
          value={dateValue}
          onChange={(newValue) => {
            field.onChange(formatDate(newValue));
          }}
          minDate={minDateValue ?? undefined}
          maxDate={maxDateValue ?? undefined}
          disabled={disabled}
          slotProps={{
            textField: {
              id: dateId,
              size: 'small',
              fullWidth: true,
              placeholder,
              error: !!errorMessage,
              onBlur: field.onBlur,
              inputProps: {
                'aria-invalid': Boolean(errorMessage),
                'aria-required': Boolean(required),
              },
              sx: {
                '& .MuiOutlinedInput-root': {
                  backgroundColor: disabled ? '#f3f4f6' : 'white',
                  boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                  paddingRight: endAdornment ? '72px' : undefined,
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: errorMessage ? '#fca5a5' : '#d1d5db',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: errorMessage ? '#f87171' : '#9ca3af',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: errorMessage ? '#ef4444' : '#0084ff',
                    borderWidth: '1px',
                    boxShadow: errorMessage
                      ? '0 0 0 1px #ef4444'
                      : '0 0 0 1px #0084ff',
                  },
                  // Move calendar icon to the left when endAdornment is present
                  '& .MuiInputAdornment-root': endAdornment
                    ? { marginRight: '32px' }
                    : undefined,
                },
              },
            },
          }}
        />
        {endAdornment && (
          <div className="absolute inset-y-0 right-2 flex items-center">
            {endAdornment}
          </div>
        )}
      </div>
    </InputWrapper>
  );
}
