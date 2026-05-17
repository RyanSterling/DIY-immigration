# Plan: Single Save Button for Admin Form Template Editor

## Overview

Refactor the admin `FormTemplateDetail.tsx` page from individual save buttons (per template/section/field) to a single global save button using React Hook Form. All operations (create, update, delete) will be batched until the user clicks Save.

## Current State

- **File**: `/admin/src/pages/form-templates/FormTemplateDetail.tsx` (1,620 lines)
- **Problem**: 3 levels of forms with separate save buttons and individual API calls
- **Dead Code**: `SectionEditor` component (lines 658-861) is defined but never used
- **State Management**: Manual `useState` for change tracking at each level

## Requirements

1. Single save button at top of page handles ALL changes
2. All operations batched (creates, updates, deletes) until Save clicked
3. Keep "Unsaved" badges on individual sections/fields
4. Use React Hook Form for state management

---

## Implementation Plan

### Phase 1: Backend - Update Existing Endpoint

**File**: `/backend/src/routes/adminFormTemplates.ts`

Update existing `PATCH /:id` endpoint to accept full template with nested sections and fields:

```typescript
// Request payload structure
{
  formNumber?: string,
  title?: string,
  revision?: string,
  pdfTemplateUrl?: string,
  organizationId?: string,
  sections: [
    {
      id?: string,           // Existing section ID (omit for new sections)
      _tempId?: string,      // Client-generated ID for new sections
      _deleted?: boolean,    // Mark for deletion
      title: string,
      order: number,
      fields: [
        {
          id?: string,       // Existing field ID (omit for new fields)
          _tempId?: string,  // Client-generated ID for new fields
          _deleted?: boolean,// Mark for deletion
          // ... all field properties
        }
      ]
    }
  ]
}
```

**Transaction Order** (for referential integrity):
1. Update template metadata
2. Delete sections marked with `_deleted` (cascades to fields)
3. Delete individual fields marked with `_deleted`
4. Update existing sections
5. Update existing fields
6. Create new sections with nested fields
7. Create new fields in existing sections

### Phase 2: Form Schema & Types

**New File**: `/admin/src/pages/form-templates/formTemplateSchema.ts`

- Zod schema for form validation
- `_tempId: string` - Client-generated ID for new items (React key)
- `_deleted: boolean` - Soft delete flag for pending deletes

### Phase 3: Hook Update

**File**: `/admin/src/hooks/useAdminFormTemplates.ts`

Update existing `useUpdateFormTemplate` hook to send full nested payload with sections and fields.

### Phase 4: Custom Editor Refactoring

Refactor custom editors to use `useController({ name })` internally - no wrapper components needed:

- `OptionsEditor` - Add `name` prop, use `useController` internally
- `KeyValueEditor` - Add `name` prop, use `useController` internally
- `ShowWhenEditor` - Add `name` prop, use `useController` internally
- `AutofillMappingEditor` - Add `name` prop, use `useController` internally

Each editor receives a `name` prop and handles its own RHF integration via `useController`.

### Phase 5: Component Refactoring

**File**: `/admin/src/pages/form-templates/FormTemplateDetail.tsx`

**Structure Changes**:
```
FormProvider (page level)
├── Header with Global Save Button
├── TemplateMetadataForm (useFormContext)
└── SectionsAccordion (purely UI container)
    └── SectionAccordion (purely UI container)
        └── FieldsAccordion (purely UI container)
            └── Field inputs (all use useFormContext directly)
```

**Key Changes**:
1. Wrap entire page in `<FormProvider>`
2. Replace `useState` with `useForm` / `useFormContext`
3. Use `useFieldArray` for sections and nested fields
4. Replace individual save buttons with single global save
5. Use `formState.dirtyFields` for "Unsaved" badge detection
6. Delete dead `SectionEditor` component (lines 658-861)
7. Accordions are purely UI containers for visual organization
8. All inputs use `useFormContext()` directly with proper field paths

### Phase 6: Change Detection Utility

**New File**: `/admin/src/pages/form-templates/computeChanges.ts`

Diff function that compares original data vs current form data to determine:
- Which template fields changed
- Which sections are new/modified/deleted
- Which fields are new/modified/deleted

### Phase 7: Dirty Status Hook

**New Hook**: `useDirtyStatus()`

Uses `formState.dirtyFields` to provide:
- `getSectionStatus(index)` → `{ isNew, isDeleted, isDirty }`
- `getFieldStatus(sectionIdx, fieldIdx)` → `{ isNew, isDeleted, isDirty }`

For rendering appropriate status badges.

---

## Files to Modify

| File | Changes |
|------|---------|
| `/backend/src/routes/adminFormTemplates.ts` | Update `PATCH /:id` endpoint to accept nested sections and fields |
| `/admin/src/hooks/useAdminFormTemplates.ts` | Update `useUpdateFormTemplate` hook for nested payload |
| `/admin/src/pages/form-templates/FormTemplateDetail.tsx` | Major refactor to RHF |
| `/admin/src/pages/form-templates/editors/OptionsEditor.tsx` | Add `name` prop, use `useController` internally |
| `/admin/src/pages/form-templates/editors/KeyValueEditor.tsx` | Add `name` prop, use `useController` internally |
| `/admin/src/pages/form-templates/editors/ShowWhenEditor.tsx` | Add `name` prop, use `useController` internally |
| `/admin/src/pages/form-templates/editors/AutofillMappingEditor.tsx` | Add `name` prop, use `useController` internally |

## New Files to Create

| File | Purpose |
|------|---------|
| `/admin/src/pages/form-templates/formTemplateSchema.ts` | Zod schema for form |
| `/admin/src/pages/form-templates/computeChanges.ts` | Diff utility for save logic |
| `/admin/src/pages/form-templates/useDirtyStatus.ts` | Hook for change detection badges |
| `/admin/src/pages/form-templates/components/TemplateMetadataForm.tsx` | Template-level form fields |
| `/admin/src/pages/form-templates/components/SectionsEditor.tsx` | Sections list with useFieldArray |
| `/admin/src/pages/form-templates/components/SectionEditor.tsx` | Single section editor |
| `/admin/src/pages/form-templates/components/FieldEditor.tsx` | Single field editor |
| `/admin/src/pages/form-templates/components/StatusBadge.tsx` | Unsaved/New/Deleted badge |
| `/admin/src/pages/form-templates/components/AddSectionModal.tsx` | Modal for new section |
| `/admin/src/pages/form-templates/components/AddFieldModal.tsx` | Modal for new field |
| `/admin/src/pages/form-templates/components/DeleteConfirmModal.tsx` | Delete confirmation |

## File Structure After Refactor

```
/admin/src/pages/form-templates/
├── FormTemplateDetail.tsx          # Main page (~200 lines)
├── FormTemplateCreate.tsx          # Existing create page
├── formTemplateSchema.ts           # Zod schema + types
├── computeChanges.ts               # Diff utility
├── useDirtyStatus.ts               # Dirty tracking hook
├── components/
│   ├── TemplateMetadataForm.tsx
│   ├── SectionsEditor.tsx
│   ├── SectionEditor.tsx
│   ├── FieldEditor.tsx
│   ├── StatusBadge.tsx
│   ├── AddSectionModal.tsx
│   ├── AddFieldModal.tsx
│   └── DeleteConfirmModal.tsx
└── editors/                        # Existing custom editors (updated with useController)
    ├── OptionsEditor.tsx
    ├── KeyValueEditor.tsx
    ├── ShowWhenEditor.tsx
    └── AutofillMappingEditor.tsx
```

---

## Verification

1. **Unit Tests**: Add tests for `computeChanges` utility
2. **Manual Testing**:
   - Edit template metadata → Save → Verify persisted
   - Add new section with fields → Save → Verify created
   - Modify existing section/field → Save → Verify updated
   - Delete section → Save → Verify deleted
   - Mixed operations (add + edit + delete) → Save → Verify all applied
   - Navigate away with unsaved changes → Verify warning shown
3. **API Testing**: Test updated `PATCH /:id` endpoint with nested payloads

---

## Notes

- The file is 1,620 lines - will be broken into smaller components during refactor
- Existing custom editors are updated to use `useController` internally with a `name` prop
- React Hook Form's `isDirty` replaces manual `hasChanges` state tracking
- Accordions serve only as UI containers; all form inputs connect to RHF via `useFormContext()`
