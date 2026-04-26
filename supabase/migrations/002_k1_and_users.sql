-- =============================================
-- MIGRATION 002: K-1 VISA TYPE AND CLERK USERS
-- =============================================

-- =============================================
-- USERS TABLE (Clerk Integration)
-- =============================================

CREATE TABLE IF NOT EXISTS users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  clerk_user_id text UNIQUE NOT NULL,
  email text,
  first_name text,
  last_name text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Indexes for user lookups
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Add user_id column to assessments (links assessments to users)
ALTER TABLE assessments
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id) ON DELETE SET NULL;

-- Index for user assessments lookup
CREATE INDEX IF NOT EXISTS idx_assessments_user_id ON assessments(user_id);

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Service role can manage users"
ON users FOR ALL
USING (true);

-- =============================================
-- K-1 VISA TYPE
-- =============================================

-- Add K-1 to visa_types table
INSERT INTO visa_types (
  code,
  name,
  category,
  description,
  base_processing_time_days,
  premium_processing_available,
  premium_processing_days,
  government_filing_fee,
  typical_attorney_fee_low,
  typical_attorney_fee_high,
  diy_difficulty_level,
  annual_cap
) VALUES (
  'k1',
  'K-1 Fiancé Visa',
  'family',
  'For fiancé(e)s of US citizens to enter the US for marriage within 90 days',
  360,
  false,
  NULL,
  800,
  1500,
  4000,
  'intermediate',
  NULL
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  base_processing_time_days = EXCLUDED.base_processing_time_days,
  government_filing_fee = EXCLUDED.government_filing_fee,
  typical_attorney_fee_low = EXCLUDED.typical_attorney_fee_low,
  typical_attorney_fee_high = EXCLUDED.typical_attorney_fee_high,
  diy_difficulty_level = EXCLUDED.diy_difficulty_level;

-- =============================================
-- K-1 DOCUMENT REQUIREMENTS
-- =============================================

-- Get K-1 visa type ID and insert document requirements
DO $$
DECLARE
  k1_id uuid;
BEGIN
  SELECT id INTO k1_id FROM visa_types WHERE code = 'k1';

  IF k1_id IS NOT NULL THEN
    -- Clear existing K-1 documents (if any) and insert fresh
    DELETE FROM document_requirements WHERE visa_type_id = k1_id;

    INSERT INTO document_requirements (visa_type_id, document_name, document_description, category, is_required, sort_order) VALUES
    (k1_id, 'Form I-129F', 'Petition for Alien Fiancé(e) - filed by US citizen petitioner', 'identity', true, 1),
    (k1_id, 'Proof of US Citizenship', 'Petitioner''s passport, birth certificate, or naturalization certificate', 'identity', true, 2),
    (k1_id, 'Passport Photos', 'Recent passport-style photos of both petitioner and beneficiary (2x2 inches)', 'identity', true, 3),
    (k1_id, 'Proof of In-Person Meeting', 'Photos together, travel records, passport stamps showing you met within last 2 years', 'supporting', true, 4),
    (k1_id, 'Proof of Relationship', 'Communication records (calls, messages, emails), photos together, letters', 'supporting', true, 5),
    (k1_id, 'Engagement Evidence', 'Engagement ring receipt, engagement party photos, wedding venue deposits', 'supporting', false, 6),
    (k1_id, 'Form I-134', 'Affidavit of Support showing petitioner meets income requirements', 'financial', true, 7),
    (k1_id, 'Petitioner Tax Returns', 'Last 3 years of federal tax returns (Form 1040)', 'financial', true, 8),
    (k1_id, 'Petitioner Employment Letter', 'Letter from employer confirming employment, position, and salary', 'financial', false, 9),
    (k1_id, 'Petitioner Pay Stubs', 'Recent pay stubs (last 3-6 months)', 'financial', false, 10),
    (k1_id, 'Divorce Decree', 'If either party was previously married - final divorce decree', 'identity', false, 11),
    (k1_id, 'Death Certificate', 'If either party was previously married and spouse is deceased', 'identity', false, 12),
    (k1_id, 'Police Certificates', 'From all countries where beneficiary has lived 6+ months since age 16', 'supporting', true, 13),
    (k1_id, 'Birth Certificate', 'Beneficiary''s birth certificate', 'identity', true, 14),
    (k1_id, 'Beneficiary Passport', 'Valid passport with at least 6 months validity', 'identity', true, 15),
    (k1_id, 'Medical Exam Results', 'Form I-693 from USCIS-designated civil surgeon (required for visa interview)', 'supporting', true, 16);
  END IF;
END $$;

-- =============================================
-- ADD K-1 SPECIFIC COLUMNS TO ASSESSMENTS
-- =============================================

-- Add column to store K-1 specific answers
ALTER TABLE assessments
ADD COLUMN IF NOT EXISTS k1_answers jsonb;

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE users IS 'Users synced from Clerk authentication';
COMMENT ON COLUMN users.clerk_user_id IS 'Clerk user ID (sub claim from JWT)';
COMMENT ON COLUMN assessments.user_id IS 'Link to authenticated user (nullable for anonymous assessments)';
COMMENT ON COLUMN assessments.k1_answers IS 'K-1 fiancé visa specific quiz answers stored as JSON';
