-- Convert existing text values to jsonb (wrapping strings in quotes for valid JSON)
ALTER TABLE "form_fields" ALTER COLUMN "pdf_field_id" SET DATA TYPE jsonb USING
  CASE
    WHEN "pdf_field_id" IS NULL THEN NULL
    ELSE to_jsonb("pdf_field_id"::text)
  END;