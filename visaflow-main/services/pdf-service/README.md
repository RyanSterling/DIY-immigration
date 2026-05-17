# PDF Service

A microservice for handling PDF operations including form filling, field inspection, and form type detection.

## Features

- **Form Type Detection**: Automatically detects whether a PDF uses AcroForm or XFA format
- **Dual Engine Support**: Uses pdf-lib for AcroForm PDFs and pdftk for XFA PDFs
- **Field Inspection**: Lists all form fields in a PDF with their types and current values
- **Form Filling**: Fills PDF forms with provided data

## API Endpoints

### GET /health

Check service status and tool availability.

```json
// Response
{
  "status": "ok",
  "pdftk": "available",
  "pdfLib": "available"
}
```

### POST /detect

Detect the form type of a PDF.

```json
// Request
{
  "pdf": "<base64-encoded-pdf>"
}

// Response
{
  "hasXFA": false,
  "hasAcroForm": true,
  "acroFormFieldCount": 45,
  "isXFAOnly": false,
  "recommendedEngine": "pdf-lib"
}
```

### POST /inspect

List all form fields in a PDF.

```json
// Request
{
  "pdf": "<base64-encoded-pdf>"
}

// Response
{
  "fields": [
    {
      "name": "FirstName",
      "type": "text",
      "value": ""
    },
    {
      "name": "Citizenship",
      "type": "dropdown",
      "options": ["USA", "Canada", "Mexico"]
    }
  ],
  "formType": {
    "hasXFA": false,
    "hasAcroForm": true,
    "acroFormFieldCount": 45,
    "isXFAOnly": false,
    "recommendedEngine": "pdf-lib"
  }
}
```

### POST /fill

Fill a PDF form with provided data.

```json
// Request
{
  "pdf": "<base64-encoded-pdf>",
  "fields": {
    "FirstName": "John",
    "LastName": "Doe",
    "AgreeToTerms": true
  },
  "options": {
    "flatten": false
  }
}

// Response
{
  "success": true,
  "pdf": "<base64-encoded-filled-pdf>",
  "engine": "pdf-lib",
  "stats": {
    "filledCount": 3,
    "skippedCount": 0,
    "errors": []
  }
}
```

## Development

### Prerequisites

- Node.js 20+
- pdftk (optional, for XFA form support)

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

### Run Production Server

```bash
npm start
```

## Docker

### Build Image

```bash
docker build -t pdf-service .
```

### Run Container

```bash
docker run -p 3001:3001 pdf-service
```

## Architecture

```
src/
├── index.ts           # Hono server entry point
├── types.ts           # TypeScript type definitions
├── routes/
│   ├── fill.ts        # POST /fill endpoint
│   ├── inspect.ts     # POST /inspect endpoint
│   ├── detect.ts      # POST /detect endpoint
│   └── health.ts      # GET /health endpoint
└── lib/
    ├── detectFormType.ts  # Form type detection
    ├── pdfLibFiller.ts    # pdf-lib filling logic
    ├── pdftkFiller.ts     # pdftk filling logic
    └── fdfGenerator.ts    # FDF generation for pdftk
```

## Engine Selection

The service automatically selects the appropriate engine based on the PDF form type:

- **pdf-lib**: Used for standard AcroForm PDFs. Pure JavaScript, works everywhere.
- **pdftk**: Used for XFA forms that pdf-lib cannot handle. Requires pdftk-java to be installed.

If pdftk is not available and an XFA form is detected, the service will fall back to pdf-lib with a warning.
