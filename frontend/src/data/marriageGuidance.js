// Marriage-Based Green Card (Adjustment of Status) Document Guidance
// Keys match document_name from the database
// For spouses of US citizens adjusting status while in the US

export const MARRIAGE_GUIDANCE = {
  'Form I-130': {
    description: 'Petition for Alien Relative - the US citizen spouse files this to establish the family relationship. This is the first step in sponsoring your spouse for a green card.',
    steps: [
      'Download Form I-130 from USCIS.gov (always use the latest version)',
      'US citizen spouse (petitioner) completes all sections',
      'Include your marriage certificate as primary evidence',
      'Both petitioner and beneficiary must sign the form',
      'Include Form I-130A (Supplemental Information) with the petition',
      'Filing fee is $675 - use Form G-1450 (credit card) or G-1650 (bank transfer)'
    ],
    tips: 'You can file I-130 and I-485 concurrently (at the same time) since you are an immediate relative. This speeds up the process significantly compared to filing I-130 first and waiting for approval.',
    links: [
      { label: 'Download Form I-130', url: 'https://www.uscis.gov/i-130' },
      { label: 'Form Instructions (PDF)', url: 'https://www.uscis.gov/sites/default/files/document/forms/i-130instr.pdf' },
      { label: 'Filing Fee Information', url: 'https://www.uscis.gov/g-1055?form=i-130' }
    ],
    estimatedTime: '1-2 hours',
    difficulty: 'moderate'
  },

  'Form I-130A': {
    description: 'Supplemental Information for Spouse Beneficiary - provides additional biographic information about the foreign spouse. This form is required when filing I-130 for a spouse.',
    steps: [
      'Download Form I-130A from USCIS.gov',
      'The foreign spouse (beneficiary) completes this form',
      'Include information about employment history, addresses, parents',
      'Sign and date the form',
      'Submit together with Form I-130'
    ],
    tips: 'This form collects information that used to be on the I-130. It is now separate and required for all spouse petitions.',
    links: [
      { label: 'Download Form I-130A', url: 'https://www.uscis.gov/i-130a' }
    ],
    estimatedTime: '30 minutes',
    difficulty: 'easy'
  },

  'Form I-485': {
    description: 'Application to Register Permanent Residence or Adjust Status - this is the green card application itself. Since you are the spouse of a US citizen (immediate relative), you can file this concurrently with I-130.',
    steps: [
      'Download Form I-485 from USCIS.gov',
      'Foreign spouse (beneficiary/applicant) completes all sections',
      'Provide complete immigration history and all addresses for past 5 years',
      'Answer all questions about admissibility honestly',
      'Sign the form - signature certifies truthfulness of all information',
      'Filing fee is $1,440 (includes biometrics) - use Form G-1450 or G-1650'
    ],
    tips: 'Read Part 8 (General Eligibility and Inadmissibility Grounds) very carefully. Any issues with criminal history, prior visa overstays, or misrepresentation should be discussed with an attorney before filing.',
    links: [
      { label: 'Download Form I-485', url: 'https://www.uscis.gov/i-485' },
      { label: 'Form Instructions (PDF)', url: 'https://www.uscis.gov/sites/default/files/document/forms/i-485instr.pdf' },
      { label: 'Filing Fee Information', url: 'https://www.uscis.gov/g-1055?form=i-485' }
    ],
    estimatedTime: '3-5 hours',
    difficulty: 'moderate'
  },

  'Form I-864': {
    description: 'Affidavit of Support Under Section 213A of the INA - the US citizen spouse promises to financially support the immigrant spouse at 125% of the federal poverty guidelines.',
    steps: [
      'Download Form I-864 from USCIS.gov',
      'US citizen spouse (sponsor) completes the form',
      'Include your household size (you, spouse, and any dependents)',
      'Attach supporting financial documents (tax returns, pay stubs, employment letter)',
      'Sign the form - this creates a legally enforceable contract',
      'If income is below threshold, consider a joint sponsor (Form I-864A)'
    ],
    tips: 'For 2024, the 125% poverty guideline for a household of 2 is approximately $24,650. Include all sources of income. If using assets instead of income, asset value must be 3x the income shortfall.',
    links: [
      { label: 'Download Form I-864', url: 'https://www.uscis.gov/i-864' },
      { label: 'Poverty Guidelines', url: 'https://aspe.hhs.gov/poverty-guidelines' }
    ],
    estimatedTime: '1-2 hours',
    difficulty: 'moderate'
  },

  'Form I-864A': {
    description: 'Contract Between Sponsor and Household Member - used when a joint sponsor is needed to meet income requirements, or when household member income is being used.',
    steps: [
      'Download Form I-864A from USCIS.gov',
      'Joint sponsor completes the form',
      'Joint sponsor must be a US citizen or lawful permanent resident',
      'Joint sponsor must meet 125% poverty guidelines independently',
      'Include joint sponsor\'s tax returns, employment letter, and pay stubs',
      'Both sponsors sign - creates binding legal obligation'
    ],
    tips: 'A joint sponsor takes on the same legal responsibility as the primary sponsor. They must live in the US and file US taxes. The joint sponsor\'s household income is considered separately.',
    links: [
      { label: 'Download Form I-864A', url: 'https://www.uscis.gov/i-864a' }
    ],
    estimatedTime: '1 hour',
    difficulty: 'moderate'
  },

  'Form G-325A': {
    description: 'Biographic Information - collects biographical data for background checks. Required for adjustment of status applications.',
    steps: [
      'Download Form G-325A from USCIS.gov',
      'Foreign spouse (applicant) completes the form',
      'List all addresses for the past 5 years',
      'List all employment for the past 5 years',
      'Include all names ever used (maiden name, nicknames)',
      'Sign and date the form'
    ],
    tips: 'Be thorough and accurate with dates and addresses. Information on this form is used for FBI background checks. Inconsistencies can delay processing.',
    links: [
      { label: 'Download Form G-325A', url: 'https://www.uscis.gov/g-325a' }
    ],
    estimatedTime: '30 minutes',
    difficulty: 'easy'
  },

  'Form I-765': {
    description: 'Application for Employment Authorization Document (EAD) - allows you to work legally in the US while your green card application is pending.',
    steps: [
      'Download Form I-765 from USCIS.gov',
      'Select category (c)(9) for pending adjustment of status',
      'Include 2 passport-style photos',
      'There is NO filing fee when filed with I-485 - it\'s included',
      'You\'ll receive an EAD card valid for 2 years',
      'Can be renewed if green card is still pending'
    ],
    tips: 'Filing this is optional but highly recommended. An EAD lets you work for any employer while waiting for your green card. Processing takes 3-6 months typically.',
    links: [
      { label: 'Download Form I-765', url: 'https://www.uscis.gov/i-765' },
      { label: 'Form Instructions', url: 'https://www.uscis.gov/sites/default/files/document/forms/i-765instr.pdf' }
    ],
    estimatedTime: '30 minutes',
    difficulty: 'easy'
  },

  'Form I-131': {
    description: 'Application for Travel Document (Advance Parole) - allows you to travel outside the US while your green card application is pending without abandoning your case.',
    steps: [
      'Download Form I-131 from USCIS.gov',
      'Select document type: Advance Parole',
      'Include 2 passport-style photos',
      'There is NO filing fee when filed with I-485 - it\'s included',
      'Document is typically valid for 1-2 years',
      'MUST have the document in hand before traveling'
    ],
    tips: 'WARNING: If you leave the US without Advance Parole while your I-485 is pending, your application will be abandoned. Wait for the AP document before any international travel.',
    links: [
      { label: 'Download Form I-131', url: 'https://www.uscis.gov/i-131' }
    ],
    estimatedTime: '30 minutes',
    difficulty: 'easy'
  },

  'Form I-693': {
    description: 'Report of Medical Examination and Vaccination Record - completed by a USCIS-designated civil surgeon. Required for the green card interview.',
    steps: [
      'Find a designated civil surgeon using USCIS\'s online tool',
      'Schedule an appointment (book early as it can take weeks)',
      'Bring: passport, vaccination records, I-693 form (partially filled)',
      'Complete the medical exam including required vaccinations',
      'Doctor seals results in envelope - DO NOT OPEN',
      'Submit at your interview (or earlier if requested)'
    ],
    tips: 'Results are valid for 2 years from the civil surgeon\'s signature (or 4 years from exam date if submitted within 60 days of exam). Schedule this closer to your interview date to ensure validity.',
    links: [
      { label: 'Download Form I-693', url: 'https://www.uscis.gov/i-693' },
      { label: 'Find Civil Surgeon', url: 'https://my.uscis.gov/findadoctor' },
      { label: 'Required Vaccinations', url: 'https://www.cdc.gov/immigrantrefugeehealth/panel-physicians/vaccinations.html' }
    ],
    estimatedTime: '2-4 hours for appointment',
    difficulty: 'moderate'
  },

  'Payment Authorization Form': {
    description: 'USCIS no longer accepts checks or money orders. You must include a payment authorization form to pay filing fees.',
    steps: [
      'Choose your payment method: credit/debit card (G-1450) or bank transfer (G-1650)',
      'Download the appropriate form from USCIS.gov',
      'Fill out the form completely with payment details',
      'For concurrent filing: I-130 ($675) + I-485 ($1,440) = $2,115 total',
      'Sign and date the form',
      'Include with your petition package'
    ],
    tips: 'Most applicants use G-1450 (credit card) as it\'s simpler. You can use one G-1450 for the total amount or separate forms for each filing fee. Keep a copy for your records.',
    links: [
      { label: 'Form G-1450 (Credit Card)', url: 'https://www.uscis.gov/g-1450' },
      { label: 'Form G-1650 (Bank Transfer)', url: 'https://www.uscis.gov/g-1650' }
    ],
    estimatedTime: '5 minutes',
    difficulty: 'easy'
  },

  'Proof of US Citizenship': {
    description: 'Documentation proving the petitioner (US citizen spouse) is a United States citizen. This establishes that the petitioner can sponsor an immediate relative.',
    steps: [
      'Locate your US passport (most common and easiest proof)',
      'If no valid passport: obtain a certified copy of your birth certificate',
      'If naturalized: include a copy of your Naturalization Certificate (N-550 or N-570)',
      'If citizenship through parents: include Certificate of Citizenship',
      'Make clear photocopies of front and back of all documents'
    ],
    tips: 'A US passport is the strongest single document. If using a birth certificate, it must be a certified copy with a raised seal or registrar stamp from vital records, not a hospital certificate.',
    links: [
      { label: 'Request Birth Certificate by State', url: 'https://www.cdc.gov/nchs/w2w/index.htm' },
      { label: 'Replace Naturalization Certificate', url: 'https://www.uscis.gov/n-565' }
    ],
    estimatedTime: '1-4 weeks if ordering documents',
    difficulty: 'easy'
  },

  'Marriage Certificate': {
    description: 'Certified copy of your marriage certificate proving you are legally married. This is the most critical document in your petition.',
    steps: [
      'Obtain a certified copy from the county clerk or vital records office where you married',
      'If married abroad, obtain from the civil registry in that country',
      'Ensure it shows: names of both parties, date of marriage, officiant, location',
      'If not in English, obtain a certified translation',
      'Include both the original language document and translation'
    ],
    tips: 'USCIS requires a certified copy (with a seal or stamp), not a photocopy of your original. If married abroad, you may need an apostille. Translations must include a certification statement.',
    links: [
      { label: 'US Vital Records by State', url: 'https://www.cdc.gov/nchs/w2w/index.htm' }
    ],
    estimatedTime: '1-2 weeks to obtain',
    difficulty: 'easy'
  },

  'Marriage Certificate Translation': {
    description: 'Certified English translation of your marriage certificate if the original is not in English.',
    steps: [
      'Find a qualified translator (does not need to be certified, but must be competent)',
      'Translate the entire document word-for-word',
      'Include a certification statement signed by the translator',
      'Certification should state: "I certify that I am competent to translate from [language] to English and that the above translation is complete and accurate."',
      'Include translator\'s name, signature, and date'
    ],
    tips: 'You can translate documents yourself (or have a friend do it) as long as you include the certification statement. Professional translation services are available but not required.',
    links: [],
    estimatedTime: '1-2 hours',
    difficulty: 'easy'
  },

  'Passport Photos': {
    description: '2x2 inch passport-style photos for both spouses. Multiple sets are needed for the various forms.',
    steps: [
      'Take photos against a plain white or off-white background',
      'Face must be clearly visible with neutral expression, eyes open',
      'No glasses, hats, or head coverings (unless religious)',
      'Photos must be recent (taken within last 6 months)',
      'Get at least 6 identical photos of the foreign spouse',
      'Get at least 2 photos of the US citizen spouse',
      'Write full name lightly in pencil on back of each photo'
    ],
    tips: 'You\'ll need multiple sets: I-485 needs 2, I-765 needs 2, I-131 needs 2. Get extras in case of mistakes. Many pharmacies and postal stores offer passport photo services.',
    links: [
      { label: 'USCIS Photo Requirements', url: 'https://www.uscis.gov/forms/filing-guidance/photo-requirements' }
    ],
    estimatedTime: '30 minutes',
    difficulty: 'easy'
  },

  'Evidence of Lawful Entry': {
    description: 'Proof that the foreign spouse entered the US legally. This is required for adjustment of status eligibility.',
    steps: [
      'Locate your Form I-94 arrival/departure record',
      'Print I-94 from CBP website using passport info',
      'Include copies of visa stamp in passport that allowed entry',
      'Copy passport page with entry stamps',
      'If entered with ESTA: print ESTA approval and I-94'
    ],
    tips: 'Adjustment of status generally requires lawful admission to the US. If you entered without inspection (crossed border without documents), consult an immigration attorney - you may need to use a different process.',
    links: [
      { label: 'Get I-94 Online', url: 'https://i94.cbp.dhs.gov/I94/' }
    ],
    estimatedTime: '15 minutes',
    difficulty: 'easy'
  },

  'Petitioner Government ID': {
    description: 'Government-issued photo ID of the US citizen spouse (petitioner) for identity verification.',
    steps: [
      'Copy front and back of a current, valid government-issued ID',
      'US driver\'s license is most common',
      'State ID card is also acceptable',
      'US passport can serve as both citizenship proof and ID'
    ],
    tips: 'Make sure the ID is not expired. A clear, readable photocopy is sufficient - no need to send original documents.',
    links: [],
    estimatedTime: '5 minutes',
    difficulty: 'easy'
  },

  'Proof of Genuine Marriage': {
    description: 'Evidence that your marriage is bona fide (genuine) and not entered into solely for immigration purposes. USCIS will carefully evaluate your relationship.',
    steps: [
      'Joint bank account statements showing both names',
      'Joint lease or mortgage documents',
      'Joint utility bills, insurance policies',
      'Photos of your relationship over time (dating, wedding, daily life)',
      'Joint ownership documents (car titles, property deeds)',
      'Birth certificates of children born to the marriage',
      'Affidavits from friends and family attesting to relationship'
    ],
    tips: 'Quality over quantity. Show commingling of finances, shared residence, and genuine relationship. If you haven\'t lived together long, include more photos and communication records. Wedding photos alone are not enough.',
    links: [],
    estimatedTime: '2-4 hours to compile',
    difficulty: 'moderate'
  },

  'Birth Certificate': {
    description: 'The foreign spouse\'s (beneficiary\'s) birth certificate showing full name, date of birth, place of birth, and parents\' names.',
    steps: [
      'Obtain an official/certified copy from the civil registry in country of birth',
      'Ensure it shows: full name, date of birth, place of birth, parents\' names',
      'If not in English, obtain a certified translation',
      'Include both the original language version and translation'
    ],
    tips: 'Some countries issue birth certificates that expire or must be recently issued. Check your country\'s requirements. If the birth was never registered, obtain a letter from the civil registry explaining this.',
    links: [
      { label: 'Country-Specific Requirements', url: 'https://travel.state.gov/content/travel/en/us-visas/Visa-Reciprocity-and-Civil-Documents-by-Country.html' }
    ],
    estimatedTime: '1-4 weeks',
    difficulty: 'moderate'
  },

  'Beneficiary Passport': {
    description: 'The foreign spouse\'s valid passport. A copy is needed for the application, and the original must be brought to the interview.',
    steps: [
      'Make photocopies of the bio/data page',
      'Copy all pages with stamps or visas',
      'Ensure passport is valid (does not need to remain valid through processing)',
      'If expired, include a copy anyway and note the new passport info if renewed'
    ],
    tips: 'Unlike visa applications, your passport does not need to be valid for 6 months beyond filing. However, you\'ll need a valid passport if you plan to travel with Advance Parole.',
    links: [],
    estimatedTime: '10 minutes',
    difficulty: 'easy'
  },

  'Police Certificates': {
    description: 'Criminal background check certificates from all countries where the foreign spouse has lived for 6 or more months since age 16.',
    steps: [
      'List all countries where you\'ve lived 6+ months since age 16',
      'Check the DOS Reciprocity Schedule for each country\'s requirements',
      'Contact each country\'s embassy or national police authority',
      'Follow each country\'s application process',
      'If certificates are not in English, obtain certified translations'
    ],
    tips: 'START THIS EARLY - can take months for some countries. Some countries (like the US) don\'t issue police certificates for immigration purposes. The Reciprocity Schedule has detailed country-by-country instructions.',
    links: [
      { label: 'DOS Reciprocity Schedule', url: 'https://travel.state.gov/content/travel/en/us-visas/Visa-Reciprocity-and-Civil-Documents-by-Country.html' }
    ],
    estimatedTime: '1-6 months depending on countries',
    difficulty: 'hard'
  },

  'Divorce Decree': {
    description: 'If either spouse was previously married, proof that all prior marriages were legally terminated is required.',
    steps: [
      'Obtain a certified copy of the final divorce decree from the court',
      'The decree must show the marriage was legally dissolved',
      'If not in English, obtain a certified translation',
      'Include divorce decrees for ALL previous marriages (both spouses)',
      'If annulled, include the annulment document'
    ],
    tips: 'Both spouses must be legally free to marry. Contact the court clerk where your divorce was filed to request certified copies. If your divorce was abroad, you may need to verify it was properly finalized.',
    links: [],
    estimatedTime: '1-3 weeks to obtain copies',
    difficulty: 'moderate'
  },

  'Death Certificate': {
    description: 'If either spouse\'s prior marriage ended by death of the former spouse, a death certificate is required instead of a divorce decree.',
    steps: [
      'Obtain a certified copy of the death certificate',
      'Request from vital records office where the death occurred',
      'If not in English, obtain a certified translation',
      'Include proof of your marriage to the deceased if applicable'
    ],
    tips: 'Death certificates are issued by vital records offices, not funeral homes. International death certificates may need authentication or apostille.',
    links: [
      { label: 'US Vital Records by State', url: 'https://www.cdc.gov/nchs/w2w/index.htm' }
    ],
    estimatedTime: '1-4 weeks',
    difficulty: 'moderate'
  },

  'Petitioner Tax Returns': {
    description: 'Federal income tax returns for the past 3 years from the US citizen spouse, showing income history for the Affidavit of Support.',
    steps: [
      'Locate filed tax returns (Form 1040) for past 3 years',
      'Include all pages, schedules, and W-2s/1099s',
      'If cannot find them, request tax transcripts from the IRS',
      'Most recent year is most important, but include all 3',
      'If recently filed, include proof of filing'
    ],
    tips: 'Tax transcripts from the IRS are acceptable if you cannot find your returns. Request them free online at IRS.gov. Most recent tax year is required; prior 2 years recommended.',
    links: [
      { label: 'Request Tax Transcripts', url: 'https://www.irs.gov/individuals/get-transcript' }
    ],
    estimatedTime: '1-2 weeks if requesting transcripts',
    difficulty: 'easy'
  },

  'Petitioner Employment Letter': {
    description: 'A letter from the US citizen spouse\'s employer confirming current employment, position, and salary.',
    steps: [
      'Request a letter from HR department or direct supervisor',
      'Letter should be on official company letterhead',
      'Must include: full name, job title, start date, salary or hourly wage',
      'Include employer contact information for verification',
      'Date should be recent (within 30 days of filing)'
    ],
    tips: 'If self-employed, provide a signed statement describing your business, recent business tax returns, 1099s, business license, and bank statements showing income.',
    links: [],
    estimatedTime: '3-5 business days',
    difficulty: 'easy'
  },

  'Petitioner Pay Stubs': {
    description: 'Recent pay stubs from the US citizen spouse showing current income. Typically the most recent 6 months.',
    steps: [
      'Gather most recent 6 pay stubs',
      'Ensure your name and employer name are visible',
      'Year-to-date earnings should be shown',
      'If paid electronically, print from payroll system',
      'Make clear copies'
    ],
    tips: 'Pay stubs show current, ongoing income (tax returns show historical income). If you recently started a new job, include your offer letter as well.',
    links: [],
    estimatedTime: '15 minutes',
    difficulty: 'easy'
  },

  'Joint Sponsor Tax Returns': {
    description: 'If using a joint sponsor to meet income requirements, the joint sponsor must provide their tax returns.',
    steps: [
      'Joint sponsor provides past 3 years of tax returns',
      'Include all W-2s/1099s and schedules',
      'Joint sponsor must meet 125% poverty guideline independently',
      'Include joint sponsor\'s I-864A and employment documentation'
    ],
    tips: 'A joint sponsor must be a US citizen or permanent resident, at least 18 years old, and domiciled in the US. They take on the same financial obligation as the primary sponsor.',
    links: [],
    estimatedTime: 'Varies',
    difficulty: 'moderate'
  }
};

// Marriage-Based Green Card Process Timeline Phases
export const MARRIAGE_TIMELINE = [
  {
    phase: 1,
    title: 'Start Here',
    description: 'These documents have long lead times. Start gathering them immediately to avoid delays later in the process.',
    duration: '1-6 months depending on countries',
    tips: 'Police certificates often take the longest. Birth certificates may need apostille or translation. Order these first!',
    docsNeeded: ['Police Certificates', 'Birth Certificate', 'Beneficiary Passport'],
    video: {
      title: 'Getting Started: Documents with Long Lead Times',
      description: 'Which documents to start gathering first and why timing matters.'
    }
  },
  {
    phase: 2,
    title: 'Petitioner Documents',
    description: 'Documents proving the US citizen spouse\'s identity and legal status.',
    duration: '1-4 weeks if ordering documents',
    tips: 'A US passport is the strongest proof of citizenship. Gather divorce/death records for any prior marriages.',
    docsNeeded: ['Proof of US Citizenship', 'Petitioner Government ID', 'Divorce Decree', 'Death Certificate'],
    video: {
      title: 'Proving US Citizenship',
      description: 'What documents prove citizenship and how to get certified copies.'
    }
  },
  {
    phase: 3,
    title: 'Relationship Evidence',
    description: 'Evidence demonstrating your marriage is genuine and not entered solely for immigration purposes.',
    duration: '2-4 hours to compile',
    tips: 'Show commingling of finances, shared residence, photos over time. Quality matters more than quantity.',
    docsNeeded: ['Proof of Genuine Marriage'],
    video: {
      title: 'Building Strong Relationship Evidence',
      description: 'What evidence USCIS looks for and how to organize it effectively.'
    }
  },
  {
    phase: 4,
    title: 'Marriage Certificate',
    description: 'Your certified marriage certificate is the foundation of your petition.',
    duration: 'Already have or 1-2 weeks to order',
    tips: 'Must be a certified copy with seal/stamp. If not in English, include a certified translation.',
    docsNeeded: ['Marriage Certificate', 'Marriage Certificate Translation'],
    video: {
      title: 'Marriage Certificate Requirements',
      description: 'What makes a valid marriage certificate and how to get translations.'
    }
  },
  {
    phase: 5,
    title: 'Form I-130',
    description: 'Complete the Petition for Alien Relative. This establishes the qualifying family relationship.',
    duration: '1-2 hours',
    tips: 'The US citizen spouse is the petitioner. Include Form I-130A (required for spouse petitions).',
    docsNeeded: ['Form I-130', 'Form I-130A', 'Passport Photos'],
    video: {
      title: 'Form I-130 Walkthrough',
      description: 'Step-by-step guide to completing the alien relative petition.'
    }
  },
  {
    phase: 6,
    title: 'Form I-485',
    description: 'Complete the Application to Adjust Status. This is the actual green card application.',
    duration: '3-5 hours',
    tips: 'Read Part 8 (inadmissibility) carefully. Be honest about all travel, arrests, or immigration violations.',
    docsNeeded: ['Form I-485', 'Form G-325A', 'Evidence of Lawful Entry', 'Passport Photos'],
    video: {
      title: 'Form I-485 Walkthrough',
      description: 'How to complete the adjustment of status application correctly.'
    }
  },
  {
    phase: 7,
    title: 'Form I-864',
    description: 'Complete the Affidavit of Support. The US citizen spouse must demonstrate ability to financially support.',
    duration: '1-2 hours',
    tips: 'Need 125% of poverty guidelines for household size. Include tax returns, pay stubs, and employment letter.',
    docsNeeded: ['Form I-864', 'Petitioner Tax Returns', 'Petitioner Employment Letter', 'Petitioner Pay Stubs', 'Form I-864A', 'Joint Sponsor Tax Returns'],
    video: {
      title: 'Form I-864 and Financial Requirements',
      description: 'Understanding income requirements and what documents to include.'
    }
  },
  {
    phase: 8,
    title: 'Optional: Work/Travel',
    description: 'Optionally file for work authorization (EAD) and travel document (Advance Parole) while your case is pending.',
    duration: '1-2 hours',
    tips: 'No additional fee when filed with I-485. Highly recommended so you can work and travel during the 6-12 month wait.',
    docsNeeded: ['Form I-765', 'Form I-131'],
    isOptional: true,
    video: {
      title: 'Work and Travel While Pending',
      description: 'Why you should file for EAD and Advance Parole and how to do it.'
    }
  },
  {
    phase: 9,
    title: 'Mail Your Package',
    description: 'Compile all documents and mail your complete petition package to USCIS.',
    duration: '1-2 hours to organize and mail',
    tips: 'Use tracking! Make copies of EVERYTHING. Organize with tabs or dividers. Cover letter helps.',
    docsNeeded: [],
    isMailingPhase: true,
    video: {
      title: 'Assembling Your Petition Package',
      description: 'How to organize and mail your documents to USCIS.'
    }
  },
  {
    phase: 10,
    title: 'USCIS Processing',
    description: 'USCIS processes your petition. You\'ll receive receipt notices, attend biometrics, and wait for interview scheduling.',
    duration: '6-12 months (varies by office)',
    tips: 'Track your case online with your receipt number. Respond promptly to any RFEs (Requests for Evidence).',
    docsNeeded: [],
    video: {
      title: 'What Happens During Processing',
      description: 'Timeline expectations, biometrics appointment, and tracking your case.'
    }
  },
  {
    phase: 11,
    title: 'Interview Preparation',
    description: 'Complete your medical exam and prepare for the USCIS interview.',
    duration: '2-4 weeks before interview',
    tips: 'Schedule medical exam when interview is approaching. Bring updated relationship evidence if months have passed.',
    docsNeeded: ['Form I-693'],
    video: {
      title: 'Medical Exam and Interview Prep',
      description: 'What to expect at the civil surgeon and how to prepare for your interview.'
    }
  },
  {
    phase: 12,
    title: 'Green Card Interview',
    description: 'Attend your interview at the local USCIS field office with your spouse.',
    duration: 'Usually same day decision',
    tips: 'Both spouses attend together. Bring ALL original documents. Dress professionally. Answer honestly.',
    docsNeeded: [],
    video: {
      title: 'The Green Card Interview',
      description: 'Common questions, what to bring, and tips for success.'
    }
  }
];

// Document categories for grouping
export const DOCUMENT_CATEGORIES = [
  { id: 'identity', label: 'Identity & Status Documents', description: 'Core documents proving identity and relationship' },
  { id: 'financial', label: 'Financial Documents', description: 'Proof of ability to financially support' },
  { id: 'supporting', label: 'Supporting Evidence', description: 'Documents supporting your application' }
];

// Optional documents - recommended but not required
export const OPTIONAL_DOCS = [
  'Form I-765',
  'Form I-131'
];

// Conditional documents - only required based on user's situation
export const CONDITIONAL_DOCS = [
  { name: 'Divorce Decree', condition: 'previously_married', prompt: 'Were you or your spouse previously married (and divorced)?' },
  { name: 'Death Certificate', condition: 'spouse_deceased', prompt: 'Did a previous marriage end due to spouse\'s death?' },
  { name: 'Marriage Certificate Translation', condition: 'marriage_cert_not_english', prompt: 'Is your marriage certificate in a language other than English?' },
  { name: 'Form I-864A', condition: 'needs_joint_sponsor', prompt: 'Do you need a joint sponsor to meet income requirements?' },
  { name: 'Joint Sponsor Tax Returns', condition: 'needs_joint_sponsor', prompt: 'Do you need a joint sponsor to meet income requirements?' }
];
