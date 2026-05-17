import { Input } from "~/atoms/Input";
import FileUpload from "~/components/forms/FileUpload";
import { Select } from "~/atoms/Select";
import { Textarea } from "~/atoms/Textarea";
import { Checkbox, CheckboxGroup } from "~/atoms/Checkbox";
import { Radio } from "~/atoms/Radio";
import { DatePicker } from "~/atoms/DatePicker";
import type {
  FieldConfig,
  TextFieldConfig,
  TextareaFieldConfig,
  SelectFieldConfig,
  CheckboxFieldConfig,
  RadioFieldConfig,
  DateFieldConfig,
  FileFieldConfig,
} from "./types";

interface FieldRendererProps {
  field: FieldConfig;
}

export function FieldRenderer({ field }: FieldRendererProps) {
  // Text-based inputs - self-registering
  if (
    field.type === "text" ||
    field.type === "email" ||
    field.type === "phone" ||
    field.type === "number"
  ) {
    const textField = field as TextFieldConfig;
    return (
      <Input
        name={textField.name}
        label={textField.label}
        description={textField.helpText}
        descriptionPosition="bottom"
        placeholder={textField.placeholder}
        disabled={textField.disabled}
        hideLabel={textField.hideLabel}
        type={textField.type === "phone" ? "tel" : textField.type}
      />
    );
  }

  // Textarea - self-registering
  if (field.type === "textarea") {
    const textareaField = field as TextareaFieldConfig;
    return (
      <Textarea
        name={textareaField.name}
        label={textareaField.label}
        description={textareaField.helpText}
        descriptionPosition="bottom"
        placeholder={textareaField.placeholder}
        disabled={textareaField.disabled}
        hideLabel={textareaField.hideLabel}
        rows={textareaField.rows}
      />
    );
  }

  // Select - self-registering
  if (field.type === "select") {
    const selectField = field as SelectFieldConfig;
    return (
      <Select
        name={selectField.name}
        label={selectField.label}
        description={selectField.helpText}
        descriptionPosition="bottom"
        options={selectField.options}
        disabled={selectField.disabled}
        hideLabel={selectField.hideLabel}
        placeholder={selectField.placeholder || selectField.emptyOptionLabel}
      />
    );
  }

  // Checkbox - single or group (now self-registering)
  if (field.type === "checkbox") {
    const checkboxField = field as CheckboxFieldConfig;

    // Single checkbox (no options array)
    if (!checkboxField.options || checkboxField.options.length === 0) {
      return (
        <Checkbox
          name={checkboxField.name}
          label={checkboxField.label}
          description={checkboxField.helpText}
          disabled={checkboxField.disabled}
        />
      );
    }

    // Checkbox group
    return (
      <CheckboxGroup
        name={checkboxField.name}
        options={checkboxField.options}
        label={checkboxField.label}
        description={checkboxField.helpText}
        descriptionPosition="bottom"
        hideLabel={checkboxField.hideLabel}
        disabled={checkboxField.disabled}
      />
    );
  }

  // Radio - now self-registering
  if (field.type === "radio") {
    const radioField = field as RadioFieldConfig;
    return (
      <Radio
        name={radioField.name}
        options={radioField.options}
        label={radioField.label}
        description={radioField.helpText}
        descriptionPosition="bottom"
        direction={radioField.direction}
        hideLabel={radioField.hideLabel}
        disabled={radioField.disabled}
      />
    );
  }

  // Date - now self-registering
  if (field.type === "date") {
    const dateField = field as DateFieldConfig;
    return (
      <DatePicker
        name={dateField.name}
        label={dateField.label}
        description={dateField.helpText}
        descriptionPosition="bottom"
        hideLabel={dateField.hideLabel}
        disabled={dateField.disabled}
        minDate={dateField.minDate}
        maxDate={dateField.maxDate}
      />
    );
  }

  // File upload - now self-registering
  if (field.type === "file") {
    const fileField = field as FileFieldConfig;
    return (
      <FileUpload
        name={fileField.name}
        label={fileField.label}
        description={fileField.helpText}
        descriptionPosition="bottom"
        hideLabel={fileField.hideLabel}
        accept={fileField.accept}
        maxSizeMb={fileField.maxSizeMb}
        disabled={fileField.disabled}
        onProcessAll={fileField.onProcessAll}
        isLoading={fileField.isProcessing}
      />
    );
  }

  // Fallback for unknown field types
  console.warn(`Unknown field type: ${(field as FieldConfig).type}`);
  return null;
}
