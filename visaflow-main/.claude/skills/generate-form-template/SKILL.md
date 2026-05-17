---
name: generate-form-template
description: Generate a TypeScript FormTemplate from PDF analysis JSON. Second step in the form template generation pipeline.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Generate Form Template

Synthesizes analysis JSON (from `/analyze-pdf-form`) into a TypeScript FormTemplate file.

## When to Use

Invoke this skill when:
- User runs `/generate-form-template <form-id>`
- The `/analyze-pdf-form` skill has completed and analysis JSON exists
- User requests generation of a TypeScript template from analysis data

## Prerequisites

The analysis JSON file must exist at:
```
frontend/src/templates/_analysis/{form-id}.json
```

This JSON is produced by the `/analyze-pdf-form` skill.

## Inputs

| Input | Source | Example |
|-------|--------|---------|
| `form-id` | Command argument or prompt | `i-765`, `i-131`, `i-485` |
| Analysis JSON | File at `frontend/src/templates/_analysis/{form-id}.json` | Structured PDF analysis |

## Outputs

1. **TypeScript template file** at:
   ```
   frontend/src/templates/{form-id}.ts
   ```

2. **JSON template file** at (for database seeding):
   ```
   frontend/src/templates/_generated/{form-id}.json
   ```

## Process

### 1. Read Analysis JSON

```bash
# Expected location
frontend/src/templates/_analysis/{form-id}.json
```

The analysis JSON contains:
- `formInfo`: Form number, title, revision
- `sections`: Array of section objects with fields
- `pdfFields`: Raw PDF field names and types
- `conditionalLogic`: Detected conditional relationships

### 2. Convert Sections to StepConfig Array

For each section in the analysis:
- Create a `StepConfig` with unique `id` (kebab-case)
- Set `title` and optional `description`
- Convert each field to the appropriate `FieldConfig`

### 3. Apply Field Type Inference

Use utilities from `.claude/skills/pdf-form-utils/`:

```typescript
import { inferFieldType, inferFieldWidth } from './pdf-form-utils/field-types';
import { pdfFieldNameToCamelCase, suggestCanonicalField } from './pdf-form-utils/naming';
```

For each field:
- Infer HTML field type from PDF type and label
- Infer field width based on label keywords
- Convert PDF field name to camelCase for form field name

### 4. Apply Conditional Logic as showWhen Properties

Convert detected conditional relationships to `showWhen` rules:

```typescript
// Example: If a Yes/No triggers follow-up fields
showWhen: [
  {
    field: "hasOtherNames",
    operator: "equals",
    value: "yes"
  }
]
```

### 5. Create pdfFieldMappings

Map form field names (camelCase) to original PDF field names:

```typescript
pdfFieldMappings: {
  familyName: "topmostSubform[0].Page1[0].Pt1Line1a_FamilyName[0]",
  givenName: "topmostSubform[0].Page1[0].Pt1Line1b_GivenName[0]",
  // ...
}
```

### 6. Create autofillMappings

Use `suggestCanonicalField()` to map form fields to canonical client data fields:

```typescript
autofillMappings: {
  familyName: "last_name",
  givenName: "first_name",
  dateOfBirth: "date_of_birth",
  passportNumber: "passport_number",
  // ...
}
```

Only include mappings where a canonical field is identified.

## Canonical Fields Reference

Use these canonical field keys for autofillMappings:

| Category | Canonical Field Key | Description |
|----------|-------------------|-------------|
| **Personal** | `first_name` | Given/first name |
| | `last_name` | Family/last name |
| | `middle_name` | Middle name or initial |
| | `date_of_birth` | Date of birth |
| | `place_of_birth` | City/country of birth |
| | `nationality` | Country of citizenship |
| | `gender` | Gender/sex |
| **Passport** | `passport_number` | Passport/travel doc number |
| | `passport_issue_date` | Passport issue date |
| | `passport_expiry_date` | Passport expiration date |
| | `passport_issuing_country` | Country that issued passport |
| **Visa** | `visa_number` | Visa number |
| | `visa_type` | Visa classification |
| | `visa_issue_date` | Visa issue date |
| | `visa_expiry_date` | Visa expiration date |
| **I-94** | `i94_number` | I-94 record number |
| | `i94_admission_date` | Date of admission |
| | `i94_class_of_admission` | Immigration status at entry |
| | `i94_admit_until_date` | Authorized stay expiration |
| **Marriage** | `marriage_date` | Date of marriage |
| | `marriage_place` | Place of marriage |
| | `spouse_first_name` | Spouse's first name |
| | `spouse_last_name` | Spouse's last name |
| **Employment** | `current_employer` | Current employer name |
| | `current_job_title` | Current job title/occupation |
| | `education_degree` | Highest degree earned |
| | `education_institution` | School/university name |

## Template Output Format

Generate TypeScript matching this structure:

```typescript
import type { FormTemplate } from "@/types/multi-step-form";

export const {formId}Template: FormTemplate = {
  id: "{form-id}",
  title: "{Form Title}",
  formNumber: "{USCIS Form Number}",
  revision: "{MM/DD/YY}",
  steps: [
    {
      id: "part-1-information-about-you",
      title: "Part 1. Information About You",
      description: "Provide your biographical information",
      fields: [
        {
          name: "familyName",
          label: "Family Name (Last Name)",
          type: "text",
          width: "1-2",
          placeholder: "Enter your family name",
        },
        {
          name: "givenName",
          label: "Given Name (First Name)",
          type: "text",
          width: "1-2",
          placeholder: "Enter your given name",
        },
        {
          name: "hasOtherNames",
          label: "Have you used other names?",
          type: "radio",
          width: "1-1",
          options: [
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ],
        },
        {
          name: "otherFamilyName",
          label: "Other Family Name",
          type: "text",
          width: "1-2",
          showWhen: [
            { field: "hasOtherNames", operator: "equals", value: "yes" }
          ],
        },
        // ... more fields
      ],
    },
    // ... more steps
  ],
  pdfFieldMappings: {
    familyName: "topmostSubform[0].Page1[0].Pt1Line1a_FamilyName[0]",
    givenName: "topmostSubform[0].Page1[0].Pt1Line1b_GivenName[0]",
    hasOtherNames: "topmostSubform[0].Page1[0].Pt1Line2_YesNo[0]",
    otherFamilyName: "topmostSubform[0].Page1[0].Pt1Line2a_OtherFamilyName[0]",
    // ... all field mappings
  },
  autofillMappings: {
    familyName: "last_name",
    givenName: "first_name",
    dateOfBirth: "date_of_birth",
    // ... only fields with canonical matches
  },
};

export default {formId}Template;
```

## Field Type Guidelines

| PDF Type | Inferred HTML Type | Notes |
|----------|-------------------|-------|
| `Tx` (Text) | `text`, `email`, `phone`, `date`, `textarea` | Based on label keywords |
| `Btn` (Button) | `checkbox` or `radio` | Single vs. grouped |
| `Ch` (Choice) | `select` | Dropdown lists |

Label-based refinements:
- "email" in label → `email` type
- "phone", "telephone" in label → `phone` type
- "date", "dob" in label → `date` type
- "address", "description" in label → `textarea` type

## Field Width Guidelines

| Width | Use Case |
|-------|----------|
| `1-1` | Full-width: addresses, textareas, long text |
| `1-2` | Half-width: most text fields, dates, selects |
| `1-3` | Third-width: state codes, extensions |
| `1-4` | Quarter-width: zip codes, initials, checkboxes |

## Instructions

When invoked:

1. **Parse the form-id** from `$ARGUMENTS` or ask if not provided
2. **Read the analysis JSON**:
   ```
   frontend/src/templates/_analysis/{form-id}.json
   ```
3. **If analysis file doesn't exist**, inform user to run `/analyze-pdf-form` first
4. **Generate the template data**:
   - Convert sections to steps
   - Apply type/width inference
   - Map PDF fields to form fields
   - Suggest autofill mappings
5. **Write the TypeScript template file**:
   ```
   frontend/src/templates/{form-id}.ts
   ```
6. **Write the JSON template file** (for database seeding):
   ```
   frontend/src/templates/_generated/{form-id}.json
   ```
   The JSON file contains the same data as the TypeScript export, in JSON format.
7. **Report generation summary**:
   - Number of steps created
   - Number of fields mapped
   - Autofill mappings count
   - Any fields without PDF mappings (warnings)
8. **Suggest next steps**:
   - Review and refine conditional logic
   - Validate with `/validate-form-template`
   - Seed to database with `/seed-form-template {form-id}`
   - Test with actual PDF rendering

## Example Invocation

**User:** `/generate-form-template i-765`

**Claude:**
1. Reads `frontend/src/templates/_analysis/i-765.json`
2. Processes 4 sections with 42 fields
3. Generates template with:
   - 4 steps (Part 1-4)
   - 42 field configurations
   - 42 PDF field mappings
   - 18 autofill mappings
4. Writes TypeScript to `frontend/src/templates/i-765.ts`
5. Writes JSON to `frontend/src/templates/_generated/i-765.json`
6. Reports:
   ```
   Generated i-765 template:
   - Steps: 4
   - Fields: 42
   - PDF Mappings: 42 (100% coverage)
   - Autofill Mappings: 18

   Files created:
   - TypeScript: frontend/src/templates/i-765.ts
   - JSON: frontend/src/templates/_generated/i-765.json

   Next steps:
   - Review conditional logic in steps
   - Validate with /validate-form-template i-765
   - Seed to database with /seed-form-template i-765
   ```

## Input Validation

Before processing, validate the analysis JSON using utilities from `pdf-form-utils`:

```typescript
import { validateAnalysisJSON, getFormPaths } from '../pdf-form-utils';

// Get standardized paths
const paths = getFormPaths(formId);

// Read and parse analysis JSON
const analysisData = JSON.parse(fs.readFileSync(paths.analysisJson, 'utf-8'));

// Validate structure
const validation = validateAnalysisJSON(analysisData);

if (!validation.isValid) {
  console.error("Analysis JSON has errors:");
  validation.errors.forEach(err => console.error(`  - ${err}`));
  throw new Error("Cannot generate template from invalid analysis JSON");
}

if (validation.warnings.length > 0) {
  console.warn("Analysis JSON has warnings:");
  validation.warnings.forEach(warn => console.warn(`  - ${warn}`));
}
```

---

## Concrete Examples

### Example 1: Text Field Generation

**Analysis JSON Input:**
```json
{
  "itemNumber": "1.a",
  "name": "familyName",
  "type": "text",
  "label": "Family Name (Last Name)",
  "width": "1-3"
}
```

**Generated FieldConfig:**
```typescript
{
  name: "familyName",
  label: "Family Name (Last Name)",
  type: "text",
  width: "1-3",
  placeholder: "Enter your family name",
}
```

**pdfFieldMappings Entry:**
```typescript
familyName: "form1[0].Page1[0].Part2[0].Line1a_FamilyName[0]"
```

**autofillMappings Entry:**
```typescript
familyName: "last_name"
```

### Example 2: Radio Button with Conditional

**Analysis JSON Input:**
```json
{
  "itemNumber": "3",
  "name": "hasOtherNames",
  "type": "radio",
  "label": "Have you ever used any other names?",
  "options": [
    { "value": "yes", "label": "Yes" },
    { "value": "no", "label": "No" }
  ]
}
```

**Conditional from Analysis:**
```json
{
  "id": "cond-1",
  "triggerField": "hasOtherNames",
  "triggerValue": "yes",
  "affectedItems": ["4", "5", "6"],
  "action": "show"
}
```

**Generated FieldConfig (trigger field):**
```typescript
{
  name: "hasOtherNames",
  label: "Have you ever used any other names?",
  type: "radio",
  width: "1-1",
  options: [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
  ],
  direction: "horizontal",
}
```

**Generated FieldConfig (conditional field):**
```typescript
{
  name: "otherFamilyName",
  label: "Other Family Name (Last Name)",
  type: "text",
  width: "1-3",
  showWhen: [
    { field: "hasOtherNames", operator: "equals", value: "yes" }
  ],
}
```

**pdfFieldMappings (Yes/No checkboxes need TWO entries):**
```typescript
"hasOtherNames:yes": "form1[0].Page1[0].Part2[0].Line3_Yes[0]",
"hasOtherNames:no": "form1[0].Page1[0].Part2[0].Line3_No[0]",
```

### Example 3: Select Dropdown

**Analysis JSON Input:**
```json
{
  "itemNumber": "27",
  "name": "eligibilityCategory",
  "type": "select",
  "label": "Eligibility Category",
  "options": [
    { "value": "(a)(3)", "label": "(a)(3) - Refugee" },
    { "value": "(c)(9)", "label": "(c)(9) - Adjustment applicant" },
    { "value": "(c)(10)", "label": "(c)(10) - Asylum applicant" }
  ]
}
```

**Generated FieldConfig:**
```typescript
{
  name: "eligibilityCategory",
  label: "Eligibility Category",
  type: "select",
  width: "1-1",
  options: [
    { value: "(a)(3)", label: "(a)(3) - Refugee" },
    { value: "(c)(9)", label: "(c)(9) - Adjustment applicant" },
    { value: "(c)(10)", label: "(c)(10) - Asylum applicant" },
  ],
  allowEmpty: true,
  emptyOptionLabel: "Select your eligibility category...",
}
```

### Example 4: Complex Conditional (AND logic)

**Scenario:** Field shows when TWO conditions are met.

**Analysis Conditionals:**
```json
{
  "id": "cond-ssn-disclosure",
  "originalText": "If you want SSN card AND consent to disclosure, complete Items 29-31",
  "triggerField": "wantSsnCard",
  "triggerValue": "yes",
  "affectedItems": ["29", "30", "31"],
  "action": "show"
}
```

**Generated FieldConfig with multiple showWhen rules:**
```typescript
{
  name: "fatherFamilyName",
  label: "Father's Family Name (Last Name)",
  type: "text",
  width: "1-2",
  // Multiple conditions = AND logic (all must be true)
  showWhen: [
    { field: "wantSsnCard", operator: "equals", value: "yes" },
    { field: "consentForDisclosure", operator: "equals", value: "yes" }
  ],
}
```

### Example 5: Address Fields (Physical vs Mailing)

**Scenario:** Physical address fields only show if "same as mailing" is "no".

**Generated FieldConfigs:**
```typescript
// The toggle field
{
  name: "mailingAddressSameAsPhysical",
  label: "Is your physical address the same as your mailing address?",
  type: "radio",
  width: "1-1",
  options: [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
  ],
  direction: "horizontal",
},
// Conditional physical address fields
{
  name: "physicalStreet",
  label: "Street Number and Name",
  type: "text",
  width: "1-1",
  showWhen: [
    { field: "mailingAddressSameAsPhysical", operator: "equals", value: "no" }
  ],
},
{
  name: "physicalCity",
  label: "City or Town",
  type: "text",
  width: "1-2",
  showWhen: [
    { field: "mailingAddressSameAsPhysical", operator: "equals", value: "no" }
  ],
},
```

---

## Output Validation

After generating the template, validate it before writing:

```typescript
import { validateFormTemplateSchema, validateConditionalReferences } from '../pdf-form-utils';

// Validate schema
const schemaValidation = validateFormTemplateSchema(template);
if (!schemaValidation.isValid) {
  console.error("Generated template has schema errors:");
  schemaValidation.errors.forEach(err => console.error(`  - ${err}`));
  // Attempt to fix or warn user
}

// Validate conditional references
const brokenRefs = validateConditionalReferences(template.steps);
if (brokenRefs.length > 0) {
  console.error("Broken conditional references found:");
  brokenRefs.forEach(ref => {
    console.error(`  - Field "${ref.field}" references non-existent field "${ref.referencedField}"`);
  });
}
```

---

## Standardized Paths

Use `getFormPaths()` for consistent file locations:

```typescript
import { getFormPaths } from '../pdf-form-utils/config';

const paths = getFormPaths(formId);

// Input
const analysisJson = paths.analysisJson;  // frontend/src/templates/_analysis/{form-id}.json

// Output
const templateTs = paths.template;         // frontend/src/templates/{form-id}.ts
const templateJson = paths.generatedJson;  // frontend/src/templates/_generated/{form-id}.json
```

---

## Notes

- The template uses the `FormTemplate` type from `@/types/multi-step-form`
- All PDF field names are preserved exactly as they appear in the PDF
- Form field names are converted to camelCase for JavaScript compatibility
- Only include autofillMappings for fields with confident canonical matches
- Fields without clear labels may need manual review after generation
- Use `getFormPaths()` from config.ts for standardized paths
- Validate input analysis JSON before processing
- Validate output template before writing
