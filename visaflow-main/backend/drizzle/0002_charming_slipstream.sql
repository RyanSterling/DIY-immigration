ALTER TABLE "client_field_values" ADD COLUMN "is_active" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_client_field_values_active" ON "client_field_values" USING btree ("client_id") WHERE is_active = true;--> statement-breakpoint
ALTER TABLE "clients" DROP COLUMN "first_name";--> statement-breakpoint
ALTER TABLE "clients" DROP COLUMN "last_name";--> statement-breakpoint
ALTER TABLE "clients" DROP COLUMN "email";--> statement-breakpoint
ALTER TABLE "clients" DROP COLUMN "phone";