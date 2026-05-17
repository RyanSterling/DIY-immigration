# USCIS Form Field Extraction Prompt

Extract structured JSON form templates from USCIS PDF forms for use in a multi-step HTML form interface with bidirectional PDF sync.

---

## Architecture Overview

```
                    ┌─────────────────────┐
                    │   Master Prompt     │
                    │  (Orchestrator)     │
                    └─────────┬───────────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
            ▼                 ▼                 ▼
   ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
   │ Agent 1:       │ │ Agent 2:       │ │ Agent 3:       │
   │ Structure &    │ │ Conditional    │ │ PDF Field      │
   │ Fields         │ │ Logic          │ │ Names          │
   └────────┬───────┘ └────────┬───────┘ └────────┬───────┘
            │                 │                 │
            └─────────────────┼─────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │   Agent 4:          │
                    │   Synthesizer       │
                    └─────────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │   Final JSON        │
                    │   FormTemplate      │
                    └─────────────────────┘
```

---

## Target Output Schema

```typescript
interface FormTemplate {
  id: string; // e.g., "i-765"
  title: string; // e.g., "Application for Employment Authorization"
  formNumber: string; // e.g., "I-765"
  revision: string; // e.g., "03/20/24"
  steps: StepConfig[]; // Multi-step form structure
  pdfFieldMappings: {
    // For bidirectional PDF sync
    [formFieldName: string]: string;
  };
  autofillMappings: {
    // For document extraction autofill
    [formFieldName: string]: string;
  };
}
```

---

## Master Orchestration Prompt

Use this prompt to kick off the extraction. Attach the USCIS PDF and run this.

```markdown
# USCIS Form Field Extraction - Master Orchestrator

You are analyzing a USCIS immigration form PDF to extract a structured JSON form template.

**Form**: [FORM_NUMBER] - [FORM_TITLE]
**PDF File**: [Attached PDF]

## Your Task

Launch 3 parallel sub-agents to analyze this form, then synthesize their results.

### Launch These Agents IN PARALLEL:

**Agent 1: Structure & Fields Agent**
Analyze the form structure and extract all input fields with their types, labels, and layout.

**Agent 2: Conditional Logic Agent**
Find all conditional display rules ("If Yes, complete Items X-Y", etc.)

**Agent 3: PDF Field Names Agent**
Extract the internal PDF form field names for bidirectional sync.

### After All Agents Complete:

Run the **Synthesizer Agent** to combine all results into the final FormTemplate JSON.

## Output Format

The final output must be valid TypeScript that can be saved directly to a file:

import type { FormTemplate } from '~/types/form-template';

export const [formId]Template: FormTemplate = {
// ... complete form definition
};
```

---

## Agent 1: Structure & Fields Agent

```markdown
# Agent 1: Form Structure & Field Extraction

Analyze the attached USCIS form PDF and extract all sections and input fields.

## Instructions

### 1. Identify All Sections

Scan for parts labeled "Part 1", "Part 2", etc. For each section, record:

- Section identifier (e.g., "part-1")
- Official title (e.g., "Information About You")
- Item number range (e.g., "Items 1-15")

### 2. Extract All Input Fields

For each section, extract every input field. Map to these types:

| PDF Element                | JSON Type  | Notes                                                          |
| -------------------------- | ---------- | -------------------------------------------------------------- |
| Text box (single line)     | `text`     |                                                                |
| Text box (multi-line)      | `textarea` | Set `rows` property                                            |
| Checkbox (standalone)      | `checkbox` |                                                                |
| Checkbox group (pick one)  | `radio`    | Create `options` array                                         |
| Checkbox group (pick many) | `checkbox` | Create `options` array                                         |
| Yes/No question            | `radio`    | `options: [{value:"yes",label:"Yes"},{value:"no",label:"No"}]` |
| Date field (mm/dd/yyyy)    | `date`     |                                                                |
| Numeric field              | `number`   |                                                                |
| Dropdown/selection         | `select`   | Create `options` array                                         |

### 3. Field Properties

For each field, capture:

- `name`: camelCase identifier based on content (e.g., `familyName`, `dateOfBirth`)
- `itemNumber`: The form's item number (e.g., "1.a", "2.b")
- `label`: The question/prompt text exactly as written
- `helpText`: Any parenthetical or smaller instructional text
- `width`: Estimate based on visual size:
  - `"1-1"` = full width
  - `"1-2"` = half width
  - `"1-3"` = one-third width
  - `"1-4"` = quarter width
- `options`: For radio/select/checkbox groups

### 4. Exclusions

DO NOT include:

- Signature blocks ("I certify...")
- Preparer/interpreter sections (Part 5+) unless user data fields exist
- Page numbers, OMB numbers, expiration dates
- Instruction text not connected to a field
- Barcode/QR areas

## Output Format

{
"formInfo": {
"formNumber": "I-765",
"title": "Application for Employment Authorization",
"revision": "03/20/24",
"totalPages": 7
},
"sections": [
{
"id": "part-1",
"title": "Reason for Applying",
"itemRange": "Items 1-2",
"fields": [
{
"itemNumber": "1",
"name": "reasonForApplying",
"type": "radio",
"label": "I am applying for:",
"options": [
{ "value": "initial", "label": "a. Initial permission to accept employment" },
{ "value": "replacement", "label": "b. Replacement (lost, stolen, or damaged EAD)" },
{ "value": "renewal", "label": "c. Renewal of my permission to accept employment" }
],
"width": "1-1"
}
]
}
]
}

Be thorough - capture EVERY field. Missing fields will break PDF sync.
```

---

## Agent 2: Conditional Logic Agent

```markdown
# Agent 2: Conditional Logic Detection

Analyze the attached USCIS form PDF for conditional display logic.

## Instructions

### 1. Find Conditional Patterns

Look for these phrases throughout the form:

- "If you answered 'Yes' to Item X..."
- "If you answered 'No', skip to..."
- "Complete Items X-Y only if..."
- "If applicable, complete..."
- "If not applicable, type or print 'N/A'"
- "See instructions for exceptions"

### 2. Map Each Condition

For each conditional you find, record:

- `triggerField`: The item number or field that controls visibility
- `triggerOperator`: How to compare (`equals`, `notEquals`, `isEmpty`, `isNotEmpty`)
- `triggerValue`: The value that activates the condition
- `affectedItems`: Array of item numbers that are shown/hidden
- `action`: `show` (display when true) or `hide` (hide when true)
- `location`: Page and item number where the condition appears

### 3. Conditional Types

**Type A: Yes/No Branching**
"1. Have you previously filed Form I-765? [ ] Yes [ ] No
If 'Yes', complete Items 2-5."

→ Items 2-5 have `showWhen: [{field: "item1", operator: "equals", value: "yes"}]`

**Type B: Skip Logic**
"If you answered 'No' to Item 3, skip to Item 10."

→ Items 4-9 have `showWhen: [{field: "item3", operator: "equals", value: "yes"}]`

**Type C: Category-Based**
"If you selected (a)(12), complete Supplement A."

→ Supplement A fields have `showWhen: [{field: "eligibilityCategory", operator: "equals", value: "a12"}]`

**Type D: Part-Level Conditions**
"Complete Part 4 only if you are applying for a renewal."

→ All Part 4 fields have `showWhen: [{field: "reasonForApplying", operator: "equals", value: "renewal"}]`

## Output Format

{
"conditions": [
{
"id": "cond-1",
"location": "Page 2, after Item 3",
"originalText": "If you answered 'Yes' to Item 3, complete Items 4-8.",
"triggerField": "item3",
"triggerItemNumber": "3",
"triggerOperator": "equals",
"triggerValue": "yes",
"affectedItems": ["4", "5", "6", "7", "8"],
"action": "show"
},
{
"id": "cond-2",
"location": "Page 1, Part 1 header",
"originalText": "Complete Part 4 only if applying for renewal",
"triggerField": "reasonForApplying",
"triggerItemNumber": "1",
"triggerOperator": "equals",
"triggerValue": "renewal",
"affectedItems": ["part-4-all"],
"action": "show"
}
]
}

Capture the exact original text so we can verify the interpretation.
```

---

## Agent 3: PDF Field Names Agent

```markdown
# Agent 3: PDF Form Field Name Extraction

Extract the internal PDF field names from this USCIS form for bidirectional sync.

## Instructions

### 1. Identify PDF Form Fields

USCIS forms are fillable PDFs with named form fields. Each text box, checkbox, etc. has an internal name like:

- `form1[0].Page1[0].Part1[0].Line1a[0]`
- `topmostSubform[0].Page1[0].TextField1[0]`

### 2. Map Fields

For each visible input field in the form, record:

- `itemNumber`: The form's visible item number (e.g., "1.a")
- `fieldLabel`: Brief description of what the field is for
- `pdfFieldName`: The exact internal PDF field name
- `fieldType`: text, checkbox, radio, date, etc.

### 3. How to Find PDF Field Names

**Method 1: PDF Reader Inspection**
Open in Adobe Reader, use Form > Export Data to see field names

**Method 2: JavaScript Console**
In a PDF reader with JS support:
for (var i = 0; i < this.numFields; i++) {
console.println(this.getNthFieldName(i));
}

**Method 3: pdf-lib Extraction**
import { PDFDocument } from 'pdf-lib';
const pdfDoc = await PDFDocument.load(pdfBytes);
const form = pdfDoc.getForm();
const fields = form.getFields();
fields.forEach(field => console.log(field.getName()));

### 4. Field Name Patterns

USCIS forms typically use patterns like:

- `form1[0].Page1[0].Part2[0].Line1a_FamilyName[0]`
- `form1[0].Page1[0].Part2[0].Checkbox1_Yes[0]`

Note any patterns you observe for easier mapping.

## Output Format

{
"pdfInfo": {
"hasFormFields": true,
"totalFields": 156,
"fieldNamePattern": "form1[0].Page{N}[0].Part{M}[0].{FieldDesc}[0]"
},
"fieldMappings": [
{
"itemNumber": "1.a",
"fieldLabel": "Family Name",
"pdfFieldName": "form1[0].Page1[0].Part2[0].Line1a_FamilyName[0]",
"fieldType": "text"
},
{
"itemNumber": "1.b",
"fieldLabel": "Given Name",
"pdfFieldName": "form1[0].Page1[0].Part2[0].Line1b_GivenName[0]",
"fieldType": "text"
},
{
"itemNumber": "3",
"fieldLabel": "Has other names - Yes",
"pdfFieldName": "form1[0].Page1[0].Part2[0].Line3_Yes[0]",
"fieldType": "checkbox"
},
{
"itemNumber": "3",
"fieldLabel": "Has other names - No",
"pdfFieldName": "form1[0].Page1[0].Part2[0].Line3_No[0]",
"fieldType": "checkbox"
}
]
}

Note: For Yes/No checkboxes, there are typically TWO PDF fields (one for each option).
```

---

## Agent 4: Synthesizer Agent

```markdown
# Agent 4: Form Template Synthesizer

Combine the outputs from Agents 1, 2, and 3 into a final FormTemplate.

## Inputs

- Agent 1 Output: `structureAndFields.json`
- Agent 2 Output: `conditionalLogic.json`
- Agent 3 Output: `pdfFieldNames.json`

## Instructions

### 1. Build the Steps Array

Convert each section from Agent 1 into a `StepConfig`:

- `id`: Use section id (e.g., "part-1")
- `title`: Use section title
- `fields`: Convert each field to `FieldConfig`

### 2. Apply Conditional Logic

For each condition from Agent 2:

- Find the affected fields by item number
- Add `showWhen` property with the mapped condition

### 3. Create PDF Field Mappings

From Agent 3, create the `pdfFieldMappings` object:

- Key: The camelCase field name from Agent 1
- Value: The PDF field name from Agent 3
- Match by item number

### 4. Create Autofill Mappings

Map fields to canonical names for document extraction autofill:

| Field Pattern                       | Canonical Name             |
| ----------------------------------- | -------------------------- |
| Family Name, Last Name, Surname     | `last_name`                |
| Given Name, First Name              | `first_name`               |
| Middle Name                         | `middle_name`              |
| Date of Birth, DOB                  | `date_of_birth`            |
| Place of Birth, Birthplace          | `place_of_birth`           |
| Country of Birth                    | `country_of_birth`         |
| Country of Citizenship, Nationality | `nationality`              |
| Gender, Sex                         | `gender`                   |
| A-Number, Alien Number              | `a_number`                 |
| USCIS Online Account Number         | `uscis_account_number`     |
| Social Security Number, SSN         | `ssn`                      |
| Passport Number                     | `passport_number`          |
| Travel Document Number              | `travel_document_number`   |
| Passport Country of Issuance        | `passport_issuing_country` |
| Passport Expiration Date            | `passport_expiry_date`     |
| I-94 Number                         | `i94_number`               |
| I-94 Date of Admission              | `i94_admission_date`       |
| I-94 Class of Admission             | `i94_class_of_admission`   |

### 5. Validate Structure

Ensure the output matches TypeScript types:

- All required properties present
- Field types are valid
- Conditional rules reference existing fields

## Output Format

import type { FormTemplate } from '~/types/form-template';

export const i765Template: FormTemplate = {
id: "i-765",
title: "Application for Employment Authorization",
formNumber: "I-765",
revision: "03/20/24",
steps: [
{
id: "part-1",
title: "Reason for Applying",
fields: [
{
name: "reasonForApplying",
type: "radio",
label: "I am applying for:",
options: [
{ value: "initial", label: "Initial permission to accept employment" },
{ value: "replacement", label: "Replacement of lost, stolen, or damaged EAD" },
{ value: "renewal", label: "Renewal of my permission to accept employment" }
],
width: "1-1"
}
]
},
{
id: "part-2",
title: "Information About You",
fields: [
{
name: "familyName",
type: "text",
label: "Family Name (Last Name)",
width: "1-2"
},
{
name: "givenName",
type: "text",
label: "Given Name (First Name)",
width: "1-2"
},
{
name: "hasOtherNames",
type: "radio",
label: "Have you used any other names since birth?",
options: [
{ value: "yes", label: "Yes" },
{ value: "no", label: "No" }
],
width: "1-1"
},
{
name: "otherFamilyName",
type: "text",
label: "Other Family Name Used (Last Name)",
width: "1-2",
showWhen: [
{ field: "hasOtherNames", operator: "equals", value: "yes" }
]
}
]
}
],
pdfFieldMappings: {
"familyName": "form1[0].Page1[0].Part2[0].Line1a[0]",
"givenName": "form1[0].Page1[0].Part2[0].Line1b[0]",
"hasOtherNames": "form1[0].Page1[0].Part2[0].Line3[0]",
"otherFamilyName": "form1[0].Page1[0].Part2[0].Line4a[0]"
},
autofillMappings: {
"familyName": "last_name",
"givenName": "first_name",
"middleName": "middle_name",
"dateOfBirth": "date_of_birth",
"passportNumber": "passport_number"
}
};
```

---

## Usage Instructions

### How to Use This Prompt System

**Step 1: Prepare the Form**

1. Download the fillable PDF from USCIS website (e.g., I-765)
2. Open a new Claude conversation
3. Attach the PDF file to your message

**Step 2: Run the Master Prompt**
Copy the Master Orchestration Prompt and replace:

- [FORM_NUMBER] with the form number (e.g., "I-765")
- [FORM_TITLE] with the official title
- [Attached PDF] reference the attached file

Claude will automatically spawn the 3 parallel agents.

**Step 3: Review Agent Outputs**
Each agent will return structured JSON. Review for:

- Missing fields (especially nested conditional sections)
- Incorrect field types
- Misidentified conditionals

**Step 4: Run Synthesizer**
After all 3 agents complete, run Agent 4 with their combined outputs.

**Step 5: Save and Validate**

- Save the TypeScript output to `frontend/src/templates/{form-id}.ts`
- Run TypeScript compiler to validate types
- Test in the MultiStepForm component

---

## Quick Reference: Canonical Field Names

These are the standard field names from `backend/src/config/canonicalFields.ts`:

| Category       | Canonical Fields                                                                                     |
| -------------- | ---------------------------------------------------------------------------------------------------- |
| Personal       | `first_name`, `last_name`, `middle_name`, `date_of_birth`, `place_of_birth`, `nationality`, `gender` |
| Passport       | `passport_number`, `passport_issue_date`, `passport_expiry_date`, `passport_issuing_country`         |
| Visa           | `visa_number`, `visa_type`, `visa_issue_date`, `visa_expiry_date`                                    |
| I-94           | `i94_number`, `i94_admission_date`, `i94_class_of_admission`, `i94_admit_until_date`                 |
| Marriage       | `marriage_date`, `marriage_place`, `spouse_first_name`, `spouse_last_name`                           |
| Employment     | `current_employer`, `current_job_title`                                                              |
| USCIS-specific | `a_number`, `uscis_account_number`, `ssn`                                                            |

---

## Tips for Best Results

1. **Use fillable PDFs**: Non-fillable PDFs won't have named form fields for Agent 3

2. **Process forms page by page**: For very long forms (I-485 is 18 pages), you may get better results processing in chunks

3. **Verify conditionals manually**: Conditional logic is nuanced - always verify Agent 2's output against the actual form

4. **Handle checkbox pairs**: Yes/No questions have two PDF fields - ensure both are mapped

5. **Test iteratively**: After generating a template, test in the UI and refine as needed
