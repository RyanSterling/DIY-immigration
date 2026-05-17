# Form Template Migration Plan: TypeScript to Database

## Overview

Migrate form template definitions from hard-coded TypeScript files (`frontend/src/templates/`) to the PostgreSQL database, enabling dynamic form management and replacing localStorage with API-based persistence.

## Current State

- **Frontend**: Form templates defined in `frontend/src/templates/i-765.ts` (1,548 lines, 16 steps, 133 fields)
- **Persistence**: Form instances stored in localStorage via `useFormInstances` hook
- **Backend**: Database schema exists (`formTemplates`, `formSections`, `formFields`, etc.) but no API routes

## Target State

- Form templates stored in database, fetched via API
- Form instances persisted to database with auto-save
- Frontend uses React Query hooks for all form operations

---

## Phase 1: Schema Modifications

### Files to Modify
- `backend/src/db/schema.ts`
- New migration file: `backend/drizzle/0008_*.sql`

### Changes Required

**1.1 Replace `pdfFieldId` with `pdfMappings` (CRITICAL)**

The current single `pdfFieldId` column cannot represent value-specific PDF field mappings for radio/checkbox fields (e.g., `"mailingAptSteFlr:apt"` → separate PDF checkbox).

```sql
ALTER TABLE form_fields ADD COLUMN pdf_mappings JSONB;
UPDATE form_fields SET pdf_mappings = jsonb_build_object('default', pdf_field_id) WHERE pdf_field_id IS NOT NULL;
ALTER TABLE form_fields DROP COLUMN pdf_field_id;
```

**1.2 Add missing field properties to `form_fields`**

```sql
ALTER TABLE form_fields
  ADD COLUMN disabled BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN hide_label BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN class_name TEXT,
  ADD COLUMN field_config JSONB;  -- Type-specific: rows, direction, accept, maxSizeMb, etc.
```

**1.3 Add missing section properties to `form_sections`**

```sql
ALTER TABLE form_sections
  ADD COLUMN help_text TEXT,
  ADD COLUMN is_required BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN button_config JSONB;
```

---

## Phase 2: Backend API Routes

### Files to Create
- `backend/src/routes/formTemplates.ts`
- `backend/src/routes/formInstances.ts`

### Files to Modify
- `backend/src/index.ts` (register routes)
- `backend/src/lib/redis.ts` (add cache keys)

### Endpoints

**Form Templates (read-only)**
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/form-templates` | List all templates (metadata) |
| GET | `/api/form-templates/:id` | Get full template with sections, fields, mappings |

**Form Instances (CRUD)**
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/form-instances` | Create new instance |
| GET | `/api/form-instances` | List instances (filter by clientId, status) |
| GET | `/api/form-instances/:id` | Get instance with responses |
| PATCH | `/api/form-instances/:id` | Update status/progress |
| DELETE | `/api/form-instances/:id` | Soft delete |
| PATCH | `/api/form-instances/:id/responses` | Bulk update field values |
| GET | `/api/form-instances/:id/autofill` | Get autofill from clientFieldValues |

### Key Implementation Details

- Follow existing patterns from `clientFieldValues.ts` and `clients.ts`
- Multi-tenant: Always filter by `organizationId`
- Soft deletes: Check `deletedAt IS NULL`
- Optimistic locking: Use `version` field on `formResponses`
- Cache invalidation after mutations
- **Role-based access**: POST, PATCH, DELETE on `/api/form-instances` require admin role (use `requireRole("org_admin")` middleware)

---

## Phase 3: Seed Script for Template Migration

### Files to Create
- `backend/src/db/seed-templates.ts`

### Purpose
Parse the TypeScript template (`i-765.ts`) and insert into database tables:
1. `formTemplates` - Template metadata
2. `formSections` - Steps/parts
3. `formFields` - Individual fields with `pdfMappings` JSONB
4. `formFieldAutofillMappings` - Links to canonical client fields

### Approach
```typescript
// 1. Import template from TypeScript
import { i765Template } from '../../frontend/src/templates/i-765';

// 2. Insert template
const [template] = await db.insert(formTemplates).values({
  formNumber: i765Template.formNumber,
  title: i765Template.title,
  revision: i765Template.revision,
  organizationId: null, // Global template
}).returning();

// 3. Insert sections (steps)
for (const [idx, step] of i765Template.steps.entries()) {
  const [section] = await db.insert(formSections).values({
    formTemplateId: template.id,
    sectionKey: step.id,
    title: step.title,
    description: step.description,
    orderIndex: idx,
  }).returning();

  // 4. Insert fields
  for (const [fieldIdx, field] of step.fields.entries()) {
    const [dbField] = await db.insert(formFields).values({
      formSectionId: section.id,
      name: field.name,
      label: field.label,
      fieldType: field.type,
      pdfMappings: buildPdfMappings(field.name, i765Template.pdfFieldMappings),
      options: field.options,
      showWhen: field.showWhen,
      width: field.width,
      orderIndex: fieldIdx,
      // ... other properties
    }).returning();

    // 5. Insert autofill mapping if exists
    const autofillMapping = i765Template.autofillMappings[field.name];
    if (autofillMapping) {
      await db.insert(formFieldAutofillMappings).values({
        formFieldId: dbField.id,
        canonicalField: autofillMapping,
      });
    }
  }
}
```

---

## Phase 4: Frontend API Integration

### Files to Create
- `frontend/src/hooks/useFormTemplates.ts`
- `frontend/src/hooks/useFormInstancesApi.ts`
- `frontend/src/components/skeletons/FormInstanceSkeleton.tsx`

### Files to Modify
- `frontend/src/pages/Forms.tsx`
- `frontend/src/pages/FormInstance.tsx`
- `frontend/src/pages/client-detail/ClientForms.tsx`
- `frontend/src/lib/form-utils.ts` (add template transform)

### Key Changes

**4.1 New Hooks**

```typescript
// useFormTemplates.ts
export function useFormTemplates() {
  const listQuery = useQuery({
    queryKey: ["form-templates", "list"],
    queryFn: async () => { /* fetch from API */ },
    staleTime: 1000 * 60 * 30, // 30 min - templates rarely change
  });
  // ...
}

// useFormInstancesApi.ts
export function useFormInstances(options: { clientId?: string }) {
  // List, create, update, delete mutations
  // useSaveResponses with optimistic updates
  // ...
}
```

**4.2 Manual Save Only**

No auto-save functionality. Users must explicitly click "Save" to persist changes. The save button will:
1. Call `PATCH /api/form-instances/:id/responses` with current form data
2. Show loading state during save
3. Display success/error toast notification

**4.3 Template Transformation**

Transform normalized DB structure → flat `MultiStepFormConfig` for existing components:

```typescript
function transformApiTemplateToConfig(apiTemplate): MultiStepFormConfig {
  return {
    id: apiTemplate.id,
    title: apiTemplate.title,
    steps: apiTemplate.sections.map(section => ({
      id: section.sectionKey,
      title: section.title,
      fields: section.fields.map(/* ... */),
    })),
  };
}
```

---

## Phase 5: Deprecation & Cleanup

### Files to Deprecate
- `frontend/src/templates/i-765.ts` (keep for reference)
- `frontend/src/templates/index.ts`
- `frontend/src/hooks/useFormInstances.ts` (localStorage version)

### Migration for Existing Data
If there are form instances in localStorage, create a one-time migration:

```typescript
async function migrateLocalStorageToApi() {
  const instances = listAllInstances(); // from localStorage
  for (const instance of instances) {
    await apiClient.post("/form-instances/migrate", instance);
    deleteInstance(instance.id); // remove from localStorage
  }
}
```

---

## Implementation Order

1. **Schema Changes** (Phase 1)
   - Create migration file for `form_fields` and `form_sections` changes
   - Update Drizzle schema
   - Run migration

2. **Seed Script** (Phase 3)
   - Create and test seed script
   - Populate database with I-765 template

3. **Backend Routes** (Phase 2)
   - Implement `formTemplates.ts` (read-only)
   - Implement `formInstances.ts` (CRUD + responses + autofill)
   - Register routes and test

4. **Frontend Integration** (Phase 4)
   - Create new hooks
   - Update pages with loading states
   - Add auto-save functionality

5. **Cleanup** (Phase 5)
   - Migrate any existing localStorage data
   - Remove deprecated code

---

## Verification Plan

### Backend Testing
```bash
# After Phase 2-3, test API endpoints:
curl http://localhost:3001/api/form-templates
curl http://localhost:3001/api/form-templates/:id
curl -X POST http://localhost:3001/api/form-instances -d '{"clientId":"...", "formTemplateId":"..."}'
```

### Frontend Testing
1. Navigate to `/forms` - should load templates from API
2. Create new form instance - should POST to API
3. Fill form fields - should auto-save to API
4. Refresh page - form data should persist from database
5. Check client forms tab - should show instances from API

### Integration Testing
1. Create form instance
2. Auto-fill from extracted client data
3. Save progress, close browser
4. Reopen - data should be intact
5. Complete form - status should update

---

## Critical Files Reference

| File | Purpose |
|------|---------|
| `backend/src/db/schema.ts` | Database schema definitions |
| `frontend/src/templates/i-765.ts` | Source template (1,548 lines) |
| `frontend/src/components/multi-step-form/types.ts` | TypeScript interfaces |
| `backend/src/routes/clientFieldValues.ts` | Pattern for API routes |
| `frontend/src/hooks/useClients.ts` | Pattern for React Query hooks |

---

## Estimated Scope

- **Schema migration**: 1 file (migration SQL)
- **Backend routes**: 2 new files (~400 lines each)
- **Seed script**: 1 new file (~200 lines)
- **Frontend hooks**: 2 new files (~150 lines each)
- **Page updates**: 3 files (moderate changes)
- **Total new code**: ~1,500 lines
