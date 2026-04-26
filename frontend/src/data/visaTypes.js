/**
 * US Visa Types and Information
 * Used for assessment results and DIY application guidance
 */

export const VISA_TYPES = {
  h1b: {
    code: 'h1b',
    name: 'H-1B Specialty Occupation',
    category: 'work',
    description: 'For workers in specialty occupations requiring at least a bachelor\'s degree',
    requirements: {
      minDegree: 'bachelors',
      jobOffer: true,
      employerSponsorship: true,
      specialtyOccupation: true
    },
    timeline: {
      standard: 180,
      premium: 15
    },
    costs: {
      governmentFees: 2500,
      attorneyFeeLow: 2000,
      attorneyFeeHigh: 5000
    },
    diyDifficulty: 'advanced',
    annualCap: 85000,
    notes: 'Subject to annual lottery. Applications accepted April 1st for October 1st start.'
  },

  l1a: {
    code: 'l1a',
    name: 'L-1A Intracompany Transferee (Manager/Executive)',
    category: 'work',
    description: 'For managers and executives transferring within a multinational company',
    requirements: {
      minDegree: null,
      jobOffer: true,
      employerSponsorship: true,
      multinationalEmployment: true,
      minTimeAbroad: 12, // months
      managerialRole: true
    },
    timeline: {
      standard: 90,
      premium: 15
    },
    costs: {
      governmentFees: 1500,
      attorneyFeeLow: 3000,
      attorneyFeeHigh: 8000
    },
    diyDifficulty: 'expert_only',
    annualCap: null,
    notes: 'No annual cap. Can lead to EB-1C green card.'
  },

  l1b: {
    code: 'l1b',
    name: 'L-1B Intracompany Transferee (Specialized Knowledge)',
    category: 'work',
    description: 'For employees with specialized knowledge transferring within a multinational company',
    requirements: {
      minDegree: null,
      jobOffer: true,
      employerSponsorship: true,
      multinationalEmployment: true,
      minTimeAbroad: 12,
      specializedKnowledge: true
    },
    timeline: {
      standard: 90,
      premium: 15
    },
    costs: {
      governmentFees: 1500,
      attorneyFeeLow: 3000,
      attorneyFeeHigh: 8000
    },
    diyDifficulty: 'expert_only',
    annualCap: null,
    notes: 'Specialized knowledge must be specific to company products/services.'
  },

  o1a: {
    code: 'o1a',
    name: 'O-1A Extraordinary Ability (Sciences/Business)',
    category: 'work',
    description: 'For individuals with extraordinary ability in sciences, business, education, or athletics',
    requirements: {
      minDegree: null,
      jobOffer: true,
      extraordinaryAbility: true,
      sustainedAcclaim: true
    },
    timeline: {
      standard: 60,
      premium: 15
    },
    costs: {
      governmentFees: 1000,
      attorneyFeeLow: 5000,
      attorneyFeeHigh: 15000
    },
    diyDifficulty: 'expert_only',
    annualCap: null,
    notes: 'Requires evidence of national/international recognition. No cap.'
  },

  o1b: {
    code: 'o1b',
    name: 'O-1B Extraordinary Ability (Arts)',
    category: 'work',
    description: 'For individuals with extraordinary achievement in arts, film, or television',
    requirements: {
      minDegree: null,
      jobOffer: true,
      extraordinaryAbility: true,
      artsField: true
    },
    timeline: {
      standard: 60,
      premium: 15
    },
    costs: {
      governmentFees: 1000,
      attorneyFeeLow: 5000,
      attorneyFeeHigh: 15000
    },
    diyDifficulty: 'expert_only',
    annualCap: null,
    notes: 'Standard is "distinction" which is lower than O-1A extraordinary ability.'
  },

  eb1a: {
    code: 'eb1a',
    name: 'EB-1A Extraordinary Ability Green Card',
    category: 'green_card',
    description: 'Green card for individuals with extraordinary ability in their field',
    requirements: {
      minDegree: null,
      jobOffer: false,
      extraordinaryAbility: true,
      sustainedAcclaim: true,
      continueWorkInField: true
    },
    timeline: {
      standard: 365,
      premium: 45
    },
    costs: {
      governmentFees: 3500,
      attorneyFeeLow: 8000,
      attorneyFeeHigh: 25000
    },
    diyDifficulty: 'expert_only',
    annualCap: null,
    notes: 'Self-petition allowed. No job offer required. Priority date often current.'
  },

  eb1b: {
    code: 'eb1b',
    name: 'EB-1B Outstanding Researcher Green Card',
    category: 'green_card',
    description: 'Green card for outstanding professors and researchers',
    requirements: {
      minDegree: 'phd',
      jobOffer: true,
      employerSponsorship: true,
      researchExperience: true,
      internationalRecognition: true
    },
    timeline: {
      standard: 365,
      premium: 45
    },
    costs: {
      governmentFees: 3500,
      attorneyFeeLow: 8000,
      attorneyFeeHigh: 20000
    },
    diyDifficulty: 'expert_only',
    annualCap: null,
    notes: 'Requires 3+ years of research experience and international recognition.'
  },

  eb2_niw: {
    code: 'eb2_niw',
    name: 'EB-2 National Interest Waiver Green Card',
    category: 'green_card',
    description: 'Green card for those whose work benefits the US national interest',
    requirements: {
      minDegree: 'masters',
      jobOffer: false,
      nationalInterest: true,
      advancedDegreeOrExceptional: true
    },
    timeline: {
      standard: 730, // 2 years due to backlogs
      premium: null
    },
    costs: {
      governmentFees: 3500,
      attorneyFeeLow: 6000,
      attorneyFeeHigh: 15000
    },
    diyDifficulty: 'advanced',
    annualCap: null,
    notes: 'Self-petition allowed. Popular for STEM professionals. Long backlogs for India/China.'
  },

  eb3: {
    code: 'eb3',
    name: 'EB-3 Skilled Worker Green Card',
    category: 'green_card',
    description: 'Green card for skilled workers with employer sponsorship',
    requirements: {
      minDegree: 'bachelors',
      jobOffer: true,
      employerSponsorship: true,
      laborCertification: true
    },
    timeline: {
      standard: 1095, // 3+ years
      premium: null
    },
    costs: {
      governmentFees: 4000,
      attorneyFeeLow: 5000,
      attorneyFeeHigh: 12000
    },
    diyDifficulty: 'expert_only',
    annualCap: 40000,
    notes: 'Requires PERM labor certification. Very long waits for India/China.'
  },

  e2: {
    code: 'e2',
    name: 'E-2 Treaty Investor',
    category: 'investor',
    description: 'For investors from treaty countries making substantial investment in US business',
    requirements: {
      minDegree: null,
      jobOffer: false,
      treatyCountry: true,
      substantialInvestment: true,
      activeBusinessRole: true
    },
    timeline: {
      standard: 60,
      premium: null
    },
    costs: {
      governmentFees: 500,
      attorneyFeeLow: 3000,
      attorneyFeeHigh: 10000
    },
    diyDifficulty: 'intermediate',
    annualCap: null,
    notes: 'Must be from treaty country. Investment typically $100K+. Renewable indefinitely.'
  },

  eb5: {
    code: 'eb5',
    name: 'EB-5 Immigrant Investor Green Card',
    category: 'green_card',
    description: 'Green card through investment of $800K-$1.05M in US business',
    requirements: {
      minDegree: null,
      jobOffer: false,
      minimumInvestment: 800000,
      jobCreation: 10
    },
    timeline: {
      standard: 730,
      premium: null
    },
    costs: {
      governmentFees: 5000,
      attorneyFeeLow: 15000,
      attorneyFeeHigh: 50000
    },
    diyDifficulty: 'expert_only',
    annualCap: 10000,
    notes: '$800K for targeted employment areas, $1.05M otherwise. Must create 10 jobs.'
  },

  k1: {
    code: 'k1',
    name: 'K-1 Fiancé Visa',
    category: 'family',
    description: 'For fiancé(e)s of US citizens to enter the US for marriage',
    requirements: {
      minDegree: null,
      jobOffer: false,
      uscitizenPetitioner: true,
      engaged: true,
      metInPerson: true,
      freeToMarry: true,
      incomeRequirement: true
    },
    timeline: {
      standard: 360,
      premium: null
    },
    costs: {
      governmentFees: 800,
      attorneyFeeLow: 1500,
      attorneyFeeHigh: 4000
    },
    diyDifficulty: 'intermediate',
    annualCap: null,
    notes: 'Must marry US citizen within 90 days of entry. Can apply for green card and work permit after marriage.'
  }
};

/**
 * Get visa info by code
 */
export function getVisaInfo(code) {
  return VISA_TYPES[code] || null;
}

/**
 * Get all visa types as array
 */
export function getAllVisaTypes() {
  return Object.values(VISA_TYPES);
}

/**
 * Get visa types by category
 */
export function getVisaTypesByCategory(category) {
  return Object.values(VISA_TYPES).filter(visa => visa.category === category);
}
