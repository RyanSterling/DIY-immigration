-- =============================================
-- MIGRATION 005: Conditional Documents Support
-- =============================================
-- Adds support for conditional documents (Divorce Decree, Death Certificate)
-- that are only required based on user's situation
--
-- PREREQUISITE: Run migrations 001-004 first:
--   001_initial_schema.sql (creates document_requirements table)
--   002_k1_and_users.sql (creates K-1 visa type and documents)
--   003_k1_dashboard.sql (creates progress tracking)
--   004_document_comments.sql (creates comments)

-- Add conditional document fields to document_requirements
-- (only runs if the table exists from migration 001)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'document_requirements') THEN
    -- Add columns if they don't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'document_requirements' AND column_name = 'is_conditional') THEN
      ALTER TABLE document_requirements ADD COLUMN is_conditional BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'document_requirements' AND column_name = 'condition_key') THEN
      ALTER TABLE document_requirements ADD COLUMN condition_key VARCHAR(50);
    END IF;

    -- Update conditional documents
    UPDATE document_requirements
    SET is_conditional = true, condition_key = 'previously_married'
    WHERE document_name = 'Divorce Decree';

    UPDATE document_requirements
    SET is_conditional = true, condition_key = 'spouse_deceased'
    WHERE document_name = 'Death Certificate';
  ELSE
    RAISE NOTICE 'document_requirements table does not exist. Run migrations 001-002 first.';
  END IF;
END $$;

-- =============================================
-- USER K-1 PREFERENCES
-- =============================================
-- Stores user's answers to conditional document questions

CREATE TABLE IF NOT EXISTS user_k1_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  previously_married BOOLEAN DEFAULT false,
  spouse_deceased BOOLEAN DEFAULT false,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_user_k1_preferences_user_id ON user_k1_preferences(user_id);

-- RLS policies for user_k1_preferences
ALTER TABLE user_k1_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only see their own preferences
CREATE POLICY "Users can view own preferences"
  ON user_k1_preferences
  FOR SELECT
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Users can insert their own preferences
CREATE POLICY "Users can insert own preferences"
  ON user_k1_preferences
  FOR INSERT
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Users can update their own preferences
CREATE POLICY "Users can update own preferences"
  ON user_k1_preferences
  FOR UPDATE
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- =============================================
-- UPDATE SORT ORDER
-- =============================================
-- Reorder documents to match new phase structure:
-- Phase 1: Long Lead-Time (Police Certs, Birth Cert, Beneficiary Passport)
-- Phase 2: Petitioner Identity (Citizenship, Divorce, Death)
-- Phase 3: Relationship Evidence (Meeting, Relationship)
-- Phase 4: File I-129F (Form, Photos)
-- Phase 5: Financial (I-134, Tax Returns)
-- Phase 6: Medical (Medical Exam)
-- Optional: (Engagement, Employment Letter, Pay Stubs)

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'document_requirements') THEN
    UPDATE document_requirements SET sort_order = 1 WHERE document_name = 'Police Certificates';
    UPDATE document_requirements SET sort_order = 2 WHERE document_name = 'Birth Certificate';
    UPDATE document_requirements SET sort_order = 3 WHERE document_name = 'Beneficiary Passport';
    UPDATE document_requirements SET sort_order = 4 WHERE document_name = 'Proof of US Citizenship';
    UPDATE document_requirements SET sort_order = 5 WHERE document_name = 'Divorce Decree';
    UPDATE document_requirements SET sort_order = 6 WHERE document_name = 'Death Certificate';
    UPDATE document_requirements SET sort_order = 7 WHERE document_name = 'Proof of In-Person Meeting';
    UPDATE document_requirements SET sort_order = 8 WHERE document_name = 'Proof of Relationship';
    UPDATE document_requirements SET sort_order = 9 WHERE document_name = 'Form I-129F';
    UPDATE document_requirements SET sort_order = 10 WHERE document_name = 'Passport Photos';
    UPDATE document_requirements SET sort_order = 11 WHERE document_name = 'Form I-134';
    UPDATE document_requirements SET sort_order = 12 WHERE document_name = 'Petitioner Tax Returns';
    UPDATE document_requirements SET sort_order = 13 WHERE document_name = 'Medical Exam Results';
    UPDATE document_requirements SET sort_order = 14 WHERE document_name = 'Engagement Evidence';
    UPDATE document_requirements SET sort_order = 15 WHERE document_name = 'Petitioner Employment Letter';
    UPDATE document_requirements SET sort_order = 16 WHERE document_name = 'Petitioner Pay Stubs';
  END IF;
END $$;
