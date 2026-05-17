/**
 * Form-specific guidance for PDF form filling
 * Tips, common mistakes, and section-by-section help
 */

export const FORM_GUIDANCE = {
  'i-129f': {
    displayName: 'Form I-129F',
    subtitle: 'Petition for Alien Fiancé(e)',
    overview: 'This is the main petition form that starts your K-1 visa process. Take your time - accuracy is more important than speed.',
    sections: [
      {
        title: 'Part 1: Information About You (Petitioner)',
        tips: [
          'Use your legal name exactly as it appears on your passport or birth certificate',
          'A-Number is only if you\'ve had previous immigration cases - leave blank if N/A',
          'Social Security Number is required for US citizens'
        ]
      },
      {
        title: 'Part 2: Information About Your Fiancé(e)',
        tips: [
          'Use their name exactly as it appears on their passport',
          'Include all other names used (maiden name, nicknames on legal docs)',
          'Get their exact foreign address - USCIS may send correspondence there'
        ]
      },
      {
        title: 'Part 3: Other Information',
        tips: [
          'List ALL previous marriages for both of you, even if annulled',
          'Include how each marriage ended (divorce, death, annulment)',
          'Dates must be exact - check documents if unsure'
        ]
      },
      {
        title: 'Part 4: How You Met',
        tips: [
          'You MUST have met in person within the last 2 years',
          'Be specific about dates and locations',
          'Keep it factual - save the love story for the cover letter'
        ]
      }
    ],
    commonMistakes: [
      'Using nicknames instead of legal names',
      'Forgetting to list a previous marriage',
      'Wrong dates (mixing up month/day format)',
      'Leaving required fields blank instead of writing "N/A"',
      'Not signing in black ink'
    ],
    proTips: [
      'Double-check all dates against official documents',
      'Use N/A for fields that don\'t apply - never leave blank',
      'Print clearly or type - illegible forms get delayed',
      'Make a copy before mailing',
      'Sign and date on the same day you mail'
    ],
    estimatedTime: '45-60 minutes',
    links: [
      { label: 'Official USCIS Instructions', url: 'https://www.uscis.gov/sites/default/files/document/forms/i-129finstr.pdf' },
      { label: 'Filing Fee Information', url: 'https://www.uscis.gov/i-129f' }
    ]
  },
  'i-134': {
    displayName: 'Form I-134',
    subtitle: 'Declaration of Financial Support',
    overview: 'This form proves you can financially support your fiancé(e) when they arrive in the US. Your income must be at least 100% of the poverty guideline.',
    sections: [
      {
        title: 'Part 1: Information About You (Sponsor)',
        tips: [
          'You are the "sponsor" - the US citizen petitioner',
          'Use your current legal address',
          'Employment info should match your tax returns'
        ]
      },
      {
        title: 'Part 2: Household Size',
        tips: [
          'Count yourself, your dependents, and your fiancé(e)',
          'Include anyone you claimed on your last tax return',
          'Don\'t forget children who live with you'
        ]
      },
      {
        title: 'Part 3: Income and Assets',
        tips: [
          'Use your most recent tax return figures',
          'Include all sources of income (salary, investments, rental)',
          'Assets can supplement income if needed (savings, property)'
        ]
      }
    ],
    commonMistakes: [
      'Using gross income instead of adjusted gross income',
      'Forgetting to count fiancé(e) in household size',
      'Not including required evidence (tax returns, pay stubs)',
      'Math errors in totals',
      'Outdated poverty guideline figures'
    ],
    proTips: [
      'Your income must be at least 100% of poverty guideline for household size',
      'Include 3 most recent pay stubs as evidence',
      'Bank statements should be from last 3 months',
      'If income is low, show assets worth 3x the shortfall',
      'Get a co-sponsor if your income doesn\'t qualify'
    ],
    estimatedTime: '30-45 minutes',
    links: [
      { label: 'Poverty Guidelines (2024)', url: 'https://aspe.hhs.gov/topics/poverty-economic-mobility/poverty-guidelines' },
      { label: 'USCIS I-134 Instructions', url: 'https://www.uscis.gov/i-134' }
    ]
  }
};

// Get guidance for a specific form
export function getFormGuidance(formType) {
  return FORM_GUIDANCE[formType] || null;
}
