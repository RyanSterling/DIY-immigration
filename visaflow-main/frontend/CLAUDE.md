# Frontend

React application with Vite, TypeScript, and Tailwind CSS. See the top-level CLAUDE.md for full project context.

## Form Development

All user input functionality must use React Hook Form for consistency.

### Using Atoms for Forms

When building forms, use atoms from `src/atoms/`. These are pre-integrated with React Hook Form. **Before creating new components, check if an atom already exists that handles your use case.**

Available form atoms: `Input`, `Select`, `Textarea`, `Checkbox`, `Radio`, `DatePicker`

Atoms use `useFormContext()` and wrap content in `InputWrapper` for consistent label/error handling:

```tsx
import { useFormContext } from "react-hook-form";
import { InputWrapper } from "./InputWrapper";

const { register, formState: { errors } } = useFormContext();
const { ref, ...rest } = register(name, rules);

return (
  <InputWrapper label={label} name={name} error={errors[name]?.message}>
    <input ref={ref} {...rest} />
  </InputWrapper>
);
```

### Creating New Form Atoms

If an atom doesn't exist for your needs, create it in `src/atoms/` following the same pattern:
1. Use `useFormContext()` to access form state
2. Use `register(name, rules)` to connect to the form
3. Wrap in `InputWrapper` for labels and error display
4. Support a `rules` prop for validation

## Folder Structure

- **atoms/** - Low-level, reusable UI components. Form inputs are RHF-integrated. Look here first when building forms or needing basic UI elements (buttons, spinners, etc.)

- **components/** - Composite and feature-specific components. Look here for business logic components, the multi-step-form system, and composed UI pieces.

- **hooks/** - Custom React hooks for data fetching and state management. Look here when you need to interact with the API or manage complex state.

- **pages/** - Page-level components. Each file corresponds to a route. Look here to understand page structure or add new routes.

- **lib/** - Utility libraries and API configuration. Contains `api.ts` (Hono client), `cache.ts` (React Query), `document-utils.ts` (document helpers), and `form-utils.ts` (form helpers).

- **providers/** - React context providers for auth and toast notifications.

## Code Organization Standards

### No Barrel Exports

Do NOT create `index.ts` barrel files. Import each module directly:

```tsx
// Correct
import { Button } from "~/atoms/Button";
import { Input } from "~/atoms/Input";

// Wrong - no barrel exports
import { Button, Input } from "~/atoms";
```

### Export Style

- **Single component/function files**: Use default export for cleaner imports
- **Multi-export files**: Use named exports

```tsx
// Single component file - use default
export default function Button() { ... }
import Button from "~/atoms/Button";

// Multiple exports (like Checkbox + CheckboxGroup) - use named
export function Checkbox() { ... }
export function CheckboxGroup() { ... }
import { Checkbox, CheckboxGroup } from "~/atoms/Checkbox";
```

### Shared Types

- Atom-related types (e.g., `FieldOption`): `~/atoms/types.ts`
- Form component types: `~/components/forms/types.ts`
- Multi-step form types: `~/components/multi-step-form/types.ts`

### Utility Functions

Don't duplicate utility functions across files. Extract to the appropriate lib file:

- Document utilities (`getDocumentTypeLabel`, `formatConfidence`): `~/lib/document-utils.ts`
- Form utilities (`getErrorMessage`): `~/lib/form-utils.ts`
- Generic utilities (`cn`): `~/utils/`
