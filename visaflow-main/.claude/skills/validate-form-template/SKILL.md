---
name: validate-form-template
description: Validate a FormTemplate against its source PDF to ensure completeness and correctness. Third step in the form template generation pipeline.
allowed-tools: Read, Write, Glob, Grep
---

# Validate Form Template

Validates a FormTemplate against its source PDF to ensure all fields are properly mapped, autofill references are valid, and the template is ready for production use.

## When to Use

Invoke this skill after `/generate-form-template` completes to verify the generated template is correct and complete. This is the third step in the form template generation pipeline:

1. `/analyze-pdf-form` - Extract fields from PDF
2. `/generate-form-template` - Generate FormTemplate from analysis
3. `/validate-form-template` - Validate template (this skill)
4. `/refine-form-template` - Fix issues if validation fails

## Inputs

| Input | Description | Required |
|-------|-------------|----------|
| Template file path | Path to the generated FormTemplate TypeScript file | Yes |
| Source PDF path | Path to the original PDF form | Yes |
| Analysis JSON path | Path to the PDF field analysis JSON from step 1 | Yes |

## Outputs

### Validation Result

The skill produces a validation result with:

- **Status**: `PASS` or `FAIL`
- **Issues list**: Array of issues with severity levels
- **Coverage percentage**: Percentage of PDF fields that have mappings

### Output Format

The validation result is saved as JSON:

```json
{
  "status": "PASS" | "FAIL",
  "coverage": 95.5,
  "errorCount": 0,
  "warningCount": 2,
  "issues": [
    {
      "severity": "error" | "warning",
      "field": "field_name",
      "message": "Description of the issue",
      "suggestion": "How to fix it"
    }
  ],
  "summary": {
    "totalPdfFields": 50,
    "mappedFields": 48,
    "unmappedFields": 2,
    "totalFormFields": 48,
    "totalSteps": 5,
    "autofillMappings": 12
  }
}
```

## Validation Checks

### Error-Level Checks (cause FAIL)

1. **All PDF fields have mappings**
   - Every form field must map to a PDF field
   - Missing mappings prevent PDF generation

2. **All autofill mappings use valid canonical fields**
   - References must exist in `shared/src/canonicalFields.ts`
   - Invalid references break document extraction autofill

3. **Conditional logic references valid fields**
   - `showWhen` rules must reference existing form fields
   - Broken references cause runtime errors

### Warning-Level Checks (noted but pass)

4. **Field types match expected patterns**
   - Date-like field names should use `type: "date"`
   - Email-like field names should use `type: "email"`
   - Phone-like field names should use `type: "phone"`

5. **Steps have reasonable field counts**
   - Maximum recommended: 20 fields per step
   - More fields may hurt user experience

## Validation Process

1. **Load the FormTemplate** from the TypeScript file
2. **Load the PDF analysis JSON** to get the expected field count
3. **Run validation rules** using the `validation-rules.ts` utility
4. **Generate the validation result** JSON
5. **Report outcome** with actionable next steps

## Using the Validation Utility

The skill uses the `validation-rules.ts` utility from `pdf-form-utils`:

```typescript
import { validateFormTemplate, ValidationResult } from "../pdf-form-utils/validation-rules";

// Load template and get PDF field count from analysis
const template: FormTemplate = /* loaded from file */;
const pdfFieldCount: number = /* from analysis JSON */;

const result: ValidationResult = validateFormTemplate(template, pdfFieldCount);

if (result.isValid) {
  // Template passed validation
  console.log(`PASS - Coverage: ${result.coverage}%`);
} else {
  // Template has errors that must be fixed
  console.log(`FAIL - ${result.issues.filter(i => i.severity === 'error').length} errors`);
}
```

## Triggering Refinement

If validation fails (`status: "FAIL"`), the skill should:

1. **Display the validation result** with all issues
2. **Recommend running `/refine-form-template`** to fix the issues
3. **Provide the validation result path** as input to refinement

Example output on failure:

```
Validation FAILED

Errors (must fix):
- Form field "applicant_dob" has no PDF field mapping
- Autofill mapping for "birth_country" references invalid canonical field "country_of_birth"

Warnings (recommended):
- Step "Personal Information" has 25 fields (recommended max: 20)

Coverage: 94.2% (47/50 PDF fields mapped)

Run /refine-form-template to fix these issues:
  Template: ./templates/i-765.ts
  Validation: ./analysis/i-765-validation.json
```

## File Locations

| File Type | Default Location |
|-----------|-----------------|
| Templates | `backend/src/templates/` |
| PDF Forms | `backend/src/pdf-forms/` |
| Analysis JSON | `backend/src/pdf-forms/analysis/` |
| Validation JSON | `backend/src/pdf-forms/analysis/` |

## Related Skills

- `/analyze-pdf-form` - Step 1: Extract PDF fields
- `/generate-form-template` - Step 2: Generate template
- `/refine-form-template` - Step 4: Fix validation issues
