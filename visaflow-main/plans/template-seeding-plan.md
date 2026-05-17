# Phase 1: Template Seeding Implementation Plan

## Goal
Create a seeding script that converts TypeScript form templates (i-765.ts) into database records, enabling the backend to serve templates via API.

## Summary
- Create `backend/src/db/seed-templates.ts` script
- Copy template types and data from frontend to backend
- Convert flat `pdfFieldMappings` to per-field JSONB structure
- Use delete-and-recreate approach for idempotency
- Add npm script `db:seed:templates`

---

## Files to Create

### 1. `backend/src/db/templates/types.ts`
Define seeding interfaces (SeedFormTemplate, SeedStepConfig, SeedFieldConfig, etc.)

### 2. `backend/src/db/templates/i-765.ts`
Copy template data from `frontend/src/templates/i-765.ts` using local types

### 3. `backend/src/db/templates/index.ts`
Export array of all templates for iteration

### 4. `backend/src/db/seed-templates.ts`
Main seeding script with:
- `buildPdfFieldIdMap()` - converts `fieldName:value` patterns to JSONB objects
- `extractValidationRules()` - extracts rows, allowEmpty, etc. to validation_rules
- `seedTemplates()` - orchestration function using transactions

## Files to Modify

### 5. `backend/package.json`
Add script: `"db:seed:templates": "tsx src/db/seed-templates.ts"`

---

## Key Conversion Logic

### PDF Field Mapping Transformation
```
Input (flat):  { "familyName": "pdf[0].Name[0]", "sex:male": "pdf[0].Male[0]", "sex:female": "pdf[0].Female[0]" }
Output (per-field JSONB):
  - familyName -> "pdf[0].Name[0]" (string)
  - sex -> { "male": "pdf[0].Male[0]", "female": "pdf[0].Female[0]" } (object)
```

### Idempotency Strategy (No Duplicates)
For **each template** in the templates array:
1. **Check first**: Query for existing template by unique key (organization_id IS NULL, form_number, revision)
2. **If exists**:
   - DELETE all sections (CASCADE automatically cleans fields + autofill mappings)
   - UPDATE template metadata if needed (keeps same UUID)
3. **If not exists**: INSERT new template record
4. Then INSERT fresh sections, fields, and autofill mappings

**Result**: Running seed multiple times produces identical database state, no duplicates ever created.

---

## Implementation Steps

| # | Task | Files |
|---|------|-------|
| 1 | Create template types | `backend/src/db/templates/types.ts` |
| 2 | Copy I-765 template data | `backend/src/db/templates/i-765.ts` |
| 3 | Create templates index | `backend/src/db/templates/index.ts` |
| 4 | Create seed script with conversion logic | `backend/src/db/seed-templates.ts` |
| 5 | Add npm script | `backend/package.json` |
| 6 | Test: run `npm run db:seed:templates` | - |
| 7 | Verify: check records in database | - |

---

## Verification

After running seed, verify:
```sql
SELECT COUNT(*) FROM form_templates WHERE organization_id IS NULL;  -- 1
SELECT COUNT(*) FROM form_sections;  -- ~18 (I-765 has 18 steps)
SELECT COUNT(*) FROM form_fields;    -- ~200+ fields
SELECT COUNT(*) FROM form_field_autofill_mappings;  -- ~13 mappings
```

Check radio field JSONB structure:
```sql
SELECT name, pdf_field_id FROM form_fields WHERE name = 'sex';
-- Should show: { "male": "...", "female": "..." }
```

---

## Critical Files Reference

| Purpose | Path |
|---------|------|
| Database schema | `backend/src/db/schema.ts` |
| Source template | `frontend/src/templates/i-765.ts` |
| Existing seed pattern | `backend/src/db/seed.ts` |
| DB exports | `backend/src/db/index.js` |
| Package scripts | `backend/package.json` |
