/**
 * Visa Eligibility Scoring Logic
 * Calculates eligibility scores for each visa type based on user answers
 */

import { VISA_TYPES } from '../data/visaTypes';

/**
 * Calculate eligibility scores for all visa types
 */
export function calculateVisaEligibility(answers) {
  const results = [];

  // H-1B Assessment
  const h1bScore = calculateH1BScore(answers);
  if (h1bScore.eligible) {
    results.push({
      visaCode: 'h1b',
      ...h1bScore
    });
  }

  // L-1A/L-1B Assessment
  const l1Score = calculateL1Score(answers);
  if (l1Score.eligible) {
    results.push({
      visaCode: l1Score.subtype,
      ...l1Score
    });
  }

  // O-1A Assessment
  const o1Score = calculateO1Score(answers);
  if (o1Score.eligible) {
    results.push({
      visaCode: 'o1a',
      ...o1Score
    });
  }

  // EB-1A Assessment
  const eb1aScore = calculateEB1AScore(answers);
  if (eb1aScore.eligible) {
    results.push({
      visaCode: 'eb1a',
      ...eb1aScore
    });
  }

  // EB-2 NIW Assessment
  const eb2NiwScore = calculateEB2NIWScore(answers);
  if (eb2NiwScore.eligible) {
    results.push({
      visaCode: 'eb2_niw',
      ...eb2NiwScore
    });
  }

  // E-2 Assessment
  const e2Score = calculateE2Score(answers);
  if (e2Score.eligible) {
    results.push({
      visaCode: 'e2',
      ...e2Score
    });
  }

  // EB-5 Assessment
  const eb5Score = calculateEB5Score(answers);
  if (eb5Score.eligible) {
    results.push({
      visaCode: 'eb5',
      ...eb5Score
    });
  }

  // Sort by eligibility score descending
  results.sort((a, b) => b.score - a.score);

  return results;
}

/**
 * H-1B Eligibility
 */
function calculateH1BScore(answers) {
  let score = 0;
  const strengths = [];
  const challenges = [];

  // Degree requirement
  const degreePoints = {
    'high_school': 0,
    'some_college': 0,
    'associates': 10,
    'bachelors': 40,
    'masters': 50,
    'phd': 55,
    'professional': 50
  };
  score += degreePoints[answers.highest_degree] || 0;

  if (['bachelors', 'masters', 'phd', 'professional'].includes(answers.highest_degree)) {
    strengths.push('Meets minimum education requirement');
  } else {
    challenges.push('Bachelor\'s degree typically required');
  }

  // STEM field bonus
  if (answers.degree_field === 'stem') {
    score += 10;
    strengths.push('STEM degree (high demand)');
  }

  // Job offer
  if (answers.has_job_offer === 'yes') {
    score += 20;
    strengths.push('Has job offer from US employer');
  } else {
    challenges.push('Requires job offer from US employer');
  }

  // Employer sponsorship
  if (answers.employer_sponsor === 'yes_confirmed') {
    score += 15;
    strengths.push('Employer confirmed sponsorship');
  } else if (answers.employer_sponsor === 'likely') {
    score += 10;
    strengths.push('Employer likely to sponsor');
  } else if (answers.has_job_offer === 'yes') {
    challenges.push('Employer sponsorship not confirmed');
  }

  // Specialty occupation check
  const specialtyOccupations = ['tech', 'engineering', 'finance', 'healthcare', 'science', 'legal'];
  if (specialtyOccupations.includes(answers.current_occupation)) {
    score += 10;
    strengths.push('Specialty occupation');
  }

  // Lottery challenge
  challenges.push('Subject to annual lottery (approx. 25% chance)');

  // Minimum threshold for eligibility
  const eligible = score >= 50 &&
    ['bachelors', 'masters', 'phd', 'professional'].includes(answers.highest_degree);

  return {
    eligible,
    score,
    likelihood: score >= 70 ? 'high' : score >= 50 ? 'medium' : 'low',
    strengths,
    challenges,
    estimatedDays: 180,
    estimatedCost: 5000
  };
}

/**
 * L-1 Eligibility
 */
function calculateL1Score(answers) {
  let score = 0;
  const strengths = [];
  const challenges = [];
  let subtype = 'l1b';

  // Multinational employment
  if (answers.multinational_employee === 'yes_1year+') {
    score += 40;
    strengths.push('1+ year at multinational company');
  } else {
    challenges.push('Requires 1+ year at multinational company with US offices');
  }

  // Managerial role
  if (answers.current_occupation === 'management') {
    score += 25;
    subtype = 'l1a';
    strengths.push('Managerial/executive position (L-1A)');
  } else {
    subtype = 'l1b';
    strengths.push('May qualify for L-1B with specialized knowledge');
  }

  // Job offer (transfer)
  if (answers.has_job_offer === 'yes') {
    score += 20;
    strengths.push('US position available');
  }

  // No lottery
  strengths.push('No annual cap or lottery');

  const eligible = score >= 40 && answers.multinational_employee === 'yes_1year+';

  return {
    eligible,
    subtype,
    score,
    likelihood: score >= 65 ? 'high' : score >= 40 ? 'medium' : 'low',
    strengths,
    challenges,
    estimatedDays: 90,
    estimatedCost: 6000
  };
}

/**
 * O-1A Eligibility
 */
function calculateO1Score(answers) {
  let score = 0;
  const strengths = [];
  const challenges = [];

  // Check extraordinary ability criteria
  const achievements = answers.extraordinary_ability || [];
  let criteriaCount = 0;

  if (achievements.includes('awards')) {
    criteriaCount++;
    score += 15;
    strengths.push('National/international awards');
  }
  if (achievements.includes('publications')) {
    criteriaCount++;
    score += 15;
    strengths.push('Published works');
  }
  if (achievements.includes('patents')) {
    criteriaCount++;
    score += 15;
    strengths.push('Patents or inventions');
  }
  if (achievements.includes('media')) {
    criteriaCount++;
    score += 15;
    strengths.push('Media coverage');
  }
  if (achievements.includes('memberships')) {
    criteriaCount++;
    score += 15;
    strengths.push('Prestigious professional memberships');
  }
  if (achievements.includes('high_salary')) {
    criteriaCount++;
    score += 15;
    strengths.push('High salary compared to peers');
  }
  if (achievements.includes('judging')) {
    criteriaCount++;
    score += 15;
    strengths.push('Judged others\' work');
  }
  if (achievements.includes('original_contribution')) {
    criteriaCount++;
    score += 15;
    strengths.push('Original contributions');
  }

  // Need to meet at least 3 criteria
  if (criteriaCount >= 3) {
    score += 20;
    strengths.push(`Meets ${criteriaCount} extraordinary ability criteria`);
  } else if (criteriaCount > 0) {
    challenges.push(`Only ${criteriaCount} criteria met (need 3+)`);
  } else {
    challenges.push('Requires evidence of extraordinary ability');
  }

  // Job offer
  if (answers.has_job_offer === 'yes') {
    score += 10;
    strengths.push('Has job offer/sponsor');
  } else {
    challenges.push('Requires US sponsor or agent');
  }

  // No cap advantage
  strengths.push('No annual cap');

  const eligible = criteriaCount >= 3 && score >= 55;

  return {
    eligible,
    score,
    likelihood: score >= 80 ? 'high' : score >= 55 ? 'medium' : 'low',
    strengths,
    challenges,
    estimatedDays: 60,
    estimatedCost: 10000
  };
}

/**
 * EB-1A Eligibility
 */
function calculateEB1AScore(answers) {
  let score = 0;
  const strengths = [];
  const challenges = [];

  // Similar to O-1A but higher standard
  const achievements = answers.extraordinary_ability || [];
  let criteriaCount = 0;

  achievements.forEach(achievement => {
    if (achievement !== 'none') {
      criteriaCount++;
      score += 12;
    }
  });

  if (criteriaCount >= 3) {
    score += 25;
    strengths.push(`Meets ${criteriaCount} extraordinary ability criteria`);
  } else if (criteriaCount > 0) {
    challenges.push(`Only ${criteriaCount} criteria met (need 3+)`);
  }

  // Self-petition advantage
  strengths.push('No job offer required (self-petition)');
  strengths.push('No labor certification required');

  // Advanced degree bonus
  if (['phd', 'masters', 'professional'].includes(answers.highest_degree)) {
    score += 10;
    strengths.push('Advanced degree strengthens case');
  }

  // Experience bonus
  if (['10-15', '15+'].includes(answers.years_experience)) {
    score += 10;
    strengths.push('Extensive experience in field');
  }

  challenges.push('High standard: sustained national/international acclaim');

  const eligible = criteriaCount >= 3 && score >= 60;

  return {
    eligible,
    score,
    likelihood: score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low',
    strengths,
    challenges,
    estimatedDays: 365,
    estimatedCost: 15000
  };
}

/**
 * EB-2 NIW Eligibility
 */
function calculateEB2NIWScore(answers) {
  let score = 0;
  const strengths = [];
  const challenges = [];

  // Advanced degree
  const degreePoints = {
    'masters': 30,
    'phd': 40,
    'professional': 35
  };
  score += degreePoints[answers.highest_degree] || 0;

  if (['masters', 'phd', 'professional'].includes(answers.highest_degree)) {
    strengths.push('Meets advanced degree requirement');
  } else if (answers.highest_degree === 'bachelors' && ['10-15', '15+'].includes(answers.years_experience)) {
    score += 25;
    strengths.push('Bachelor\'s + 5 years experience may qualify');
  } else {
    challenges.push('Typically requires advanced degree');
  }

  // STEM advantage
  if (answers.degree_field === 'stem') {
    score += 15;
    strengths.push('STEM field (strong for NIW)');
  }

  // National interest fields
  const niFields = ['tech', 'engineering', 'healthcare', 'science'];
  if (niFields.includes(answers.current_occupation)) {
    score += 15;
    strengths.push('Field aligns with national interest');
  }

  // Self-petition advantage
  strengths.push('No job offer required (self-petition)');
  strengths.push('No labor certification required');

  // Challenge: processing time
  challenges.push('Long processing times (especially India/China born)');

  const eligible = score >= 45;

  return {
    eligible,
    score,
    likelihood: score >= 70 ? 'high' : score >= 45 ? 'medium' : 'low',
    strengths,
    challenges,
    estimatedDays: 730,
    estimatedCost: 10000
  };
}

/**
 * E-2 Eligibility
 */
function calculateE2Score(answers) {
  let score = 0;
  const strengths = [];
  const challenges = [];

  // Investment capital
  if (answers.investment_capital === 'yes_900k+') {
    score += 40;
    strengths.push('Substantial investment capital available');
  } else if (answers.investment_capital === 'yes_500k-900k') {
    score += 35;
    strengths.push('Significant investment capital available');
  } else if (answers.investment_capital === 'yes_100k-500k') {
    score += 25;
    strengths.push('Investment capital available');
  } else {
    challenges.push('Requires substantial investment in US business');
    return { eligible: false, score: 0, strengths, challenges };
  }

  // Entrepreneurial background
  if (answers.current_occupation === 'entrepreneur') {
    score += 20;
    strengths.push('Entrepreneurial experience');
  }

  // Note about treaty country
  challenges.push('Must be citizen of treaty country');
  challenges.push('Does not lead directly to green card');

  strengths.push('No annual cap');
  strengths.push('Can be renewed indefinitely');

  const eligible = score >= 25;

  return {
    eligible,
    score,
    likelihood: score >= 40 ? 'high' : score >= 25 ? 'medium' : 'low',
    strengths,
    challenges,
    estimatedDays: 60,
    estimatedCost: 7000
  };
}

/**
 * EB-5 Eligibility
 */
function calculateEB5Score(answers) {
  let score = 0;
  const strengths = [];
  const challenges = [];

  // Investment capital
  if (answers.investment_capital === 'yes_900k+') {
    score += 50;
    strengths.push('Meets minimum investment threshold');
    strengths.push('Direct path to permanent residence');
  } else {
    challenges.push('Requires $800K-$1.05M investment');
    return { eligible: false, score: 0, strengths, challenges };
  }

  // No other requirements
  strengths.push('No education requirements');
  strengths.push('No work experience requirements');
  strengths.push('No job offer needed');

  // Challenges
  challenges.push('Must create 10 full-time US jobs');
  challenges.push('Investment must be "at risk"');

  const eligible = score >= 50;

  return {
    eligible,
    score,
    likelihood: score >= 50 ? 'high' : 'low',
    strengths,
    challenges,
    estimatedDays: 730,
    estimatedCost: 60000
  };
}

/**
 * K-1 Fiancé Visa Eligibility
 */
export function calculateK1Score(answers) {
  let score = 0;
  const strengths = [];
  const challenges = [];

  // HARD REQUIREMENT: Must be engaged
  if (answers.k1_relationship_type !== 'engaged') {
    return {
      eligible: false,
      score: 0,
      likelihood: 'ineligible',
      strengths: [],
      challenges: ['K-1 visa requires being engaged to a US citizen'],
      estimatedDays: 0,
      estimatedCost: 0
    };
  }

  // HARD REQUIREMENT: Petitioner must be US citizen
  // If quiz taker is US citizen, this is automatically satisfied
  // If quiz taker is foreign national, check their partner's citizenship
  const quizTakerIsUSCitizen = answers.k1_quiz_taker_role === 'us_citizen';
  const partnerIsUSCitizen = answers.k1_petitioner_citizen === 'yes_citizen';

  if (!quizTakerIsUSCitizen && !partnerIsUSCitizen) {
    let challenge = 'K-1 visa requires US citizen petitioner';
    if (answers.k1_petitioner_citizen === 'green_card') {
      challenge = 'K-1 is only for US citizens. Green card holders must use Form I-130 instead.';
    }
    return {
      eligible: false,
      score: 0,
      likelihood: 'ineligible',
      strengths: [],
      challenges: [challenge],
      estimatedDays: 0,
      estimatedCost: 0
    };
  }
  score += 25;
  strengths.push(quizTakerIsUSCitizen ? 'You are a US citizen (petitioner)' : 'Petitioner is a US citizen');

  // HARD REQUIREMENT: In-person meeting
  if (answers.k1_met_in_person === 'yes_recent') {
    score += 25;
    strengths.push('Met in person within the last 2 years');
  } else if (answers.k1_meeting_exception === 'religious_customs' ||
             answers.k1_meeting_exception === 'extreme_hardship') {
    score += 15;
    strengths.push('May qualify for meeting requirement waiver');
    challenges.push('Must document exception to in-person meeting requirement');
  } else {
    challenges.push('Must meet in person within 2 years (or qualify for waiver)');
    return {
      eligible: false,
      score: 0,
      likelihood: 'ineligible',
      strengths,
      challenges,
      estimatedDays: 0,
      estimatedCost: 0
    };
  }

  // HARD REQUIREMENT: Both parties must be free to marry
  if (answers.k1_free_to_marry === 'both_free') {
    score += 20;
    strengths.push('Both parties legally free to marry');
  } else if (answers.k1_free_to_marry === 'divorce_pending') {
    score += 5;
    challenges.push('Must finalize divorce before petition is approved');
  } else {
    challenges.push('Both parties must be legally free to marry');
    return {
      eligible: false,
      score: 0,
      likelihood: 'ineligible',
      strengths,
      challenges,
      estimatedDays: 0,
      estimatedCost: 0
    };
  }

  // SOFT FACTOR: Income requirement
  if (answers.k1_income_level === 'above_125') {
    score += 15;
    strengths.push('Petitioner meets income requirement');
  } else if (answers.k1_income_level === 'near_threshold') {
    score += 10;
    challenges.push('Income near threshold - consider joint sponsor');
  } else if (answers.k1_joint_sponsor === 'yes_available') {
    score += 12;
    strengths.push('Joint sponsor available');
  } else if (answers.k1_joint_sponsor === 'maybe') {
    score += 5;
    challenges.push('May need to secure joint sponsor for income requirement');
  } else if (answers.k1_income_level !== 'unsure_income') {
    challenges.push('Must meet 125% poverty guideline (joint sponsor may be needed)');
  }

  // SOFT FACTOR: Relationship duration
  const durationPoints = {
    'over_2_years': 10,
    '1_2_years': 8,
    '6_12_months': 5,
    'less_6_months': 2
  };
  score += durationPoints[answers.k1_relationship_duration] || 0;

  if (answers.k1_relationship_duration === 'over_2_years') {
    strengths.push('Long-term established relationship');
  } else if (answers.k1_relationship_duration === 'less_6_months') {
    challenges.push('Short relationship history may require extra evidence');
  }

  // SOFT FACTOR: Criminal history
  if (answers.k1_criminal_history === 'no_criminal') {
    score += 10;
    strengths.push('No criminal history concerns');
  } else if (answers.k1_criminal_history === 'minor_offenses') {
    score += 5;
    challenges.push('Minor offenses - may need documentation');
  } else if (answers.k1_criminal_history === 'serious_offenses') {
    score -= 10;
    challenges.push('Serious criminal history may affect eligibility - consult attorney');
  }

  // SOFT FACTOR: Evidence strength
  const evidence = answers.k1_evidence_strength || [];
  const evidenceCount = evidence.filter(e => e !== 'limited_evidence').length;

  if (evidenceCount >= 5) {
    score += 10;
    strengths.push('Strong evidence of genuine relationship');
  } else if (evidenceCount >= 3) {
    score += 6;
    strengths.push('Good evidence of relationship');
  } else if (evidenceCount >= 1) {
    score += 3;
    challenges.push('May need additional evidence of relationship');
  } else {
    challenges.push('Strong relationship evidence is important for approval');
  }

  // Calculate likelihood
  let likelihood;
  if (score >= 85) {
    likelihood = 'high';
  } else if (score >= 65) {
    likelihood = 'medium';
  } else if (score >= 45) {
    likelihood = 'low';
  } else {
    likelihood = 'unlikely';
  }

  // K-1 specific notes
  strengths.push('No employer sponsorship required');
  strengths.push('Path to green card after marriage');

  challenges.push('Must marry within 90 days of entry');
  challenges.push('Cannot work until EAD is approved (3-5 months after entry)');

  return {
    eligible: score >= 45,
    score,
    likelihood,
    strengths,
    challenges,
    estimatedDays: 360,
    estimatedCost: 2500
  };
}

/**
 * Calculate K-1 visa eligibility (wrapper for K-1 specific assessment)
 */
export function calculateK1Eligibility(answers) {
  const k1Score = calculateK1Score(answers);

  if (!k1Score.eligible && k1Score.likelihood === 'ineligible') {
    return [];
  }

  return [{
    visaCode: 'k1',
    ...k1Score
  }];
}

/**
 * Prepare assessment data for database storage
 */
export function prepareAssessmentData(answers, email, freeText, utmParams) {
  return {
    email,
    session_id: answers.sessionId,
    country_of_citizenship: answers.citizenship,
    current_country: answers.current_location === 'in_us' ? 'US' : answers.citizenship,
    current_visa_status: answers.current_status || null,
    highest_degree: answers.highest_degree,
    degree_field: answers.degree_field || null,
    years_experience: answers.years_experience,
    current_occupation: answers.current_occupation,
    has_job_offer: answers.has_job_offer === 'yes',
    employer_type: answers.employer_sponsor || null,
    has_extraordinary_ability: (answers.extraordinary_ability || []).length > 0 &&
      !answers.extraordinary_ability.includes('none'),
    additional_context: freeText || null,
    utm_source: utmParams?.utm_source || null,
    utm_campaign: utmParams?.utm_campaign || null,
    utm_content: utmParams?.utm_content || null,
    utm_term: utmParams?.utm_term || null
  };
}
