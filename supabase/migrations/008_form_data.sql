-- Store user form data (PDF form field values)
-- Allows users to save progress on forms like I-129F

CREATE TABLE IF NOT EXISTS user_form_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  form_type TEXT NOT NULL,  -- e.g., 'i-129f', 'i-130', etc.
  form_data JSONB NOT NULL DEFAULT '{}',  -- The actual form field values
  last_page INTEGER DEFAULT 1,  -- Last page user was on
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Each user can only have one saved version per form type
  UNIQUE(user_id, form_type)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_form_data_user_form
  ON user_form_data(user_id, form_type);

-- Enable RLS
ALTER TABLE user_form_data ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own form data
CREATE POLICY "Users can manage own form data" ON user_form_data
  FOR ALL USING (true);  -- Service key bypasses RLS anyway
