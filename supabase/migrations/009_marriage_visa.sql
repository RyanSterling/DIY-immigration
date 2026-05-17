-- =============================================
-- MIGRATION 009: MARRIAGE-BASED GREEN CARD VISA TYPE
-- =============================================
-- For spouses of US citizens adjusting status while in the US
-- Concurrent filing of I-130 + I-485

-- =============================================
-- MARRIAGE VISA TYPE
-- =============================================

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
  'marriage',
  'Marriage-Based Green Card (Adjustment of Status)',
  'family',
  'For spouses of US citizens to obtain permanent residence while in the US. Immediate relatives can file I-130 and I-485 concurrently.',
  365,
  false,
  NULL,
  2115,  -- $675 (I-130) + $1,440 (I-485 with biometrics)
  3000,
  8000,
  'intermediate',
  NULL  -- Immediate relatives not subject to numerical limits
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
-- MARRIAGE DOCUMENT REQUIREMENTS
-- =============================================

DO $$
DECLARE
  marriage_id uuid;
BEGIN
  SELECT id INTO marriage_id FROM visa_types WHERE code = 'marriage';

  IF marriage_id IS NOT NULL THEN
    -- Clear existing marriage documents (if any) and insert fresh
    DELETE FROM document_requirements WHERE visa_type_id = marriage_id;

    INSERT INTO document_requirements (visa_type_id, document_name, document_description, category, is_required, is_conditional, condition_key, sort_order) VALUES
    -- Phase 1: Start Here (Long Lead Time)
    (marriage_id, 'Police Certificates', 'Criminal background checks from all countries where foreign spouse lived 6+ months since age 16', 'supporting', true, false, NULL, 1),
    (marriage_id, 'Birth Certificate', 'Foreign spouse''s birth certificate with translation if not in English', 'identity', true, false, NULL, 2),
    (marriage_id, 'Beneficiary Passport', 'Foreign spouse''s valid passport - copy of bio page and all stamped pages', 'identity', true, false, NULL, 3),

    -- Phase 2: Petitioner Documents
    (marriage_id, 'Proof of US Citizenship', 'US citizen spouse''s passport, birth certificate, or naturalization certificate', 'identity', true, false, NULL, 4),
    (marriage_id, 'Petitioner Government ID', 'US citizen spouse''s driver''s license or state ID', 'identity', true, false, NULL, 5),
    (marriage_id, 'Divorce Decree', 'If either spouse was previously married - final divorce decree', 'identity', false, true, 'previously_married', 6),
    (marriage_id, 'Death Certificate', 'If prior spouse is deceased - death certificate instead of divorce decree', 'identity', false, true, 'spouse_deceased', 7),

    -- Phase 3: Relationship Evidence
    (marriage_id, 'Proof of Genuine Marriage', 'Joint bank accounts, lease, utility bills, photos, insurance, affidavits from family/friends', 'supporting', true, false, NULL, 8),

    -- Phase 4: Marriage Certificate
    (marriage_id, 'Marriage Certificate', 'Certified copy of marriage certificate with seal', 'identity', true, false, NULL, 9),
    (marriage_id, 'Marriage Certificate Translation', 'Certified translation if marriage certificate not in English', 'identity', false, true, 'marriage_cert_not_english', 10),

    -- Phase 5: Form I-130
    (marriage_id, 'Form I-130', 'Petition for Alien Relative - filed by US citizen spouse', 'identity', true, false, NULL, 11),
    (marriage_id, 'Form I-130A', 'Supplemental Information for Spouse Beneficiary', 'identity', true, false, NULL, 12),
    (marriage_id, 'Passport Photos', 'Recent 2x2 inch passport-style photos of both spouses (6+ of foreign spouse)', 'identity', true, false, NULL, 13),

    -- Phase 6: Form I-485
    (marriage_id, 'Form I-485', 'Application to Register Permanent Residence or Adjust Status', 'identity', true, false, NULL, 14),
    (marriage_id, 'Form G-325A', 'Biographic Information form', 'identity', true, false, NULL, 15),
    (marriage_id, 'Evidence of Lawful Entry', 'I-94, visa stamp, passport entry stamps proving lawful admission', 'identity', true, false, NULL, 16),

    -- Phase 7: Form I-864 (Financial)
    (marriage_id, 'Form I-864', 'Affidavit of Support showing US citizen meets 125% poverty guidelines', 'financial', true, false, NULL, 17),
    (marriage_id, 'Petitioner Tax Returns', 'US citizen spouse''s federal tax returns for past 3 years with W-2s', 'financial', true, false, NULL, 18),
    (marriage_id, 'Petitioner Employment Letter', 'Letter from employer confirming employment, position, and salary', 'financial', true, false, NULL, 19),
    (marriage_id, 'Petitioner Pay Stubs', 'Most recent 6 months of pay stubs', 'financial', true, false, NULL, 20),
    (marriage_id, 'Form I-864A', 'Joint sponsor affidavit if needed to meet income requirements', 'financial', false, true, 'needs_joint_sponsor', 21),
    (marriage_id, 'Joint Sponsor Tax Returns', 'Joint sponsor''s tax returns if using joint sponsor', 'financial', false, true, 'needs_joint_sponsor', 22),

    -- Phase 8: Optional Work/Travel
    (marriage_id, 'Form I-765', 'Employment Authorization Document application - work while pending', 'supporting', false, false, NULL, 23),
    (marriage_id, 'Form I-131', 'Advance Parole application - travel while pending', 'supporting', false, false, NULL, 24),

    -- Payment
    (marriage_id, 'Payment Authorization Form', 'G-1450 (credit card) or G-1650 (bank transfer) for $2,115 total filing fee', 'financial', true, false, NULL, 25),

    -- Phase 11: Interview
    (marriage_id, 'Form I-693', 'Medical examination by USCIS-designated civil surgeon (required for interview)', 'supporting', true, false, NULL, 26);
  END IF;
END $$;

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE visa_types IS 'Visa types available in the system including marriage-based green card';
