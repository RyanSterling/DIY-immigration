---
name: simple-forms
description: Build forms using React Hook Form and form atoms. Use when creating login forms, settings pages, modals with inputs, or any standalone form that doesn't need multi-step navigation.
---

# Simple Forms with React Hook Form

Build forms using atoms from `src/atoms/` integrated with React Hook Form.

## Quick Start

```tsx
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "~/atoms/Input";
import { Select } from "~/atoms/Select";
import Button from "~/atoms/Button";

const schema = z.object({
  email: z.string().email("Invalid email"),
  role: z.string().min(1, "Select a role"),
});

type FormData = z.infer<typeof schema>;

function MyForm() {
  const methods = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    console.log(data);
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-4">
        <Input name="email" label="Email" type="email" required />
        <Select
          name="role"
          label="Role"
          options={[
            { value: "admin", label: "Admin" },
            { value: "user", label: "User" },
          ]}
        />
        <Button type="submit">Submit</Button>
      </form>
    </FormProvider>
  );
}
```

## Available Form Atoms

All atoms in `src/atoms/` are pre-integrated with React Hook Form via `useFormContext()`.

| Atom | Use For | Key Props |
|------|---------|-----------|
| `Input` | Text, email, phone, number | `type`, `startAdornment`, `endAdornment` |
| `Select` | Dropdowns | `options: { value, label }[]` |
| `Textarea` | Multi-line text | `rows` |
| `Checkbox` | Single checkbox or groups | `options[]` for groups |
| `Radio` | Radio button groups | `options[]`, `direction` |
| `DatePicker` | Date selection | `minDate`, `maxDate` |

## When to Use register() vs Controller

**Self-registering atoms (use directly):**
- `Input`, `Select`, `Textarea` - these call `register()` internally

**Controller-based atoms (wrap with Controller):**
- `Checkbox`, `Radio`, `DatePicker` - need `Controller` for controlled behavior

```tsx
import { Controller, useFormContext } from "react-hook-form";
import { Checkbox } from "~/atoms/Checkbox";
import { InputWrapper } from "~/atoms/InputWrapper";

function ControlledCheckbox({ name, label }: { name: string; label: string }) {
  const { control, formState: { errors } } = useFormContext();
  const error = errors[name]?.message as string | undefined;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <InputWrapper label={label} error={error}>
          <Checkbox
            id={name}
            label={label}
            checked={!!field.value}
            onChange={field.onChange}
            error={error}
          />
        </InputWrapper>
      )}
    />
  );
}
```

## Creating New Atoms

If an atom doesn't exist, create it in `src/atoms/` following this pattern:

```tsx
import type { ReactNode, Ref } from "react";
import type { RegisterOptions } from "react-hook-form";
import { useFormContext } from "react-hook-form";
import { cn } from "~/utils/cn";
import { InputWrapper } from "~/atoms/InputWrapper";
import { getErrorMessage } from "~/lib/form-utils";

export interface MyInputProps {
  name: string;
  label?: string;
  description?: string;
  descriptionPosition?: "top" | "bottom";
  disabled?: boolean;
  required?: boolean | string;
  rules?: Pick<RegisterOptions, "validate" | "required" | "pattern">;
  // ... other props specific to your input
}

export function MyInput({
  name,
  label,
  description,
  descriptionPosition = "top",
  disabled = false,
  required = false,
  rules = {},
}: MyInputProps) {
  const { register, formState: { errors } } = useFormContext();

  const requiredMessage = typeof required === "string"
    ? required
    : "This field is required.";
  const errorMessage = getErrorMessage(name, errors);

  const { ref, ...rest } = register(name, {
    required: required ? requiredMessage : false,
    ...rules,
  });

  return (
    <InputWrapper
      label={label}
      description={description}
      descriptionPosition={descriptionPosition}
      disabled={disabled}
      error={errorMessage}
      id={name}
      required={Boolean(required)}
    >
      <input
        ref={ref}
        id={name}
        disabled={disabled}
        aria-invalid={Boolean(errorMessage)}
        className={cn(
          "block w-full rounded-md border-0 py-1.5 px-3 text-gray-900",
          "ring-1 shadow-sm sm:text-sm sm:leading-6",
          errorMessage
            ? "ring-red-300 focus:ring-red-500"
            : "ring-gray-300 focus:ring-primary-600",
          disabled && "cursor-not-allowed bg-gray-100"
        )}
        {...rest}
      />
    </InputWrapper>
  );
}
```

## Tailwind Styling Patterns

### The cn() Utility

Use `cn()` from `~/utils/cn` to merge Tailwind classes conditionally:

```tsx
import { cn } from "~/utils/cn";

const classes = cn(
  "base-classes",
  condition && "conditional-classes",
  error ? "error-classes" : "normal-classes"
);
```

### Common Form Styling

```tsx
// Input base styling
"block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 shadow-sm sm:text-sm"

// Focus states
"focus:ring-2 focus:ring-inset focus:ring-primary-600"

// Error states
"ring-red-300 text-red-900 placeholder:text-red-300 focus:ring-red-500"

// Disabled states
"cursor-not-allowed bg-gray-100 opacity-50"

// Form layout
"space-y-4"  // Vertical spacing between fields
"grid grid-cols-2 gap-4"  // Two-column layout
```

### Color Palette

- Primary actions: `primary-600`, `primary-700` (hover)
- Borders/rings: `gray-300`
- Text: `gray-900` (primary), `gray-700` (labels), `gray-500` (descriptions)
- Errors: `red-500`, `red-600`
- Focus rings: `focus:ring-primary-600`

## Form Layout Examples

### Single Column
```tsx
<form className="space-y-4">
  <Input name="firstName" label="First Name" />
  <Input name="lastName" label="Last Name" />
</form>
```

### Two Columns
```tsx
<form className="space-y-4">
  <div className="grid grid-cols-2 gap-4">
    <Input name="firstName" label="First Name" />
    <Input name="lastName" label="Last Name" />
  </div>
  <Input name="email" label="Email" />
</form>
```

### With Actions
```tsx
<form className="space-y-6">
  {/* Fields */}
  <div className="space-y-4">
    <Input name="name" label="Name" />
  </div>

  {/* Actions */}
  <div className="flex justify-end gap-3">
    <Button variant="outline" type="button">Cancel</Button>
    <Button type="submit">Save</Button>
  </div>
</form>
```

## Validation

Use Zod schemas with `zodResolver`:

```tsx
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  age: z.number().min(18, "Must be 18 or older"),
  website: z.string().url().optional(),
});

const methods = useForm({
  resolver: zodResolver(schema),
});
```

For inline validation on atoms, use the `rules` prop:

```tsx
<Input
  name="phone"
  label="Phone"
  rules={{
    pattern: {
      value: /^\d{10}$/,
      message: "Must be 10 digits"
    }
  }}
/>
```

## Key Files

- `src/atoms/Input.tsx` - Text input reference
- `src/atoms/InputWrapper.tsx` - Label/error wrapper
- `src/atoms/Button.tsx` - Button component
- `src/utils/cn.ts` - Class merging utility
- `src/lib/form-utils.ts` - getErrorMessage helper
