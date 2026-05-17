# Multi-Step Form Component

A reusable, JSON-driven multi-step form component built on React Hook Form.

## Quick Start

Import and use the component:

```tsx
import { MultiStepForm, type MultiStepFormConfig } from '~/components/multi-step-form';

const config: MultiStepFormConfig = {
  id: 'my-form',
  title: 'My Form',
  steps: [
    {
      id: 'step-1',
      title: 'Step One',
      fields: [
        { name: 'firstName', type: 'text', label: 'First Name' },
        { name: 'lastName', type: 'text', label: 'Last Name' },
      ],
    },
  ],
};

function MyPage() {
  return (
    <MultiStepForm
      config={config}
      onSave={(data, step) => console.log('Saved:', data)}
      onSubmit={(data) => console.log('Submitted:', data)}
    />
  );
}
```

## Field Types

| Type | Description | Extra Props |
|------|-------------|-------------|
| `text` | Single-line text input | - |
| `email` | Email input | - |
| `phone` | Phone number input | - |
| `number` | Numeric input | - |
| `textarea` | Multi-line text | `rows?: number` |
| `select` | Dropdown | `options`, `allowEmpty`, `emptyOptionLabel` |
| `checkbox` | Single or group | `options[]` for group |
| `radio` | Radio button group | `options`, `direction` |
| `date` | Date picker | `minDate`, `maxDate` |
| `file` | File upload | `accept`, `maxSizeMb`, `maxFiles` |

## Conditional Fields

Show/hide fields based on other field values:

```typescript
{
  name: 'spouseName',
  type: 'text',
  label: 'Spouse Name',
  showWhen: [
    { field: 'maritalStatus', operator: 'equals', value: 'married' }
  ]
}
```

**Operators:**
- `equals` / `notEquals` - Exact value match
- `contains` - Array includes or string contains
- `isEmpty` / `isNotEmpty` - Check for empty value

Multiple conditions use AND logic (all must be true).

## Props

| Prop | Type | Description |
|------|------|-------------|
| `config` | `MultiStepFormConfig` | Form configuration object |
| `initialData` | `FormData` | Pre-populate form fields |
| `stepParamKey` | `string` | URL param key for step (default: `'step'`) |
| `initialCompletedSteps` | `Set<number>` | Steps already completed |
| `onSave` | `(data, step) => Promise<void>` | Called when Save clicked |
| `onSubmit` | `(data) => Promise<void>` | Called on final step submit |
| `onStepChange` | `(step) => void` | Called when step changes |
| `isSaving` | `boolean` | Shows loading state on buttons |
| `className` | `string` | Additional CSS classes |

## Customizing Buttons

Override button text and styling per-step or globally:

```typescript
const config: MultiStepFormConfig = {
  // Global button overrides
  saveButton: { label: 'Save Draft', variant: 'secondary' },
  submitButton: { label: 'Complete', variant: 'primary' },
  steps: [
    {
      id: 'step-1',
      title: 'Step One',
      // Per-step overrides
      nextButton: { label: 'Continue', variant: 'primary' },
      prevButton: { label: 'Go Back', variant: 'outline' },
      fields: [...],
    },
  ],
};
```

## Step Navigation

Steps can be marked as `required`:

```typescript
{
  id: 'personal-info',
  title: 'Personal Information',
  required: true,  // Must complete before navigating past
  fields: [...],
}
```

**Navigation Rules:**
- Users can click any step in the progress indicator
- If all previous required steps are complete → navigate to clicked step
- If a required step is incomplete → navigate to first incomplete required step instead
- Completed steps show a checkmark and are always accessible

## URL-Controlled Navigation

The current step is stored in the URL search params for proper navigation and bookmarking:

- Step 0: `/form` (no param)
- Step 1: `/form?step=1`
- Step 2: `/form?step=2`

To customize the param key:

```tsx
<MultiStepForm
  config={config}
  stepParamKey="formStep"  // Results in ?formStep=1
  onSave={...}
  onSubmit={...}
/>
```

## Notes

- Current step is URL-controlled (supports browser back/forward)
- Save is manual (no auto-save)
- No blocking validation - empty fields are allowed
- Uses FormProvider from React Hook Form for nested access
