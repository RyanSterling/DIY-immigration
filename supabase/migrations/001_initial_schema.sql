-- Immigration DIY - Initial Database Schema
-- Run this in Supabase SQL Editor

-- =============================================
-- VISA TYPES AND REQUIREMENTS
-- =============================================

-- Visa types reference table
CREATE TABLE visa_types (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('work', 'green_card', 'investor', 'student', 'family')),
  description text,
  base_processing_time_days integer,
  premium_processing_available boolean DEFAULT false,
  premium_processing_days integer,
  government_filing_fee decimal(10,2),
  typical_attorney_fee_low decimal(10,2),
  typical_attorney_fee_high decimal(10,2),
  diy_difficulty_level text CHECK (diy_difficulty_level IN ('beginner', 'intermediate', 'advanced', 'expert_only')),
  annual_cap integer,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Document requirements per visa type
CREATE TABLE document_requirements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  visa_type_id uuid REFERENCES visa_types(id) ON DELETE CASCADE,
  document_name text NOT NULL,
  document_description text,
  category text NOT NULL CHECK (category IN ('identity', 'education', 'employment', 'financial', 'supporting')),
  is_required boolean DEFAULT true,
  alternatives text[],
  tips text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- =============================================
-- ASSESSMENTS (Public Quiz)
-- =============================================

-- Main assessments table
CREATE TABLE assessments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL,
  email text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,

  -- Personal information
  country_of_citizenship text,
  current_country text,
  current_visa_status text,

  -- Education
  highest_degree text,
  degree_field text,

  -- Work experience
  years_experience text,
  current_occupation text,

  -- Employment
  has_job_offer boolean,
  employer_type text,

  -- Special qualifications
  has_extraordinary_ability boolean DEFAULT false,

  -- Additional context
  additional_context text,

  -- AI assessment results
  ai_assessment jsonb,

  -- UTM tracking
  utm_source text,
  utm_campaign text,
  utm_content text,
  utm_term text
);

-- Indexes for assessments
CREATE INDEX idx_assessments_email ON assessments(email);
CREATE INDEX idx_assessments_session ON assessments(session_id);
CREATE INDEX idx_assessments_created ON assessments(created_at DESC);

-- Visa eligibility results per assessment
CREATE TABLE visa_eligibility_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id uuid REFERENCES assessments(id) ON DELETE CASCADE,
  visa_type_id text NOT NULL,
  eligibility_score integer,
  likelihood_rating text CHECK (likelihood_rating IN ('high', 'medium', 'low', 'unlikely')),
  estimated_processing_days integer,
  estimated_total_cost decimal(10,2),
  key_strengths text[],
  key_challenges text[],
  is_recommended boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Indexes for visa results
CREATE INDEX idx_visa_results_assessment ON visa_eligibility_results(assessment_id);
CREATE INDEX idx_visa_results_visa_type ON visa_eligibility_results(visa_type_id);

-- Quiz start tracking (for abandonment analysis)
CREATE TABLE quiz_starts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT now(),
  session_id text NOT NULL UNIQUE,
  utm_source text,
  utm_campaign text,
  completed boolean DEFAULT false,
  completed_at timestamp with time zone,
  assessment_id uuid REFERENCES assessments(id)
);

CREATE INDEX idx_quiz_starts_session ON quiz_starts(session_id);
CREATE INDEX idx_quiz_starts_completed ON quiz_starts(completed);

-- IP rate limiting table
CREATE TABLE ip_rate_limits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_ip_rate_limits ON ip_rate_limits(ip_address, created_at DESC);

-- =============================================
-- SETTINGS
-- =============================================

CREATE TABLE settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT now()
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE visa_eligibility_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_starts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE visa_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Public insert policies (for quiz submissions)
CREATE POLICY "Anyone can insert assessments"
ON assessments FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can select assessments"
ON assessments FOR SELECT
USING (true);

CREATE POLICY "Anyone can update assessments"
ON assessments FOR UPDATE
USING (true);

CREATE POLICY "Anyone can insert visa results"
ON visa_eligibility_results FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can select visa results"
ON visa_eligibility_results FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert quiz starts"
ON quiz_starts FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update quiz starts"
ON quiz_starts FOR UPDATE
USING (true);

CREATE POLICY "Anyone can select quiz starts"
ON quiz_starts FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert IP rate limits"
ON ip_rate_limits FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can select IP rate limits"
ON ip_rate_limits FOR SELECT
USING (true);

CREATE POLICY "Anyone can select visa types"
ON visa_types FOR SELECT
USING (true);

CREATE POLICY "Anyone can select document requirements"
ON document_requirements FOR SELECT
USING (true);

CREATE POLICY "Anyone can select settings"
ON settings FOR SELECT
USING (true);

-- =============================================
-- SEED DATA: Visa Types
-- =============================================

INSERT INTO visa_types (code, name, category, description, base_processing_time_days, premium_processing_available, premium_processing_days, government_filing_fee, typical_attorney_fee_low, typical_attorney_fee_high, diy_difficulty_level, annual_cap) VALUES
('h1b', 'H-1B Specialty Occupation', 'work', 'For workers in specialty occupations requiring at least a bachelor''s degree', 180, true, 15, 2500, 2000, 5000, 'advanced', 85000),
('l1a', 'L-1A Intracompany Transferee (Manager)', 'work', 'For managers and executives transferring within a multinational company', 90, true, 15, 1500, 3000, 8000, 'expert_only', NULL),
('l1b', 'L-1B Intracompany Transferee (Specialized)', 'work', 'For employees with specialized knowledge transferring within a multinational company', 90, true, 15, 1500, 3000, 8000, 'expert_only', NULL),
('o1a', 'O-1A Extraordinary Ability', 'work', 'For individuals with extraordinary ability in sciences, business, education, or athletics', 60, true, 15, 1000, 5000, 15000, 'expert_only', NULL),
('eb1a', 'EB-1A Extraordinary Ability Green Card', 'green_card', 'Green card for individuals with extraordinary ability in their field', 365, true, 45, 3500, 8000, 25000, 'expert_only', NULL),
('eb2_niw', 'EB-2 National Interest Waiver', 'green_card', 'Green card for those whose work benefits the US national interest', 730, false, NULL, 3500, 6000, 15000, 'advanced', NULL),
('e2', 'E-2 Treaty Investor', 'investor', 'For investors from treaty countries making substantial investment in US business', 60, false, NULL, 500, 3000, 10000, 'intermediate', NULL),
('eb5', 'EB-5 Immigrant Investor', 'green_card', 'Green card through investment of $800K-$1.05M in US business', 730, false, NULL, 5000, 15000, 50000, 'expert_only', 10000);

-- Insert default settings
INSERT INTO settings (key, value) VALUES (
  'pricing',
  '{
    "products": {
      "h1b_guide": { "name": "H-1B DIY Guide", "price": 149, "visa_type": "h1b" },
      "eb2_niw_guide": { "name": "EB-2 NIW DIY Guide", "price": 199, "visa_type": "eb2_niw" },
      "e2_guide": { "name": "E-2 DIY Guide", "price": 179, "visa_type": "e2" }
    }
  }'
);
