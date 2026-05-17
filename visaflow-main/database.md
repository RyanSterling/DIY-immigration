# VisaFlow Database Schema

**Document Type**: Database Schema Definitions
**Purpose**: Define data structure for the application
**Related**: [claude.md](./claude.md) - Complete functional specification

> **Note**: This file contains ONLY CREATE TABLE statements. For implementation requirements (triggers, indexes, RLS policies, query patterns), see [claude.md - Database Implementation Requirements](./claude.md#database-implementation-requirements).

---

## Core Organizational Tables

```sql
-- Organizations (top-level tenant isolation)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  settings JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE organizations IS 'Top-level organizational entities for multi-tenancy';

-- Users (linked to Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY, -- matches auth.users.id
  organization_id UUID NOT NULL REFERENCES organizations(id),
  email TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
  is_super_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE users IS 'Application users linked to authentication system';
COMMENT ON COLUMN users.is_super_admin IS 'Platform-level admin with cross-org access. Can only be modified via direct database access, not through API.';

-- Clients (belong to organizations)
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  contact_info JSONB,
  is_active BOOLEAN DEFAULT true,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE clients IS 'Client records belonging to organizations';
```

---

## Document Management & Data Extraction Tables

```sql
-- Client Documents (uploaded files for each client)
CREATE TABLE client_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  document_type TEXT NOT NULL CHECK (document_type IN (
    'passport', 'visa', 'resume', 'birth_certificate', 'marriage_certificate', 'i94_entry_record'
  )),
  document_url TEXT NOT NULL,
  original_filename TEXT,
  file_size_bytes INTEGER,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  textract_job_id TEXT,
  processing_status TEXT CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  processing_error TEXT,
  processing_completed_at TIMESTAMPTZ,
  metadata JSONB,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  -- Document Versioning
  replaces_document_id UUID REFERENCES client_documents(id),
  document_version INTEGER DEFAULT 1,
  is_current_version BOOLEAN DEFAULT true,
  version_notes TEXT,
  superseded_at TIMESTAMPTZ,
  superseded_by_document_id UUID REFERENCES client_documents(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_version_chain CHECK (
    (replaces_document_id IS NULL AND document_version = 1) OR
    (replaces_document_id IS NOT NULL AND document_version > 1)
  )
);
COMMENT ON TABLE client_documents IS 'Client documents with Textract processing status and versioning support';

-- Raw Textract Responses (complete AWS Textract output)
CREATE TABLE textract_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES client_documents(id) UNIQUE,
  raw_response JSONB NOT NULL,
  response_size_bytes INTEGER,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  textract_job_arn TEXT
);
COMMENT ON TABLE textract_responses IS 'Raw Textract API responses for cost optimization and re-processing';

-- Third-Party Service Costs (tracks costs for external API/service usage)
CREATE TABLE third_party_service_costs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  client_id UUID REFERENCES clients(id),
  service_provider TEXT NOT NULL CHECK (service_provider IN (
    'aws_textract', 'openai', 'anthropic', 'twilio', 'sendgrid', 'stripe', 'other'
  )),
  service_category TEXT NOT NULL CHECK (service_category IN (
    'document_processing', 'ai_inference', 'communication', 'payment', 'storage', 'other'
  )),
  operation_type TEXT NOT NULL,
  operation_details JSONB,
  resource_id UUID,
  resource_type TEXT,
  quantity INTEGER,
  unit_of_measure TEXT,
  estimated_cost_usd DECIMAL(10,4) NOT NULL,
  actual_cost_usd DECIMAL(10,4),
  reconciled_at TIMESTAMPTZ,
  billing_period TEXT,
  service_region TEXT,
  pricing_tier TEXT,
  metadata JSONB,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE third_party_service_costs IS 'Tracks third-party service usage costs (Textract, OpenAI, Twilio, etc.) per organization and optionally per client for billing analysis and cost reporting';
COMMENT ON COLUMN third_party_service_costs.service_provider IS 'The third-party service provider (e.g., aws_textract, openai, anthropic)';
COMMENT ON COLUMN third_party_service_costs.service_category IS 'Broad category of service for reporting/grouping';
COMMENT ON COLUMN third_party_service_costs.operation_type IS 'Specific operation performed (e.g., DetectDocumentText, chat.completions, sms.send)';
COMMENT ON COLUMN third_party_service_costs.operation_details IS 'Provider-specific operation details (e.g., model name, page count, token count)';
COMMENT ON COLUMN third_party_service_costs.resource_id IS 'Optional link to related resource (document_id, form_instance_id, etc.)';
COMMENT ON COLUMN third_party_service_costs.quantity IS 'Number of units consumed (pages, tokens, messages, etc.)';
COMMENT ON COLUMN third_party_service_costs.unit_of_measure IS 'Unit of measurement (pages, tokens, requests, MB, etc.)';
COMMENT ON COLUMN third_party_service_costs.billing_period IS 'Billing period identifier (e.g., 2025-01, 2025-Q1) for cost aggregation';

-- Field Definitions (canonical list of extractable fields - APP-WIDE)
CREATE TABLE field_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  field_name TEXT UNIQUE NOT NULL,
  display_label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'date', 'number', 'boolean', 'email', 'phone', 'address', 'url', 'json')),
  description TEXT,
  applicable_document_types TEXT[] NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE field_definitions IS 'Canonical field definitions used across all organizations';

-- Client Extracted Data (individual field values from documents - THE STACK)
CREATE TABLE client_extracted_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  document_id UUID NOT NULL REFERENCES client_documents(id),
  field_name TEXT NOT NULL,
  field_value TEXT NOT NULL,
  confidence_score DECIMAL(5,2),
  extracted_at TIMESTAMPTZ DEFAULT NOW(),
  bounding_box JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE client_extracted_data IS 'Stacked extracted data values from all documents - never overwrite, always append';

-- Client Active Field Values (user-selected "active" values for autofill)
CREATE TABLE client_active_field_values (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  field_name TEXT NOT NULL,
  selected_extracted_data_id UUID NOT NULL REFERENCES client_extracted_data(id),
  selected_by UUID NOT NULL REFERENCES users(id),
  selected_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  UNIQUE(client_id, field_name)
);
COMMENT ON TABLE client_active_field_values IS 'User-selected active values used for form autofill';

-- Client Active Field Values History (audit trail of selection changes)
CREATE TABLE client_active_field_values_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
  client_id UUID NOT NULL,
  field_name TEXT NOT NULL,
  previous_extracted_data_id UUID,
  new_extracted_data_id UUID NOT NULL,
  reason TEXT,
  correlation_id UUID,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE client_active_field_values_history IS 'Immutable audit trail of field value selection changes';

-- Document Type Field Mappings (database-driven extraction configuration)
-- MANAGED BY SUPER ADMINS ONLY - App-wide mappings (all organizations use same logic)
CREATE TABLE document_type_field_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_type TEXT NOT NULL CHECK (document_type IN (
    'passport', 'visa', 'i94_entry_record', 'birth_certificate', 'marriage_certificate', 'resume'
  )),
  field_name TEXT NOT NULL,
  textract_search_patterns JSONB NOT NULL,
  extraction_method TEXT NOT NULL CHECK (extraction_method IN (
    'key_value', 'table', 'raw_text', 'form_field', 'signature_detection'
  )),
  extraction_config JSONB,
  is_required BOOLEAN DEFAULT false,
  validation_regex TEXT,
  validation_rules JSONB,
  transformation_rules JSONB,
  display_order INTEGER NOT NULL DEFAULT 0,
  display_label TEXT,
  help_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(document_type, field_name),
  CONSTRAINT valid_json_arrays CHECK (jsonb_typeof(textract_search_patterns) = 'array')
);
COMMENT ON TABLE document_type_field_mappings IS 'Super admin-configurable extraction mappings (app-wide, not org-specific)';

-- Client Data Validation Results (cross-document validation)
CREATE TABLE client_data_validation_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  validation_rule_name TEXT NOT NULL,
  validation_rule_type TEXT NOT NULL CHECK (validation_rule_type IN (
    'field_consistency', 'cross_field_dependency', 'timeline_validation', 'format_validation', 'required_field_missing'
  )),
  field_names TEXT[] NOT NULL,
  documents_involved UUID[] NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending_review', 'accepted', 'resolved', 'dismissed', 'auto_passed')),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  detected_inconsistency JSONB NOT NULL,
  user_resolution_notes TEXT,
  resolution_action JSONB,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE client_data_validation_results IS 'Cross-document validation results and user resolutions';
```

---

## Form Template Structure (Static Definition)

```sql
-- Form Templates (the PDF definition/blueprint)
CREATE TABLE form_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  pdf_template_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE form_templates IS 'PDF form template definitions (can be org-specific or global if organization_id is null)';

-- Sections/Groups within templates
CREATE TABLE form_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_template_id UUID NOT NULL REFERENCES form_templates(id),
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE form_sections IS 'Logical sections within form templates (e.g., Personal Information, Employment History)';

-- Individual fields/questions
CREATE TABLE form_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_section_id UUID NOT NULL REFERENCES form_sections(id),
  pdf_field_id TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'select', 'checkbox', 'radio', 'textarea')),
  options JSONB,
  validation_rules JSONB,
  is_required BOOLEAN DEFAULT false,
  order_index INTEGER NOT NULL,
  help_text TEXT,
  default_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE form_fields IS 'Individual fields within form sections, mapped to PDF field IDs';

-- Form Field Autofill Mappings (connects form fields to extracted data)
CREATE TABLE form_field_autofill_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_field_id UUID NOT NULL REFERENCES form_fields(id),
  field_name TEXT NOT NULL,
  transformation_rule JSONB,
  fallback_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(form_field_id)
);
COMMENT ON TABLE form_field_autofill_mappings IS 'Maps form fields to extracted data fields for automatic population';
```

---

## Form Instances & Responses (User Data)

```sql
-- Form Instances (user-created submissions)
CREATE TABLE form_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_template_id UUID NOT NULL REFERENCES form_templates(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  instance_number INTEGER NOT NULL,
  status TEXT CHECK (status IN ('draft', 'in_progress', 'submitted', 'completed')),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated_by UUID REFERENCES users(id),
  submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES users(id)
);
COMMENT ON TABLE form_instances IS 'User-created form submissions for specific clients';

-- Current field responses (latest state)
CREATE TABLE form_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_instance_id UUID NOT NULL REFERENCES form_instances(id),
  form_field_id UUID NOT NULL REFERENCES form_fields(id),
  value TEXT,
  version INTEGER DEFAULT 1,
  updated_by UUID NOT NULL REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(form_instance_id, form_field_id)
);
COMMENT ON TABLE form_responses IS 'Current state of form field responses (latest values)';
```

---

## Audit & Version History Tables

```sql
-- Form Response History (tracks every change to form fields)
-- Partitioned by month for performance
CREATE TABLE form_response_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
  client_id UUID NOT NULL,
  form_instance_id UUID NOT NULL,
  field_id UUID NOT NULL,
  field_name TEXT NOT NULL,
  previous_value TEXT,
  new_value TEXT,
  action_type TEXT NOT NULL CHECK (action_type IN ('insert', 'update', 'delete')),
  edit_source TEXT CHECK (edit_source IN ('html_form', 'pdf_editor', 'autofill', 'api', 'system', 'bulk_import')),
  correlation_id UUID,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
) PARTITION BY RANGE (changed_at);
COMMENT ON TABLE form_response_history IS 'Immutable audit trail of all form field changes';

-- Access Logs (tracks all data access events)
-- Partitioned by month for performance
CREATE TABLE access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
  client_id UUID,
  user_id UUID,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('client_document', 'form_instance', 'client_profile', 'generated_pdf')),
  resource_id UUID NOT NULL,
  access_type TEXT NOT NULL CHECK (access_type IN ('view', 'download', 'export', 'print')),
  success BOOLEAN NOT NULL,
  ip_address INET,
  user_agent TEXT,
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  correlation_id UUID,
  metadata JSONB
) PARTITION BY RANGE (accessed_at);
COMMENT ON TABLE access_logs IS 'Immutable audit trail of data access events';

-- System Events (system-wide events, lifecycle changes, configuration)
CREATE TABLE system_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID,
  user_id UUID,
  event_category TEXT NOT NULL CHECK (event_category IN (
    'authentication', 'authorization', 'lifecycle', 'configuration', 'job', 'workflow', 'super_admin'
  )),
  event_type TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  action TEXT CHECK (action IN ('create', 'update', 'delete', 'submit', 'approve', 'login', 'logout')),
  success BOOLEAN NOT NULL,
  ip_address INET,
  user_agent TEXT,
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  correlation_id UUID,
  before_data JSONB,
  after_data JSONB,
  metadata JSONB
);
COMMENT ON TABLE system_events IS 'Immutable audit trail of system-wide events and lifecycle changes';

-- Form Generated PDFs (tracks PDF generation and lifecycle)
CREATE TABLE form_generated_pdfs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
  client_id UUID NOT NULL,
  form_instance_id UUID NOT NULL,
  pdf_url TEXT NOT NULL,
  generation_type TEXT NOT NULL CHECK (generation_type IN ('draft', 'review', 'final', 'revised')),
  is_final BOOLEAN DEFAULT false,
  page_count INTEGER,
  file_size_bytes BIGINT,
  generated_by UUID NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  correlation_id UUID,
  metadata JSONB
);
COMMENT ON TABLE form_generated_pdfs IS 'Artifact tracking for generated PDFs (not pure audit, but tracks PDF lifecycle)';
```

---

## Notes

**Multi-Tenancy**: All tables use Row Level Security (RLS) policies for organization-level data isolation. Super admins can bypass organization restrictions.

**Soft Deletes**: Major entities (organizations, clients, form_instances, form_templates, client_documents) support soft deletion via is_deleted flag.

**Audit Immutability**: Audit tables (form_response_history, access_logs, system_events, client_active_field_values_history) have no foreign key constraints to preserve data even if parent entities are deleted.

**Partitioning**: High-frequency tables (form_response_history, access_logs) are partitioned by month for performance.

**For Complete Implementation Details**: See [claude.md](./claude.md) for:
- Required indexes
- Trigger specifications
- RLS policy requirements
- Query patterns
- Seed data requirements
- Validation logic
- Business rules
