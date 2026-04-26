-- =============================================
-- MIGRATION 003: K-1 DASHBOARD PROGRESS TRACKING
-- =============================================

-- =============================================
-- USER DOCUMENT PROGRESS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS user_document_progress (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  assessment_id uuid REFERENCES assessments(id) ON DELETE SET NULL,
  document_requirement_id uuid REFERENCES document_requirements(id) ON DELETE CASCADE NOT NULL,
  status text CHECK (status IN ('not_started', 'in_progress', 'completed', 'not_applicable')) DEFAULT 'not_started',
  notes text,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),

  UNIQUE(user_id, document_requirement_id)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_doc_progress_user ON user_document_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_doc_progress_assessment ON user_document_progress(assessment_id);
CREATE INDEX IF NOT EXISTS idx_user_doc_progress_status ON user_document_progress(status);

-- Enable RLS
ALTER TABLE user_document_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can manage all progress records
CREATE POLICY "Service role can manage document progress"
ON user_document_progress FOR ALL
USING (true);

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE user_document_progress IS 'Tracks user progress on document requirements for visa applications';
COMMENT ON COLUMN user_document_progress.user_id IS 'The user tracking this document';
COMMENT ON COLUMN user_document_progress.assessment_id IS 'Optional link to a specific assessment';
COMMENT ON COLUMN user_document_progress.document_requirement_id IS 'The document requirement being tracked';
COMMENT ON COLUMN user_document_progress.status IS 'Current status: not_started, in_progress, completed, or not_applicable';
COMMENT ON COLUMN user_document_progress.notes IS 'Optional user notes about this document';
COMMENT ON COLUMN user_document_progress.completed_at IS 'When the document was marked as completed';
