// K-1 Fiancé Visa Document Guidance
// Keys match document_name from the database

export const K1_GUIDANCE = {
  'Form I-129F': {
    description: 'The Petition for Alien Fiancé(e) is the main application form filed by the US citizen petitioner. This form establishes the relationship and requests approval for the fiancé(e) to enter the US.',
    steps: [
      'Download Form I-129F from USCIS.gov (always use the latest version)',
      'Complete all sections - Petitioner (US citizen) fills Parts 1-7',
      'Beneficiary (foreign fiancé(e)) completes their sections',
      'Both petitioner and beneficiary must sign and date the form',
      'Make a copy for your records before mailing',
      'Include the $535 filing fee (check or money order payable to "U.S. Department of Homeland Security")'
    ],
    tips: 'Double-check all dates and spelling of names. Any inconsistency with other documents can cause delays. Use N/A for questions that do not apply rather than leaving blank. Print clearly or type the form.',
    links: [
      { label: 'Download Form I-129F', url: 'https://www.uscis.gov/i-129f' },
      { label: 'Form Instructions (PDF)', url: 'https://www.uscis.gov/sites/default/files/document/forms/i-129finstr.pdf' },
      { label: 'Filing Fee Information', url: 'https://www.uscis.gov/forms/filing-fees' }
    ],
    estimatedTime: '2-4 hours',
    difficulty: 'moderate'
  },

  'Proof of US Citizenship': {
    description: 'Documentation proving the petitioner is a United States citizen. This is a fundamental requirement as only US citizens (not green card holders) can file a K-1 petition.',
    steps: [
      'Locate your US passport (most common and easiest proof)',
      'If no valid passport: obtain a certified copy of your birth certificate from vital records',
      'If naturalized: include a copy of your Naturalization Certificate (Form N-550 or N-570)',
      'If citizenship obtained through parents: include Certificate of Citizenship',
      'Make clear photocopies of front and back of all documents'
    ],
    tips: 'A US passport is the strongest single document. If using a birth certificate, ensure it is a certified copy with a raised seal or registrar stamp, not a photocopy of the original. Hospital birth certificates are NOT acceptable.',
    links: [
      { label: 'Request Birth Certificate by State', url: 'https://www.cdc.gov/nchs/w2w/index.htm' },
      { label: 'Replace Naturalization Certificate', url: 'https://www.uscis.gov/n-565' }
    ],
    estimatedTime: '1-4 weeks if ordering documents',
    difficulty: 'easy'
  },

  'Passport Photos': {
    description: '2x2 inch passport-style photos of both the petitioner and beneficiary. USCIS has specific requirements for acceptable photos that must be followed exactly.',
    steps: [
      'Take photos against a plain white or off-white background',
      'Face must be clearly visible with eyes open and neutral expression',
      'No glasses, hats, or head coverings (unless religious)',
      'Photos must be recent (taken within the last 6 months)',
      'Get 2 identical photos per person (4 total for the petition)',
      'Write your name lightly in pencil on the back of each photo'
    ],
    tips: 'Many pharmacies (CVS, Walgreens) and postal stores (UPS, FedEx) offer passport photo services for $10-15 per set. Online services like Costco Photo Center also work. Make sure photos meet all USCIS specifications to avoid delays.',
    links: [
      { label: 'USCIS Photo Requirements', url: 'https://www.uscis.gov/forms/filing-guidance/photo-requirements' }
    ],
    estimatedTime: '30 minutes',
    difficulty: 'easy'
  },

  'Proof of In-Person Meeting': {
    description: 'Evidence that the couple has met in person at least once within the two years before filing the petition. This is a critical requirement with very limited exceptions.',
    steps: [
      'Gather passport stamps showing travel to the same location at the same time',
      'Collect dated photos of you together (check photo metadata for date/location)',
      'Obtain boarding passes, flight itineraries, or ticket receipts',
      'Get hotel receipts or rental agreements showing stays together',
      'Include any social media posts or check-ins from meetings',
      'Write a brief statement describing when and where you met'
    ],
    tips: 'The more evidence types you have, the stronger your case. Passport stamps are very strong evidence. If photos lack visible dates, include a signed statement explaining when and where they were taken. Video calls do NOT satisfy this requirement.',
    links: [
      { label: 'Meeting Waiver Information', url: 'https://www.uscis.gov/family/family-of-us-citizens/visas-for-fiancees-of-us-citizens' }
    ],
    estimatedTime: '1-2 hours to gather',
    difficulty: 'moderate'
  },

  'Proof of Relationship': {
    description: 'Evidence demonstrating a genuine, ongoing relationship. This helps establish that the relationship is bona fide and not solely for immigration purposes.',
    steps: [
      'Export call logs showing regular communication (phone records)',
      'Print screenshots of text messages, WhatsApp, or other messaging apps',
      'Save emails showing ongoing correspondence',
      'Gather photos together at different times and locations',
      'Collect letters, cards, or gifts exchanged',
      'Include evidence of meeting each other\'s families (if applicable)',
      'Document any joint activities (travel together, shared accounts)'
    ],
    tips: 'Quality over quantity. A few meaningful conversations and photos showing your relationship developed over time are better than hundreds of generic "good morning" texts. Organize chronologically to show progression.',
    links: [],
    estimatedTime: '2-3 hours to compile',
    difficulty: 'moderate'
  },

  'Engagement Evidence': {
    description: 'While not strictly required, evidence of engagement strengthens your case by demonstrating genuine intent to marry within 90 days of entry.',
    steps: [
      'Include engagement ring receipt or photo of ring',
      'Gather engagement party photos or celebration images',
      'Collect wedding planning documents (venue deposits, save-the-dates, vendor contracts)',
      'Include cards or messages of congratulations from family/friends',
      'Document any engagement announcements (newspaper, social media)'
    ],
    tips: 'A simple affidavit stating your intent to marry within 90 days is sufficient if you don\'t have formal engagement evidence. The engagement ring doesn\'t need to be expensive - a receipt for any ring shows intent.',
    links: [],
    estimatedTime: '30 minutes to gather',
    difficulty: 'easy',
    strengthening_reason: 'Demonstrates genuine intent to marry and shows commitment to the relationship. Wedding planning evidence is particularly compelling.'
  },

  'Form I-134': {
    description: 'Affidavit of Support showing the US citizen petitioner can financially support the beneficiary. Required for the visa interview (not the initial I-129F filing).',
    steps: [
      'Download Form I-134 from USCIS.gov',
      'Complete all sections about your income, assets, and liabilities',
      'Sign the form in front of a notary (recommended but not required)',
      'Attach supporting financial documents (tax returns, pay stubs, bank statements)',
      'If income is below 125% of poverty guidelines, prepare to explain assets or joint sponsor'
    ],
    tips: 'For 2024, the 125% poverty guideline for a household of 2 is approximately $24,650. If your income is below this, you can include assets (savings, property) valued at 3x the shortfall, or arrange a joint sponsor who meets the requirements.',
    links: [
      { label: 'Download Form I-134', url: 'https://www.uscis.gov/i-134' },
      { label: 'Poverty Guidelines', url: 'https://aspe.hhs.gov/poverty-guidelines' }
    ],
    estimatedTime: '1-2 hours',
    difficulty: 'moderate'
  },

  'Petitioner Tax Returns': {
    description: 'Federal income tax returns (Form 1040) for the past 1-3 years showing the petitioner\'s income history and ability to support the beneficiary.',
    steps: [
      'Locate your filed tax returns for the past 3 years',
      'Include all pages, schedules, and W-2s',
      'If you cannot find them, request tax transcripts from the IRS',
      'Make clear photocopies of all documents',
      'If recently filed, ensure you have proof of filing'
    ],
    tips: 'Tax transcripts from the IRS are acceptable and often preferred if you cannot locate actual returns. Request them free online at IRS.gov or by calling 1-800-908-9946. Processing takes 5-10 business days.',
    links: [
      { label: 'Request Tax Transcripts Online', url: 'https://www.irs.gov/individuals/get-transcript' },
      { label: 'IRS Phone Request', url: 'https://www.irs.gov/taxtopics/tc156' }
    ],
    estimatedTime: '1-2 weeks if requesting transcripts',
    difficulty: 'easy'
  },

  'Petitioner Employment Letter': {
    description: 'A letter from your current employer confirming your employment status, job title, and annual salary or hourly wage.',
    steps: [
      'Request a letter from your HR department or direct supervisor',
      'Ensure it includes: your full name, job title, start date, and salary/wage',
      'Letter should be on official company letterhead',
      'Include a contact phone number for verification',
      'Date should be within 30 days of your visa interview'
    ],
    tips: 'If self-employed, provide a signed statement describing your business, copies of 1099 forms, business license, and business bank statements showing regular income. A CPA letter confirming your income is also helpful.',
    links: [],
    estimatedTime: '3-5 business days',
    difficulty: 'easy',
    strengthening_reason: 'Provides official verification of stable employment beyond tax returns. Shows job security and consistent income.'
  },

  'Petitioner Pay Stubs': {
    description: 'Recent pay stubs showing your current income. Typically the most recent 3-6 pay periods are requested.',
    steps: [
      'Gather your most recent 6 pay stubs',
      'Ensure your name and employer name are clearly visible',
      'Verify year-to-date earnings are shown',
      'If paid electronically, print from your payroll system',
      'Make clear copies of all stubs'
    ],
    tips: 'If you\'re paid in cash or tips, provide bank statements showing regular deposits along with a signed statement from your employer confirming your compensation. Self-employed individuals should provide business income records.',
    links: [],
    estimatedTime: '15 minutes',
    difficulty: 'easy',
    strengthening_reason: 'Shows current, up-to-date income verification. Tax returns show past income, but pay stubs prove ongoing earning capacity.'
  },

  'Divorce Decree': {
    description: 'If either the petitioner or beneficiary was previously married, proof that all prior marriages have been legally terminated is required.',
    steps: [
      'Obtain a certified copy of the final divorce decree from the court that issued it',
      'The decree must show the marriage was legally dissolved',
      'If the decree is not in English, obtain a certified translation',
      'Include divorce decrees for ALL previous marriages',
      'If marriage was annulled, include the annulment document'
    ],
    tips: 'The divorce must be FINALIZED before filing Form I-129F. A pending divorce will result in denial. Contact the court clerk where your divorce was filed to request certified copies. Fees vary by jurisdiction.',
    links: [],
    estimatedTime: '1-3 weeks to obtain copies',
    difficulty: 'moderate'
  },

  'Death Certificate': {
    description: 'If either party was previously married and their former spouse is deceased, a death certificate is required instead of a divorce decree.',
    steps: [
      'Obtain a certified copy of the death certificate',
      'Request from the vital records office in the state/country where the death occurred',
      'If not in English, obtain a certified translation',
      'Include proof of your marriage to the deceased (if applicable)'
    ],
    tips: 'Death certificates are issued by vital records offices, not funeral homes. Processing time varies by jurisdiction. International death certificates may need to be apostilled or authenticated.',
    links: [
      { label: 'US Vital Records by State', url: 'https://www.cdc.gov/nchs/w2w/index.htm' }
    ],
    estimatedTime: '1-4 weeks',
    difficulty: 'moderate'
  },

  'Police Certificates': {
    description: 'Criminal background check certificates from all countries where the beneficiary has lived for 6 or more months since age 16.',
    steps: [
      'List all countries where the beneficiary has lived 6+ months since age 16',
      'Check the DOS Reciprocity Schedule for each country\'s specific requirements',
      'Contact each country\'s embassy or national police authority',
      'Follow each country\'s application process (some require in-person visits)',
      'If certificates are not in English, obtain certified translations'
    ],
    tips: 'START THIS EARLY - it can take several months. Some countries mail certificates while others require in-person pickup. Some countries (like the US) don\'t issue police certificates. Check the Reciprocity Schedule for detailed country-by-country instructions.',
    links: [
      { label: 'DOS Reciprocity Schedule', url: 'https://travel.state.gov/content/travel/en/us-visas/Visa-Reciprocity-and-Civil-Documents-by-Country.html' }
    ],
    estimatedTime: '1-6 months depending on countries',
    difficulty: 'hard'
  },

  'Birth Certificate': {
    description: 'The beneficiary\'s (foreign fiancé(e)\'s) birth certificate showing their full name, date of birth, place of birth, and parents\' names.',
    steps: [
      'Obtain an official/certified copy from the civil registry in the country of birth',
      'Ensure it shows: full name, date of birth, place of birth, parents\' names',
      'If not in English, obtain a certified translation',
      'Include both the original language version and translation',
      'Some countries require apostille or authentication'
    ],
    tips: 'Some countries issue birth certificates that expire or must be recently issued. Check your country\'s requirements. If the birth was never registered, obtain a letter from the civil registry explaining this situation.',
    links: [],
    estimatedTime: '1-4 weeks',
    difficulty: 'moderate'
  },

  'Beneficiary Passport': {
    description: 'The foreign fiancé(e)\'s valid passport. The K-1 visa will be stamped in this passport, so it must be valid with sufficient blank pages.',
    steps: [
      'Check passport expiration date - must be valid for at least 6 months beyond intended entry',
      'Verify there are at least 2 blank visa pages',
      'If expired or expiring soon, renew the passport now',
      'Make clear photocopies of the bio/data page and all stamped pages',
      'Ensure name matches all other documents exactly'
    ],
    tips: 'The K-1 visa will be placed in this passport. If your name has changed since the passport was issued, get it updated before the visa interview. Some countries require additional processing time for passport renewals.',
    links: [],
    estimatedTime: '2-8 weeks if renewal needed',
    difficulty: 'easy'
  },

  'Medical Exam Results': {
    description: 'Medical examination by a USCIS-designated panel physician. This is required for the K-1 visa interview, not the initial I-129F filing.',
    steps: [
      'Find a designated panel physician through the US Embassy website for the beneficiary\'s country',
      'Schedule an appointment (may need to book several weeks ahead)',
      'Bring: passport, passport photos, vaccination records, appointment confirmation',
      'Complete the medical exam including required vaccinations',
      'Physician provides results in a sealed envelope - DO NOT OPEN'
    ],
    tips: 'Schedule the medical exam when your interview date is approaching, NOT at the start of the process. Results are typically valid for 6 months. Bring all vaccination records you have to potentially avoid repeat vaccinations.',
    links: [
      { label: 'Find Panel Physician', url: 'https://travel.state.gov/content/travel/en/us-visas/inova.html' },
      { label: 'Required Vaccinations', url: 'https://www.cdc.gov/immigrantrefugeehealth/panel-physicians/vaccinations.html' }
    ],
    estimatedTime: '1-2 days for exam, schedule when interview approaching',
    difficulty: 'moderate'
  },

};

// K-1 Process Timeline Phases
export const K1_TIMELINE = [
  {
    phase: 1,
    title: 'Start Here',
    description: 'These documents have long lead times - they take weeks or months to obtain. Start gathering them immediately to avoid delays later in the process.',
    duration: '1-6 months depending on countries',
    tips: 'Police certificates often take the longest. Birth certificates may need apostille or translation. Check passport expiration now.',
    docsNeeded: ['Police Certificates', 'Birth Certificate', 'Beneficiary Passport']
  },
  {
    phase: 2,
    title: 'Petitioner Identity',
    description: 'Documents proving the US citizen petitioner\'s identity and legal status. If previously married, include proof of divorce or spouse\'s death.',
    duration: '1-4 weeks if ordering documents',
    tips: 'A US passport is the strongest proof of citizenship. If using a birth certificate, ensure it\'s a certified copy with a raised seal.',
    docsNeeded: ['Proof of US Citizenship', 'Divorce Decree', 'Death Certificate']
  },
  {
    phase: 3,
    title: 'Relationship Evidence',
    description: 'Proof of your genuine, ongoing relationship and that you have met in person within the past 2 years.',
    duration: '2-4 hours to compile',
    tips: 'Quality over quantity. Show your relationship developed over time with photos, messages, and travel records.',
    docsNeeded: ['Proof of In-Person Meeting', 'Proof of Relationship']
  },
  {
    phase: 4,
    title: 'Complete I-129F Form',
    description: 'Fill out Form I-129F (Petition for Alien Fiancé(e)) and get passport photos. Do NOT mail yet - that\'s the next step.',
    duration: '2-4 hours',
    tips: 'Double-check all dates and spelling. Use N/A for questions that don\'t apply. Print clearly or type the form.',
    docsNeeded: ['Form I-129F', 'Passport Photos']
  },
  {
    phase: 5,
    title: 'Strengthen Your Case',
    description: 'These documents are not required, but including them makes your petition stronger and can help avoid RFEs (Requests for Evidence).',
    duration: '1-2 hours to gather',
    tips: 'Financial documents show you can support your fiancé(e). Engagement evidence demonstrates genuine intent to marry.',
    docsNeeded: ['Engagement Evidence', 'Petitioner Employment Letter', 'Petitioner Pay Stubs'],
    isOptional: true
  },
  {
    phase: 6,
    title: 'Mail Your Petition',
    description: 'Compile all documents from previous phases and mail your complete I-129F petition package to USCIS.',
    duration: '1-2 hours to organize and mail',
    tips: 'Send via USPS Priority Mail with tracking. Make copies of EVERYTHING before mailing. Keep your tracking number safe.',
    docsNeeded: [], // Uses custom MailingChecklist component
    isMailingPhase: true
  },
  {
    phase: 7,
    title: 'USCIS Processing',
    description: 'USCIS reviews your petition. You\'ll receive NOA1 (receipt notice) within 2-3 weeks, then wait for NOA2 (approval). After approval, your case transfers to the National Visa Center (NVC), then to the embassy.',
    duration: '6-10 months (varies)',
    tips: 'You don\'t need to do anything during this time except respond to any RFEs (Requests for Evidence). Track your case online with your receipt number.',
    docsNeeded: []
  },
  {
    phase: 8,
    title: 'Interview Preparation',
    description: 'Prepare these documents for the visa interview. The National Visa Center (NVC) will schedule your interview and notify you by email - you do NOT schedule it yourself.',
    duration: '1-2 weeks to prepare, plus medical exam',
    tips: 'The NVC schedules your interview after processing your case (typically 2-4 weeks after receiving your file). You\'ll get an interview appointment letter with the date.',
    docsNeeded: ['Form I-134', 'Petitioner Tax Returns', 'Medical Exam Results']
  },
  {
    phase: 9,
    title: 'Visa Interview',
    description: 'The beneficiary attends the interview at the US Embassy or Consulate with all required documents. The petitioner does NOT need to attend.',
    duration: 'Usually 1 day',
    tips: 'Bring ORIGINALS and copies of all documents. The medical exam results stay in the sealed envelope - do NOT open it. Dress professionally and answer questions honestly.',
    docsNeeded: []
  },
  {
    phase: 10,
    title: 'Entry & Marriage',
    description: 'After visa approval, travel to the US and marry within 90 days. Then file Form I-485 to adjust status to permanent resident.',
    duration: 'Marriage within 90 days, AOS takes 8-18 months',
    tips: 'Research marriage requirements in your state. File I-485 as soon as possible after marriage for work authorization.',
    docsNeeded: []
  }
];

// Document categories for grouping
export const DOCUMENT_CATEGORIES = [
  { id: 'identity', label: 'Identity & Status Documents', description: 'Core documents proving who you are' },
  { id: 'financial', label: 'Financial Documents', description: 'Proof of ability to support your fiancé(e)' },
  { id: 'supporting', label: 'Supporting Evidence', description: 'Documents supporting your relationship and application' }
];

// Optional documents that strengthen your case but aren't required
export const OPTIONAL_DOCS = [
  'Engagement Evidence',
  'Petitioner Employment Letter',
  'Petitioner Pay Stubs'
];

// Conditional documents - only required based on user's situation
export const CONDITIONAL_DOCS = [
  { name: 'Divorce Decree', condition: 'previously_married', prompt: 'Were you or your fiancé(e) previously married (and divorced)?' },
  { name: 'Death Certificate', condition: 'spouse_deceased', prompt: 'Were you or your fiancé(e) previously married to someone who is now deceased?' }
];
