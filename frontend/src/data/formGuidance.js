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
  },

  // ============================================
  // MARRIAGE-BASED GREEN CARD FORMS
  // ============================================

  'i-130': {
    displayName: 'Form I-130',
    subtitle: 'Petition for Alien Relative',
    overview: 'This form establishes the qualifying family relationship between you (US citizen) and your spouse. It\'s the foundation of your green card petition.',
    sections: [
      {
        title: 'Part 1: Relationship',
        tips: [
          'Select "Spouse" as the relationship type',
          'You are the "petitioner" (US citizen spouse)',
          'Your spouse is the "beneficiary" (foreign spouse)'
        ]
      },
      {
        title: 'Part 2: Information About You (Petitioner)',
        tips: [
          'Use your legal name exactly as it appears on your passport or birth certificate',
          'A-Number is only if you\'ve had previous immigration cases',
          'Include your Social Security Number'
        ]
      },
      {
        title: 'Part 3: Biographic Information',
        tips: [
          'Ethnicity and race questions are required',
          'Height and weight in US measurements',
          'Eye and hair color as currently shown'
        ]
      },
      {
        title: 'Part 4: Information About Beneficiary',
        tips: [
          'Use your spouse\'s name exactly as it appears on their passport',
          'Include all names ever used (maiden name, previous married names)',
          'Current address must be accurate'
        ]
      }
    ],
    commonMistakes: [
      'Using nicknames instead of legal names',
      'Forgetting to list previous marriages for either spouse',
      'Wrong dates (mixing up month/day format)',
      'Leaving required fields blank instead of writing "N/A"',
      'Forgetting to include Form I-130A'
    ],
    proTips: [
      'File I-130 and I-485 concurrently since your spouse is an immediate relative',
      'Double-check all dates against official documents',
      'Make a copy of everything before mailing',
      'Use N/A for fields that don\'t apply - never leave blank',
      'Sign and date on the same day you mail'
    ],
    estimatedTime: '1-2 hours',
    links: [
      { label: 'Official USCIS Instructions', url: 'https://www.uscis.gov/sites/default/files/document/forms/i-130instr.pdf' },
      { label: 'Download Form I-130', url: 'https://www.uscis.gov/i-130' }
    ]
  },

  'i-130a': {
    displayName: 'Form I-130A',
    subtitle: 'Supplemental Information for Spouse Beneficiary',
    overview: 'This supplemental form collects additional information about your spouse (the beneficiary). It must be filed together with Form I-130.',
    sections: [
      {
        title: 'Part 1: Information About Beneficiary',
        tips: [
          'Your spouse (beneficiary) fills out this form',
          'Use the same name as on the I-130',
          'List all addresses for the past 5 years'
        ]
      },
      {
        title: 'Part 2: Employment History',
        tips: [
          'List all employment for past 5 years',
          'Include periods of unemployment',
          'Use employer\'s official name and address'
        ]
      },
      {
        title: 'Part 3: Parent Information',
        tips: [
          'Include both parents\' information',
          'Use parents\' current names and addresses',
          'If deceased, note the city/country of death'
        ]
      }
    ],
    commonMistakes: [
      'Not including all addresses from past 5 years',
      'Gaps in employment history without explanation',
      'Using parents\' maiden names inconsistently',
      'Not signing the form'
    ],
    proTips: [
      'This form is required for all spouse petitions',
      'Keep a copy of what you submit',
      'Dates must be consistent with I-130',
      'Your spouse must sign this form'
    ],
    estimatedTime: '30 minutes',
    links: [
      { label: 'Download Form I-130A', url: 'https://www.uscis.gov/i-130a' }
    ]
  },

  'i-485': {
    displayName: 'Form I-485',
    subtitle: 'Application to Register Permanent Residence or Adjust Status',
    overview: 'This is the actual green card application. Your spouse (beneficiary) completes this form to apply for permanent resident status while in the US.',
    sections: [
      {
        title: 'Part 1: Information About You',
        tips: [
          'This is about the foreign spouse (applicant)',
          'Use name exactly as shown on passport',
          'A-Number only if you\'ve had prior immigration cases'
        ]
      },
      {
        title: 'Part 2: Application Type',
        tips: [
          'Select "Immediate relative of US citizen"',
          'You\'re filing based on approved/pending I-130',
          'Include the I-130 receipt number if you have it'
        ]
      },
      {
        title: 'Part 3: Processing Information',
        tips: [
          'List every entry to the US with dates',
          'Include all I-94 arrival numbers',
          'Be thorough about immigration history'
        ]
      },
      {
        title: 'Part 8: General Eligibility and Inadmissibility',
        tips: [
          'READ EVERY QUESTION CAREFULLY',
          'Answer honestly - lies can result in denial and bars',
          'If unsure about any question, consult an attorney',
          'Arrest without conviction still needs to be disclosed'
        ]
      }
    ],
    commonMistakes: [
      'Not listing all US entries',
      'Answering "No" to questions without reading carefully',
      'Not disclosing arrests (even without conviction)',
      'Inconsistent dates with other forms',
      'Forgetting to sign every required section'
    ],
    proTips: [
      'Part 8 is crucial - take your time with every question',
      'Any criminal history should be reviewed by an attorney first',
      'Attach extra sheets if needed for complete answers',
      'Include copies of all travel documents and I-94s',
      'Keep copies of everything you submit'
    ],
    estimatedTime: '3-5 hours',
    links: [
      { label: 'Official USCIS Instructions', url: 'https://www.uscis.gov/sites/default/files/document/forms/i-485instr.pdf' },
      { label: 'Download Form I-485', url: 'https://www.uscis.gov/i-485' }
    ]
  },

  'i-864': {
    displayName: 'Form I-864',
    subtitle: 'Affidavit of Support Under Section 213A of the INA',
    overview: 'The US citizen spouse promises to financially support the immigrant spouse at 125% of the federal poverty guidelines. This is a legally binding contract.',
    sections: [
      {
        title: 'Part 1: Basis for Filing',
        tips: [
          'You are the "sponsor" (US citizen petitioner)',
          'Select that you filed I-130 for this person',
          'This creates a legally enforceable obligation'
        ]
      },
      {
        title: 'Part 3: Sponsor\'s Household Size',
        tips: [
          'Count yourself (1)',
          'Add your spouse (1)',
          'Add any dependents you claim on taxes',
          'Household size determines income requirement'
        ]
      },
      {
        title: 'Part 6: Sponsor\'s Income and Employment',
        tips: [
          'Use your most recent tax return\'s Adjusted Gross Income',
          'Include all sources of income',
          'Employment must be current for the income to count'
        ]
      }
    ],
    commonMistakes: [
      'Using gross income instead of Adjusted Gross Income',
      'Forgetting to count spouse in household size',
      'Not including all required tax documents',
      'Math errors in totals',
      'Using outdated poverty guideline figures'
    ],
    proTips: [
      'For 2024: 125% poverty for household of 2 ≈ $24,650',
      'If income is too low, use assets worth 3x the shortfall',
      'Or get a joint sponsor who qualifies independently',
      'Include 3 years of tax returns plus W-2s',
      'Include recent pay stubs and employment letter'
    ],
    estimatedTime: '1-2 hours',
    links: [
      { label: 'Poverty Guidelines', url: 'https://aspe.hhs.gov/topics/poverty-economic-mobility/poverty-guidelines' },
      { label: 'Download Form I-864', url: 'https://www.uscis.gov/i-864' }
    ]
  },

  'i-864a': {
    displayName: 'Form I-864A',
    subtitle: 'Contract Between Sponsor and Household Member',
    overview: 'Use this form when you need a joint sponsor to help meet income requirements, or to use a household member\'s income.',
    sections: [
      {
        title: 'Part 2: Joint Sponsor Information',
        tips: [
          'Joint sponsor must be US citizen or LPR',
          'Must be at least 18 years old',
          'Must be domiciled in the US'
        ]
      },
      {
        title: 'Part 5: Income and Employment',
        tips: [
          'Joint sponsor must independently meet 125% poverty guidelines',
          'Their income is considered separately, not combined with yours',
          'Include full financial documentation for joint sponsor'
        ]
      }
    ],
    commonMistakes: [
      'Joint sponsor not being US citizen or LPR',
      'Joint sponsor living outside the US',
      'Not including joint sponsor\'s complete financial documents',
      'Thinking incomes can be combined (they cannot)'
    ],
    proTips: [
      'Joint sponsor takes on same legal obligation as you',
      'They\'re responsible if your spouse needs public benefits',
      'Obligation lasts until spouse becomes citizen or works 40 quarters',
      'Include joint sponsor\'s tax returns, W-2s, employment letter, pay stubs'
    ],
    estimatedTime: '1 hour',
    links: [
      { label: 'Download Form I-864A', url: 'https://www.uscis.gov/i-864a' }
    ]
  },

  'g-325a': {
    displayName: 'Form G-325A',
    subtitle: 'Biographic Information',
    overview: 'This form collects biographical data for FBI background checks. Accuracy is critical as this information is used for security screening.',
    sections: [
      {
        title: 'Personal Information',
        tips: [
          'Your spouse (applicant) fills this out',
          'List all names ever used',
          'Include maiden names and name changes'
        ]
      },
      {
        title: 'Address History',
        tips: [
          'List ALL addresses for past 5 years',
          'Include dates you lived at each address',
          'No gaps - account for all time periods'
        ]
      },
      {
        title: 'Employment History',
        tips: [
          'List all employment for past 5 years',
          'Include self-employment',
          'Account for periods of unemployment'
        ]
      }
    ],
    commonMistakes: [
      'Gaps in address or employment history',
      'Not including all names used',
      'Inconsistent dates with I-485',
      'Missing employer details'
    ],
    proTips: [
      'Keep a timeline of addresses and jobs to avoid gaps',
      'Use the same dates as on your I-485',
      'This info is verified during background checks',
      'Be thorough - inconsistencies cause delays'
    ],
    estimatedTime: '30 minutes',
    links: [
      { label: 'Download Form G-325A', url: 'https://www.uscis.gov/g-325a' }
    ]
  },

  'i-765': {
    displayName: 'Form I-765',
    subtitle: 'Application for Employment Authorization',
    overview: 'This form allows your spouse to work legally in the US while the green card application is pending. No additional fee when filed with I-485.',
    sections: [
      {
        title: 'Part 2: Eligibility Category',
        tips: [
          'Select category (c)(9) for pending I-485',
          'This is "Adjustment applicant"',
          'You must have a pending I-485 to use this category'
        ]
      },
      {
        title: 'Part 3: Applicant Information',
        tips: [
          'Use same name as on I-485',
          'Include current immigration status',
          'Provide A-Number if you have one'
        ]
      }
    ],
    commonMistakes: [
      'Selecting wrong eligibility category',
      'Using different name than other forms',
      'Not including photos',
      'Filing separately instead of with I-485 (unnecessary fee)'
    ],
    proTips: [
      'File this WITH your I-485 - no additional fee',
      'If filing separately later, there\'s a $410 fee',
      'Include 2 passport-style photos',
      'Processing takes 3-6 months typically',
      'EAD is valid for 2 years while pending'
    ],
    estimatedTime: '30 minutes',
    links: [
      { label: 'Download Form I-765', url: 'https://www.uscis.gov/i-765' },
      { label: 'Form Instructions', url: 'https://www.uscis.gov/sites/default/files/document/forms/i-765instr.pdf' }
    ]
  },

  'i-131': {
    displayName: 'Form I-131',
    subtitle: 'Application for Travel Document (Advance Parole)',
    overview: 'This allows your spouse to travel internationally while the green card is pending without abandoning the application. Critical if travel is needed.',
    sections: [
      {
        title: 'Part 2: Application Type',
        tips: [
          'Select "Advance Parole Document"',
          'This is for travel while I-485 is pending',
          'You cannot travel without this document'
        ]
      },
      {
        title: 'Part 4: Information About Proposed Travel',
        tips: [
          'List countries you plan to visit',
          'Provide estimated departure and return dates',
          'Explain purpose of travel (family visit, business, etc.)'
        ]
      }
    ],
    commonMistakes: [
      'Traveling before receiving the AP document',
      'Not including photos',
      'Listing too short a validity period'
    ],
    proTips: [
      'WARNING: Leaving US without AP abandons your I-485!',
      'File this WITH your I-485 - no additional fee',
      'Wait until you physically have the document before traveling',
      'Document is typically valid 1-2 years',
      'You can request multiple entries'
    ],
    estimatedTime: '30 minutes',
    links: [
      { label: 'Download Form I-131', url: 'https://www.uscis.gov/i-131' }
    ]
  }
};

// Get guidance for a specific form
export function getFormGuidance(formType) {
  return FORM_GUIDANCE[formType] || null;
}
