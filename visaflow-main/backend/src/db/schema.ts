import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  integer,
  decimal,
  jsonb,
  boolean,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Enums
export const userRoleEnum = pgEnum("user_role", ["super_admin", "org_admin"]);

export const documentTypeEnum = pgEnum("document_type", [
  "passport",
  "visa",
  "resume",
  "birth_certificate",
  "marriage_certificate",
  "i94",
]);

export const extractionStatusEnum = pgEnum("extraction_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

export const valueSourceEnum = pgEnum("value_source", [
  "document_extraction",
  "user_edit",
]);

export const valueTypeEnum = pgEnum("value_type", [
  "text",
  "date",
  "number",
  "boolean",
  "country",
]);

export const serviceProviderEnum = pgEnum("service_provider", [
  "aws_textract",
  "openai",
  "anthropic",
  "twilio",
  "sendgrid",
  "stripe",
  "other",
]);

export const serviceCategoryEnum = pgEnum("service_category", [
  "document_processing",
  "ai_inference",
  "communication",
  "payment",
  "storage",
  "other",
]);

// Form-related enums
export const formInstanceStatusEnum = pgEnum("form_instance_status", [
  "draft",
  "in_progress",
  "completed",
]);

export const pdfGenerationTypeEnum = pgEnum("pdf_generation_type", [
  "draft",
  "review",
  "final",
]);

export const formFieldTypeEnum = pgEnum("form_field_type", [
  "text",
  "textarea",
  "number",
  "date",
  "select",
  "checkbox",
  "radio",
  "email",
  "phone",
  "file",
]);

// Organizations
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  disabledAt: timestamp("disabled_at", { withTimezone: true }),
});

// Users
export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // References Supabase auth.users
  organizationId: uuid("organization_id").references(() => organizations.id),
  email: text("email").notNull().unique(),
  role: userRoleEnum("role").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  disabledAt: timestamp("disabled_at", { withTimezone: true }),
  createdBy: uuid("created_by"),
  updatedBy: uuid("updated_by"),
});

// Clients - Identity container only, all personal data in clientFieldValues
export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),

    // Timestamps & audit
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
  },
  (table) => [index("idx_clients_org").on(table.organizationId)]
);

// Notes (generic - can be attached to multiple entity types)
export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),

    // Entity references (only one should be non-null per row)
    clientId: uuid("client_id").references(() => clients.id),
    documentId: uuid("document_id").references(() => documents.id),

    text: text("text").notNull(),

    // Timestamps & audit
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdBy: uuid("created_by").references(() => users.id),
  },
  (table) => [
    index("idx_notes_org").on(table.organizationId),
    index("idx_notes_client").on(table.clientId),
    index("idx_notes_document").on(table.documentId),
  ]
);

// Documents
export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    clientId: uuid("client_id").references(() => clients.id), // Nullable - documents can exist without a client initially

    // Document info only
    documentType: documentTypeEnum("document_type").notNull(),
    filePath: text("file_path").notNull(),
    originalFilename: text("original_filename").notNull(),
    mimeType: text("mime_type"),
    fileSize: integer("file_size"),

    // Processed file for Textract (if original needed compression/conversion)
    processedFilePath: text("processed_file_path"),

    // Timestamps & audit
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_documents_org").on(table.organizationId),
    index("idx_documents_client").on(table.clientId),
  ]
);

// Document Extractions (1:1 with documents)
export const documentExtractions = pgTable(
  "document_extractions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id)
      .unique(),

    // Processing status
    status: extractionStatusEnum("status").default("pending").notNull(),
    errorMessage: text("error_message"),

    // Textract data
    textractJobId: text("textract_job_id"),
    queueBearMessageId: text("queue_bear_message_id"),
    rawTextractResponse: jsonb("raw_textract_response"),

    // Timestamps
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("idx_document_extractions_org").on(table.organizationId)]
);

// Client Field Values (The Unified Stack)
export const clientFieldValues = pgTable(
  "client_field_values",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id),

    // Source tracking
    source: valueSourceEnum("source").notNull(),
    documentId: uuid("document_id").references(() => documents.id), // nullable - only for extractions

    // Field identification
    canonicalField: text("canonical_field").notNull(),
    rawFieldName: text("raw_field_name"), // Original field name from Textract (extractions only)

    // Value storage
    rawValue: text("raw_value").notNull(),
    valueType: valueTypeEnum("value_type").default("text").notNull(),
    normalizedValue: jsonb("normalized_value"),

    // Active value indicator - only one value per (clientId, canonicalField) should be active
    isActive: boolean("is_active").default(false).notNull(),

    // Extraction metadata (nullable - only for document_extraction source)
    confidenceScore: decimal("confidence_score", { precision: 5, scale: 4 }),
    boundingBox: jsonb("bounding_box"),

    // Audit
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // Partial index for efficient "get all active values" queries
    index("idx_client_field_values_active")
      .on(table.clientId)
      .where(sql`is_active = true`),
    // Composite index for efficient field lookups per client
    index("idx_client_field_values_client_field").on(
      table.clientId,
      table.canonicalField
    ),
  ]
);

// Third Party Service Costs (tracks costs for external API/service usage)
export const thirdPartyServiceCosts = pgTable(
  "third_party_service_costs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    clientId: uuid("client_id").references(() => clients.id),
    serviceProvider: serviceProviderEnum("service_provider").notNull(),
    serviceCategory: serviceCategoryEnum("service_category").notNull(),
    operationType: text("operation_type").notNull(),
    operationDetails: jsonb("operation_details"),
    resourceId: uuid("resource_id"),
    resourceType: text("resource_type"),
    quantity: integer("quantity"),
    unitOfMeasure: text("unit_of_measure"),
    estimatedCostUsd: decimal("estimated_cost_usd", {
      precision: 10,
      scale: 4,
    }).notNull(),
    actualCostUsd: decimal("actual_cost_usd", { precision: 10, scale: 4 }),
    reconciledAt: timestamp("reconciled_at", { withTimezone: true }),
    billingPeriod: text("billing_period"),
    serviceRegion: text("service_region"),
    pricingTier: text("pricing_tier"),
    metadata: jsonb("metadata"),
    processedAt: timestamp("processed_at", { withTimezone: true }).defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("idx_third_party_costs_org").on(table.organizationId)]
);

// Form Templates - PDF form blueprint definitions
export const formTemplates = pgTable(
  "form_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").references(() => organizations.id), // nullable = global template
    formNumber: text("form_number").notNull(), // e.g., "I-765"
    title: text("title").notNull(), // e.g., "Application for Employment Authorization"
    revision: text("revision"), // e.g., "01/20/25"
    pdfTemplateUrl: text("pdf_template_url"), // Path to blank PDF template

    // Timestamps & audit
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
  },
  (table) => [
    index("idx_form_templates_org").on(table.organizationId),
    index("idx_form_templates_form_number").on(table.formNumber),
    unique("uq_form_templates_org_form_rev").on(
      table.organizationId,
      table.formNumber,
      table.revision
    ),
  ]
);

// Form Sections - Logical sections/steps within a form template
export const formSections = pgTable(
  "form_sections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    formTemplateId: uuid("form_template_id")
      .notNull()
      .references(() => formTemplates.id, { onDelete: "cascade" }),
    sectionKey: text("section_key").notNull(), // e.g., "part1", "applicantInfo"
    title: text("title").notNull(),
    description: text("description"),
    helpText: text("help_text"), // Help text displayed below step header
    isRequired: boolean("is_required").default(false).notNull(), // Must complete before navigating past
    buttonConfig: jsonb("button_config"), // {nextButton, prevButton} configuration
    orderIndex: integer("order_index").notNull(),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_form_sections_template").on(table.formTemplateId),
    unique("uq_form_sections_template_key").on(
      table.formTemplateId,
      table.sectionKey
    ),
  ]
);

// Form Fields - Individual input fields within sections
export const formFields = pgTable(
  "form_fields",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    formSectionId: uuid("form_section_id")
      .notNull()
      .references(() => formSections.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // camelCase field identifier
    label: text("label").notNull(),
    fieldType: formFieldTypeEnum("field_type").notNull(),
    pdfMappings: jsonb("pdf_mappings"), // Maps field values to PDF internal field names (JSONB for value-specific mappings)
    placeholder: text("placeholder"),
    helpText: text("help_text"),
    options: jsonb("options"), // For select/radio/checkbox (array of {label, value})
    validationRules: jsonb("validation_rules"), // For future validation
    defaultValue: text("default_value"),
    width: text("width"), // Layout: "1-1", "1-2", "1-3", "1-4"
    isRequired: boolean("is_required").default(false).notNull(), // Metadata only, no blocking
    disabled: boolean("disabled").default(false).notNull(), // Disables the input
    hideLabel: boolean("hide_label").default(false).notNull(), // Visually hides label
    className: text("class_name"), // Custom CSS class
    fieldConfig: jsonb("field_config"), // Type-specific config: rows, direction, accept, maxSizeMb, etc.
    orderIndex: integer("order_index").notNull(),
    showWhen: jsonb("show_when"), // Conditional display rules

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_form_fields_section").on(table.formSectionId),
  ]
);

// Form Field Autofill Mappings - Links form fields to client extracted data
export const formFieldAutofillMappings = pgTable(
  "form_field_autofill_mappings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    formFieldId: uuid("form_field_id")
      .notNull()
      .references(() => formFields.id, { onDelete: "cascade" })
      .unique(), // One mapping per field
    canonicalField: text("canonical_field").notNull(), // e.g., "first_name", "passport_number"
    transformationRule: text("transformation_rule"), // Optional transformation
    fallbackValue: text("fallback_value"), // Default if no extraction

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  }
);

// Form Instances - User-created form submissions for a client
export const formInstances = pgTable(
  "form_instances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id),
    formTemplateId: uuid("form_template_id")
      .notNull()
      .references(() => formTemplates.id),
    instanceNumber: integer("instance_number").notNull(), // Per client/template counter
    status: formInstanceStatusEnum("status").default("draft").notNull(),

    // Progress tracking
    currentStepIndex: integer("current_step_index").default(0),
    completedStepIds: jsonb("completed_step_ids").$type<string[]>().default([]),

    // Timestamps & audit
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    deletedBy: uuid("deleted_by").references(() => users.id),

    // Submission tracking
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    submittedBy: uuid("submitted_by").references(() => users.id),
  },
  (table) => [
    index("idx_form_instances_client").on(table.clientId),
    index("idx_form_instances_org").on(table.organizationId),
    index("idx_form_instances_template").on(table.formTemplateId),
    unique("uq_form_instances_client_template_num").on(
      table.clientId,
      table.formTemplateId,
      table.instanceNumber
    ),
  ]
);

// Form Responses - Current state of form field values (one per instance/field)
export const formResponses = pgTable(
  "form_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    formInstanceId: uuid("form_instance_id")
      .notNull()
      .references(() => formInstances.id, { onDelete: "cascade" }),
    formFieldId: uuid("form_field_id")
      .notNull()
      .references(() => formFields.id),
    value: text("value"), // Nullable - empty fields allowed per spec
    version: integer("version").default(1).notNull(), // Optimistic locking

    // Audit
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedBy: uuid("updated_by")
      .notNull()
      .references(() => users.id),
  },
  (table) => [
    index("idx_form_responses_instance").on(table.formInstanceId),
    unique("uq_form_responses_instance_field").on(
      table.formInstanceId,
      table.formFieldId
    ),
  ]
);

// Form Generated PDFs - Tracks PDF generation lifecycle
export const formGeneratedPdfs = pgTable(
  "form_generated_pdfs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id),
    formInstanceId: uuid("form_instance_id")
      .notNull()
      .references(() => formInstances.id, { onDelete: "cascade" }),

    // File info
    filePath: text("file_path").notNull(),
    fileName: text("file_name").notNull(),
    fileSizeBytes: integer("file_size_bytes"),
    pageCount: integer("page_count"),

    // Generation metadata
    generationType: pdfGenerationTypeEnum("generation_type").notNull(),
    isFinal: boolean("is_final").default(false).notNull(),
    formDataSnapshot: jsonb("form_data_snapshot"), // Snapshot of form data at generation

    // Audit
    generatedBy: uuid("generated_by")
      .notNull()
      .references(() => users.id),
    generatedAt: timestamp("generated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    correlationId: uuid("correlation_id"), // For tracking related operations
  },
  (table) => [
    index("idx_form_generated_pdfs_instance").on(table.formInstanceId),
    index("idx_form_generated_pdfs_client").on(table.clientId),
  ]
);

// Type exports
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type DocumentExtraction = typeof documentExtractions.$inferSelect;
export type NewDocumentExtraction = typeof documentExtractions.$inferInsert;
export type ClientFieldValue = typeof clientFieldValues.$inferSelect;
export type NewClientFieldValue = typeof clientFieldValues.$inferInsert;
export type ThirdPartyServiceCost = typeof thirdPartyServiceCosts.$inferSelect;
export type NewThirdPartyServiceCost = typeof thirdPartyServiceCosts.$inferInsert;

// Form-related table types
export type FormTemplate = typeof formTemplates.$inferSelect;
export type NewFormTemplate = typeof formTemplates.$inferInsert;
export type FormSection = typeof formSections.$inferSelect;
export type NewFormSection = typeof formSections.$inferInsert;
export type FormField = typeof formFields.$inferSelect;
export type NewFormField = typeof formFields.$inferInsert;
export type FormFieldAutofillMapping = typeof formFieldAutofillMappings.$inferSelect;
export type NewFormFieldAutofillMapping = typeof formFieldAutofillMappings.$inferInsert;
export type FormInstance = typeof formInstances.$inferSelect;
export type NewFormInstance = typeof formInstances.$inferInsert;
export type FormResponse = typeof formResponses.$inferSelect;
export type NewFormResponse = typeof formResponses.$inferInsert;
export type FormGeneratedPdf = typeof formGeneratedPdfs.$inferSelect;
export type NewFormGeneratedPdf = typeof formGeneratedPdfs.$inferInsert;

// Enum value types
export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type DocumentType = (typeof documentTypeEnum.enumValues)[number];
export type ExtractionStatus = (typeof extractionStatusEnum.enumValues)[number];
export type ValueSource = (typeof valueSourceEnum.enumValues)[number];
export type ValueType = (typeof valueTypeEnum.enumValues)[number];
export type ServiceProvider = (typeof serviceProviderEnum.enumValues)[number];
export type ServiceCategory = (typeof serviceCategoryEnum.enumValues)[number];

// Form-related enum types
export type FormInstanceStatus = (typeof formInstanceStatusEnum.enumValues)[number];
export type PdfGenerationType = (typeof pdfGenerationTypeEnum.enumValues)[number];
export type FormFieldType = (typeof formFieldTypeEnum.enumValues)[number];
