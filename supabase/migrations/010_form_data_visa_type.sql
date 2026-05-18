-- =============================================
-- MIGRATION 010: ADD VISA_TYPE TO USER_FORM_DATA
-- =============================================
-- Allows form data to be stored per visa type, not just per form type
-- This enables users to have separate form progress for K-1 vs Marriage, etc.

-- Add visa_type column with default for backward compatibility
ALTER TABLE user_form_data
ADD COLUMN IF NOT EXISTS visa_type TEXT NOT NULL DEFAULT 'k1';

-- Drop old unique constraint
ALTER TABLE user_form_data
DROP CONSTRAINT IF EXISTS user_form_data_user_id_form_type_key;

-- Add new unique constraint including visa_type
ALTER TABLE user_form_data
ADD CONSTRAINT user_form_data_user_visa_form_unique
UNIQUE(user_id, visa_type, form_type);

-- Drop old index
DROP INDEX IF EXISTS idx_user_form_data_user_form;

-- Create new index including visa_type
CREATE INDEX IF NOT EXISTS idx_user_form_data_user_visa_form
  ON user_form_data(user_id, visa_type, form_type);

-- Update comment
COMMENT ON TABLE user_form_data IS 'Stores user form data (PDF form field values) per visa type and form type';
COMMENT ON COLUMN user_form_data.visa_type IS 'The visa type this form data belongs to (e.g., k1, marriage)';
