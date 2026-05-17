---
name: preview-pdf-mapping
description: Visual preview of form template-to-PDF field mappings before database seeding
allowed-tools: Read, Glob, Grep, Bash
---

# Preview PDF Mapping

Generate a visual preview report of form template-to-PDF field mappings before seeding to the database.

## Purpose

This skill provides human-readable verification of:
- Which form fields map to which PDF fields
- Autofill mappings to canonical fields
- Conditional visibility logic
- Unmapped or potentially problematic fields

Use this skill AFTER generate-form-template and validate-form-template, BEFORE seed-form-template.

## Input

```
/preview-pdf-mapping <form-id>
```

**Arguments:**
- `form-id`: The form identifier (e.g., "i-765")

## Files Read

Using paths from `pdf-form-utils/config.ts`:

1. **Generated JSON Template**: `frontend/src/templates/_generated/{form-id}.json`
   - Contains the complete FormTemplate with pdfFieldMappings and autofillMappings

2. **Analysis JSON** (optional): `frontend/src/templates/_analysis/{form-id}.json`
   - Used to cross-reference PDF field counts and conditionals

3. **Validation Result** (optional): `frontend/src/templates/_analysis/{form-id}-validation.json`
   - If exists, include validation status in report

## Output

Generate and display a markdown report with the following sections:

### 1. Summary Section

```markdown
# PDF Mapping Preview: {form-id}

## Summary

| Metric | Value |
|--------|-------|
| Form Number | I-765 |
| Title | Application for Employment Authorization |
| Revision | 01/20/25 |
| Total Steps | 16 |
| Total Form Fields | 133 |
| PDF Field Mappings | 407 |
| Autofill Mappings | 13 |
| Validation Status | PASS / FAIL |
```

### 2. Section-by-Section Mapping Table

For each step in the template, generate a table:

```markdown
## Step Mappings

### Part 1. Reason for Applying (3 fields)

| Form Field | Type | PDF Field | Autofill |
|------------|------|-----------|----------|
| reasonInitial | checkbox | `form1[0].Page1[0].Part1[0].Checkbox1a[0]` | - |
| reasonReplacement | checkbox | `form1[0].Page1[0].Part1[0].Checkbox1b[0]` | - |
| reasonRenewal | checkbox | `form1[0].Page1[0].Part1[0].Checkbox1c[0]` | - |

### Part 2. Your Full Legal Name (3 fields)

| Form Field | Type | PDF Field | Autofill |
|------------|------|-----------|----------|
| familyName | text | `form1[0].Page1[0].Part2[0].Line1a[0]` | `last_name` |
| givenName | text | `form1[0].Page1[0].Part2[0].Line1b[0]` | `first_name` |
| middleName | text | `form1[0].Page1[0].Part2[0].Line1c[0]` | `middle_name` |
```

**Table Generation Rules:**
- Show form field name, type, mapped PDF field (in backticks), and autofill mapping
- Use `-` for fields without autofill mapping
- For fields with value-specific mappings (e.g., `sex:male`), show the base field name and note the value mappings

### 3. Value-Specific Mappings

For fields like radio buttons that have value-specific PDF mappings:

```markdown
## Value-Specific PDF Mappings

These fields have different PDF fields for each option value:

### Field: sex

| Value | PDF Field |
|-------|-----------|
| male | `form1[0].Page2[0].Part2[0].Line10_Male[0]` |
| female | `form1[0].Page2[0].Part2[0].Line10_Female[0]` |
```

### 4. Conditional Logic Summary

```markdown
## Conditional Logic

| Field | Shows When |
|-------|------------|
| physicalStreet | `mailingAddressSameAsPhysical` = "no" |
| fatherFamilyName | `wantSsnCard` = "yes" AND `consentForDisclosure` = "yes" |
| previousReceiptNumber | `hasPreviousApplication` = "yes" |
```

### 5. Autofill Mapping Summary

```markdown
## Autofill Mappings

These fields will be auto-populated from extracted client documents:

| Form Field | Canonical Field | Description |
|------------|-----------------|-------------|
| familyName | `last_name` | Client's last/family name |
| givenName | `first_name` | Client's first/given name |
| dateOfBirth | `date_of_birth` | Client's date of birth |
| passportNumber | `passport_number` | Passport document number |
```

### 6. Unmapped Fields (if any)

```markdown
## Unmapped Form Fields

These form fields have no PDF mapping (may be intentional or an error):

| Field | Step | Type | Reason |
|-------|------|------|--------|
| internalNotes | Review | textarea | Likely intentional - not on PDF |
```

### 7. Warnings and Recommendations

```markdown
## Warnings

- **Field "ssn" has no autofill mapping** - Consider adding if client SSN is available
- **Step "Part 6" has 25 fields** - Consider splitting for better UX (max recommended: 20)
- **PDF field coverage: 95%** - 7 PDF fields have no form field mapping

## Recommendations

1. Review unmapped PDF fields to ensure they're intentionally excluded
2. Verify autofill mappings for date fields use correct canonical keys
3. Test conditional logic thoroughly before seeding
```

### 8. Next Steps

```markdown
## Next Steps

- **If satisfied**: Run `/seed-form-template {form-id}` to insert into database
- **If issues found**: Run `/refine-form-template {form-id}` to fix specific problems
- **For major issues**: Re-run `/generate-form-template {form-id}` with corrections
```

## Process

### Step 1: Load Files

```
1. Read generated JSON template from frontend/src/templates/_generated/{form-id}.json
2. Read analysis JSON from frontend/src/templates/_analysis/{form-id}.json (if exists)
3. Read validation result from frontend/src/templates/_analysis/{form-id}-validation.json (if exists)
```

### Step 2: Calculate Statistics

```
- Count total steps
- Count total form fields across all steps
- Count PDF field mappings (including value-specific)
- Count autofill mappings
- Identify unmapped fields
- Identify fields with conditional logic
```

### Step 3: Build Value-Specific Mapping Index

Look for PDF mappings with colons (e.g., `fieldName:value`) and group them:

```typescript
// Example: { "sex:male": "...", "sex:female": "..." }
// Group into: { "sex": { "male": "...", "female": "..." } }
```

### Step 4: Generate Report Sections

Generate each section of the markdown report in order:
1. Summary table
2. Step-by-step field mappings
3. Value-specific mappings
4. Conditional logic summary
5. Autofill mappings
6. Unmapped fields
7. Warnings
8. Next steps

### Step 5: Display Report

Output the complete markdown report to the user.

## Example Usage

```
User: /preview-pdf-mapping i-765