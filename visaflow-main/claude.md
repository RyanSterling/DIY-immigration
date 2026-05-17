# PDF Form Management System - MVP Specification

This is a functionality specification. Database schema and implementation details are left to developer discretion.

## Executive Summary

A multi-tenant web application that bridges the gap between complex PDF forms and user-friendly HTML interfaces. The system allows organizations to manage clients, upload documents for data extraction, and complete immigration forms with an intuitive section-based interface and interactive PDF editing.

**MVP Focus**: Get core functionality working with minimal complexity. No blocking validation, no complex audit trails.

## Implementation Status

> This section tracks progress against the specification. Updated: January 2026

### Completed
- [x] Multi-tenant architecture with organization isolation
- [x] Client management with search and soft delete
- [x] Document upload with S3 storage
- [x] AWS Textract integration for data extraction
- [x] Smart data layering (stacked values from multiple documents)
- [x] Conflict resolution UI for extracted values
- [x] Section-based form UI with JSON-driven configuration
- [x] Form autofill from extracted client data
- [x] Form instance management (draft/in-progress/completed)
- [x] PDF generation with pdf-lib
- [x] Admin interface for template management (http://localhost:5174)

### In Progress
- [ ] PDF Review & Direct Editing - Basic preview exists, bidirectional editing not implemented
- [ ] Form Templates - I-765 implemented, 5 other forms pending (I-131, I-485, G-1450, I-864, I-140)

### Not Started
- [ ] Bidirectional PDF editing (click-to-edit in PDF viewer)
- [ ] PostHog analytics integration
- [ ] Sentry error monitoring

## Core Concept

**The Problem**: PDF forms are lengthy, complex, and difficult to fill out directly. Users need a more intuitive interface while maintaining the ability to populate the original PDF with accurate data.

**The Solution**: A web application that:
- Maps PDF form fields to a user-friendly HTML interface
- Breaks large forms into logical sections
- Extracts data from uploaded documents to autofill forms
- Provides interactive PDF editing with bidirectional sync

## User Access

### Organization Admin (Single Account per Org)
- Super admin creates organization accounts manually
- Basic login flow with session management via custom backend API
- Password reset handled manually by super admin for MVP
- Can manage clients, upload documents, create and complete forms

### Super Admin (Platform-Level)
- Creates organization accounts via admin interface
- Manages form templates via admin UI (http://localhost:5174)
- Views platform-wide statistics
- Accesses via separate admin application

## Navigation Structure

- Client list view as primary dashboard after login
- Click client to view their profile, documents, and form instances
- Create new forms and upload documents from within client page

## Key Features

### 1. Client Management

- Organizations can create and manage multiple clients
- Each form instance is attributed to a specific client
- Clients can have multiple instances of the same form
- Client profile includes contact information and metadata
- As documents are added, client metadata is updated from extracted data
- Organizations can search for client name in client listing
- Soft delete capability (hidden from UI but preserved in database)

### 2. Document Upload & Data Extraction

**Automated Document Processing**
- Upload client documents and extract data using AWS Textract
- Extraction field definitions configured by developer at build time

**MVP Supported Document Types**
- Passport
- Visa
- Resume/CV
- Birth Certificate
- Marriage Certificate
- I-94 Entry Record (CBP arrival/departure record)

**Smart Data Layering**
- All extracted values are "stacked" showing complete history
- View all different values for the same field across multiple documents
- See which document each value came from
- Track upload date, uploader, and Textract confidence scores

**Conflict Resolution**
- Side-by-side comparison of different values for the same field
- User selects which value to use with notes explaining why
- Visual indicators showing currently selected value

**Form Autofill**
- Automatically populate form fields from extracted client data
- Configurable mappings between extracted fields and form fields (developer-configured)
- Transformation rules for format conversions (e.g., date formats)
- Override capability - users can change autofilled values

**Data Provenance**
- Every piece of data maintains permanent link to source document

**Processing Status Tracking**
- Monitor document processing states: pending, processing, completed, failed
- Failed documents show error message with option to re-upload
- No automatic retry - user deletes and re-uploads if processing fails

### 3. Section-Based Form UI

- Break large PDF forms into manageable sections
- Each section represents a "page" or group in the app form UI
- Custom ordering of sections and fields (developer-configured)
- Progress tracking across sections
- Save and come back to form at a later date

**Content Inclusion Rules**
- Remove all intro/general content from forms
- Each paper form section creates a corresponding section in the app
- Only include content directly connected to an input field
- Conditional questions should work
- Include ALL input fields (except signature blocks)
- Signature blocks excluded (wet signatures required)

**No Blocking Validation**
- Any question can be skipped without errors
- No flags or feedback for empty fields
- Empty responses result in blank fields in final PDF output
- No blocking validation during form completion

### 4. Form Instance Management

- Create new form instance for a client by selecting from available templates
- Form statuses: Draft, Completed
- All forms remain editable (no locking after completion)
- View list of all form instances for a client
- Download PDF button available from the PDF review screen

### 5. PDF Review & Direct Editing (Core MVP Feature)

This is the cornerstone feature that distinguishes the application.

**Interactive PDF Review**
- Display the filled PDF for final review as the last step of every form
- Mandatory step in the form completion workflow

**Direct PDF Editing**
- Click-to-edit functionality within the PDF viewer
- Real-time field editing without leaving the review interface

**Bidirectional Synchronization**
- Edits made in the PDF automatically update the underlying form data
- Changes sync back to the HTML form fields
- Maintains data consistency across both interfaces

**Document Prefill Integration**
- PDF editor respects and displays autofilled values from extracted client data

**Technical Requirements**
- Selected solution: react-pdf.dev SDK for PDF viewing
- Custom development required for editing functionality
- Build robust connector system for field pairing between PDF fields and form fields

> **Implementation Note**: PDF preview is functional. Interactive bidirectional editing is under investigation. See `sandboxing/react-pdf-edit-test/` for technical research.

## Target PDF Forms (USCIS Immigration Forms)

The initial implementation focuses on these six USCIS forms:

1. **I-765** - Application for Employment Authorization ✅ Implemented
2. **I-131** - Application for Travel Document ⏳ Pending
3. **I-485** - Application to Register Permanent Residence ⏳ Pending
4. **G-1450** - Authorization for Credit Card Transactions ⏳ Pending
5. **I-864** - Affidavit of Support Under Section 213A ⏳ Pending
6. **I-140** - Immigrant Petition for Alien Worker ⏳ Pending

Templates are managed via:
- Claude Code `/pdf-form-pipeline` skill for automated generation
- Admin UI for manual template editing

## Core Workflows

### Document Upload & Data Extraction Workflow

```
1. User uploads client document (passport, visa, resume, birth certificate, marriage certificate, or I-94)
2. Document stored in cloud storage
3. System triggers AWS Textract for automated data extraction
4. Textract processes document and returns structured data
5. System extracts and normalizes field values with confidence scores
6. If first document for a field: automatically set as "active" value for autofill
7. If client already has data for field: add new values to the "stack"
8. User reviews stacked data in UI and resolves any conflicts
9. Active values automatically populate new form instances
```

### Form Creation & Completion Workflow

```
1. User selects a client
2. User chooses a form template
3. System creates new form instance and autofills from client's active values
4. User navigates through sections filling in fields (auto-saved)
5. User can save and return later
6. When ready, user proceeds to PDF review step
7. Filled PDF displayed in interactive viewer
8. User can edit fields directly in the PDF (bidirectional sync)
9. User marks form as completed
10. PDF available for download
```

## Technical Stack

### Frontend
- **Framework**: React with Vite and TypeScript
- **State Management**: React Query
- **UI Components**: Custom components with Tailwind CSS
- **Form Management**: React Hook Form
- **PDF Viewing & Editing**: react-pdf.dev SDK with custom editing layer
- **Auth**: Custom auth built on top of custom backend

### Backend
- **Framework**: Hono API (REST)
- **Storage**: Supabase
- **PDF Processing**: pdf-lib for reading/writing PDF form fields
- **Document Processing**: AWS Textract SDK

### Database
- **Primary**: PostgreSQL via Supabase
- **Features**: Row Level Security (RLS), JSONB

### Infrastructure
- **Hosting**: Vercel (Frontend) + Render (Backend)
- **File Storage**: AWS S3
- **AWS Services**: Textract for document analysis

## Technical Architecture

### Monorepo Structure
- `backend/` - Hono API server with Drizzle ORM
- `frontend/` - React app for organization admins
- `admin/` - React app for super admins
- `shared/` - Shared types and utilities
- `.claude/skills/` - Claude Code automation skills

### Database
PostgreSQL via Supabase with tables including:
- Organizations, users, clients
- Documents, document_extractions, client_field_values
- Form templates, sections, fields
- Form instances, responses

### Background Processing
QueueBear (BullMQ-compatible) for:
- AWS Textract document processing
- Email notifications
- Cleanup jobs

## Data Security

### Multi-Tenancy
- Organization-level data isolation via Row Level Security (RLS)
- All queries scoped to organization automatically via RLS policies
- No cross-organization data access

### Data Management
- Soft deletes for clients, forms, and documents
- Deleted items hidden from UI but preserved in database

### Authentication
- Basic login flow
- JWT-based session management
- Role-based access (org admin only for MVP)

## Analytics & Monitoring

- **PostHog**: User behavior tracking and analytics
- **Sentry**: Error monitoring and reporting

## UI Development Philosophy

Build working features quickly without heavy focus on visual polish. Get core functionality working, then return to enhance design and UX. Desktop only for MVP.
