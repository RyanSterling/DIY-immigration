---
name: refine-form-template
description: Fix specific issues in an existing FormTemplate based on validation results. Used for iterative refinement without full re-analysis.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Refine Form Template Skill

This skill fixes specific issues in an existing FormTemplate without starting over. It performs targeted repairs based on validation failures.

## When to Use

Use this skill ONLY after `/validate-form-template` returns FAIL status. This skill is for iterative refinement, not initial creation.

**Appropriate scenarios:**
- Validation found missing PDF field mappings
- Canonical field references are invalid
- Conditional logic has broken field references
- Field types don't match PDF form field types
- Section references are incorrect

**Do NOT use when:**
- Creating a new template from scratch (use `/create-form-template`)
- Making major structural changes
- Template needs complete redesign

## Inputs

The skill requires these inputs from the user:

1. **Current template file path** - Path to the existing FormTemplate JSON file
2. **Validation issues JSON** - The issues array from validate-form-template output
3. **Source PDF path** (optional) - Original PDF for reference when fixing mappings

## Outputs

- **Updated template file** - The original file edited in place with targeted fixes
- **Summary of changes** - List of what was fixed

## Process

### Step 1: Read Existing Template as Baseline

```
Read the current template file completely. This is the baseline - preserve everything that works.
```

### Step 2: Parse Validation Issues

```
Parse the validation issues JSON to understand:
- Which fields have problems
- What type of issue each field has
- The specific error message for each
```

### Step 3: Focus ONLY on Problematic Fields/Sections

```
Create a list of fields/sections that need fixing. Do NOT modify anything not in this list.
```

### Step 4: Apply Targeted Fixes

For each issue, apply the appropriate fix strategy (see below).

### Step 5: Preserve All Working Parts

```
When editing, use surgical Edit operations. Never rewrite sections that are working correctly.
```

## Fix Strategies by Issue Type

### Missing PDF Mapping

**Issue:** Field has no `pdfFieldName` or the name doesn't exist in PDF

**Strategy:**
1. If source PDF provided, examine PDF field names using pdf-lib inspection
2. Look for similar field names (typos, case differences)
3. Check for naming patterns in the form (e.g., `form1[0].Page1[0].Field1[0]`)
4. Update the `pdfFieldName` property with correct value

**Example fix:**
```json
// Before
{
  "id": "first_name",
  "pdfFieldName": "FirstName"  // Doesn't exist in PDF
}

// After
{
  "id": "first_name",
  "pdfFieldName": "form1[0].#subform[0].Pt2Line1a_GivenName[0]"  // Actual PDF field
}
```

### Invalid Canonical Field

**Issue:** `canonicalFieldId` references a field that doesn't exist in canonical schema

**Strategy:**
1. Read the canonical fields schema from `backend/src/formTemplates/canonicalFields.ts`
2. Find the closest matching canonical field by name/purpose
3. Update `canonicalFieldId` to valid reference, or remove if no match exists

**Example fix:**
```json
// Before
{
  "id": "given_name",
  "canonicalFieldId": "firstName"  // Invalid - doesn't exist
}

// After
{
  "id": "given_name",
  "canonicalFieldId": "givenName"  // Correct canonical field
}
```

### Broken Conditional

**Issue:** Conditional logic references a field ID that doesn't exist in template

**Strategy:**
1. Search template for similar field IDs (typos, naming variations)
2. Check if referenced field was renamed or moved
3. Update the conditional's `fieldId` to correct reference
4. If field truly doesn't exist, remove the conditional or add missing field

**Example fix:**
```json
// Before
{
  "id": "spouse_name",
  "conditional": {
    "fieldId": "maritalStatus",  // Typo - actual field is "marital_status"
    "operator": "equals",
    "value": "married"
  }
}

// After
{
  "id": "spouse_name",
  "conditional": {
    "fieldId": "marital_status",  // Corrected field reference
    "operator": "equals",
    "value": "married"
  }
}
```

### Type Mismatch

**Issue:** Field type in template doesn't match the PDF form field type

**Strategy:**
1. Determine actual PDF field type (text, checkbox, radio, dropdown)
2. Update template field `type` to match
3. If changing to radio/dropdown, ensure `options` array is populated
4. If changing from radio/dropdown to text, remove `options` array

**Example fix:**
```json
// Before - Template says text but PDF has checkbox
{
  "id": "us_citizen",
  "type": "text",
  "pdfFieldName": "USCitizen"
}

// After
{
  "id": "us_citizen",
  "type": "checkbox",
  "pdfFieldName": "USCitizen"
}
```

### Section Reference Error

**Issue:** Field references a section that doesn't exist

**Strategy:**
1. Find which section the field should belong to based on PDF page/grouping
2. Either add field to correct existing section, or create the missing section
3. Remove field from any incorrect section references

## Preserve Working Content

**Critical:** This skill performs surgical edits only. Follow these rules:

1. **Never rewrite the entire file** - Use Edit tool for targeted changes
2. **Don't restructure sections** unless specifically broken
3. **Keep all field properties** that aren't flagged as issues
4. **Maintain formatting** of the existing file
5. **Preserve comments** if present in the template

## Example: Full Refinement Workflow

### Input: Validation Issues

```json
{
  "status": "FAIL",
  "issues": [
    {
      "type": "MISSING_PDF_FIELD",
      "fieldId": "alien_number",
      "message": "PDF field 'AlienNumber' not found in form"
    },
    {
      "type": "INVALID_CANONICAL",
      "fieldId": "birth_date",
      "message": "Canonical field 'birthDate' does not exist"
    },
    {
      "type": "BROKEN_CONDITIONAL",
      "fieldId": "prior_employer_name",
      "message": "Conditional references non-existent field 'employmentHistory'"
    }
  ]
}
```

### Before Template (relevant sections)

```json
{
  "sections": [
    {
      "id": "personal_info",
      "fields": [
        {
          "id": "alien_number",
          "label": "Alien Registration Number",
          "type": "text",
          "pdfFieldName": "AlienNumber",
          "canonicalFieldId": "alienNumber"
        },
        {
          "id": "birth_date",
          "label": "Date of Birth",
          "type": "date",
          "pdfFieldName": "form1[0].DateOfBirth[0]",
          "canonicalFieldId": "birthDate"
        }
      ]
    },
    {
      "id": "employment",
      "fields": [
        {
          "id": "prior_employer_name",
          "label": "Prior Employer Name",
          "type": "text",
          "pdfFieldName": "form1[0].PriorEmployer[0]",
          "conditional": {
            "fieldId": "employmentHistory",
            "operator": "equals",
            "value": "yes"
          }
        }
      ]
    }
  ]
}
```

### After Template (with fixes applied)

```json
{
  "sections": [
    {
      "id": "personal_info",
      "fields": [
        {
          "id": "alien_number",
          "label": "Alien Registration Number",
          "type": "text",
          "pdfFieldName": "form1[0].#subform[0].AlienNum[0]",
          "canonicalFieldId": "alienNumber"
        },
        {
          "id": "birth_date",
          "label": "Date of Birth",
          "type": "date",
          "pdfFieldName": "form1[0].DateOfBirth[0]",
          "canonicalFieldId": "dateOfBirth"
        }
      ]
    },
    {
      "id": "employment",
      "fields": [
        {
          "id": "prior_employer_name",
          "label": "Prior Employer Name",
          "type": "text",
          "pdfFieldName": "form1[0].PriorEmployer[0]",
          "conditional": {
            "fieldId": "has_employment_history",
            "operator": "equals",
            "value": "yes"
          }
        }
      ]
    }
  ]
}
```

### Changes Summary

1. **alien_number**: Updated `pdfFieldName` from `"AlienNumber"` to `"form1[0].#subform[0].AlienNum[0]"` (actual PDF field name)
2. **birth_date**: Updated `canonicalFieldId` from `"birthDate"` to `"dateOfBirth"` (correct canonical field)
3. **prior_employer_name**: Updated conditional `fieldId` from `"employmentHistory"` to `"has_employment_history"` (existing field in template)

## Verification After Fixes

After applying fixes, recommend running `/validate-form-template` again to confirm all issues are resolved. Multiple refinement passes may be needed for complex templates.
