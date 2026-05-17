---
name: multi-step-forms
description: Build multi-step wizard forms using the JSON-driven MultiStepForm component. Use when creating complex forms with multiple pages/sections, step navigation, save/resume functionality, or USCIS immigration forms.
---

# Multi-Step Forms

Build wizard-style forms using the JSON-driven `MultiStepForm` component.

## Quick Start

```tsx
import { MultiStepForm, type MultiStepFormConfig } from "~/components/multi-step-form";

const config: MultiStepFormConfig = {
  id: "client-form",
  title: "Client Information",
  steps: [
    {
      id: "personal",
      title: "Personal Details",
      fields: [
        { name: "firstName", type: "text", label: "First Name" },
        { name: "lastName", type: "text", label: "Last Name" },
        { name: "email", type: "email", label: "Email Address" },
      ],
    },
    {
      id: "preferences",
      title: "Preferences",
      fields: [
        {
          name: "notifications",
          type: "checkbox",
          label: "Enable notifications",
        },
      ],
    },
  ],
};

function MyPage() {
  return (
    <MultiStepForm
      config={config}
      onSave={async (data, step) => {
        console.log("Saving step", step, data);
      }}
      onSubmit={async (data) => {
        console.log("Final submit", data);
      }}
    />
  );
}
```

## Field Types

### Text-Based Fields (self-registering)

```typescript
// text, email, phone, number
{
  name: "fieldName",
  type: "text",  // or "email" | "phone" | "number"
  label: "Field Label",
  placeholder?: "Enter value...",
  helpText?: "Additional guidance",
  disabled?: boolean,
  hideLabel?: boolean,
  width?: "1-1" | "1-2" | "1-3" | "1-4",  // Field width
}
```

### Textarea

```typescript
{
  name: "bio",
  type: "textarea",
  label: "Biography",
  rows?: 4,  // Number of visible rows
}
```

### Select

```typescript
{
  name: "country",
  type: "select",
  label: "Country",
  options: [
    { value: "us", label: "United States" },
    { value: "ca", label: "Canada" },
  ],
  allowEmpty?: true,
  emptyOptionLabel?: "Select a country...",
}
```

### Checkbox

```typescript
// Single checkbox
{
  name: "agreeToTerms",
  type: "checkbox",
  label: "I agree to the terms",
}

// Checkbox group (multiple selection)
{
  name: "interests",
  type: "checkbox",
  label: "Select your interests",
  options: [
    { value: "tech", label: "Technology" },
    { value: "sports", label: "Sports" },
  ],
}
```

### Radio

```typescript
{
  name: "gender",
  type: "radio",
  label: "Gender",
  options: [
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
    { value: "other", label: "Other" },
  ],
  direction?: "horizontal" | "vertical",  // Default: vertical
}
```

### Date

```typescript
{
  name: "birthDate",
  type: "date",
  label: "Date of Birth",
  minDate?: "1900-01-01",
  maxDate?: "2024-12-31",
}
```

### File Upload

```typescript
{
  name: "documents",
  type: "file",
  label: "Upload Documents",
  accept?: { "application/pdf": [".pdf"], "image/*": [".png", ".jpg"] },
  maxSizeMb?: 10,
  maxFiles?: 5,
  onProcessAll?: (files) => handleProcessing(files),
  isProcessing?: isLoading,
}
```

## Conditional Fields

Show/hide fields based on other field values:

```typescript
{
  name: "spouseName",
  type: "text",
  label: "Spouse Name",
  showWhen: [
    { field: "maritalStatus", operator: "equals", value: "married" }
  ]
}
```

### Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `equals` | Exact match | `{ field: "status", operator: "equals", value: "active" }` |
| `notEquals` | Not equal | `{ field: "type", operator: "notEquals", value: "guest" }` |
| `contains` | Array includes or string contains | `{ field: "roles", operator: "contains", value: "admin" }` |
| `isEmpty` | Field is empty/null/undefined | `{ field: "notes", operator: "isEmpty" }` |
| `isNotEmpty` | Field has a value | `{ field: "phone", operator: "isNotEmpty" }` |

Multiple conditions use AND logic (all must be true):

```typescript
showWhen: [
  { field: "country", operator: "equals", value: "us" },
  { field: "hasVisa", operator: "equals", value: true },
]
```

## Step Configuration

```typescript
{
  id: "step-id",
  title: "Step Title",
  description?: "Optional description",
  required?: true,  // Must complete before navigating past
  fields: [...],

  // Button overrides for this step
  nextButton?: { label: "Continue", variant: "primary" },
  prevButton?: { label: "Go Back", variant: "outline" },
}
```

## Form Configuration

```typescript
const config: MultiStepFormConfig = {
  id: "form-id",
  title: "Form Title",
  description?: "Form description",
  steps: [...],

  // Global button overrides
  saveButton?: { label: "Save Draft", variant: "secondary", hidden?: false },
  submitButton?: { label: "Complete", variant: "primary" },
};
```

## Component Props

```tsx
<MultiStepForm
  config={config}
  initialData={{ firstName: "John", lastName: "Doe" }}
  stepParamKey="step"  // URL param: ?step=1
  initialCompletedSteps={new Set([0, 1])}
  onSave={async (data, step) => { /* Called on Save button */ }}
  onSubmit={async (data) => { /* Called on final step */ }}
  onStepChange={(step) => { /* Called when step changes */ }}
  isSaving={false}  // Shows loading state
  className="custom-class"
/>
```

## Accessing Form State

Use a ref to get/set values programmatically:

```tsx
import { useRef } from "react";
import { MultiStepForm, type MultiStepFormRef } from "~/components/multi-step-form";

function MyPage() {
  const formRef = useRef<MultiStepFormRef>(null);

  const handleExternalUpdate = () => {
    formRef.current?.setValue("firstName", "Jane");
    const values = formRef.current?.getValues();
  };

  return (
    <MultiStepForm
      ref={formRef}
      config={config}
      onSave={...}
      onSubmit={...}
    />
  );
}
```

Within child components, use `useFormContext`:

```tsx
import { useFormContext } from "react-hook-form";

function ChildComponent() {
  const { watch, setValue } = useFormContext();
  const firstName = watch("firstName");
  // ...
}
```

## Adding New Field Types

To add a new field type:

1. Add the type to `types.ts`:

```typescript
// In types.ts
export type FieldType = "text" | ... | "myNewType";

export interface MyNewFieldConfig extends BaseFieldConfig {
  type: "myNewType";
  customProp?: string;
}

export type FieldConfig = ... | MyNewFieldConfig;
```

2. Handle it in `FieldRenderer.tsx`:

```tsx
// In FieldRenderer.tsx
if (field.type === "myNewType") {
  const myField = field as MyNewFieldConfig;
  return (
    <Controller
      name={myField.name}
      control={control}
      render={({ field: formField }) => (
        <InputWrapper label={myField.label} error={error}>
          <MyNewInput
            value={formField.value}
            onChange={formField.onChange}
            customProp={myField.customProp}
          />
        </InputWrapper>
      )}
    />
  );
}
```

## Layout with Field Widths

Use the `width` prop for grid layouts:

```typescript
{
  id: "address",
  title: "Address",
  fields: [
    { name: "street", type: "text", label: "Street", width: "1-1" },
    { name: "city", type: "text", label: "City", width: "1-2" },
    { name: "state", type: "text", label: "State", width: "1-4" },
    { name: "zip", type: "text", label: "ZIP", width: "1-4" },
  ],
}
```

Width values:
- `1-1` - Full width (default)
- `1-2` - Half width
- `1-3` - One-third width
- `1-4` - Quarter width

## Key Files

- `src/components/multi-step-form/MultiStepForm.tsx` - Main component
- `src/components/multi-step-form/FieldRenderer.tsx` - Field rendering logic
- `src/components/multi-step-form/types.ts` - Type definitions
- `src/components/multi-step-form/StepContent.tsx` - Step rendering
- `src/components/multi-step-form/StepIndicator.tsx` - Progress indicator
- `src/components/multi-step-form/useFormNavigation.ts` - Navigation hook
- `src/components/multi-step-form/useConditionalFields.ts` - Conditional visibility

## Notes

- Current step is URL-controlled (supports browser back/forward)
- Save is manual (no auto-save)
- No blocking validation - empty fields are allowed (MVP requirement)
- Uses FormProvider for nested component access
