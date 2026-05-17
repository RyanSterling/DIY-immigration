---
name: seed-form-template
description: Seed a generated form template into the PostgreSQL database. Final step in the form template generation pipeline.
allowed-tools: Read, Bash, Glob, Grep
---

# Seed Form Template

Inserts a generated form template into the database, creating records in `formTemplates`, `formSections`, `formFields`, and `formFieldAutofillMappings` tables.

## When to Use

Invoke this skill when:
- User runs `/seed-form-template <form-id>`
- A validated form template JSON exists at `frontend/src/templates/_generated/{form-id}.json`
- User wants to make a template available in the application

## Prerequisites

The JSON template file must exist at:
```
frontend/src/templates/_generated/{form-id}.json
```

This JSON is produced by the `/generate-form-template` skill.

## Inputs

| Input | Source | Example |
|-------|--------|---------|
| `form-id` | Command argument | `i-765`, `i-131`, `i-485` |
| JSON file | `frontend/src/templates/_generated/{form-id}.json` | FormTemplate JSON |

## Outputs

- Template record created in `formTemplates` table
- Section records created in `formSections` table
- Field records created in `formFields` table
- Autofill mapping records created in `formFieldAutofillMappings` table
- Summary of all records created

## Process

### 1. Parse Form ID

Extract `form-id` from `$ARGUMENTS`. If not provided, ask the user.

### 2. Read JSON Template

```bash
# Expected location
frontend/src/templates/_generated/{form-id}.json
```

The JSON file should contain:
- `id`: Template identifier
- `title`: Form title
- `formNumber`: Official form number (e.g., "I-765")
- `revision`: Form revision date
- `steps`: Array of step configurations with fields
- `pdfFieldMappings`: Map of field names to PDF field paths
- `autofillMappings`: Map of field names to canonical client field keys

### 3. Check for Existing Template

Query the database for an existing template with the same `formNumber` and `revision`:

```typescript
const existing = await db
  .select()
  .from(schema.formTemplates)
  .where(
    and(
      eq(schema.formTemplates.formNumber, data.formNumber),
      eq(schema.formTemplates.revision, data.revision),
      isNull(schema.formTemplates.deletedAt)
    )
  )
  .limit(1);
```

If exists, ask the user:
- **Skip**: Don't insert, template already exists
- **Update**: Soft-delete existing and insert new
- **New Revision**: Update the revision string and insert

### 4. Insert Template Record

```typescript
const [template] = await db
  .insert(schema.formTemplates)
  .values({
    formNumber: data.formNumber,
    title: data.title,
    revision: data.revision,
    organizationId: null, // Global template available to all orgs
  })
  .returning();
```

### 5. Insert Sections

For each step in `data.steps`:

```typescript
const [section] = await db
  .insert(schema.formSections)
  .values({
    formTemplateId: template.id,
    sectionKey: step.id,
    title: step.title,
    description: step.description ?? null,
    helpText: step.helpText ?? null,
    isRequired: step.required ?? false,
    buttonConfig: step.nextButton || step.prevButton ? { nextButton: step.nextButton, prevButton: step.prevButton } : null,
    orderIndex: stepIndex,
  })
  .returning();
```

### 6. Insert Fields

For each field in the step:

```typescript
const [dbField] = await db
  .insert(schema.formFields)
  .values({
    formSectionId: section.id,
    name: field.name,
    label: field.label,
    fieldType: field.type,
    pdfMappings: buildPdfMappings(field.name, data.pdfFieldMappings),
    placeholder: field.placeholder ?? null,
    helpText: field.helpText ?? null,
    options: field.options ?? null,
    defaultValue: field.defaultValue !== undefined ? String(field.defaultValue) : null,
    width: field.width ?? null,
    isRequired: false,
    disabled: field.disabled ?? false,
    hideLabel: field.hideLabel ?? false,
    className: field.className ?? null,
    fieldConfig: buildFieldConfig(field),
    orderIndex: fieldIndex,
    showWhen: field.showWhen ?? null,
  })
  .returning();
```

### 7. Insert Autofill Mappings

For fields with autofill mappings:

```typescript
const canonicalField = data.autofillMappings[field.name];
if (canonicalField) {
  await db.insert(schema.formFieldAutofillMappings).values({
    formFieldId: dbField.id,
    canonicalField: canonicalField,
  });
}
```

### 8. Report Summary

```
Seeded template: I-765 (revision 01/20/25)
Template ID: abc123-def456-...

Summary:
- Sections: 16
- Fields: 136
- Autofill mappings: 13

The template is now available via:
GET /api/form-templates/{template-id}
```

## Helper Functions

### buildPdfMappings

Extracts PDF field mappings for a specific form field, handling value-specific mappings:

```typescript
function buildPdfMappings(
  fieldName: string,
  pdfFieldMappings: Record<string, string>
): Record<string, string> | null {
  const mappings: Record<string, string> = {};

  // Check for direct mapping
  if (pdfFieldMappings[fieldName]) {
    mappings["default"] = pdfFieldMappings[fieldName];
  }

  // Check for value-specific mappings (e.g., "fieldName:yes", "fieldName:no")
  const prefix = `${fieldName}:`;
  for (const [key, value] of Object.entries(pdfFieldMappings)) {
    if (key.startsWith(prefix)) {
      const optionValue = key.slice(prefix.length);
      mappings[optionValue] = value;
    }
  }

  return Object.keys(mappings).length > 0 ? mappings : null;
}
```

### buildFieldConfig

Extracts type-specific field configuration:

```typescript
function buildFieldConfig(field: FieldConfig): Record<string, unknown> | null {
  const config: Record<string, unknown> = {};

  // Textarea
  if (field.rows !== undefined) config.rows = field.rows;

  // Radio
  if (field.direction !== undefined) config.direction = field.direction;

  // Select
  if (field.allowEmpty !== undefined) config.allowEmpty = field.allowEmpty;
  if (field.emptyOptionLabel !== undefined) config.emptyOptionLabel = field.emptyOptionLabel;

  // Date
  if (field.minDate !== undefined) config.minDate = field.minDate;
  if (field.maxDate !== undefined) config.maxDate = field.maxDate;

  // File
  if (field.accept !== undefined) config.accept = field.accept;
  if (field.maxSizeMb !== undefined) config.maxSizeMb = field.maxSizeMb;
  if (field.maxFiles !== undefined) config.maxFiles = field.maxFiles;

  return Object.keys(config).length > 0 ? config : null;
}
```

## Error Handling

| Error | Response |
|-------|----------|
| JSON file not found | Inform user to run `/generate-form-template` first |
| Invalid JSON format | Report parsing error with details |
| Database connection error | Report error, suggest checking backend server |
| Duplicate template | Ask user how to proceed (skip/update/new revision) |
| Field insertion error | Report which field failed, rollback transaction |

## Example Invocation

**User:** `/seed-form-template i-765`

**Claude:**
1. Reads `frontend/src/templates/_generated/i-765.json`
2. Checks for existing I-765 template in database
3. Inserts template, sections, fields, and autofill mappings
4. Reports:
   ```
   Seeded template: I-765 - Application for Employment Authorization
   Template ID: 550e8400-e29b-41d4-a716-446655440000
   Revision: 01/20/25

   Summary:
   - Sections: 16
   - Fields: 136
   - Autofill mappings: 13

   The template is now available at:
   GET /api/form-templates/550e8400-e29b-41d4-a716-446655440000

   To create a form instance:
   POST /api/form-instances { formTemplateId: "...", clientId: "..." }
   ```

## Database Execution

The skill should execute database operations via a TypeScript script in the backend:

```bash
cd backend && npx tsx src/db/seed-form-template.ts --form-id={form-id}
```

Or directly construct and run the SQL/Drizzle commands using the existing `seed-templates.ts` as a pattern.

## Pre-Seed Validation

Before inserting into the database, validate the template:

```typescript
import { validateFormTemplateSchema, VALID_CANONICAL_FIELDS_SET, getFormPaths } from '../pdf-form-utils';

const paths = getFormPaths(formId);
const templateData = JSON.parse(fs.readFileSync(paths.generatedJson, 'utf-8'));

// Validate schema
const validation = validateFormTemplateSchema(templateData);
if (!validation.isValid) {
  console.error("Cannot seed invalid template:");
  validation.errors.forEach(err => console.error(`  - ${err}`));
  throw new Error("Template validation failed");
}

// Validate all autofill mappings reference valid canonical fields
for (const [field, canonical] of Object.entries(templateData.autofillMappings)) {
  if (!VALID_CANONICAL_FIELDS_SET.has(canonical)) {
    throw new Error(`Invalid canonical field: ${canonical} for field ${field}`);
  }
}
```

---

## Transaction Support

All database inserts should be wrapped in a transaction for atomicity:

```typescript
await db.transaction(async (tx) => {
  // 1. Insert template record
  const [template] = await tx
    .insert(schema.formTemplates)
    .values({
      formNumber: data.formNumber,
      title: data.title,
      revision: data.revision,
      organizationId: null,
    })
    .returning();

  // 2. Insert sections
  for (const [stepIndex, step] of data.steps.entries()) {
    const [section] = await tx
      .insert(schema.formSections)
      .values({
        formTemplateId: template.id,
        sectionKey: step.id,
        title: step.title,
        description: step.description ?? null,
        orderIndex: stepIndex,
        // ... other fields
      })
      .returning();

    // 3. Insert fields for this section
    for (const [fieldIndex, field] of step.fields.entries()) {
      const [dbField] = await tx
        .insert(schema.formFields)
        .values({
          formSectionId: section.id,
          name: field.name,
          label: field.label,
          fieldType: field.type,
          pdfMappings: buildPdfMappings(field.name, data.pdfFieldMappings),
          orderIndex: fieldIndex,
          // ... other fields
        })
        .returning();

      // 4. Insert autofill mapping if exists
      const canonicalField = data.autofillMappings[field.name];
      if (canonicalField) {
        await tx.insert(schema.formFieldAutofillMappings).values({
          formFieldId: dbField.id,
          canonicalField: canonicalField,
        });
      }
    }
  }

  return template;
});
```

**If any insert fails, the entire transaction rolls back** - no partial data is left in the database.

---

## Database Schema Reference

### Tables

#### formTemplates
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key (auto-generated) |
| formNumber | VARCHAR | USCIS form number (e.g., "I-765") |
| title | VARCHAR | Form title |
| revision | VARCHAR | Form revision date |
| pdfTemplateUrl | VARCHAR? | URL to PDF template file |
| organizationId | UUID? | Null for global templates, or org-specific |
| createdAt | TIMESTAMP | Creation timestamp |
| updatedAt | TIMESTAMP | Last update timestamp |
| deletedAt | TIMESTAMP? | Soft delete marker |

**Unique constraint:** (organizationId, formNumber, revision, deletedAt IS NULL)

#### formSections
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| formTemplateId | UUID | FK to formTemplates (cascade delete) |
| sectionKey | VARCHAR | Step ID from template (e.g., "part-1") |
| title | VARCHAR | Section title |
| description | TEXT? | Optional description |
| helpText | TEXT? | Optional help text |
| isRequired | BOOLEAN | Whether section must be completed |
| buttonConfig | JSONB? | Custom button configurations |
| orderIndex | INTEGER | Display order (0-based) |

#### formFields
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| formSectionId | UUID | FK to formSections (cascade delete) |
| name | VARCHAR | Field name (camelCase) |
| label | VARCHAR | Display label |
| fieldType | ENUM | text, textarea, number, date, select, checkbox, radio, email, phone, file |
| pdfMappings | JSONB? | PDF field name mappings |
| placeholder | VARCHAR? | Placeholder text |
| helpText | TEXT? | Help text |
| options | JSONB? | Options for select/radio/checkbox |
| defaultValue | VARCHAR? | Default value |
| width | VARCHAR? | Field width (1-1, 1-2, 1-3, 1-4) |
| isRequired | BOOLEAN | Whether field is required |
| disabled | BOOLEAN | Whether field is disabled |
| hideLabel | BOOLEAN | Hide label visually |
| className | VARCHAR? | Custom CSS class |
| fieldConfig | JSONB? | Type-specific configuration |
| orderIndex | INTEGER | Display order within section |
| showWhen | JSONB? | Conditional visibility rules |

#### formFieldAutofillMappings
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| formFieldId | UUID | FK to formFields (cascade delete, unique) |
| canonicalField | VARCHAR | Canonical field key (e.g., "first_name") |
| transformationRule | VARCHAR? | Optional transformation |
| fallbackValue | VARCHAR? | Optional fallback |

**Unique constraint:** One autofill mapping per form field.

---

## Rollback / Recovery

If seeding fails partway through (outside a transaction) or you need to remove a template:

### Find the Template
```sql
SELECT id, form_number, title, revision
FROM form_templates
WHERE form_number = 'I-765'
  AND revision = '01/20/25'
  AND deleted_at IS NULL;
```

### Soft Delete (Recommended)
```sql
UPDATE form_templates
SET deleted_at = NOW()
WHERE id = '<template-id>';
```

### Hard Delete (Cascade)
If you need to fully remove (use with caution):

```sql
-- Cascade deletes handle most cleanup, but for safety:

-- 1. Delete autofill mappings
DELETE FROM form_field_autofill_mappings
WHERE form_field_id IN (
  SELECT ff.id FROM form_fields ff
  JOIN form_sections fs ON ff.form_section_id = fs.id
  WHERE fs.form_template_id = '<template-id>'
);

-- 2. Delete fields
DELETE FROM form_fields
WHERE form_section_id IN (
  SELECT id FROM form_sections
  WHERE form_template_id = '<template-id>'
);

-- 3. Delete sections
DELETE FROM form_sections
WHERE form_template_id = '<template-id>';

-- 4. Delete template
DELETE FROM form_templates
WHERE id = '<template-id>';
```

---

## Enhanced Duplicate Handling

When a template already exists with the same formNumber + revision:

```typescript
const existing = await db.select()
  .from(schema.formTemplates)
  .where(and(
    eq(schema.formTemplates.formNumber, data.formNumber),
    eq(schema.formTemplates.revision, data.revision),
    isNull(schema.formTemplates.deletedAt)
  ))
  .limit(1);

if (existing.length > 0) {
  // Present options to user
  const choice = await askUser({
    question: `Template ${data.formNumber} (${data.revision}) already exists. How to proceed?`,
    options: [
      { value: "skip", label: "Skip", description: "Don't insert, keep existing" },
      { value: "replace", label: "Replace", description: "Soft-delete existing, insert new" },
      { value: "revision", label: "New Revision", description: "Modify revision and insert" }
    ]
  });

  switch (choice) {
    case "skip":
      return { skipped: true, existingId: existing[0].id };

    case "replace":
      await db.update(schema.formTemplates)
        .set({ deletedAt: new Date() })
        .where(eq(schema.formTemplates.id, existing[0].id));
      // Continue with insert
      break;

    case "revision":
      data.revision = `${data.revision}-v2`;
      // Continue with insert using modified revision
      break;
  }
}
```

---

## Notes

- Templates are created with `organizationId: null` making them globally available
- Soft deletes are used - templates are never hard deleted
- The `version` field on responses enables optimistic locking
- PDF field mappings support value-specific paths for radio/checkbox fields
- Autofill mappings link form fields to canonical client data fields
- Use `getFormPaths()` from config.ts for standardized input paths
- Always wrap inserts in a transaction for atomicity
- Validate template before inserting to prevent partial failures
