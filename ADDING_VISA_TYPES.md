# Adding a New Visa Type

This guide explains how to add support for a new visa type (e.g., H-1B, EB-1A, O-1A) to the DIY dashboard.

## Overview

The system is designed to support multiple visa types through a config-driven architecture. Each visa type needs:

1. **Frontend config file** - Defines guidance, timeline, documents, and preferences
2. **Registry entry** - Registers the config in the loader
3. **Database records** - Visa type and document requirements in Supabase

## Step 1: Create the Visa Config File

Create a new file at `frontend/src/data/visaConfigs/{visa_code}.js`:

```javascript
// frontend/src/data/visaConfigs/h1b.js

export default {
  // === IDENTIFICATION ===
  code: 'h1b',
  name: 'H-1B Specialty Occupation',
  category: 'work',  // 'work', 'family', 'investor', 'green_card'

  // === DOCUMENT GUIDANCE ===
  // Object mapping document names to their guidance
  guidance: {
    'Form I-129': {
      description: 'Petition for Nonimmigrant Worker...',
      steps: [
        'Download Form I-129 from USCIS website',
        'Complete Part 1: Petitioner Information',
        // ... more steps
      ],
      tips: 'Double-check all dates and employer information...',
      links: [
        { label: 'Download Form I-129', url: 'https://www.uscis.gov/i-129' },
        { label: 'Form Instructions', url: 'https://www.uscis.gov/i-129-instructions' }
      ],
      estimatedTime: '2-3 hours',
      difficulty: 'moderate'  // 'easy', 'moderate', 'hard'
    },
    // ... more documents
  },

  // === TIMELINE/PHASES ===
  // Array of phases users go through
  timeline: [
    {
      phase: 1,
      title: 'Employer Preparation',
      description: 'Your employer gathers required documents and prepares the LCA.',
      duration: '2-4 weeks',
      tips: 'Start this process early as LCA approval takes 7+ days.',
      docsNeeded: ['Labor Condition Application', 'Company Documents'],
      isOptional: false,
      isMailingPhase: false
    },
    {
      phase: 2,
      title: 'Beneficiary Documents',
      description: 'Gather your education and work credentials.',
      duration: '1-2 weeks',
      tips: 'Get credential evaluations if your degree is from outside the US.',
      docsNeeded: ['Degree Certificate', 'Transcripts', 'Credential Evaluation'],
      isOptional: false,
      isMailingPhase: false
    },
    // ... more phases
    {
      phase: 5,
      title: 'File Petition',
      description: 'Submit the complete H-1B petition to USCIS.',
      duration: '1 day',
      tips: 'Use express mail with tracking for proof of delivery.',
      docsNeeded: [],
      isOptional: false,
      isMailingPhase: true  // Special mailing phase
    }
  ],

  // === OPTIONAL DOCUMENTS ===
  // Document names that are optional (shown in "Strengthen Your Case" section)
  optionalDocs: [
    'Reference Letters',
    'Publication List',
    'Awards Documentation'
  ],

  // === CONDITIONAL DOCUMENTS ===
  // Documents that only apply based on user's situation
  conditionalDocs: [
    {
      name: 'Credential Evaluation',
      condition: 'foreign_degree',
      prompt: 'Is your degree from outside the United States?'
    },
    {
      name: 'Previous H-1B Approval',
      condition: 'h1b_extension',
      prompt: 'Are you extending or transferring an existing H-1B?'
    }
  ],

  // === QUIZ QUESTIONS (optional) ===
  // If this visa type has its own quiz
  questions: [],  // Import from separate file if needed

  // === ONBOARDING PREFERENCES ===
  // Questions to ask users to customize their document list
  preferencesSchema: [
    {
      key: 'foreign_degree',
      type: 'boolean',
      prompt: 'Is your degree from outside the United States?',
      helperText: 'This determines if you need a credential evaluation.'
    },
    {
      key: 'h1b_extension',
      type: 'boolean',
      prompt: 'Are you extending or transferring an existing H-1B?',
      helperText: 'Extensions have different document requirements.'
    }
  ],

  // === UI CONFIGURATION ===
  progressTitle: 'H-1B Visa Progress',
  dashboardTitle: 'H-1B Specialty Occupation Dashboard',

  // === MAILING PHASE CONFIG ===
  mailingPhase: 5,  // Which phase number is the mailing phase
  filingFee: '$460',
  filingFeePayableTo: 'U.S. Department of Homeland Security',

  // Mailing addresses (if applicable)
  mailingAddresses: {
    usps: {
      label: 'USPS Regular Mail',
      address: 'USCIS\nAttn: H-1B\nP.O. Box 660867\nDallas, TX 75266'
    },
    express: {
      label: 'FedEx/UPS/Express',
      address: 'USCIS\nAttn: H-1B\n2501 S. State Hwy 121\nLewisville, TX 75067'
    }
  },

  // Documents to show in mailing checklist
  mailingDocs: [
    { name: 'Form I-129', required: true, note: 'Signed by petitioner' },
    { name: 'Labor Condition Application', required: true, note: 'Certified LCA' },
    { name: 'Degree Certificate', required: true, note: 'Copy of diploma' },
    // ... more docs
    { name: 'Reference Letters', required: false, optional: true, note: 'Strengthens case' }
  ]
};
```

## Step 2: Register in Config Index

Add the new visa type to `frontend/src/data/visaConfigs/index.js`:

```javascript
const visaConfigLoaders = {
  k1: () => import('./k1'),
  h1b: () => import('./h1b'),      // Add this line
  eb1a: () => import('./eb1a'),    // Add more as needed
};
```

## Step 3: Add Database Records

### 3a. Add Visa Type Record

Run this SQL in Supabase SQL Editor:

```sql
INSERT INTO visa_types (
  code,
  name,
  category,
  description,
  base_processing_time_days,
  premium_processing_available,
  premium_processing_days,
  government_filing_fee,
  diy_difficulty_level,
  active
) VALUES (
  'h1b',
  'H-1B Specialty Occupation',
  'work',
  'Temporary work visa for specialty occupations requiring a bachelor''s degree or higher.',
  180,
  true,
  15,
  460.00,
  'intermediate',
  true
);
```

### 3b. Add Document Requirements

```sql
-- Get the visa_type_id first
DO $$
DECLARE
  v_visa_type_id uuid;
BEGIN
  SELECT id INTO v_visa_type_id FROM visa_types WHERE code = 'h1b';

  -- Insert documents
  INSERT INTO document_requirements (visa_type_id, document_name, document_description, category, is_required, sort_order, is_conditional, condition_key)
  VALUES
    (v_visa_type_id, 'Form I-129', 'Petition for Nonimmigrant Worker', 'identity', true, 1, false, null),
    (v_visa_type_id, 'Labor Condition Application', 'Certified LCA from DOL', 'employment', true, 2, false, null),
    (v_visa_type_id, 'Degree Certificate', 'Bachelor''s degree or higher', 'education', true, 3, false, null),
    (v_visa_type_id, 'Transcripts', 'Official academic transcripts', 'education', true, 4, false, null),
    (v_visa_type_id, 'Credential Evaluation', 'Foreign degree evaluation', 'education', true, 5, true, 'foreign_degree'),
    (v_visa_type_id, 'Employer Support Letter', 'Job offer and description', 'employment', true, 6, false, null),
    (v_visa_type_id, 'Reference Letters', 'Professional recommendations', 'supporting', false, 7, false, null);
    -- Add more documents as needed
END $$;
```

## Step 4: Test the New Visa Type

1. **Run the database migration** (if not already done):
   ```bash
   # In Supabase SQL Editor, run:
   # supabase/migrations/006_multi_visa_support.sql
   ```

2. **Start the dev servers**:
   ```bash
   # Terminal 1 - Frontend
   cd frontend && npm run dev

   # Terminal 2 - Worker
   cd worker && npm run dev
   ```

3. **Test the dashboard**:
   - Navigate to `http://localhost:5174/visa/h1b`
   - Sign in with Clerk
   - Verify:
     - [ ] Dashboard loads without errors
     - [ ] Documents appear with correct names
     - [ ] Phase navigation works
     - [ ] Document status updates work
     - [ ] Comments work
     - [ ] Onboarding modal shows (if preferencesSchema defined)

## File Structure Reference

```
frontend/src/
├── data/
│   ├── visaConfigs/
│   │   ├── index.js      # Config registry
│   │   ├── k1.js         # K-1 Fiancé Visa config
│   │   └── h1b.js        # H-1B config (new)
│   ├── k1Guidance.js     # K-1 specific data (legacy)
│   └── k1Questions.js    # K-1 quiz questions (legacy)
├── pages/
│   └── VisaDashboard.jsx # Generic dashboard (uses config)
└── components/dashboard/
    ├── VisaDashboardLayout.jsx
    ├── VisaSidebar.jsx
    ├── VisaMainContent.jsx
    └── VisaOnboardingModal.jsx
```

## Config Properties Reference

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `code` | string | Yes | Unique visa code (e.g., 'h1b', 'k1') |
| `name` | string | Yes | Display name |
| `category` | string | Yes | 'work', 'family', 'investor', 'green_card' |
| `guidance` | object | Yes | Map of document names to guidance objects |
| `timeline` | array | Yes | Array of phase objects |
| `optionalDocs` | array | No | Document names that are optional |
| `conditionalDocs` | array | No | Conditional document definitions |
| `preferencesSchema` | array | No | Onboarding questions |
| `progressTitle` | string | Yes | Sidebar progress label |
| `mailingPhase` | number | No | Phase number for mailing checklist |
| `filingFee` | string | No | Filing fee display string |
| `mailingDocs` | array | No | Documents for mailing checklist |
| `mailingAddresses` | object | No | USPS and express addresses |

## Tips

1. **Copy from K-1**: The K-1 config (`k1.js`) is a complete example. Copy it and modify for your visa type.

2. **Document names must match**: The `document_name` in the database must exactly match the keys in `guidance` and items in `timeline.docsNeeded`.

3. **Keep guidance helpful**: Include practical tips, official links, and realistic time estimates.

4. **Test conditional docs**: Make sure `condition_key` in the database matches `condition` in `conditionalDocs`.

5. **Order matters**: Set `sort_order` in the database to control document display order within phases.
