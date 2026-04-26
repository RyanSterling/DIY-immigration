/**
 * K-1 Fiancé Visa Assessment Questions
 * Specific questions for K-1 visa eligibility assessment
 * Supports both US citizen and foreign fiancé(e) perspectives
 */

/**
 * Get dynamic question text based on quiz taker's role
 */
export function getQuestionText(question, answers) {
  const role = answers?.k1_quiz_taker_role;
  if (question.textByRole && role) {
    return question.textByRole[role] || question.text;
  }
  return question.text;
}

export const K1_QUESTIONS = [
  // Question 0: Quiz Taker Role
  {
    id: 'k1_quiz_taker_role',
    category: 'role',
    text: 'Which person in the relationship are you?',
    type: 'choice',
    required: true,
    options: [
      { value: 'us_citizen', label: 'I am the US citizen' },
      { value: 'foreign_national', label: 'I am the foreign fiancé(e)' }
    ]
  },

  // Question 1: Relationship Status
  {
    id: 'k1_relationship_type',
    category: 'relationship',
    text: 'What is your relationship status?',
    type: 'choice',
    required: true,
    options: [
      { value: 'engaged', label: 'We are engaged to be married' },
      { value: 'dating_serious', label: 'We are in a serious relationship but not engaged' },
      { value: 'dating_casual', label: 'We are casually dating' },
      { value: 'just_met', label: 'We recently met and are getting to know each other' }
    ]
  },

  // Question 2: Petitioner US Citizenship (only shown to foreign nationals)
  {
    id: 'k1_petitioner_citizen',
    category: 'petitioner',
    text: 'Is your fiancé(e) a US citizen?',
    type: 'choice',
    required: true,
    conditional: {
      questionId: 'k1_relationship_type',
      value: 'engaged',
      // Also requires foreign_national role (US citizens skip this)
      andCondition: { questionId: 'k1_quiz_taker_role', value: 'foreign_national' }
    },
    options: [
      { value: 'yes_citizen', label: 'Yes, they are a US citizen' },
      { value: 'green_card', label: 'No, they have a green card (permanent resident)' },
      { value: 'other_status', label: 'No, they have another immigration status' },
      { value: 'unsure', label: 'I am not sure of their status' }
    ]
  },

  // Question 3: In-Person Meeting
  {
    id: 'k1_met_in_person',
    category: 'meeting',
    text: 'Have you and your fiancé(e) met in person within the last 2 years?',
    type: 'choice',
    required: true,
    conditionalFn: (answers) => {
      const role = answers.k1_quiz_taker_role;
      const engaged = answers.k1_relationship_type === 'engaged';
      const partnerIsCitizen = answers.k1_petitioner_citizen === 'yes_citizen';
      return engaged && (role === 'us_citizen' || partnerIsCitizen);
    },
    options: [
      { value: 'yes_recent', label: 'Yes, we have met in person within the last 2 years' },
      { value: 'yes_over_2_years', label: 'Yes, but it was more than 2 years ago' },
      { value: 'no_never', label: 'No, we have never met in person' }
    ]
  },

  // Question 4: Meeting Exception (conditional)
  {
    id: 'k1_meeting_exception',
    category: 'meeting',
    text: 'Do any of the following exceptions apply to your situation?',
    type: 'choice',
    helper: 'USCIS may waive the in-person meeting requirement in certain circumstances',
    conditional: { questionId: 'k1_met_in_person', notValue: 'yes_recent' },
    options: [
      { value: 'religious_customs', label: 'Meeting in person would violate strict religious or cultural customs' },
      { value: 'extreme_hardship', label: 'Meeting in person would cause extreme hardship to the US citizen' },
      { value: 'none', label: 'None of these apply to our situation' }
    ]
  },

  // Question 5: Relationship Duration
  {
    id: 'k1_relationship_duration',
    category: 'relationship',
    text: 'How long have you and your fiancé(e) been in a relationship?',
    type: 'choice',
    conditionalFn: (answers) => {
      const role = answers.k1_quiz_taker_role;
      const engaged = answers.k1_relationship_type === 'engaged';
      const partnerIsCitizen = answers.k1_petitioner_citizen === 'yes_citizen';
      return engaged && (role === 'us_citizen' || partnerIsCitizen);
    },
    options: [
      { value: 'less_6_months', label: 'Less than 6 months' },
      { value: '6_12_months', label: '6 months to 1 year' },
      { value: '1_2_years', label: '1 to 2 years' },
      { value: 'over_2_years', label: 'More than 2 years' }
    ]
  },

  // Question 6: Free to Marry
  {
    id: 'k1_free_to_marry',
    category: 'legal',
    text: 'Are both you and your fiancé(e) legally free to marry?',
    type: 'choice',
    helper: 'This means neither of you is currently married to someone else',
    conditionalFn: (answers) => {
      const role = answers.k1_quiz_taker_role;
      const engaged = answers.k1_relationship_type === 'engaged';
      const partnerIsCitizen = answers.k1_petitioner_citizen === 'yes_citizen';
      return engaged && (role === 'us_citizen' || partnerIsCitizen);
    },
    options: [
      { value: 'both_free', label: 'Yes, we are both single, divorced, or widowed' },
      { value: 'beneficiary_not_free', label: 'I am still legally married to someone else' },
      { value: 'petitioner_not_free', label: 'My fiancé(e) is still legally married to someone else' },
      { value: 'divorce_pending', label: 'Divorce proceedings are in progress' }
    ]
  },

  // Question 7: Petitioner Income (wording changes based on role)
  {
    id: 'k1_income_level',
    category: 'financial',
    text: "What is the US citizen's annual household income?",
    textByRole: {
      us_citizen: "What is your annual household income?",
      foreign_national: "What is your fiancé(e)'s annual household income?"
    },
    type: 'choice',
    helper: 'The US citizen petitioner must meet income requirements (125% of federal poverty guidelines)',
    conditionalFn: (answers) => {
      // Show if: US citizen taking quiz (engaged) OR foreign national with US citizen partner
      const role = answers.k1_quiz_taker_role;
      const engaged = answers.k1_relationship_type === 'engaged';
      const partnerIsCitizen = answers.k1_petitioner_citizen === 'yes_citizen';
      return engaged && (role === 'us_citizen' || partnerIsCitizen);
    },
    options: [
      { value: 'above_125', label: 'Above $24,650/year (for household of 2)' },
      { value: 'near_threshold', label: 'Between $20,000 - $24,650/year' },
      { value: 'below_threshold', label: 'Below $20,000/year' },
      { value: 'unsure_income', label: 'Not sure of the exact income' }
    ]
  },

  // Question 8: Joint Sponsor (conditional, wording changes based on role)
  {
    id: 'k1_joint_sponsor',
    category: 'financial',
    text: 'Is a joint sponsor available who could provide additional financial support?',
    textByRole: {
      us_citizen: "Do you have a joint sponsor who could provide additional financial support?",
      foreign_national: "Does your fiancé(e) have a joint sponsor who could provide additional financial support?"
    },
    type: 'choice',
    helper: 'A joint sponsor is a US citizen or permanent resident who agrees to financially support the beneficiary',
    conditional: { questionId: 'k1_income_level', notValue: 'above_125' },
    options: [
      { value: 'yes_available', label: 'Yes, there is a US citizen or resident who can be a joint sponsor' },
      { value: 'maybe', label: 'Possibly, we would need to find someone' },
      { value: 'no', label: 'No, there is no joint sponsor available' }
    ]
  },

  // Question 9: Criminal History
  {
    id: 'k1_criminal_history',
    category: 'legal',
    text: 'Do either of you have any criminal history?',
    type: 'choice',
    helper: 'Certain criminal convictions may affect eligibility',
    conditionalFn: (answers) => {
      const role = answers.k1_quiz_taker_role;
      const engaged = answers.k1_relationship_type === 'engaged';
      const partnerIsCitizen = answers.k1_petitioner_citizen === 'yes_citizen';
      return engaged && (role === 'us_citizen' || partnerIsCitizen);
    },
    options: [
      { value: 'no_criminal', label: 'No, neither of us has a criminal record' },
      { value: 'minor_offenses', label: 'Minor offenses only (traffic violations, misdemeanors)' },
      { value: 'serious_offenses', label: 'Yes, there are serious criminal convictions' },
      { value: 'prefer_not_say', label: 'Prefer not to say' }
    ]
  },

  // Question 10: Evidence of Relationship
  {
    id: 'k1_evidence_strength',
    category: 'documentation',
    text: 'What evidence of your genuine relationship can you provide?',
    type: 'multiselect',
    helper: 'Select all that apply. Strong evidence helps demonstrate a bona fide relationship.',
    conditionalFn: (answers) => {
      const role = answers.k1_quiz_taker_role;
      const engaged = answers.k1_relationship_type === 'engaged';
      const partnerIsCitizen = answers.k1_petitioner_citizen === 'yes_citizen';
      return engaged && (role === 'us_citizen' || partnerIsCitizen);
    },
    options: [
      { value: 'photos_together', label: 'Photos of you together in person' },
      { value: 'travel_records', label: 'Travel records showing visits to each other' },
      { value: 'communication_records', label: 'Communication records (calls, messages, emails)' },
      { value: 'meeting_families', label: 'Evidence of meeting each other\'s families' },
      { value: 'shared_finances', label: 'Shared financial accounts or gifts' },
      { value: 'engagement_proof', label: 'Engagement ring receipt or engagement party photos' },
      { value: 'affidavits', label: 'Affidavits from friends or family about your relationship' },
      { value: 'limited_evidence', label: 'We have limited evidence to provide' }
    ]
  }
];

/**
 * Get visible K-1 questions based on current answers (conditional branching)
 */
export function getVisibleK1Questions(answers) {
  return K1_QUESTIONS.filter(question => {
    // If question has a function-based conditional, use that
    if (question.conditionalFn) {
      return question.conditionalFn(answers);
    }

    if (!question.conditional) return true;

    const conditionalAnswer = answers[question.conditional.questionId];

    // Check for single value condition
    if (question.conditional.value !== undefined) {
      const baseConditionMet = conditionalAnswer === question.conditional.value;

      // Check if there's an additional AND condition
      if (baseConditionMet && question.conditional.andCondition) {
        const andAnswer = answers[question.conditional.andCondition.questionId];
        return andAnswer === question.conditional.andCondition.value;
      }

      return baseConditionMet;
    }

    // Check for not-value condition (show if answer doesn't match)
    if (question.conditional.notValue !== undefined) {
      return conditionalAnswer !== question.conditional.notValue;
    }

    // Check for not-values condition (show if answer is not in array)
    if (question.conditional.notValues !== undefined) {
      return !question.conditional.notValues.includes(conditionalAnswer);
    }

    return true;
  });
}

/**
 * Get total K-1 question count for progress bar
 * Note: Total is hidden in UI due to conditional branching, but still used for progress bar
 */
export function getTotalK1QuestionCount(answers) {
  return getVisibleK1Questions(answers).length;
}
