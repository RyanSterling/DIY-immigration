CREATE TYPE "public"."form_field_type" AS ENUM('text', 'textarea', 'number', 'date', 'select', 'checkbox', 'radio', 'email', 'phone', 'file');--> statement-breakpoint
CREATE TYPE "public"."form_instance_status" AS ENUM('draft', 'in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."pdf_generation_type" AS ENUM('draft', 'review', 'final');--> statement-breakpoint
CREATE TABLE "form_field_autofill_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_field_id" uuid NOT NULL,
	"canonical_field" text NOT NULL,
	"transformation_rule" text,
	"fallback_value" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "form_field_autofill_mappings_form_field_id_unique" UNIQUE("form_field_id")
);
--> statement-breakpoint
CREATE TABLE "form_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_section_id" uuid NOT NULL,
	"name" text NOT NULL,
	"label" text NOT NULL,
	"field_type" "form_field_type" NOT NULL,
	"pdf_field_id" text,
	"placeholder" text,
	"help_text" text,
	"options" jsonb,
	"validation_rules" jsonb,
	"default_value" text,
	"width" text,
	"is_required" boolean DEFAULT false NOT NULL,
	"order_index" integer NOT NULL,
	"show_when" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_generated_pdfs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"form_instance_id" uuid NOT NULL,
	"file_path" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size_bytes" integer,
	"page_count" integer,
	"generation_type" "pdf_generation_type" NOT NULL,
	"is_final" boolean DEFAULT false NOT NULL,
	"form_data_snapshot" jsonb,
	"generated_by" uuid NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"correlation_id" uuid
);
--> statement-breakpoint
CREATE TABLE "form_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"form_template_id" uuid NOT NULL,
	"instance_number" integer NOT NULL,
	"status" "form_instance_status" DEFAULT 'draft' NOT NULL,
	"current_step_index" integer DEFAULT 0,
	"completed_step_ids" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"deleted_by" uuid,
	"submitted_at" timestamp with time zone,
	"submitted_by" uuid,
	CONSTRAINT "uq_form_instances_client_template_num" UNIQUE("client_id","form_template_id","instance_number")
);
--> statement-breakpoint
CREATE TABLE "form_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_instance_id" uuid NOT NULL,
	"form_field_id" uuid NOT NULL,
	"value" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	CONSTRAINT "uq_form_responses_instance_field" UNIQUE("form_instance_id","form_field_id")
);
--> statement-breakpoint
CREATE TABLE "form_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_template_id" uuid NOT NULL,
	"section_key" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"order_index" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_form_sections_template_key" UNIQUE("form_template_id","section_key")
);
--> statement-breakpoint
CREATE TABLE "form_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"form_number" text NOT NULL,
	"title" text NOT NULL,
	"revision" text,
	"pdf_template_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "uq_form_templates_org_form_rev" UNIQUE("organization_id","form_number","revision")
);
--> statement-breakpoint
ALTER TABLE "form_field_autofill_mappings" ADD CONSTRAINT "form_field_autofill_mappings_form_field_id_form_fields_id_fk" FOREIGN KEY ("form_field_id") REFERENCES "public"."form_fields"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_form_section_id_form_sections_id_fk" FOREIGN KEY ("form_section_id") REFERENCES "public"."form_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_generated_pdfs" ADD CONSTRAINT "form_generated_pdfs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_generated_pdfs" ADD CONSTRAINT "form_generated_pdfs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_generated_pdfs" ADD CONSTRAINT "form_generated_pdfs_form_instance_id_form_instances_id_fk" FOREIGN KEY ("form_instance_id") REFERENCES "public"."form_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_generated_pdfs" ADD CONSTRAINT "form_generated_pdfs_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_instances" ADD CONSTRAINT "form_instances_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_instances" ADD CONSTRAINT "form_instances_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_instances" ADD CONSTRAINT "form_instances_form_template_id_form_templates_id_fk" FOREIGN KEY ("form_template_id") REFERENCES "public"."form_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_instances" ADD CONSTRAINT "form_instances_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_instances" ADD CONSTRAINT "form_instances_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_instances" ADD CONSTRAINT "form_instances_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_instances" ADD CONSTRAINT "form_instances_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_responses" ADD CONSTRAINT "form_responses_form_instance_id_form_instances_id_fk" FOREIGN KEY ("form_instance_id") REFERENCES "public"."form_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_responses" ADD CONSTRAINT "form_responses_form_field_id_form_fields_id_fk" FOREIGN KEY ("form_field_id") REFERENCES "public"."form_fields"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_responses" ADD CONSTRAINT "form_responses_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_sections" ADD CONSTRAINT "form_sections_form_template_id_form_templates_id_fk" FOREIGN KEY ("form_template_id") REFERENCES "public"."form_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_templates" ADD CONSTRAINT "form_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_templates" ADD CONSTRAINT "form_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_templates" ADD CONSTRAINT "form_templates_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_form_fields_section" ON "form_fields" USING btree ("form_section_id");--> statement-breakpoint
CREATE INDEX "idx_form_generated_pdfs_instance" ON "form_generated_pdfs" USING btree ("form_instance_id");--> statement-breakpoint
CREATE INDEX "idx_form_generated_pdfs_client" ON "form_generated_pdfs" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_form_instances_client" ON "form_instances" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_form_instances_org" ON "form_instances" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_form_instances_template" ON "form_instances" USING btree ("form_template_id");--> statement-breakpoint
CREATE INDEX "idx_form_responses_instance" ON "form_responses" USING btree ("form_instance_id");--> statement-breakpoint
CREATE INDEX "idx_form_sections_template" ON "form_sections" USING btree ("form_template_id");--> statement-breakpoint
CREATE INDEX "idx_form_templates_org" ON "form_templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_form_templates_form_number" ON "form_templates" USING btree ("form_number");--> statement-breakpoint
CREATE INDEX "idx_client_field_values_client_field" ON "client_field_values" USING btree ("client_id","canonical_field");--> statement-breakpoint
CREATE INDEX "idx_clients_org" ON "clients" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_document_extractions_org" ON "document_extractions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_documents_org" ON "documents" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_documents_client" ON "documents" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_notes_org" ON "notes" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_notes_client" ON "notes" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_notes_document" ON "notes" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_third_party_costs_org" ON "third_party_service_costs" USING btree ("organization_id");