CREATE TYPE "public"."service_category" AS ENUM('document_processing', 'ai_inference', 'communication', 'payment', 'storage', 'other');--> statement-breakpoint
CREATE TYPE "public"."service_provider" AS ENUM('aws_textract', 'openai', 'anthropic', 'twilio', 'sendgrid', 'stripe', 'other');--> statement-breakpoint
CREATE TABLE "third_party_service_costs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid,
	"service_provider" "service_provider" NOT NULL,
	"service_category" "service_category" NOT NULL,
	"operation_type" text NOT NULL,
	"operation_details" jsonb,
	"resource_id" uuid,
	"resource_type" text,
	"quantity" integer,
	"unit_of_measure" text,
	"estimated_cost_usd" numeric(10, 4) NOT NULL,
	"actual_cost_usd" numeric(10, 4),
	"reconciled_at" timestamp with time zone,
	"billing_period" text,
	"service_region" text,
	"pricing_tier" text,
	"metadata" jsonb,
	"processed_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "third_party_service_costs" ADD CONSTRAINT "third_party_service_costs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "third_party_service_costs" ADD CONSTRAINT "third_party_service_costs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;