/**
 * Marriage-Based Green Card (Adjustment of Status) Configuration
 * For spouses of US citizens to obtain permanent residence while in the US.
 */

import { MARRIAGE_GUIDANCE, MARRIAGE_TIMELINE, OPTIONAL_DOCS, CONDITIONAL_DOCS } from '../marriageGuidance';

export default {
  // Visa identification
  code: 'marriage',
  name: 'Marriage-Based Green Card',
  category: 'family',

  // Document guidance and timeline
  guidance: MARRIAGE_GUIDANCE,
  timeline: MARRIAGE_TIMELINE,
  optionalDocs: OPTIONAL_DOCS,
  conditionalDocs: CONDITIONAL_DOCS,

  // No quiz needed - users are already married
  questions: null,

  // Preferences schema for onboarding modal
  // Defines what conditional questions to ask users
  preferencesSchema: [
    {
      key: 'previously_married',
      type: 'boolean',
      prompt: 'Were you or your spouse previously married?',
      helperText: 'This affects which documents you need to gather (divorce decree or death certificate).'
    },
    {
      key: 'spouse_deceased',
      type: 'boolean',
      conditionalOn: 'previously_married',
      prompt: 'Did the previous marriage end due to spouse\'s death?',
      helperText: 'If yes, you\'ll need a death certificate instead of divorce decree.'
    },
    {
      key: 'marriage_cert_not_english',
      type: 'boolean',
      prompt: 'Is your marriage certificate in a language other than English?',
      helperText: 'If yes, you\'ll need a certified translation.'
    },
    {
      key: 'needs_joint_sponsor',
      type: 'boolean',
      prompt: 'Do you need a joint sponsor to meet income requirements?',
      helperText: 'Required if the US citizen spouse\'s income is below 125% of poverty guidelines for household size.'
    }
  ],

  // UI configuration
  progressTitle: 'Green Card Progress',
  dashboardTitle: 'Marriage-Based Green Card Dashboard',

  // Special phase configuration
  mailingPhase: 9,  // Which phase number is the mailing phase
  filingFee: '$2,115 total',
  filingFeeBreakdown: 'I-130: $675 + I-485: $1,440 (includes biometrics)',
  filingFeePaymentMethod: 'Form G-1450 (credit card) or G-1650 (bank transfer)',

  // Mailing addresses for concurrent filing
  mailingAddresses: {
    usps: {
      label: 'USPS Regular Mail',
      address: 'USCIS\nAttn: AOS\nP.O. Box 805887\nChicago, IL 60680-4120'
    },
    express: {
      label: 'FedEx/UPS/Express',
      address: 'USCIS\nAttn: AOS\n131 S. Dearborn - 3rd Floor\nChicago, IL 60603-5517'
    }
  },

  // Documents required for mailing (Phase 9 checklist)
  mailingDocs: [
    // I-130 Package
    { name: 'Form I-130', required: true, note: 'Petition for Alien Relative - signed by US citizen spouse' },
    { name: 'Form I-130A', required: true, note: 'Supplemental Information - signed by foreign spouse' },
    { name: 'Proof of US Citizenship', required: true, note: 'Passport, birth certificate, or naturalization certificate' },
    { name: 'Marriage Certificate', required: true, note: 'Certified copy with seal' },
    { name: 'Marriage Certificate Translation', required: false, conditional: true, note: 'If marriage certificate not in English' },
    { name: 'Passport Photos', required: true, note: '2 of each spouse (2x2 inch)' },
    { name: 'Proof of Genuine Marriage', required: true, note: 'Joint accounts, lease, photos, affidavits' },

    // I-485 Package
    { name: 'Form I-485', required: true, note: 'Application to Adjust Status - signed by foreign spouse' },
    { name: 'Form G-325A', required: true, note: 'Biographic Information' },
    { name: 'Evidence of Lawful Entry', required: true, note: 'I-94, visa stamp, passport entry stamps' },
    { name: 'Birth Certificate', required: true, note: 'Foreign spouse\'s, with translation if needed' },
    { name: 'Beneficiary Passport', required: true, note: 'Copy of bio page and all stamped pages' },
    { name: 'Police Certificates', required: true, note: 'From all countries lived 6+ months since age 16' },

    // I-864 Package
    { name: 'Form I-864', required: true, note: 'Affidavit of Support - signed by US citizen spouse' },
    { name: 'Petitioner Tax Returns', required: true, note: 'Past 3 years with W-2s' },
    { name: 'Petitioner Employment Letter', required: true, note: 'On company letterhead' },
    { name: 'Petitioner Pay Stubs', required: true, note: 'Most recent 6 months' },
    { name: 'Form I-864A', required: false, conditional: true, note: 'If using joint sponsor' },
    { name: 'Joint Sponsor Tax Returns', required: false, conditional: true, note: 'If using joint sponsor' },

    // Previous Marriage Documentation
    { name: 'Divorce Decree', required: false, conditional: true, note: 'If either spouse was previously married' },
    { name: 'Death Certificate', required: false, conditional: true, note: 'If former spouse is deceased' },

    // Payment
    { name: 'Payment Authorization Form', required: true, note: 'G-1450 or G-1650 for $2,115 total' },

    // Optional (Work/Travel)
    { name: 'Form I-765', required: false, optional: true, note: 'Employment Authorization (no additional fee)' },
    { name: 'Form I-131', required: false, optional: true, note: 'Advance Parole for travel (no additional fee)' },
  ]
};
