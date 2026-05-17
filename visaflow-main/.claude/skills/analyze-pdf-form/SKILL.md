---
name: analyze-pdf-form
description: Analyze a USCIS PDF form to extract structure, fields, conditional logic, and PDF field names. First step in the form template generation pipeline.
allowed-tools: Read, Write, Edit, Glob, Grep, Task, Bash
---

# Analyze PDF Form

Analyzes a USCIS PDF form to extract complete structural information for template generation.

## When to Use

Invoke this skill when:
- Starting the PDF form analysis pipeline for a new USCIS form
- User runs `/analyze-pdf-form <path-to-pdf>`
- Beginning template generation for I-765, I-131, I-485, G-1450, I-864, or I-140

## Inputs

| Parameter | Description | Example |
|-----------|-------------|---------|
| PDF Path | Absolute or relative path to the USCIS PDF form | `./forms/i-765.pdf` |

## Outputs

Analysis JSON file saved to:
```
frontend/src/templates/_analysis/{form-id}.json
```

Example: `frontend/src/templates/_analysis/i-765.json`

## Process Overview

```
                    ┌─────────────────────┐
                    │   Read PDF Form     │
                    │   (Orchestrator)    │
                    └─────────┬───────────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
            ▼                 ▼                 ▼
   ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
   │ Structure      │ │ Conditionals   │ │ PDF Names      │
   │ Agent          │ │ Agent          │ │ Agent          │
   └────────┬───────┘ └────────┬───────┘ └────────┬───────┘
            │                 │                 │
            └─────────────────┼─────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │   Combine Results   │
                    │   → analysis.json   │
                    └─────────────────────┘
```

### Step 1: Read the PDF

Use pdf-lib or the PDF viewer to read the form:
```bash
# Extract PDF field names programmatically if available
node -e "
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const pdfBytes = fs.readFileSync('<pdf-path>');
PDFDocument.load(pdfBytes).then(doc => {
  const form = doc.getForm();
  const fields = form.getFields();
  fields.forEach(f => console.log(f.getName()));
});
"
```

### Step 2: Launch Parallel Sub-Agents

Launch 3 sub-agents IN PARALLEL using the Task tool:

#### Structure Agent
Extracts sections and fields from the form.

#### Conditionals Agent
Finds all showWhen rules and conditional display logic.

#### PDF Names Agent
Extracts internal PDF form field names for bidirectional sync.

### Step 3: Combine Results

Merge all agent outputs into the final analysis JSON.

### Step 4: Cleanup

Delete the checkpoint file on successful completion.

---

## Progress Tracking

### Checkpoint File

Create a checkpoint file to track progress:
```
frontend/src/templates/_analysis/processing-{form-id}.md
```

### Checkpoint Format

```markdown
# Processing: I-765

## Status
- Start time: 2024-01-15T10:30:00Z
- Current phase: structure-extraction

## Structure Agent
- [x] Page 1 analyzed
- [x] Page 2 analyzed
- [ ] Page 3 pending
- [ ] Page 4 pending

## Conditionals Agent
- [x] Part 1 scanned
- [ ] Part 2 pending

## PDF Names Agent
- [x] Fields extracted: 156 total
- [ ] Mapping validation pending

## Errors
(none)
```

### Resume from Checkpoint

If a checkpoint file exists:
1. Read the checkpoint to determine completed work
2. Skip already-completed sections/pages
3. Continue from where processing stopped
4. Update checkpoint as each section completes

### Cleanup

Delete the checkpoint file after successful completion:
```bash
rm frontend/src/templates/_analysis/processing-{form-id}.md
```

---

## Field Type Mapping

Map PDF form elements to JSON field types:

| PDF Element | JSON Type | Notes |
|-------------|-----------|-------|
| Text box (single line) | `text` | Standard input |
| Text box (multi-line) | `textarea` | Set `rows` property |
| Checkbox (standalone) | `checkbox` | Boolean toggle |
| Checkbox group (pick one) | `radio` | Create `options` array |
| Checkbox group (pick many) | `checkbox` | Create `options` array |
| Yes/No question | `radio` | `options: [{value:"yes",label:"Yes"},{value:"no",label:"No"}]` |
| Date field (mm/dd/yyyy) | `date` | Date picker |
| Numeric field | `number` | Numeric input |
| Dropdown/selection | `select` | Create `options` array |

---

## Example Output JSON

```json
{
  "formInfo": {
    "id": "i-765",
    "formNumber": "I-765",
    "title": "Application for Employment Authorization",
    "revision": "03/20/24",
    "totalPages": 7
  },
  "structure": {
    "sections": [
      {
        "id": "part-1",
        "title": "Reason for Applying",
        "itemRange": "Items 1-2",
        "pageStart": 1,
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
      },
      {
        "id": "part-2",
        "title": "Information About You",
        "itemRange": "Items 1-33",
        "pageStart": 1,
        "fields": [
          {
            "itemNumber": "1.a",
            "name": "familyName",
            "type": "text",
            "label": "Family Name (Last Name)",
            "width": "1-2"
          },
          {
            "itemNumber": "1.b",
            "name": "givenName",
            "type": "text",
            "label": "Given Name (First Name)",
            "width": "1-2"
          }
        ]
      }
    ]
  },
  "conditionals": [
    {
      "id": "cond-1",
      "location": "Page 2, after Item 3",
      "originalText": "If you answered 'Yes' to Item 3, complete Items 4-8.",
      "triggerField": "hasOtherNames",
      "triggerItemNumber": "3",
      "triggerOperator": "equals",
      "triggerValue": "yes",
      "affectedItems": ["4", "5", "6", "7", "8"],
      "action": "show"
    }
  ],
  "pdfFieldMappings": [
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
  ],
  "metadata": {
    "analyzedAt": "2024-01-15T10:45:00Z",
    "pdfInfo": {
      "hasFormFields": true,
      "totalFields": 156,
      "fieldNamePattern": "form1[0].Page{N}[0].Part{M}[0].{FieldDesc}[0]"
    }
  }
}
```

---

## Sub-Agent Prompts

### Structure Agent Prompt

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

| PDF Element | JSON Type | Notes |
|-------------|-----------|-------|
| Text box (single line) | `text` | |
| Text box (multi-line) | `textarea` | Set `rows` property |
| Checkbox (standalone) | `checkbox` | |
| Checkbox group (pick one) | `radio` | Create `options` array |
| Checkbox group (pick many) | `checkbox` | Create `options` array |
| Yes/No question | `radio` | `options: [{value:"yes",label:"Yes"},{value:"no",label:"No"}]` |
| Date field (mm/dd/yyyy) | `date` | |
| Numeric field | `number` | |
| Dropdown/selection | `select` | Create `options` array |

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

Return JSON with this structure:

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
      "fields": [...]
    }
  ]
}

Be thorough - capture EVERY field. Missing fields will break PDF sync.
```

### Conditionals Agent Prompt

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

-> Items 2-5 have `showWhen: [{field: "item1", operator: "equals", value: "yes"}]`

**Type B: Skip Logic**
"If you answered 'No' to Item 3, skip to Item 10."

-> Items 4-9 have `showWhen: [{field: "item3", operator: "equals", value: "yes"}]`

**Type C: Category-Based**
"If you selected (a)(12), complete Supplement A."

-> Supplement A fields have `showWhen: [{field: "eligibilityCategory", operator: "equals", value: "a12"}]`

**Type D: Part-Level Conditions**
"Complete Part 4 only if you are applying for a renewal."

-> All Part 4 fields have `showWhen: [{field: "reasonForApplying", operator: "equals", value: "renewal"}]`

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
    }
  ]
}

Capture the exact original text so we can verify the interpretation.
```

### PDF Names Agent Prompt

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

**Method 1: pdf-lib Extraction (Preferred)**
```javascript
import { PDFDocument } from 'pdf-lib';
const pdfDoc = await PDFDocument.load(pdfBytes);
const form = pdfDoc.getForm();
const fields = form.getFields();
fields.forEach(field => console.log(field.getName()));
```

**Method 2: PDF Reader Inspection**
Open in Adobe Reader, use Form > Export Data to see field names

**Method 3: JavaScript Console**
In a PDF reader with JS support:
```javascript
for (var i = 0; i < this.numFields; i++) {
  console.println(this.getNthFieldName(i));
}
```

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
    }
  ]
}

Note: For Yes/No checkboxes, there are typically TWO PDF fields (one for each option).
```

---

## Autofill Canonical Fields

Map extracted fields to these canonical names for document autofill:

| Field Pattern | Canonical Name |
|---------------|----------------|
| Family Name, Last Name, Surname | `last_name` |
| Given Name, First Name | `first_name` |
| Middle Name | `middle_name` |
| Date of Birth, DOB | `date_of_birth` |
| Place of Birth, Birthplace | `place_of_birth` |
| Country of Birth | `country_of_birth` |
| Country of Citizenship, Nationality | `nationality` |
| Gender, Sex | `gender` |
| A-Number, Alien Number | `a_number` |
| USCIS Online Account Number | `uscis_account_number` |
| Social Security Number, SSN | `ssn` |
| Passport Number | `passport_number` |
| Travel Document Number | `travel_document_number` |
| Passport Country of Issuance | `passport_issuing_country` |
| Passport Expiration Date | `passport_expiry_date` |
| I-94 Number | `i94_number` |
| I-94 Date of Admission | `i94_admission_date` |
| I-94 Class of Admission | `i94_class_of_admission` |

---

## Example Invocation

**User:** `/analyze-pdf-form ./forms/i-765.pdf`

**Process:**
1. Read the PDF file
2. Create checkpoint: `frontend/src/templates/_analysis/processing-i-765.md`
3. Launch 3 parallel sub-agents via Task tool
4. Wait for all agents to complete
5. Combine results into `frontend/src/templates/_analysis/i-765.json`
6. Delete checkpoint file
7. Report completion with summary

**Output:**
```
Analysis complete for I-765.

Saved to: frontend/src/templates/_analysis/i-765.json

Summary:
- 5 sections extracted
- 87 fields identified
- 12 conditional rules found
- 156 PDF field names mapped

Next step: Run /generate-form-template i-765 to create the TypeScript template.
```

---

## Error Handling

- If PDF cannot be read, report error and suggest checking file path
- If no form fields found, the PDF may not be fillable - warn user
- If sub-agent fails, record error in checkpoint and allow retry
- Always preserve partial progress in checkpoint file

---

## Input Validation

Before launching sub-agents, perform these validations:

### Step 0.1: Validate PDF Path

```typescript
import { getFormPaths, LIMITS } from '../pdf-form-utils/config';

// Check file exists
if (!fs.existsSync(pdfPath)) {
  throw new Error(`PDF file not found: ${pdfPath}`);
}

// Check file size
const stats = fs.statSync(pdfPath);
const sizeMb = stats.size / (1024 * 1024);
if (sizeMb > LIMITS.maxPdfSizeMb) {
  throw new Error(`PDF too large: ${sizeMb.toFixed(1)}MB (max: ${LIMITS.maxPdfSizeMb}MB)`);
}
```

### Step 0.2: Validate PDF is Fillable

```typescript
import { PDFDocument } from 'pdf-lib';

const pdfBytes = fs.readFileSync(pdfPath);
const pdfDoc = await PDFDocument.load(pdfBytes);
const form = pdfDoc.getForm();
const fields = form.getFields();

if (fields.length === 0) {
  console.warn("WARNING: PDF has no fillable fields. Analysis may be incomplete.");
  console.warn("Consider downloading the fillable version from USCIS website.");
}
```

### Step 0.3: Use Standardized Paths

```typescript
import { getFormPaths } from '../pdf-form-utils/config';

const formId = path.basename(pdfPath, '.pdf').toLowerCase();
const paths = getFormPaths(formId);

// Output to: paths.analysisJson
// Checkpoint: paths.processingCheckpoint
```

---

## Error Recovery Guide

### Common Errors and Solutions

#### Error: PDF Cannot Be Read

**Symptom:** "Error reading PDF file" or "PDF parsing failed"

**Causes:**
1. File path is incorrect
2. PDF is password-protected
3. PDF is corrupted

**Solutions:**
1. Verify the file exists: `ls -la {pdf-path}`
2. Check if PDF is fillable: Open in Adobe Reader, try filling a field
3. Try re-downloading from USCIS website
4. For password-protected PDFs, remove protection first

#### Error: No Form Fields Found

**Symptom:** "PDF has no form fields" or empty fieldMappings

**Causes:**
1. PDF is a scanned image, not a fillable form
2. PDF uses XFA forms (not supported by pdf-lib)
3. Form fields have been flattened

**Solutions:**
1. Download the "fillable" version from USCIS website
2. For XFA forms, use Adobe Acrobat to convert to AcroForm format
3. For scanned forms, manual field mapping is required

#### Error: Sub-Agent Timeout

**Symptom:** One of the parallel agents doesn't respond within expected time

**Solutions:**
1. Check checkpoint file for partial progress
2. Re-run the skill - it will resume from checkpoint
3. For very large forms (18+ pages), consider page-by-page processing
4. Increase timeout if network/API is slow

#### Error: Partial Analysis Complete

**Symptom:** Some agents completed, others failed

**Solutions:**
1. Check the checkpoint file to see which agents completed
2. Manually run the failed agent's task
3. Combine results manually into the final JSON
4. Delete checkpoint and retry if all else fails

### Resuming from Checkpoint

If analysis is interrupted, the skill automatically saves progress to:
```
frontend/src/templates/_analysis/processing-{form-id}.md
```

**To resume:**
1. Run the skill again with the same PDF path
2. The skill will detect the checkpoint and continue
3. To force a fresh start, delete the checkpoint file first:
   ```bash
   rm frontend/src/templates/_analysis/processing-{form-id}.md
   ```

### Manual Verification Checklist

After analysis completes, verify:

- [ ] All visible form fields are captured in the analysis
- [ ] Yes/No questions have BOTH checkbox options (Yes and No PDF fields)
- [ ] Multi-page sections are properly grouped
- [ ] Conditional logic text is captured accurately
- [ ] PDF field names follow the expected pattern
- [ ] Field types match visual appearance (text, checkbox, radio, date)
- [ ] Width estimates are reasonable

---

## Methodology

### Three-Agent Architecture

The analysis uses three specialized sub-agents running in parallel for efficiency:

#### 1. Structure Agent

**Purpose:** Extracts the visual layout and field definitions

**What it captures:**
- Part/Section boundaries and titles
- Item numbers and their sequence
- Field names, labels, and help text
- Field types based on visual appearance
- Estimated field widths based on layout

**Why specialized:** Form structure requires understanding visual hierarchy, reading flow, and recognizing USCIS conventions.

#### 2. Conditionals Agent

**Purpose:** Finds logic rules that control field visibility

**What it captures:**
- "If you answered..." conditional phrases
- Skip logic patterns
- Category-based conditions
- Part-level conditions

**Why specialized:** Conditional logic requires careful reading of instructional text and understanding branching patterns.

#### 3. PDF Names Agent

**Purpose:** Extracts internal PDF form field names

**What it captures:**
- Internal PDF field identifiers
- Field type mappings (Tx, Btn, Ch, etc.)
- Field name patterns for the form
- Mapping between item numbers and PDF names

**Why specialized:** PDF field extraction requires technical PDF analysis using pdf-lib or similar tools.

### Why Three Agents?

1. **Specialization**: Each agent focuses on one aspect, reducing cognitive load and errors
2. **Parallelism**: All three run simultaneously, reducing total processing time
3. **Isolation**: One agent's failure doesn't affect others; partial results are preserved
4. **Verification**: Results can be cross-checked between agents for consistency

### PDF Field Extraction Priority

When extracting PDF field names, try methods in this order:

1. **pdf-lib (Preferred)**: Most reliable for AcroForm PDFs
   ```javascript
   const { PDFDocument } = require('pdf-lib');
   const pdfDoc = await PDFDocument.load(pdfBytes);
   const fields = pdfDoc.getForm().getFields();
   ```

2. **Adobe Reader Export**: Open PDF → Form → Export Data
   - Produces an FDF/XFDF file with all field names

3. **JavaScript Console**: For PDFs with JS support
   ```javascript
   for (var i = 0; i < this.numFields; i++) {
     console.println(this.getNthFieldName(i));
   }
   ```

**Note:** If the PDF uses XFA forms (common in older USCIS forms), pdf-lib may not work. In that case, use Adobe Acrobat to convert to AcroForm format first.

---

## Notes

- Use fillable PDFs from the official USCIS website
- For very long forms (I-485 is 18 pages), process page-by-page
- Yes/No questions have TWO PDF fields - ensure both are captured
- Always verify conditionals manually after extraction
- Use `getFormPaths()` from config.ts for standardized output paths
