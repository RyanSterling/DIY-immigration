# Forms UI Implementation Plan

## Summary
Create form template selection cards on the `/forms` page with a confirmation modal that includes client selection, using localStorage for form instance persistence.

## User Requirements
- **Location**: Global `/forms` page
- **Card Content**: Form number, title, brief description
- **Card Action**: Show confirmation modal with client selection
- **Storage**: localStorage for MVP (no backend API)

---

## Files to Create

### 1. Template Registry
**`frontend/src/templates/index.ts`**
- Export array of all available form templates
- Helper function `getTemplateById(id)` to fetch full template
- Lightweight `FormTemplateInfo` type for card display (id, formNumber, title, description)

### 2. Form Template Card Component
**`frontend/src/components/FormTemplateCard.tsx`**
- Displays: form number prominently, title, revision date, description
- Uses existing `Card` component as base
- Hover state with border/shadow change
- onClick handler to open modal

### 3. Client Select Component (Standalone)
**`frontend/src/components/ClientSelect.tsx`**
- Searchable dropdown for selecting a client (NOT React Hook Form integrated)
- Uses `useClients` hook with search
- Shows client name and nationality flag
- Props: `value`, `onChange`, `placeholder`

### 4. Start Form Modal
**`frontend/src/components/StartFormModal.tsx`**
- Modal with form info display
- ClientSelect component for choosing client
- Cancel and "Start Form" buttons
- Disable confirm until client selected
- Props: `isOpen`, `onClose`, `template`, `onConfirm`, `isLoading`

### 5. Form Instance Storage Hook
**`frontend/src/hooks/useFormInstances.ts`**
- localStorage-based persistence for form instances
- Functions: `createInstance`, `getInstance`, `updateInstance`, `listInstancesForClient`
- Instance structure: `{ id, templateId, clientId, status, data, createdAt, updatedAt }`

### 6. Form Instance Page
**`frontend/src/pages/FormInstance.tsx`**
- Route: `/forms/:templateId/:instanceId`
- Loads template from registry + instance data from localStorage
- Renders `MultiStepForm` component
- Handles save and complete actions

---

## Files to Modify

### 1. Forms Page
**`frontend/src/pages/Forms.tsx`**
- Replace placeholder with template card grid
- Grid layout: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
- State for selected template and modal open
- On confirm: create instance in localStorage, navigate to form page

### 2. Router
**`frontend/src/router.tsx`**
- Add route: `/forms/:templateId/:instanceId` -> `PageFormInstance`

### 3. Client Forms Tab (optional enhancement)
**`frontend/src/pages/client-detail/ClientForms.tsx`**
- Show list of form instances for this client (from localStorage)
- Link to continue editing each instance

---

## Implementation Order

1. **Template Registry** (`templates/index.ts`)
2. **FormTemplateCard** component
3. **ClientSelect** component
4. **StartFormModal** component
5. **Update Forms.tsx** with cards + modal
6. **useFormInstances** hook (localStorage)
7. **FormInstance.tsx** page
8. **Router update** for form instance route
9. **ClientForms.tsx** enhancement (list instances)

---

## Key Technical Decisions

- **No barrel exports**: Import each module directly per project conventions
- **Standalone ClientSelect**: Not React Hook Form integrated since it's used in modal
- **localStorage keys**: `form-instance-{uuid}` and index at `form-instances-index`
- **Default export**: Single component files use default export
- **Styling**: Follow existing patterns (ring borders, primary-600 blue, rounded-md)

---

## Form Instance Data Structure

```typescript
interface FormInstance {
  id: string;           // UUID
  templateId: string;   // e.g., "i-765"
  clientId: string;     // Client UUID
  status: 'draft' | 'completed';
  data: Record<string, unknown>;  // Form field values
  createdAt: string;    // ISO date
  updatedAt: string;    // ISO date
}
```

---

## Critical Files Reference

- `frontend/src/templates/i-765.ts` - Existing template to include
- `frontend/src/components/multi-step-form/types.ts` - FormTemplate interface
- `frontend/src/components/Card.tsx` - Card component to use
- `frontend/src/components/ConfirmationModal.tsx` - Modal pattern reference
- `frontend/src/hooks/useClients.ts` - Hook pattern to follow
- `frontend/src/pages/Forms.tsx` - Main page to update
- `frontend/src/router.tsx` - Router to update
