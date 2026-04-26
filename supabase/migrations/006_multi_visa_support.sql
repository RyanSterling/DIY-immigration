-- Migration: Support multiple visa types in preferences
-- This migration creates a generic user_visa_preferences table that can store
-- preferences for any visa type, replacing the K-1 specific user_k1_preferences table.

-- 1. Create new generic preferences table
CREATE TABLE user_visa_preferences (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,  -- Clerk user ID (matching existing pattern from user_k1_preferences)
  visa_type VARCHAR(20) NOT NULL,  -- 'k1', 'h1b', 'eb1a', etc.
  preferences JSONB DEFAULT '{}',  -- Generic preferences storage (e.g., {"previously_married": true})
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, visa_type)
);

-- 2. Migrate existing K-1 preferences data
INSERT INTO user_visa_preferences (user_id, visa_type, preferences, onboarding_completed, created_at, updated_at)
SELECT
  user_id,
  'k1' AS visa_type,
  jsonb_build_object(
    'previously_married', COALESCE(previously_married, false),
    'spouse_deceased', COALESCE(spouse_deceased, false)
  ) AS preferences,
  COALESCE(onboarding_completed, false),
  COALESCE(created_at, now()),
  COALESCE(updated_at, now())
FROM user_k1_preferences
ON CONFLICT (user_id, visa_type) DO NOTHING;

-- 3. Create indexes for performance
CREATE INDEX idx_user_visa_preferences_user ON user_visa_preferences(user_id);
CREATE INDEX idx_user_visa_preferences_type ON user_visa_preferences(visa_type);
CREATE INDEX idx_user_visa_preferences_user_type ON user_visa_preferences(user_id, visa_type);

-- 4. Enable RLS
ALTER TABLE user_visa_preferences ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies (match existing pattern from user_k1_preferences)
CREATE POLICY "Users can view their own visa preferences"
  ON user_visa_preferences FOR SELECT
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own visa preferences"
  ON user_visa_preferences FOR INSERT
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own visa preferences"
  ON user_visa_preferences FOR UPDATE
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Service role bypass for backend operations
CREATE POLICY "Service role has full access to visa preferences"
  ON user_visa_preferences FOR ALL
  USING (auth.role() = 'service_role');

-- Note: Don't drop user_k1_preferences yet - keep for backward compatibility
-- The old /k1/* routes will continue to work with the old table
-- Can be dropped in a future migration after verifying everything works
