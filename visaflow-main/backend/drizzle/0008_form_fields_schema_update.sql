-- Migration: Form Fields Schema Update
-- Adds missing properties from TypeScript templates to database schema
-- This migration is IDEMPOTENT - safe to run on any database state

-- =============================================================================
-- FORM_FIELDS TABLE CHANGES
-- =============================================================================

-- Add pdf_mappings column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'form_fields' AND column_name = 'pdf_mappings'
  ) THEN
    ALTER TABLE "form_fields" ADD COLUMN "pdf_mappings" jsonb;
  END IF;
END $$;

-- Add disabled column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'form_fields' AND column_name = 'disabled'
  ) THEN
    ALTER TABLE "form_fields" ADD COLUMN "disabled" boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Add hide_label column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'form_fields' AND column_name = 'hide_label'
  ) THEN
    ALTER TABLE "form_fields" ADD COLUMN "hide_label" boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Add class_name column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'form_fields' AND column_name = 'class_name'
  ) THEN
    ALTER TABLE "form_fields" ADD COLUMN "class_name" text;
  END IF;
END $$;

-- Add field_config column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'form_fields' AND column_name = 'field_config'
  ) THEN
    ALTER TABLE "form_fields" ADD COLUMN "field_config" jsonb;
  END IF;
END $$;

-- Migrate existing pdf_field_id data to pdf_mappings JSONB format (if pdf_field_id exists)
-- This converts text like "form1[0].Page1[0].Line1[0]" to {"default": "form1[0].Page1[0].Line1[0]"}
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'form_fields' AND column_name = 'pdf_field_id'
  ) THEN
    UPDATE "form_fields"
    SET "pdf_mappings" = jsonb_build_object('default', "pdf_field_id")
    WHERE "pdf_field_id" IS NOT NULL AND "pdf_mappings" IS NULL;
  END IF;
END $$;

-- Drop the old pdf_field_id column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'form_fields' AND column_name = 'pdf_field_id'
  ) THEN
    ALTER TABLE "form_fields" DROP COLUMN "pdf_field_id";
  END IF;
END $$;

-- =============================================================================
-- FORM_SECTIONS TABLE CHANGES
-- =============================================================================

-- Add help_text column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'form_sections' AND column_name = 'help_text'
  ) THEN
    ALTER TABLE "form_sections" ADD COLUMN "help_text" text;
  END IF;
END $$;

-- Add is_required column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'form_sections' AND column_name = 'is_required'
  ) THEN
    ALTER TABLE "form_sections" ADD COLUMN "is_required" boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Add button_config column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'form_sections' AND column_name = 'button_config'
  ) THEN
    ALTER TABLE "form_sections" ADD COLUMN "button_config" jsonb;
  END IF;
END $$;
