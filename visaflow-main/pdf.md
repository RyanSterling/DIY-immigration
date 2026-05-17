# PDF Form Filling Service — Technical Specification

**Version:** 1.0  
**Last Updated:** January 2025  
**Purpose:** Backend service to programmatically fill government PDF forms from JSON data

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [PDF Form Types](#pdf-form-types)
4. [Implementation Flow](#implementation-flow)
5. [Dependencies & Environment](#dependencies--environment)
6. [API Design](#api-design)
7. [Field Mapping Strategy](#field-mapping-strategy)
8. [Error Handling](#error-handling)
9. [Security Considerations](#security-considerations)
10. [Deployment Checklist](#deployment-checklist)

---

## Overview

### Problem Statement

Government PDF forms need to be pre-filled with user data from our system and saved as new documents for download or submission. The solution must handle two distinct PDF form technologies that government agencies use.

### Solution Summary

A Node.js service that:

1. Accepts a JSON payload containing user data
2. Maps JSON fields to PDF form field names
3. Detects the PDF form type (AcroForm vs XFA)
4. Fills the form using the appropriate engine
5. Returns the filled PDF as bytes or saves to storage

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Request Flow                              │
└─────────────────────────────────────────────────────────────────┘

   JSON Data                Field Mapping              PDF Template
       │                        │                           │
       ▼                        ▼                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Form Filler Service                         │
│  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐   │
│  │  Form Type    │───▶│   Router      │───▶│  Output       │   │
│  │  Detector     │    │               │    │  Generator    │   │
│  └───────────────┘    └───────┬───────┘    └───────────────┘   │
│                               │                                  │
│                    ┌──────────┴──────────┐                      │
│                    ▼                     ▼                      │
│            ┌──────────────┐      ┌──────────────┐               │
│            │  pdf-lib     │      │  pdftk       │               │
│            │  (AcroForm)  │      │  (XFA)       │               │
│            └──────────────┘      └──────────────┘               │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                        Filled PDF Bytes
```

---

## PDF Form Types

Understanding the two form technologies is critical for implementation.

### AcroForm (Standard PDF Forms)

| Attribute | Details |
|-----------|---------|
| **Format** | Native PDF form fields embedded in the document |
| **Introduced** | PDF 1.2 (1996) |
| **Detection** | Contains `/AcroForm` dictionary in PDF structure |
| **Tooling** | Fully supported by `pdf-lib` (pure JavaScript) |
| **Prevalence** | Most modern PDFs, forms created after ~2018 |

**Characteristics:**
- Field data stored directly in PDF objects
- Lightweight, well-supported across PDF readers
- Can be manipulated entirely in JavaScript/Node.js

### XFA (XML Forms Architecture)

| Attribute | Details |
|-----------|---------|
| **Format** | XML-based form definition embedded in PDF wrapper |
| **Introduced** | PDF 1.5 (2003), Adobe proprietary |
| **Detection** | Contains `/XFA` stream in PDF structure |
| **Tooling** | Requires `pdftk` or Adobe libraries |
| **Prevalence** | Legacy government forms (IRS pre-2020, older state forms) |

**Characteristics:**
- Form logic and data stored as XML within PDF
- Deprecated by Adobe in 2017, removed from ISO PDF 2.0 standard
- Still prevalent in legacy government documents
- Cannot be processed with pure JavaScript libraries

### Hybrid Forms

Some PDFs contain both AcroForm and XFA representations. These were created during the transition period. Strategy: attempt AcroForm processing first; fall back to XFA if AcroForm fields are empty or non-functional.

### Detection Logic

```javascript
async function detectPdfFormType(pdfBuffer) {
  const pdfString = pdfBuffer.toString('latin1');
  
  const hasXFA = pdfString.includes('/XFA');
  const hasAcroForm = pdfString.includes('/AcroForm');
  
  // Attempt to count usable AcroForm fields
  let acroFormFieldCount = 0;
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    acroFormFieldCount = pdfDoc.getForm().getFields().length;
  } catch (e) {
    // XFA-only PDFs may fail to load with pdf-lib
  }

  return {
    isXFA: hasXFA,
    hasAcroForm: hasAcroForm,
    acroFormFieldCount: acroFormFieldCount,
    isXFAOnly: hasXFA && acroFormFieldCount === 0,
    recommendedEngine: (hasXFA && acroFormFieldCount === 0) ? 'pdftk' : 'pdf-lib'
  };
}
```

---

## Implementation Flow

### Step 1: Form Analysis (One-Time Setup Per Form)

Before integrating a new government form, analyze it to extract field names.

```bash
# Check form type
node fill-pdf-form-enhanced.js --check ./forms/w4-2024.pdf

# Extract all field names
node fill-pdf-form-enhanced.js --inspect ./forms/w4-2024.pdf > w4-fields.json
```

**Output Example:**
```json
[
  { "name": "topmostSubform[0].Page1[0].Step1a[0].f1_01[0]", "type": "TextField" },
  { "name": "topmostSubform[0].Page1[0].Step1a[0].f1_02[0]", "type": "TextField" },
  { "name": "topmostSubform[0].Page1[0].Step1b[0].c1_1[0]", "type": "CheckBox", "options": ["1", "Off"] },
  { "name": "topmostSubform[0].Page1[0].Step1c[0].c1_2[0]", "type": "RadioGroup", "options": ["1", "2", "3"] }
]
```

### Step 2: Create Field Mapping

Map your internal data schema to PDF field names. Store this as a configuration file per form type.

```json
// mappings/w4-2024.json
{
  "employee.firstName": "topmostSubform[0].Page1[0].Step1a[0].f1_01[0]",
  "employee.lastName": "topmostSubform[0].Page1[0].Step1a[0].f1_02[0]",
  "employee.ssn": "topmostSubform[0].Page1[0].Step1a[0].f1_03[0]",
  "employee.address.street": "topmostSubform[0].Page1[0].Step1a[0].f1_04[0]",
  "employee.address.city": "topmostSubform[0].Page1[0].Step1a[0].f1_05[0]",
  "employee.address.state": "topmostSubform[0].Page1[0].Step1a[0].f1_06[0]",
  "employee.address.zip": "topmostSubform[0].Page1[0].Step1a[0].f1_07[0]",
  "employee.filingStatus": "topmostSubform[0].Page1[0].Step1c[0].c1_2[0]",
  "employee.dependentCredit": "topmostSubform[0].Page1[0].Step3[0].f1_08[0]",
  "employee.otherIncome": "topmostSubform[0].Page1[0].Step4a[0].f1_09[0]",
  "employee.deductions": "topmostSubform[0].Page1[0].Step4b[0].f1_10[0]",
  "employee.extraWithholding": "topmostSubform[0].Page1[0].Step4c[0].f1_11[0]",
  "signature.date": "topmostSubform[0].Page1[0].Step5[0].f1_12[0]"
}
```

### Step 3: Runtime Form Filling

```javascript
// Pseudocode for the service layer
async function generateFilledForm(formType, userData) {
  // 1. Load form configuration
  const config = await loadFormConfig(formType); // { pdfPath, mapping, formInfo }
  
  // 2. Load PDF template
  const pdfBuffer = await fs.readFile(config.pdfPath);
  
  // 3. Detect form type (can be cached per form)
  const formInfo = config.formInfo || await detectPdfFormType(pdfBuffer);
  
  // 4. Route to appropriate engine
  let filledPdfBytes;
  if (formInfo.recommendedEngine === 'pdftk') {
    filledPdfBytes = await fillWithPdftk(pdfBuffer, userData, config.mapping);
  } else {
    filledPdfBytes = await fillWithPdfLib(pdfBuffer, userData, config.mapping);
  }
  
  // 5. Return or store
  return filledPdfBytes;
}
```

### Step 4: Output Handling

Options for returning the filled PDF:

| Method | Use Case | Implementation |
|--------|----------|----------------|
| Direct download | User-initiated request | Stream bytes with `Content-Disposition: attachment` |
| Base64 in JSON | API response for SPA | `Buffer.from(bytes).toString('base64')` |
| Cloud storage | Async processing | Upload to S3/GCS, return signed URL |
| Email attachment | Automated workflows | Attach buffer to email service |

---

## Dependencies & Environment

### Node.js Dependencies

```json
{
  "dependencies": {
    "pdf-lib": "^1.17.1"
  }
}
```

`pdf-lib` is the only npm dependency. It handles all AcroForm operations in pure JavaScript.

### System Dependencies (for XFA support)

| Tool | Purpose | Installation |
|------|---------|--------------|
| `pdftk-java` | XFA form filling via FDF | Required for XFA forms |
| `qpdf` | PDF repair/optimization | Optional, useful for corrupted PDFs |

**Installation by platform:**

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install pdftk-java qpdf

# Amazon Linux 2 / RHEL
sudo yum install java-11-openjdk
# pdftk must be compiled from source or use Docker

# macOS
brew install pdftk-java qpdf

# Docker (recommended for consistency)
# See Dockerfile example below
```

### Docker Environment

```dockerfile
FROM node:20-slim

# Install system dependencies for XFA support
RUN apt-get update && apt-get install -y \
    pdftk-java \
    qpdf \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

CMD ["node", "server.js"]
```

---

## API Design

### Recommended Endpoints

```
POST /api/forms/fill
POST /api/forms/:formType/fill
GET  /api/forms/:formType/fields
GET  /api/forms/:formType/preview
```

### Request/Response Schema

**Fill Form Request:**
```typescript
interface FillFormRequest {
  formType: string;          // e.g., "w4-2024", "i9-2023"
  data: Record<string, any>; // User data matching your internal schema
  options?: {
    flatten?: boolean;       // Make fields non-editable (default: false)
    outputFormat?: 'bytes' | 'base64' | 'url';
  };
}
```

**Fill Form Response:**
```typescript
interface FillFormResponse {
  success: boolean;
  data?: {
    pdf?: string;           // Base64-encoded PDF if outputFormat is 'base64'
    url?: string;           // Signed URL if outputFormat is 'url'
    filename: string;       // Suggested filename
    contentType: 'application/pdf';
  };
  error?: {
    code: string;
    message: string;
    fields?: string[];      // Fields that failed to fill
  };
}
```

### Example Integration

```javascript
// Express.js controller
app.post('/api/forms/:formType/fill', async (req, res) => {
  const { formType } = req.params;
  const { data, options = {} } = req.body;

  try {
    // Validate form type exists
    const formConfig = getFormConfig(formType);
    if (!formConfig) {
      return res.status(404).json({ 
        success: false, 
        error: { code: 'FORM_NOT_FOUND', message: `Unknown form type: ${formType}` }
      });
    }

    // Fill the form
    const pdfBytes = await fillPdfForm(
      formConfig.templatePath,
      data,
      formConfig.mapping,
      { flatten: options.flatten ?? true }
    );

    // Return based on requested format
    if (options.outputFormat === 'base64') {
      return res.json({
        success: true,
        data: {
          pdf: Buffer.from(pdfBytes).toString('base64'),
          filename: `${formType}-filled.pdf`,
          contentType: 'application/pdf'
        }
      });
    }

    // Default: stream download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${formType}-filled.pdf"`);
    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('Form fill error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FILL_FAILED', message: error.message }
    });
  }
});
```

---

## Field Mapping Strategy

### Mapping File Structure

Organize mappings per form type in a dedicated directory:

```
/config
  /form-mappings
    /w4-2024.json
    /i9-2023.json
    /state-tax-ca.json
  /form-templates
    /w4-2024.pdf
    /i9-2023.pdf
    /state-tax-ca.pdf
```

### Handling Nested Data

The service supports dot notation for nested JSON paths:

```json
// Input data
{
  "employee": {
    "name": {
      "first": "John",
      "last": "Doe"
    },
    "address": {
      "street": "123 Main St",
      "city": "Boston"
    }
  }
}

// Mapping
{
  "employee.name.first": "FirstNameField",
  "employee.name.last": "LastNameField",
  "employee.address.street": "AddressField",
  "employee.address.city": "CityField"
}
```

### Field Type Handling

| PDF Field Type | Expected JSON Value | Conversion Notes |
|---------------|---------------------|------------------|
| TextField | `string` | Converted via `String(value)` |
| CheckBox | `boolean`, `"yes"`, `"true"`, `1` | Truthy → checked |
| RadioGroup | `string` | Must match one of the option values |
| Dropdown | `string` | Must match one of the option values |

### Checkbox/Radio Values

Checkbox and radio fields have specific values that must be used. Extract these during form inspection:

```json
{
  "name": "FilingStatusRadio",
  "type": "RadioGroup",
  "options": ["Single", "Married", "HeadOfHousehold"]
}
```

To select "Married", the JSON value must be exactly `"Married"`.

---

## Error Handling

### Error Categories

| Error Code | Cause | Resolution |
|------------|-------|------------|
| `FORM_NOT_FOUND` | Unknown form type requested | Check form type string |
| `TEMPLATE_MISSING` | PDF template file not found | Verify template path |
| `FIELD_NOT_FOUND` | Mapping references non-existent PDF field | Re-inspect PDF, update mapping |
| `INVALID_FIELD_VALUE` | Value doesn't match field constraints | Check radio/dropdown options |
| `XFA_NO_PDFTK` | XFA form but pdftk not installed | Install pdftk-java |
| `PDFTK_FAILED` | pdftk execution error | Check pdftk installation, PDF validity |
| `PDF_CORRUPTED` | Cannot parse PDF file | Try qpdf repair, get new template |

### Graceful Degradation

```javascript
async function fillPdfForm(pdfPath, data, mapping, options) {
  const warnings = [];
  
  for (const [jsonKey, pdfFieldName] of Object.entries(mapping)) {
    const value = getNestedValue(data, jsonKey);
    
    if (value === undefined) {
      warnings.push(`Missing data for field: ${jsonKey}`);
      continue; // Skip, don't fail
    }

    try {
      await fillField(pdfFieldName, value);
    } catch (error) {
      warnings.push(`Failed to fill ${pdfFieldName}: ${error.message}`);
      // Continue with other fields
    }
  }

  return { pdfBytes, warnings };
}
```

---

## Security Considerations

### Input Validation

1. **Sanitize all input values** before inserting into PDF
2. **Validate form type** against allowed list (prevent path traversal)
3. **Limit file sizes** for any uploaded PDFs
4. **Validate JSON schema** before processing

```javascript
// Example validation
const allowedFormTypes = ['w4-2024', 'i9-2023', 'state-tax-ca'];

if (!allowedFormTypes.includes(formType)) {
  throw new Error('Invalid form type');
}

// Sanitize text values
function sanitizeValue(value) {
  if (typeof value !== 'string') return value;
  // Remove potential PDF injection characters
  return value.replace(/[\x00-\x1f]/g, '');
}
```

### File System Security

- Store PDF templates outside web root
- Use absolute paths constructed from config, never from user input
- Temp files (for pdftk) should use secure random names and be cleaned up

### PII Handling

- Filled PDFs contain sensitive data (SSN, addresses)
- Do not log PDF contents or full data payloads
- If storing filled PDFs, encrypt at rest
- Consider not persisting filled PDFs; generate on-demand

---


### Environment Variables

```bash
# Required
FORM_TEMPLATES_PATH=/app/config/form-templates
FORM_MAPPINGS_PATH=/app/config/form-mappings

# Optional
PDF_TEMP_DIR=/tmp/pdf-processing
FLATTEN_BY_DEFAULT=true
MAX_PDF_SIZE_MB=10
```

### Health Check

```javascript
app.get('/health', async (req, res) => {
  const checks = {
    service: 'ok',
    pdfLib: 'ok',
    pdftk: 'unknown'
  };

  // Check pdftk availability
  try {
    execSync('pdftk --version', { stdio: 'ignore' });
    checks.pdftk = 'ok';
  } catch {
    checks.pdftk = 'not installed';
  }

  res.json(checks);
});
```

### Monitoring Recommendations

- Track form fill latency (p50, p95, p99)
- Alert on `XFA_NO_PDFTK` errors (infrastructure issue)
- Monitor temp disk usage if using pdftk heavily
- Log warning counts per form type to identify mapping issues

---

## Appendix: Quick Reference

### CLI Commands

```bash
# Check if a PDF is AcroForm or XFA
node fill-pdf-form-enhanced.js --check form.pdf

# List all fillable fields
node fill-pdf-form-enhanced.js --inspect form.pdf

# Fill a form
node fill-pdf-form-enhanced.js input.pdf data.json mapping.json output.pdf

# Fill and flatten (non-editable)
node fill-pdf-form-enhanced.js input.pdf data.json mapping.json output.pdf --flatten
```

