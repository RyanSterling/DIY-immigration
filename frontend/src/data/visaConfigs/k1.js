/**
 * K-1 Fiancé Visa Configuration
 * Wraps existing K-1 data structures into standardized visa config format.
 */

import { K1_GUIDANCE, K1_TIMELINE, OPTIONAL_DOCS, CONDITIONAL_DOCS } from '../k1Guidance';
import { K1_QUESTIONS } from '../k1Questions';

export default {
  // Visa identification
  code: 'k1',
  name: 'K-1 Fiancé Visa',
  category: 'family',

  // Document guidance and timeline
  guidance: K1_GUIDANCE,
  timeline: K1_TIMELINE,
  optionalDocs: OPTIONAL_DOCS,
  conditionalDocs: CONDITIONAL_DOCS,

  // Quiz questions
  questions: K1_QUESTIONS,

  // Preferences schema for onboarding modal
  // Defines what conditional questions to ask users
  preferencesSchema: [
    {
      key: 'previously_married',
      type: 'boolean',
      prompt: 'Were you or your fiancé(e) previously married?',
      helperText: 'This affects which documents you need to gather.'
    },
    {
      key: 'spouse_deceased',
      type: 'boolean',
      conditionalOn: 'previously_married',
      prompt: 'Is the previous marriage ended by spouse\'s death?',
      helperText: 'If yes, you\'ll need a death certificate instead of divorce decree.'
    }
  ],

  // UI configuration
  progressTitle: 'K-1 Visa Progress',
  dashboardTitle: 'K-1 Fiancé Visa Dashboard',

  // Special phase configuration
  mailingPhase: 6,  // Which phase number is the mailing phase
  filingFee: '$535',
  filingFeePayableTo: 'U.S. Department of Homeland Security',

  // Mailing addresses
  mailingAddresses: {
    usps: {
      label: 'USPS Regular Mail',
      address: 'USCIS\nAttn: I-129F\nP.O. Box 660151\nDallas, TX 75266-0151'
    },
    express: {
      label: 'FedEx/UPS/Express',
      address: 'USCIS\nAttn: I-129F\n2501 S. State Hwy 121 Business\nSuite 400\nLewisville, TX 75067-8003'
    }
  },

  // Documents required for mailing (Phase 6 checklist)
  mailingDocs: [
    { name: 'Form I-129F', required: true, note: 'Signed by both petitioner and beneficiary' },
    { name: 'Passport Photos', required: true, note: '2 of petitioner, 2 of beneficiary (2x2 inch)' },
    { name: 'Proof of US Citizenship', required: true, note: 'Passport copy, birth certificate, or naturalization cert' },
    { name: 'Proof of In-Person Meeting', required: true, note: 'Photos, passport stamps, travel receipts' },
    { name: 'Proof of Relationship', required: true, note: 'Photos, messages, call logs' },
    { name: 'Police Certificates', required: true, note: 'From all countries beneficiary lived 6+ months since age 16' },
    { name: 'Birth Certificate', required: true, note: 'Beneficiary\'s, with translation if not in English' },
    { name: 'Beneficiary Passport', required: true, note: 'Copy of bio page and all stamped pages' },
    { name: 'Divorce Decree', required: false, conditional: true, note: 'If either party was previously married' },
    { name: 'Death Certificate', required: false, conditional: true, note: 'If former spouse is deceased' },
    { name: 'Engagement Evidence', required: false, optional: true, note: 'Ring receipt, wedding planning docs' },
    { name: 'Petitioner Employment Letter', required: false, optional: true, note: 'Shows financial stability' },
    { name: 'Petitioner Pay Stubs', required: false, optional: true, note: 'Recent pay stubs (last 3-6 months)' },
  ]
};
