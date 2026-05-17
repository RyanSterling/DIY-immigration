**Access**

- Organizations will have an account made for them by super admin

- Organizations will only have one account (admin) to start. Multi-user per organization is outside of MVP

**Authentication**

- Basic login flow for organization admins

- Session management via custom backend API

- Password reset handled manually by super admin for MVP

**Navigation Structure**

- Client list view as primary dashboard after login

- Click client to view their profile, documents, and form instances

- Create new forms and upload documents from within client page

**Client Management**

- Organizations can create "clients". These will be set up like users, but will not have actual access (outside of MVP)

- Organizations can manage multiple clients

- Each form instance is attributed to a specific client

- Clients can have multiple instances of the same form

- Client will have contact information and metadata

- As documents are added for a client, information should be updated within a client's profile (metadata)

- Organizations can search for client name in client listing

**Document Upload & Data Extraction**

- **Automated Document Processing**: Upload client documents and extract data using AWS Textract

- **MVP Supported Document Types**:

  - Passport

  - Visa

  - Resume/CV

  - Birth Certificate

  - Marriage Certificate

  - I-94 Entry Record (CBP arrival/departure record)

- **Smart Data Layering**: All extracted values are "stacked" showing complete history

  - View all different values for the same field across multiple documents

  - See which document each value came from

  - Track upload date, uploader, and Textract confidence scores

- **Conflict Resolution**: Handle conflicting data (e.g., name changes after marriage)

  - Side-by-side comparison of different values

  - User selects which value to use with notes explaining why

  - Visual indicators showing currently selected value

- **Form Autofill**: Automatically populate form fields from extracted client data

  - Configurable mappings between extracted fields and form fields

  - Transformation rules for format conversions (e.g., date formats)

  - Override capability - users can change autofilled values

- **Data Provenance**: Every piece of data maintains permanent link to source document

- **Processing Status Tracking**: Monitor document processing states (pending, processing, completed, failed)

- **Error Handling**: Failed documents show error message with option to re-upload. No automatic retry - user deletes and re-uploads if processing fails

**Form Templates**

- Templates are pre-configured by developer for MVP

- No admin UI for template management

- Field mappings, sections, and autofill configurations defined at build time

- Extraction field definitions (what to extract from each document type) configured by developer

**Target PDF Forms (USCIS Immigration Forms)**

The initial implementation will focus on these six USCIS forms:

1. **I-765** - Application for Employment Authorization

2. **I-131** - Application for Travel Document

3. **I-485** - Application to Register Permanent Residence or Adjust Status

4. **G-1450** - Authorization for Credit Card Transactions

5. **I-864** - Affidavit of Support Under Section 213A of the INA

6. **I-140** - Immigrant Petition for Alien Worker

**Form Instance Management**

- Create new form instance for a client by selecting from available templates

- Form statuses: Draft, Completed

- All forms remain editable (no locking after completion)

- View list of all form instances for a client

- Download PDF button available from the PDF review screen

**Section-Based Form Builder**

- Break large PDF forms into manageable sections

- Each section represents a "page" or group in the app form UI

- Custom ordering of sections and fields

- Save and come back to form at a later date

- Progress tracking across sections

- **Content Inclusion Rules**:

  - Remove all intro/general content from forms

  - Each paper form section creates a corresponding section in the app

  - Only include content directly connected to an input field

  - Conditional questions should work

  - Include ALL input fields (except signature blocks)

  - Signature blocks excluded (wet signatures required)

**Form Validation**

There is no form validation in the initial release.

- Any question can be skipped without errors

- No flags or feedback for empty fields

- Empty responses result in blank fields in final output

- No blocking validation during form completion

**PDF Review & Direct Editing**

- **Interactive PDF Review**: Display the filled PDF for final review as the last step of every form

- **Direct PDF Editing**: Can edit fields directly within the PDF preview

  - Click-to-edit functionality within the PDF viewer

- **Bidirectional Synchronization**:

  - Edits made in the PDF automatically update the underlying form data

  - Changes sync back to the HTML form fields

  - Maintains data consistency across both interfaces

- **Document Prefill Integration**:

  - PDF editor respects and displays autofilled values from extracted client data

**Data Management**

- Organization admins can soft delete clients, forms, and documents

- Deleted items are hidden from UI but preserved in database

**Data Isolation**

- Multi-tenant architecture with Row Level Security (RLS) at database level

- All queries scoped to organization automatically via RLS policies

- Per-tenant database should be added after MVP if users need this

**Analytics**

- PostHog & Sentry integration for user behavior tracking and analytics
