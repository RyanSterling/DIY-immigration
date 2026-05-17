# PDF Form Management System - Project Overview

This documentations is purely a functionality spec. There should be no code other than database schema. Everything else should be communicated as sudo code OR sentences that allow the developer to decide their own archetectual decisions.

## Executive Summary

A multi-tenant web application that bridges the gap between complex PDF forms and user-friendly HTML interfaces. The system allows organizations to define PDF form templates, break them into manageable sections, and enable multiple users to collaboratively fill out forms for different clients with complete version tracking and audit trails.

## Core Concept

**The Problem**: PDF forms are often lengthy, complex, and difficult to fill out directly. Users need a more intuitive interface while maintaining the ability to populate the original PDF with accurate data.

**The Solution**: A web application that:

- Maps PDF form fields to a user-friendly HTML interface
- Breaks large forms into logical sections/pages
- Allows multiple users to collaborate on the same form (not at the same time, at different times)
- Tracks every change with full audit history
- Maintains the connection between HTML inputs and PDF field IDs
- Supports multiple organizations, users, and clients

## Key Features

### 1. **PDF Form Template Management**

- Upload PDF forms as templates
- Extract or manually define PDF field IDs
- Create associations between PDF fields and user-friendly labels
- Organize fields into logical sections/groups
- Define field types, validation rules, and help text
- Support for multiple template versions

**MVP Target PDF Forms (USCIS Immigration Forms)**

The initial implementation will focus on these six USCIS forms as priority templates:

1. **I-765** - Application for Employment Authorization
2. **I-131** - Application for Travel Document
3. **I-485** - Application to Register Permanent Residence or Adjust Status
4. **G-1450** - Authorization for Credit Card Transactions
5. **I-864** - Affidavit of Support Under Section 213A of the INA
6. **I-140** - Immigrant Petition for Alien Worker

These forms represent common immigration workflow needs and will serve as the foundation for template development, field mapping, and autofill configuration. Additional forms can be added post-MVP using the same template management system.

### 2. **Section-Based Form Builder**

- Break large PDF forms into manageable sections
- Each section represents a "page" or group in the HTML UI
- Custom ordering of sections and fields
- Progress tracking across sections
- **Content Inclusion Rules**:
  - Remove all intro/general content from forms
  - Each paper form section creates a corresponding section in the app
  - Only include content directly connected to an input field
  - Include ALL input fields (except signature blocks)
  - Signature blocks excluded (wet signatures required)

### 3. **Multi-User Collaboration**

- Multiple users can work on the same form (at different times)
- One user can start a form, another can complete it
- User permissions and role-based access control

### 4. **Client Management**

- Organizations can manage multiple clients
- Each form instance is attributed to a specific client
- Clients can have multiple instances of the same form
- Client contact information and metadata
- Future functionality - clients will be able to log in. Do not built this, but future proof this.

### 5. **Document Upload & Intelligent Data Extraction**

- **Automated Document Processing**: Upload client documents and extract data using AWS Textract
- **MVP Supported Document Types**:
  - Passport
  - Visa
  - Resume/CV
  - Birth Certificate
  - Marriage Certificate
  - I-94 Entry Record (CBP arrival/departure record)
- **AWS Textract Integration**: Automatically extract structured data from uploaded documents
- **Smart Data Layering**: All extracted values are "stacked" showing complete history
  - View all different values for the same field across multiple documents
  - See which document each value came from
  - Track upload date, uploader, and Textract confidence scores
- **Conflict Resolution**: Handle conflicting data (e.g., name changes after marriage)
  - Side-by-side comparison of different values
  - User selects which value to use with notes explaining why
  - Visual indicators showing currently selected value
- **Complete Audit Trail**: Track origin and changes
  - Which document each value came from
  - Who uploaded the document and when
  - History of user selections with timestamps
  - Why values were changed (notes field)
- **Form Autofill**: Automatically populate form fields from extracted client data
  - Configurable mappings between extracted fields and form fields
  - Transformation rules for format conversions (e.g., date formats)
  - Override capability - users can change autofilled values
- **Data Provenance**: Every piece of data maintains permanent link to source document
- **Processing Status Tracking**: Monitor document processing states (pending, processing, completed, failed)

#### 5.1 Document Processing Technical Requirements

**Database-Driven Field Extraction**

The system must allow super admins to configure document extraction without code deployments:

- Super admins can define which fields to extract from each document type
- Super admins can specify multiple search patterns for each field (handles OCR variations and international documents)
  - Example for passport number: "Passport No.", "Passport Number", "Passeport No", "Document No."
- Super admins can configure extraction methods per field:
  - Key-value pair extraction (e.g., "DOB: 1990-05-15")
  - Table structure extraction
  - Raw text pattern matching with regex
  - PDF form field extraction
- Super admins can set validation rules (regex patterns, format requirements)
- Super admins can define transformation rules (date format normalization, uppercase conversion, whitespace removal)

All extraction configuration stored in database tables. All organizations use the same extraction logic (no org-specific overrides).

**Extraction Pipeline**

When a document is uploaded, the system must:

1. Store document in cloud storage (S3/Supabase)
2. Trigger AWS Textract job for automated data extraction
3. Store raw Textract response (enables re-processing without re-running Textract)
4. Parser reads extraction configuration from database (document_type_field_mappings table)
5. For each configured field:
   - Search Textract response using configured search patterns
   - Extract value using configured method
   - Apply transformation rules to normalize data
   - Validate using configured regex and validation rules
   - Store in extracted_data table with confidence score and source document link
6. If this is the first value for a field, automatically set as "active" for autofill
7. If client already has values for this field, add to the "stack" (don't replace existing values)
8. Run cross-document validation checks to detect inconsistencies
9. Update document processing status to "completed"

**Document Versioning**

The system must support document replacement with complete version history:

- Passport renewals (new passport replaces expired one)
- Resume updates (new resume replaces old one)
- Track version chains: v1 → v2 → v3
- Maintain "current version" flag per document type per client (only one current version)
- Preserve all historical versions (never delete old versions)
- Link versions bidirectionally:
  - replaces_document_id: Links to the document this one replaces
  - superseded_by_document_id: Links to the document that replaced this one
- When new version uploaded, automatically mark old version as superseded

**Cross-Document Validation**

The system must automatically detect data inconsistencies across multiple documents:

_Field Consistency Checks_

- Same field across multiple documents should match
- Example: Date of birth should be identical on passport, visa, I-94, birth certificate
- Exception: Name fields may differ due to marriage (marriage certificate indicates name change is expected)

_Timeline Validation_

- Documents should follow logical timeline
- Example: If name changed due to marriage, passport with new name should be issued after marriage date
- Example: Passport must be valid (not expired) on I-94 admission date

_Cross-Field Dependencies_

- Related fields should be consistent
- Example: Visa type and I-94 class of admission should match
- Example: I-94 admit date can extend beyond visa expiry (this is valid and expected)

_Validation Result Workflow_

- System detects inconsistency and creates validation result entry
- Assign severity: critical, high, medium, low, info
- Status starts as "pending_review"
- User reviews and can:
  - Accept the inconsistency with written explanation
  - Resolve by updating data
  - Dismiss as not applicable
- System logs all resolution decisions in audit trail

**Auto-Selection Logic**

When multiple documents provide values for the same field:

- First document: Automatically selected as "active" value
- Subsequent documents: Add to the stack but don't auto-replace
- User must manually review and select preferred value when conflicts exist
- User provides written explanation when changing selection
- Selection changes logged to audit trail with reason

#### 5.2 Required Field Definitions and Mappings

**MVP Document Types**

The system must support extraction from these document types at launch:

1. Passport
2. Visa (US visa foil)
3. I-94 Entry Record (CBP arrival/departure)
4. Birth Certificate
5. Marriage Certificate
6. Resume/CV

**Validation Requirements Per Field**

Engineers must configure appropriate validation:

- passport_number: 6-12 alphanumeric characters
- date_of_birth: Valid date format, between 1900 and today
- sex: Must be M, F, or X
- email_address: Valid email format (RFC 5322)
- i94_number: Exactly 11 digits
- visa_type: 1-3 letters optionally followed by dash and 1-2 numbers

**Transformation Rules**

Engineers must normalize extracted data:

- Dates: Convert all formats to YYYY-MM-DD
- Names: Consistent capitalization (title case)
- Passport numbers: Remove whitespace and special characters
- Country codes: Convert to ISO 3166 three-letter codes
- Phone numbers: Normalize to E.164 format

### 6. **Complete Audit Trail**

- Track who created, edited, or deleted forms
- Field-level version history (what changed, when, and by whom)
- System-wide action logging
- Ability to reconstruct any form at any point in time
- Before/after value tracking

#### 6.1 Audit System Requirements

**What Must Be Audited**

The system must maintain a complete, immutable audit trail of all activities:

**Data Mutations**

- Every change to every form field must be tracked, including:
  - The previous value
  - The new value
  - Who made the change
  - When the change occurred
  - How the change was made (HTML form, PDF editor, autofill, API, system, bulk import)
  - A correlation ID to group related changes (e.g., autofilling 50 fields from one document)

**Data Access**

- Every access to sensitive data must be logged, including:
  - Client documents (passports, certificates, etc.)
  - Form instances
  - Client profiles
  - Generated PDFs
  - What type of access occurred (view, download, export, print)
  - Whether access was granted or denied
  - IP address and user agent of accessor

**System Events**

- All significant system activities must be tracked:
  - User authentication (login, logout, failed attempts)
  - User authorization changes (role changes, permission grants)
  - Form lifecycle events (created, submitted, completed)
  - Document processing jobs (Textract processing, completion, failures)
  - Super admin actions (manage extraction mappings, view cross-org data)
  - PDF generation events

**App Navigation**

- All app URLS/navigation events must be tracked
- Including search query params

**Client Data Selections**

- When users select which extracted data value to use (conflict resolution):
  - Track the previous selected value
  - Track the new selected value
  - Record why the change was made (user explanation)
  - Link to the source documents

**Audit Data Requirements**

**Immutability**
The audit system must prevent modification or deletion of audit records. Once logged, audit entries cannot be changed. This ensures legal defensibility.

**Data Provenance**
Every audit entry must include sufficient context to understand the change without relying on potentially-deleted entities:

- Organization ID (even for cross-org super admin actions)
- Client ID (when applicable)
- User ID (preserved even if user is deleted)
- Entity type and ID (preserved even if entity is deleted)

**Correlation**
Related changes must be linkable through correlation IDs. For example:

- Autofilling 50 fields from a document upload
- PDF editing session affecting multiple fields
- Bulk data import operation

**Partitioning and Retention**

- High-frequency audit data (form changes, access logs) should support time-based partitioning
- Old audit data may be moved to archival storage but must never be deleted
- Minimum retention: 7 years for compliance

**Performance Requirements**

**Non-Blocking Logging**

- Audit logging must not slow down user operations
- Writes should be asynchronous where possible
- Failed audit writes should be retried but not block user actions

**Query Performance**

- Common audit queries must complete in under 2 seconds:
  - "Show all changes to this form"
  - "Show all activity by this user today"
  - "Who accessed this document?"
- Point-in-time reconstruction of form state should be possible
- User activity reports should be paginated for large datasets

**Implementation Requirements**

Engineers must implement audit logging using:

- Database triggers for automatic data mutation tracking (cannot be bypassed)
- Middleware for automatic access tracking (applied to all routes)
- Application code for explicit system events
- Session variables to pass context (edit source, correlation ID) to triggers

Engineers must design indexes to support:

- Filtering by organization and time range
- Filtering by user and time range
- Filtering by entity (form, document, client) and time range
- Filtering by event type and success/failure

### 7. **Form Instance Management**

- Users can create multiple versions of the same form for a client
- Form status tracking (draft, in progress, submitted, completed)
- Save progress and return later
- Form duplication capabilities
- **No-Blocking Validation Policy**:
  - Any question can be skipped without errors
  - No flags or feedback for empty fields
  - Empty responses result in blank fields in final PDF output
  - No blocking validation during form completion

### 8. **PDF Review & Direct Editing (Core MVP Feature)**

This is the cornerstone feature that distinguishes the application and provides critical value to legal professionals.

- **Interactive PDF Review**: Display the filled PDF for final review as the last step of every form
- **Direct PDF Editing**: Lawyers can edit fields directly within the PDF preview
  - Click-to-edit functionality within the PDF viewer
  - Real-time field editing without leaving the review interface
  - Visual indicators showing which fields have been edited
- **Bidirectional Synchronization**:
  - Edits made in the PDF automatically update the underlying form data
  - Changes sync back to the HTML form fields
  - Maintains data consistency across both interfaces
- **Audit Trail Integration**:
  - All PDF edits are tracked in the audit system
  - Record which fields were edited via PDF vs HTML form
  - Track who made PDF edits and when
- **Document Prefill Integration**:
  - PDF editor respects and displays autofilled values from extracted client data
  - Maintains link to source documents even after PDF edits
  - Shows data provenance for autofilled fields
- **Reusable Field Connector System**:
  - Bidirectional mapping between PDF field IDs and HTML form fields
  - Generic connector architecture for any PDF form template
  - Supports complex field types and validation rules
- **Technical Requirements**:
  - **PDF Solution Decision**: react-pdf.dev SDK for PDF viewing and editing
    - ⚠️ **PREREQUISITE**: Create test project to validate editing capabilities and scope effort before starting full implementation
    - Must prove: field editing integration, change event capture, bidirectional sync
    - Estimate development effort for custom editing layer on top of react-pdf
  - Build robust connector system for field pairing
  - Ensure real-time sync performance
  - Handle edge cases (conflicting edits, validation errors)

## User Roles & Permissions

### **Super Admin** (Platform-Level)

- **Manage app-wide document extraction mappings** (all organizations use same extraction logic)
- Configure field definitions for document processing
- Configure Textract search patterns and validation rules
- Add new document types to the system
- View data across all organizations
- Monitor extraction quality and system performance
- Cannot modify audit data (read-only on audit tables)

### **Organization Admin**

- Manage users within their organization
- Create and manage clients
- Upload and configure form templates
- **Upload client documents and manage extracted data**
- **View field definitions and extraction mappings** (read-only)
- **Resolve data conflicts and select active field values**
- View all forms and audit logs
- Configure organization settings

### **Editor**

- Create form instances for clients
- Fill out and edit forms
- **Upload client documents**
- **Select active field values from extracted data**
- **View document processing status and extracted data**
- View forms they created or were assigned to
- View relevant audit logs

### **Viewer**

- Read-only access to forms
- **View uploaded client documents**
- **View extracted data and selection history**
- View audit trails
- Generate reports

## UI Development Philosophy

**Rapid Prototyping & Iterative Design**

A general UI layout has been created in Figma, but these designs should be treated as wireframes and directional guidance only.

Build working features quickly without heavy focus on visual polish. Get core functionality working, then return to enhance design and UX

## System Architecture

### **Frontend**

- Modern web application React with Vite
- Desktop only
- Section-based form navigation
- Real-time validation (non-blocking)
- Progress indicators
- **Interactive PDF viewer with editing capabilities**
- **Bidirectional field synchronization** between HTML forms and PDF

### **Backend**

- RESTful API
- Authentication and authorization
- Audit logging middleware

### **Database**

- PostgreSQL (via Supabase)
- Multi-tenant architecture with Row Level Security
- Optimized for version history queries
- Automated audit triggers

### **Storage**

- Cloud storage for PDF templates (Supabase Storage or S3)
- Generated PDF storage for completed forms
- **Client document storage (passports, certificates, etc.)**
- **Separate storage for raw Textract responses (cost optimization)**

### **Document Processing (NEW)**

- **AWS Textract**: Automated OCR and data extraction from documents
- **Job Management**: Track Textract processing status (pending, processing, completed, failed)
- **Data Normalization**: Parse and structure extracted data into standardized fields
- **Confidence Scoring**: Store and display Textract confidence levels
- **Error Handling**: Retry logic and user notifications for failed extractions

### **PDF Generation & Interactive Editing**

- PDF manipulation library to fill form fields
- Map HTML form responses to PDF field IDs
- **Autofill from extracted client data**
- Generate completed PDFs on demand
- **Interactive PDF Editing (Core MVP)**:
  - Real-time PDF field editing in browser
  - Bidirectional field connector system
  - Sync PDF edits back to application form data
  - Track edit source (HTML form vs PDF editor) in audit trail
  - Support for complex field types (text, dates, checkboxes, dropdowns)
  - Field-level locking and validation during PDF editing

## Database Implementation Requirements

### Table Design Principles

**Multi-Tenancy**

- All tables must include organization_id for data isolation
- Users table links to authentication system (Supabase auth.users)
- Soft deletes required on all major entities:
  - Add is_deleted (boolean, default false)
  - Add deleted_at (timestamp, nullable)
  - Add deleted_by (user ID, nullable)
- This preserves audit trail and enables data recovery

**Version Tracking Strategy**

- Use hybrid approach for optimal performance:
  - Current state tables store latest values (fast reads): form_responses
  - History tables store complete change trail (audit compliance): form_response_history
- Never overwrite data in history tables - only append
- Link current state to history via version numbers or timestamps

**Ordering Strategy**

- Use integer order_index for sequencing sections and fields
- Leave gaps between numbers (10, 20, 30, 40...) to allow easy reordering
- Reordering a single item won't require updating all rows

### Required Indexes

Engineers must create indexes to support these common query patterns:

**Form Instance Queries**

- Find all forms for a client, sorted by creation date
- Find all forms for an organization by status
- Find forms by template type

**Form Response Queries**

- Get all responses for a form instance (for form rendering)
- Field lookup by form instance and field ID

**Document Management Queries**

- Find all documents for a client, sorted by upload date
- Find documents by processing status (pending, processing, completed, failed)
- Find documents by type for a client

**Extracted Data Queries ("Stacking")**

- Get all values for a specific field for a client, sorted by extraction date
- Find which value is currently active for a field
- Detect conflicts (multiple different values for same field)

**Audit Queries**

- Find all changes for a form instance by time range
- Find all activity by a user in a time range
- Find all access to a specific document
- Find failed access attempts (security monitoring)

**Active Field Values**

- Get all active values for a client (for autofill)
- Get selection history for a field

### Required Triggers

Engineers must implement database triggers that automatically execute on data changes:

**Form Response Changes**

- Automatically log every INSERT, UPDATE, DELETE on form_responses table
- Capture: previous value, new value, action type, edit source, correlation ID, timestamp, user
- Read session variables for context (edit_source, correlation_id)
- Insert into form_response_history table
- Must use AFTER triggers (non-blocking)

**Client Data Selection Changes**

- Automatically log when users change which extracted value is "active"
- Capture: previous selection, new selection, reason, user, timestamp
- Insert into client_active_field_values_history table

**Document Versioning**

- When a document is uploaded to replace another (passport renewal):
  - Mark old document: set is_current_version = false
  - Set superseded_at timestamp
  - Link old → new via superseded_by_document_id
  - Only one current_version = true per document type per client

**Validation Result Updates**

- When validation status changes from pending_review to accepted/resolved/dismissed:
  - Auto-set reviewed_at timestamp
  - Record who reviewed it (reviewed_by)
  - Auto-set updated_at timestamp

### Required Database Functions

Engineers should create helper functions for common operations:

**Complex Operations**

- Duplicate form instance: Copy all field responses to new instance
- Generate partition tables: Auto-create monthly partitions for time-series data

**Permission Checking**

- is_super_admin(): Check if current user is platform admin
- user_org_id(): Get organization ID for current authenticated user

### Data Normalization Requirements

**Audit Tables Must Be Immutable**

- Do NOT use foreign key constraints on audit tables
- Store IDs as plain values (preserve even if parent deleted)
- Denormalize organization_id and client_id into every audit row
- Enables filtering without joins to potentially-deleted entities
- Store user_id without FK (preserve even if user deleted)

**Extracted Data Stacking**

- Never overwrite extracted values from documents
- Always append new values from new documents
- Link every value to source document via document_id (data provenance)
- Multiple values for same field should coexist (user selects which is "active")

### Partitioning Strategy

High-frequency tables must support time-based partitioning to maintain performance:

**Tables to Partition by Month**

- form_response_history (millions of rows expected over time)
- access_logs (hundreds of thousands of rows per month)

**Partition Maintenance**

- Auto-create partitions for future months (at least 3 months in advance)
- Queries filtering by time will only scan relevant partitions
- Old partitions can be moved to archival storage (never dropped)
- Use monthly boundaries (2025-01-01 to 2025-02-01)

### Autofill Mapping System

Engineers must create a mapping system to enable automatic form population:

**Field Mapping Table**

- Links form fields to extracted data field names
- Stores transformation rules (date format conversions, uppercase, etc.)
- Example: form field "Date of Birth" → extracted field "date_of_birth" → transform "YYYY-MM-DD"

**Mapping Logic**

- When user creates form instance for client:
  - Query active field values for client
  - Match to form fields via mapping table
  - Apply transformations
  - Pre-fill form fields
  - User can override any autofilled value

## Core Workflows

### **1. Template Setup Workflow**

```
1. Admin uploads PDF form template (e.g., USCIS Form I-765, I-485, etc.)
2. System extracts PDF field IDs (or admin enters manually)
3. Admin creates sections/groups (following the paper form's structure)
4. Admin adds fields to sections with:
   - Field labels (user-friendly text)
   - Field types (text, number, date, etc.)
   - Validation rules
   - PDF field ID mapping
   - Autofill mappings (link to extracted data fields like passport_number, date_of_birth)
5. Admin sets ordering for sections and fields
6. Template is activated and available for use
```

### **2. Form Creation & Completion Workflow**

```
1. User selects a client
2. User chooses a form template
3. System creates a new form instance
4. User navigates through sections
5. User fills in fields (auto-saved with no blocking validation)
   - Any field can be left empty without errors
   - System autofills fields from extracted client data when available
6. Multiple users can edit the same form at different times
7. All changes are logged with timestamps and user info
8. User completes all desired sections
9. System generates filled PDF with current form data
10. **MANDATORY PDF REVIEW STEP (Core MVP Feature)**:
    - Display filled PDF in interactive viewer
    - Lawyer reviews the completed PDF
    - Lawyer can edit fields directly within the PDF
    - PDF edits sync bidirectionally with form data
    - All PDF edits tracked in audit trail
    - Visual indicators show which fields were edited in PDF
11. User confirms and submits final form
12. Final PDF is generated and available for download/export
13. Complete audit trail preserved (HTML form edits + PDF edits)
```

### **3. Audit & Review Workflow**

```
1. User/Admin accesses a form instance
2. Views complete history of changes
3. Sees who made each change and when
4. Can filter by user, date range, or field
5. Can compare versions side-by-side
6. Can revert to previous versions if needed
```

### **4. Document Upload & Data Extraction Workflow**

```
1. User uploads client document (passport, visa, resume, birth certificate, marriage certificate, or I-94)
2. Document stored in cloud storage (S3/Supabase)
3. System triggers AWS Textract for automated data extraction
4. Textract processes document and returns structured data
5. System extracts and normalizes field values:
   - First name, last name, date of birth, passport number, visa number, etc.
   - Links each value to source document
   - Stores Textract confidence scores
6. If this is the first document for a field:
   - Automatically set as the "active" value for autofill
7. If client already has data for these fields:
   - Add new values to the "stack" (don't replace existing)
   - Notify user of new data availability
8. User reviews stacked data in UI:
   - See all values for each field side-by-side
   - View document source, upload date, confidence
   - Identify conflicts (different values for same field)
9. User selects preferred value:
   - Click to set as "active" value
   - Add notes explaining why (e.g., "Updated after marriage")
   - System logs the selection change to audit trail
10. When creating forms:
    - System automatically fills fields with active values
    - User can override autofilled values if needed
    - Maintains link to source document for reference
```

### **5. Data Conflict Resolution Example**

```
SCENARIO: Client uploads birth certificate (2024-01-15), then marriage certificate (2024-06-20)

Initial State (Birth Certificate):
├─ first_name: "John" ✓ ACTIVE
└─ last_name: "Smith" ✓ ACTIVE

After Marriage Certificate Upload:
├─ first_name: "John" (2 sources, same value) ✓ ACTIVE
└─ last_name: ⚠️ CONFLICT DETECTED
    ├─ "Smith" (birth_certificate, 2024-01-15) ✓ CURRENTLY ACTIVE
    └─ "Daniels" (marriage_certificate, 2024-06-20)

User Reviews Conflict:
1. System highlights "last_name" has conflicting values
2. User views side-by-side comparison:
   - Left: "Smith" from birth certificate
   - Right: "Daniels" from marriage certificate
3. User selects "Daniels" as active value
4. Adds note: "Updated to reflect married name"
5. System logs change to audit history

Result:
├─ first_name: "John" ✓ ACTIVE
└─ last_name: "Daniels" ✓ ACTIVE (with complete history preserved)

All future forms automatically use "Daniels" for last_name field
```

## Technical Stack Recommendations

### **Frontend**

- **Framework**: React Vite with TypeScript
- **State Management**: React Query
- **UI Components**: Custom Components with Tailwind CSS
- **Form Management**: React Hook Form
- **PDF Viewing & Editing**:
  - **Selected Solution**: react-pdf.dev SDK
    - React-native components for PDF rendering
    - Built on top of PDF.js with React integration
    - Requires custom development for editing functionality
    - ⚠️ **ACTION REQUIRED**: Build prototype test project before implementation to:
      - Validate field editing capabilities (react-pdf is primarily a viewer)
      - Test change event capture and form field interaction
      - Verify bidirectional sync is achievable
      - Estimate development effort (2-4 weeks expected)
    - **Official Documentation**: [https://react-pdf.org/](https://react-pdf.org/)
    - **Reference**: [Understanding PDF.js Layers and How to Use Them in React.js](https://javascript.plainenglish.io/understanding-pdf-js-layers-and-how-to-use-them-in-react-js-6e761d796c2f) (PDF.js concepts still apply)
  - **Requirements**: Must support direct field editing, bidirectional sync, field-level events
  - **Considerations**: React integration, TypeScript support, form field editing capabilities
- **Auth**: Custom auth built on top of custom backend

### **Backend**

- **Framework**: Hono API - Rest.
- **Storage**: Supabase
- **PDF Processing**: pdf-lib or PDFtk
- **PDF Field Manipulation**:
  - pdf-lib for reading/writing PDF form fields
  - Support for extracting field metadata (IDs, types, positions)
  - **Field Connector System**: Bidirectional mapping architecture
    - Map PDF field IDs to application form field IDs
    - Track field relationships and dependencies
    - Handle field type conversions and validation
    - Support for dynamic field mapping per template
- **Document Processing**: AWS Textract SDK
- **Job Queues**: For async Textract processing (optional: AWS SQS, BullMQ, or Supabase Edge Functions)

### **Database**

- **Primary**: PostgreSQL (Supabase)
- **Features Used**: RLS, Triggers, JSONB, Full-text search
- **Document Data Tables**: client_documents, client_extracted_data, textract_responses
- **Audit Tables**: client_active_field_values_history for selection tracking

### **Infrastructure**

- **Hosting**: Vercel (Frontend) + Render (Backend)
- **File Storage**: Supabase Storage or AWS S3
- **CDN**: Cloudflare or similar
- **AWS Services**:
  - **Textract**: Document analysis and data extraction
  - **S3** (optional): Document storage if not using Supabase Storage
  - **Lambda** (optional): Async Textract job processing

## Data Security & Compliance

### **Multi-Tenancy Isolation**

- Organization-level data segregation
- Row Level Security (RLS) policies
- No cross-organization data access

### **Authentication & Authorization**

- Secure user authentication (Supabase Auth)
- JWT-based session management
- Role-based access control (RBAC)
- API rate limiting

### **Audit Compliance**

- Complete audit trail for compliance requirements
- GDPR-ready (data export/deletion capabilities)
- Immutable history records
- IP address and user agent logging

### **Data Protection**

- Encrypted data at rest and in transit
- Soft deletes for data recovery
- Access logs for sensitive operations
- **Document Security**:
  - Encrypted storage for all client documents (passports, certificates, etc.)
  - Secure signed URLs with expiration for document access
  - Complete audit trail of who accessed which documents
  - Soft delete for documents (retain for compliance/recovery)
- **PII Protection**:
  - Extracted personal data (names, DOB, passport numbers) encrypted at rest
  - Access controls prevent cross-organization data access
  - Data retention policies for extracted information
  - GDPR-compliant data export and deletion capabilities

### **Multi-Tenancy and Access Control Requirements**

**Organization-Level Isolation**

The system must enforce strict data isolation between organizations:

- Users can ONLY access data belonging to their organization
- No cross-organization data leakage through any API or query
- Database-level enforcement required (not just application-level)
- Row-level security policies must be implemented on all multi-tenant tables

**Super Admin Platform Access**

Super admins are platform-level administrators who exist outside the normal organization structure. They must have:

_Read Access Across All Organizations_

- View all organizations, users, clients, forms, documents
- View complete audit trails across all organizations
- Monitor system health and data quality

_Write Access to Platform Configuration_

- Manage document extraction field mappings (app-wide, affects all organizations)
- Configure field definitions for document processing
- Add new document types to the system
- Configure Textract search patterns and validation rules

_Restrictions_

- Cannot modify audit data (audit trail remains immutable even for super admins)
- Cannot be granted super admin status via API (must be done via direct database access for security)
- All actions must be logged to audit trail with super admin flag

**Implementation Requirements**

Engineers must implement access control using:

- Row-level security (RLS) policies at the database level
- Organization ID filtering on all multi-tenant tables
- Super admin bypass logic for platform-level access (super admins can view data across all orgs)
- Helper functions to check user permissions (is_super_admin, user_org_id)
- Middleware to enforce access control on all API routes

All data tables must include organization_id for filtering, even if the entity is logically org-scoped through relationships (e.g., through client → organization).

Audit tables must be read-only via RLS policies. Writes happen only through secured database triggers or functions with elevated privileges.

## Scalability Considerations

### **Database Optimization**

- Strategic indexing for common queries
- Query optimization for version history
- **Indexed queries for stacked data views** (client_id + field_name + extracted_at)
- **Separate table for raw Textract responses** (keeps main tables lean)

### **Performance**

- Lazy loading for form sections
- Debounced auto-save
- Optimistic UI updates
- Caching strategies for templates
- **Async document processing** (Textract jobs run in background)
- **Progress indicators** for document upload and processing status
- **Pagination for document lists** (clients may have many documents over time)

### **Cost Optimization**

- **Textract Response Caching**: Store raw responses to avoid re-processing
- **Smart Re-extraction**: Only re-process when document changes
- **Batch Processing**: Group multiple documents for efficiency
- **Confidence Thresholds**: Only store high-confidence extractions to reduce noise

### **Monitoring & Observability**

- **Document Processing Metrics**: Track success/failure rates, processing times
- **Third-Party Service Cost Tracking**: Track costs for all external service providers per organization and client
  - **Supported Providers**: AWS Textract, OpenAI, Anthropic, Twilio, SendGrid, Stripe, and others
  - **Service Categories**: Document processing, AI inference, communication, payment, storage
  - Record per-operation costs (operation type, quantity, unit of measure, estimated cost)
  - Enable organization-level cost reporting and budgeting across all services
  - Support client-level cost breakdowns for billing analysis
  - Track service region and pricing tier for accurate cost calculation
  - Optional reconciliation with actual provider billing data
  - Flexible metadata storage for provider-specific details (model name, token count, page count, etc.)
  - Billing period tracking for monthly/quarterly cost aggregation
- **Error Alerting**: Notify admins of failed document processing
- **Extraction Quality Metrics**: Track confidence scores and manual override rates
