-- =============================================
-- MIGRATION 004: DOCUMENT COMMENTS
-- =============================================
-- Allows users to add notes/comments to track progress on documents

CREATE TABLE IF NOT EXISTS document_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  document_requirement_id UUID REFERENCES document_requirements(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_doc_comments_user ON document_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_doc_comments_document ON document_comments(document_requirement_id);
CREATE INDEX IF NOT EXISTS idx_doc_comments_created ON document_comments(created_at DESC);

-- Enable RLS
ALTER TABLE document_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can manage all comments
CREATE POLICY "Service role can manage document comments"
ON document_comments FOR ALL
USING (true);

-- Comments for documentation
COMMENT ON TABLE document_comments IS 'User notes and comments on document requirements';
COMMENT ON COLUMN document_comments.user_id IS 'The user who created the comment';
COMMENT ON COLUMN document_comments.document_requirement_id IS 'The document this comment is about';
COMMENT ON COLUMN document_comments.content IS 'The comment text';
