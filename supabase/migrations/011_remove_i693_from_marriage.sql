-- =============================================
-- MIGRATION 011: REMOVE I-693 FROM MARRIAGE DOCUMENTS
-- =============================================
-- Form I-693 is filled out by the civil surgeon, not by the user.
-- It doesn't make sense as a checklist item since the user doesn't produce this document.

DO $$
DECLARE
  marriage_id uuid;
BEGIN
  SELECT id INTO marriage_id FROM visa_types WHERE code = 'marriage';

  IF marriage_id IS NOT NULL THEN
    DELETE FROM document_requirements
    WHERE visa_type_id = marriage_id
    AND document_name = 'Form I-693';
  END IF;
END $$;
