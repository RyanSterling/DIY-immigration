/**
 * US Visa Assessment Questions
 * Conditional branching based on user's situation
 */

export const QUESTIONS = [
  // Personal Information
  {
    id: 'citizenship',
    category: 'personal',
    text: 'What is your country of citizenship?',
    type: 'country',
    required: true
  },
  {
    id: 'current_location',
    category: 'personal',
    text: 'Where are you currently located?',
    type: 'choice',
    options: [
      { value: 'in_us', label: 'I am currently in the United States' },
      { value: 'outside_us', label: 'I am outside the United States' }
    ]
  },
  {
    id: 'current_status',
    category: 'personal',
    text: 'What is your current immigration status?',
    type: 'choice',
    conditional: { questionId: 'current_location', value: 'in_us' },
    options: [
      { value: 'tourist_b1b2', label: 'Tourist/Business Visa (B-1/B-2)' },
      { value: 'student_f1', label: 'Student Visa (F-1)' },
      { value: 'h1b', label: 'H-1B Work Visa' },
      { value: 'l1', label: 'L-1 Intracompany Transfer' },
      { value: 'j1', label: 'J-1 Exchange Visitor' },
      { value: 'opt', label: 'OPT/STEM OPT' },
      { value: 'other_work', label: 'Other Work Visa' },
      { value: 'other', label: 'Other Status' }
    ]
  },

  // Education
  {
    id: 'highest_degree',
    category: 'education',
    text: 'What is your highest level of education?',
    type: 'choice',
    options: [
      { value: 'high_school', label: 'High School or equivalent' },
      { value: 'some_college', label: 'Some college (no degree)' },
      { value: 'associates', label: "Associate's degree" },
      { value: 'bachelors', label: "Bachelor's degree" },
      { value: 'masters', label: "Master's degree" },
      { value: 'phd', label: 'Ph.D. or Doctorate' },
      { value: 'professional', label: 'Professional degree (MD, JD, etc.)' }
    ]
  },
  {
    id: 'degree_field',
    category: 'education',
    text: 'What field is your degree in?',
    type: 'choice',
    conditional: { questionId: 'highest_degree', notValues: ['high_school', 'some_college'] },
    options: [
      { value: 'stem', label: 'STEM (Science, Technology, Engineering, Math)' },
      { value: 'business', label: 'Business/Finance/Accounting' },
      { value: 'healthcare', label: 'Healthcare/Medicine' },
      { value: 'law', label: 'Law' },
      { value: 'arts', label: 'Arts/Humanities' },
      { value: 'social_science', label: 'Social Sciences' },
      { value: 'education', label: 'Education' },
      { value: 'other', label: 'Other' }
    ]
  },

  // Work Experience
  {
    id: 'years_experience',
    category: 'work',
    text: 'How many years of professional work experience do you have?',
    type: 'choice',
    options: [
      { value: '0-2', label: 'Less than 2 years' },
      { value: '2-5', label: '2-5 years' },
      { value: '5-10', label: '5-10 years' },
      { value: '10-15', label: '10-15 years' },
      { value: '15+', label: 'More than 15 years' }
    ]
  },
  {
    id: 'current_occupation',
    category: 'work',
    text: 'What best describes your current or most recent occupation?',
    type: 'choice',
    options: [
      { value: 'tech', label: 'Technology/Software/IT' },
      { value: 'engineering', label: 'Engineering' },
      { value: 'finance', label: 'Finance/Banking/Accounting' },
      { value: 'healthcare', label: 'Healthcare/Medical' },
      { value: 'science', label: 'Science/Research' },
      { value: 'management', label: 'Management/Executive' },
      { value: 'education', label: 'Education/Academia' },
      { value: 'legal', label: 'Legal' },
      { value: 'creative', label: 'Creative/Arts/Media' },
      { value: 'entrepreneur', label: 'Entrepreneur/Business Owner' },
      { value: 'other', label: 'Other' }
    ]
  },

  // Employment Situation
  {
    id: 'has_job_offer',
    category: 'employment',
    text: 'Do you have a job offer from a US employer?',
    type: 'choice',
    options: [
      { value: 'yes', label: 'Yes, I have a job offer' },
      { value: 'in_process', label: 'I am currently interviewing' },
      { value: 'no', label: 'No, I do not have a job offer' }
    ]
  },
  {
    id: 'employer_sponsor',
    category: 'employment',
    text: 'Is your employer willing to sponsor your visa?',
    type: 'choice',
    conditional: { questionId: 'has_job_offer', value: 'yes' },
    options: [
      { value: 'yes_confirmed', label: 'Yes, they have confirmed sponsorship' },
      { value: 'likely', label: 'They are open to it but not confirmed' },
      { value: 'unsure', label: "I'm not sure" },
      { value: 'no', label: 'No, they will not sponsor' }
    ]
  },
  {
    id: 'salary_level',
    category: 'employment',
    text: 'What is the approximate annual salary for your role?',
    type: 'choice',
    conditional: { questionId: 'has_job_offer', value: 'yes' },
    options: [
      { value: 'under_60k', label: 'Under $60,000' },
      { value: '60k-80k', label: '$60,000 - $80,000' },
      { value: '80k-100k', label: '$80,000 - $100,000' },
      { value: '100k-150k', label: '$100,000 - $150,000' },
      { value: '150k+', label: 'Over $150,000' }
    ]
  },

  // Extraordinary Ability / Special Qualifications
  {
    id: 'extraordinary_ability',
    category: 'qualifications',
    text: 'Do you have any of the following accomplishments?',
    type: 'multiselect',
    helper: 'Select all that apply',
    options: [
      { value: 'awards', label: 'National or international awards in your field' },
      { value: 'publications', label: 'Published articles, books, or research papers' },
      { value: 'patents', label: 'Patents or significant inventions' },
      { value: 'media', label: 'Featured in major media publications' },
      { value: 'memberships', label: 'Membership in prestigious professional associations' },
      { value: 'high_salary', label: 'Significantly high salary compared to peers' },
      { value: 'judging', label: 'Served as a judge of others\' work in your field' },
      { value: 'original_contribution', label: 'Original contributions of major significance' },
      { value: 'none', label: 'None of the above' }
    ]
  },

  // Investment / Business
  {
    id: 'investment_capital',
    category: 'investment',
    text: 'Do you have significant capital to invest in a US business?',
    type: 'choice',
    options: [
      { value: 'yes_900k+', label: 'Yes, $900,000 or more' },
      { value: 'yes_500k-900k', label: 'Yes, $500,000 - $900,000' },
      { value: 'yes_100k-500k', label: 'Yes, $100,000 - $500,000' },
      { value: 'no', label: 'No significant investment capital' }
    ]
  },

  // Multinational Company
  {
    id: 'multinational_employee',
    category: 'employment',
    text: 'Have you worked for a multinational company with US offices?',
    type: 'choice',
    options: [
      { value: 'yes_1year+', label: 'Yes, for 1+ years in a managerial or specialized role' },
      { value: 'yes_less_1year', label: 'Yes, but less than 1 year' },
      { value: 'no', label: 'No' }
    ]
  },

  // Timeline
  {
    id: 'timeline',
    category: 'timeline',
    text: 'When do you need to be in the US?',
    type: 'choice',
    options: [
      { value: 'asap', label: 'As soon as possible (within 3 months)' },
      { value: '3-6_months', label: '3-6 months' },
      { value: '6-12_months', label: '6-12 months' },
      { value: '1-2_years', label: '1-2 years' },
      { value: 'flexible', label: 'Flexible / No rush' }
    ]
  },

  // Goals
  {
    id: 'immigration_goal',
    category: 'goals',
    text: 'What is your ultimate immigration goal?',
    type: 'choice',
    options: [
      { value: 'temporary_work', label: 'Temporary work visa (return home eventually)' },
      { value: 'permanent_residence', label: 'Permanent residence (Green Card)' },
      { value: 'citizenship', label: 'US Citizenship' },
      { value: 'unsure', label: "I'm not sure yet" }
    ]
  }
];

/**
 * Get visible questions based on current answers (conditional branching)
 */
export function getVisibleQuestions(answers) {
  return QUESTIONS.filter(question => {
    if (!question.conditional) return true;

    const conditionalAnswer = answers[question.conditional.questionId];

    // Check for single value condition
    if (question.conditional.value !== undefined) {
      return conditionalAnswer === question.conditional.value;
    }

    // Check for not-value condition (hide if answer matches)
    if (question.conditional.notValue !== undefined) {
      return conditionalAnswer !== question.conditional.notValue;
    }

    // Check for not-values condition (hide if answer is in array)
    if (question.conditional.notValues !== undefined) {
      return !question.conditional.notValues.includes(conditionalAnswer);
    }

    return true;
  });
}

/**
 * Get total question count for progress bar
 */
export function getTotalQuestionCount(answers) {
  return getVisibleQuestions(answers).length;
}
