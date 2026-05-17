# Database Schema: Form Templates & Instances

## Status

**COMPLETED** - The database schema has been fully implemented and the migration has been applied to the database. All tables, enums, indexes, and constraints are now in place in the PostgreSQL database.

## Overview

Add database tables for form templates, sections, fields, instances, responses, and PDF generation tracking to enable the multi-step form completion workflow.

## File to Modify

- `backend/src/db/schema.ts`

## New Enums

```typescript
// Form instance status
export const formInstanceStatusEnum = pgEnum("form_instance_status", [
  "draft",
  "in_progress",
  "completed",
]);

// PDF generation type
export const pdfGenerationTypeEnum = pgEnum("pdf_generation_type", [
  "draft",
  "review",
  "final",
]);

// Form field types (for form_fields table)
export const formFieldTypeEnum = pgEnum("form_field_type", [
  "text",
  "textarea",
  "number",
  "date",
  "select",
  "checkbox",
  "radio",
  "email",
  "phone",
  "file",
]);
```

## New Tables (in order of dependencies)

### 1. form_templates

Blueprint definitions for PDF forms (global or org-specific).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| organization_id | uuid | FK nullable (null = global template) |
| form_number | text | e.g., "I-765" |
| title | text | e.g., "Application for Employment Authorization" |
| revision | text | e.g., "01/20/25" |
| pdf_template_url | text | Path to blank PDF template |
| created_at | timestamp | |
| updated_at | timestamp | |
| deleted_at | timestamp | Soft delete |
| created_by | uuid | FK users |
| updated_by | uuid | FK users |

### 2. form_sections

Logical sections/steps within a form template.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| form_template_id | uuid | FK form_templates |
| section_key | text | e.g., "part1", "applicantInfo" |
| title | text | Display title |
| description | text | Optional help text |
| order_index | integer | Sort order |
| created_at | timestamp | |
| updated_at | timestamp | |

### 3. form_fields

Individual input fields within sections.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| form_section_id | uuid | FK form_sections |
| name | text | camelCase field identifier |
| label | text | Display label |
| field_type | enum | text, textarea, number, date, select, checkbox, radio, email, phone, file |
| pdf_field_id | text | Maps to PDF internal field name |
| placeholder | text | Optional |
| help_text | text | Optional |
| options | jsonb | For select/radio/checkbox (array of {label, value}) |
| validation_rules | jsonb | For future validation |
| default_value | text | Optional |
| width | text | Layout: "1-1", "1-2", "1-3", "1-4" |
| is_required | boolean | No blocking validation, just metadata |
| order_index | integer | Sort order within section |
| show_when | jsonb | Conditional display rules |
| created_at | timestamp | |
| updated_at | timestamp | |

### 4. form_field_autofill_mappings

Maps form fields to client extracted data fields.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| form_field_id | uuid | FK form_fields, UNIQUE |
| canonical_field | text | e.g., "first_name", "passport_number" |
| transformation_rule | text | Optional transformation |
| fallback_value | text | Default if no extraction |
| created_at | timestamp | |
| updated_at | timestamp | |

### 5. form_instances

User-created form submissions for a client.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| organization_id | uuid | FK organizations |
| client_id | uuid | FK clients |
| form_template_id | uuid | FK form_templates |
| instance_number | integer | Per client/template counter |
| status | enum | draft, in_progress, completed |
| current_step_index | integer | Progress tracking |
| completed_step_ids | jsonb | Array of completed section keys |
| created_at | timestamp | |
| updated_at | timestamp | |
| deleted_at | timestamp | Soft delete |
| created_by | uuid | FK users |
| updated_by | uuid | FK users |
| deleted_by | uuid | FK users |
| submitted_at | timestamp | When marked completed |
| submitted_by | uuid | FK users |

**Indexes:** client_id, organization_id, form_template_id

### 6. form_responses

Current state of form field values (one per instance/field).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| form_instance_id | uuid | FK form_instances (CASCADE delete) |
| form_field_id | uuid | FK form_fields |
| value | text | Nullable (empty fields allowed per spec) |
| version | integer | Optimistic locking |
| updated_at | timestamp | |
| updated_by | uuid | FK users |

**Constraints:** UNIQUE(form_instance_id, form_field_id)
**Indexes:** form_instance_id

### 7. form_generated_pdfs

Tracks PDF generation lifecycle.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| organization_id | uuid | FK organizations |
| client_id | uuid | FK clients |
| form_instance_id | uuid | FK form_instances (CASCADE delete) |
| file_path | text | S3/storage path |
| file_name | text | Display name |
| file_size_bytes | integer | |
| page_count | integer | |
| generation_type | enum | draft, review, final |
| is_final | boolean | Default false |
| form_data_snapshot | jsonb | Optional snapshot of form data at generation |
| generated_by | uuid | FK users |
| generated_at | timestamp | |
| correlation_id | uuid | For tracking related operations |

**Indexes:** form_instance_id, client_id

## Type Exports

```typescript
// Table types
export type FormTemplate = typeof formTemplates.$inferSelect;
export type NewFormTemplate = typeof formTemplates.$inferInsert;
export type FormSection = typeof formSections.$inferSelect;
export type NewFormSection = typeof formSections.$inferInsert;
export type FormField = typeof formFields.$inferSelect;
export type NewFormField = typeof formFields.$inferInsert;
export type FormFieldAutofillMapping = typeof formFieldAutofillMappings.$inferSelect;
export type NewFormFieldAutofillMapping = typeof formFieldAutofillMappings.$inferInsert;
export type FormInstance = typeof formInstances.$inferSelect;
export type NewFormInstance = typeof formInstances.$inferInsert;
export type FormResponse = typeof formResponses.$inferSelect;
export type NewFormResponse = typeof formResponses.$inferInsert;
export type FormGeneratedPdf = typeof formGeneratedPdfs.$inferSelect;
export type NewFormGeneratedPdf = typeof formGeneratedPdfs.$inferInsert;

// Enum types
export type FormInstanceStatus = (typeof formInstanceStatusEnum.enumValues)[number];
export type PdfGenerationType = (typeof pdfGenerationTypeEnum.enumValues)[number];
export type FormFieldType = (typeof formFieldTypeEnum.enumValues)[number];
```

## NOT Included (per MVP decision)

- form_response_history table (audit trail) - can be added later
- Complex validation rules enforcement
- Blocking validation logic
