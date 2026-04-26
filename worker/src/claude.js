/**
 * Claude API Integration for Visa Assessment
 */

import Anthropic from '@anthropic-ai/sdk';

const VISA_ASSESSMENT_PROMPT = `You are an expert immigration consultant assistant. Your role is to provide personalized recommendations based on a user's visa eligibility assessment results.

You will receive:
- The user's quiz answers about their background (education, work experience, situation)
- Any additional context they provided
- Their calculated visa eligibility results (which visa types they may qualify for)

Your task is to:
1. Provide encouraging but realistic recommendations tailored to their specific situation
2. Suggest practical next steps they should take
3. Highlight any opportunities they may not have considered
4. Warn about any potential challenges specific to their situation

IMPORTANT RULES:
- Be encouraging but honest - don't oversell their chances
- Use warm, conversational language like a knowledgeable friend
- Focus on actionable advice
- If they have limited options, focus on what IS possible, not what isn't
- Never use em-dashes or en-dashes (use hyphens only)
- Keep paragraphs short and scannable
- Do not use bullet points in your response

Return your response as JSON with this structure:
{
  "recommendations": "2-3 paragraphs of personalized recommendations",
  "nextSteps": "2-3 sentences about immediate next steps",
  "additionalAdvice": "1-2 sentences of encouragement or additional insight"
}`;

/**
 * Generate personalized visa assessment recommendations
 */
export async function generateVisaAssessment(env, { answers, freeText, visaResults }) {
  try {
    const client = new Anthropic({
      apiKey: env.CLAUDE_API_KEY
    });

    // Build the user context
    const userContext = buildUserContext(answers, freeText, visaResults);

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 600,
      temperature: 0.7,
      system: VISA_ASSESSMENT_PROMPT,
      messages: [
        {
          role: 'user',
          content: userContext
        }
      ]
    });

    // Parse the JSON response
    const content = response.content[0].text;

    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          recommendations: parsed.recommendations,
          nextSteps: parsed.nextSteps,
          additionalAdvice: parsed.additionalAdvice,
          error: null
        };
      }
      throw new Error('No JSON found in response');
    } catch (parseError) {
      console.error('Failed to parse Claude response:', parseError);
      // Return the raw content if JSON parsing fails
      return {
        recommendations: content,
        nextSteps: null,
        additionalAdvice: null,
        error: null
      };
    }

  } catch (error) {
    console.error('Claude API error:', error);
    return {
      recommendations: null,
      nextSteps: null,
      additionalAdvice: null,
      error: error.message
    };
  }
}

/**
 * Build user context string for Claude
 */
function buildUserContext(answers, freeText, visaResults) {
  let context = 'USER PROFILE:\n';

  // Basic info
  if (answers.citizenship) {
    context += `- Country of citizenship: ${answers.citizenship}\n`;
  }
  if (answers.current_location) {
    context += `- Currently in US: ${answers.current_location === 'in_us' ? 'Yes' : 'No'}\n`;
  }
  if (answers.current_status) {
    context += `- Current visa status: ${answers.current_status}\n`;
  }

  // Education
  if (answers.highest_degree) {
    context += `- Highest degree: ${formatDegree(answers.highest_degree)}\n`;
  }
  if (answers.degree_field) {
    context += `- Field of study: ${answers.degree_field}\n`;
  }

  // Work
  if (answers.years_experience) {
    context += `- Years of experience: ${answers.years_experience}\n`;
  }
  if (answers.current_occupation) {
    context += `- Occupation: ${answers.current_occupation}\n`;
  }

  // Job offer
  if (answers.has_job_offer) {
    context += `- Has US job offer: ${answers.has_job_offer === 'yes' ? 'Yes' : 'No'}\n`;
  }
  if (answers.employer_sponsor) {
    context += `- Employer sponsorship: ${answers.employer_sponsor}\n`;
  }

  // Special qualifications
  if (answers.extraordinary_ability && answers.extraordinary_ability.length > 0) {
    const achievements = answers.extraordinary_ability.filter(a => a !== 'none');
    if (achievements.length > 0) {
      context += `- Notable achievements: ${achievements.join(', ')}\n`;
    }
  }

  // Investment
  if (answers.investment_capital && answers.investment_capital !== 'no') {
    context += `- Investment capital: ${answers.investment_capital}\n`;
  }

  // Timeline
  if (answers.timeline) {
    context += `- Timeline urgency: ${answers.timeline}\n`;
  }

  // Goal
  if (answers.immigration_goal) {
    context += `- Immigration goal: ${answers.immigration_goal}\n`;
  }

  // Free text context
  if (freeText && freeText.trim()) {
    context += `\nADDITIONAL CONTEXT FROM USER:\n"${freeText.trim()}"\n`;
  }

  // Visa results
  if (visaResults && visaResults.length > 0) {
    context += '\nVISA ELIGIBILITY RESULTS:\n';
    visaResults.forEach((result, index) => {
      context += `${index + 1}. ${result.visaCode.toUpperCase()} - ${result.likelihood} likelihood (score: ${result.score})\n`;
      if (result.strengths && result.strengths.length > 0) {
        context += `   Strengths: ${result.strengths.slice(0, 3).join('; ')}\n`;
      }
      if (result.challenges && result.challenges.length > 0) {
        context += `   Challenges: ${result.challenges.slice(0, 2).join('; ')}\n`;
      }
    });
  } else {
    context += '\nVISA ELIGIBILITY: No strong matches found based on current profile.\n';
  }

  return context;
}

function formatDegree(degree) {
  const map = {
    'high_school': 'High School',
    'some_college': 'Some College',
    'associates': "Associate's Degree",
    'bachelors': "Bachelor's Degree",
    'masters': "Master's Degree",
    'phd': 'Ph.D./Doctorate',
    'professional': 'Professional Degree (MD, JD, etc.)'
  };
  return map[degree] || degree;
}

/**
 * Analyze assessment responses (for admin dashboard)
 */
export async function analyzeResponses(env, question, assessments) {
  try {
    const client = new Anthropic({
      apiKey: env.CLAUDE_API_KEY
    });

    // Summarize the data for Claude
    const dataSummary = summarizeAssessments(assessments);

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1000,
      temperature: 0.3,
      system: `You are a data analyst helping to understand visa assessment responses. You have access to summarized data about quiz completions. Answer questions clearly and concisely, citing specific numbers when relevant.`,
      messages: [
        {
          role: 'user',
          content: `DATA SUMMARY:\n${dataSummary}\n\nQUESTION: ${question}`
        }
      ]
    });

    return {
      answer: response.content[0].text,
      error: null
    };

  } catch (error) {
    console.error('Claude API error:', error);
    return {
      answer: null,
      error: error.message
    };
  }
}

function summarizeAssessments(assessments) {
  if (!assessments || assessments.length === 0) {
    return 'No assessment data available.';
  }

  const total = assessments.length;
  const withJobOffer = assessments.filter(a => a.has_job_offer).length;
  const byDegree = {};
  const byCountry = {};
  const byOccupation = {};

  assessments.forEach(a => {
    // Count by degree
    if (a.highest_degree) {
      byDegree[a.highest_degree] = (byDegree[a.highest_degree] || 0) + 1;
    }
    // Count by country
    if (a.country_of_citizenship) {
      byCountry[a.country_of_citizenship] = (byCountry[a.country_of_citizenship] || 0) + 1;
    }
    // Count by occupation
    if (a.current_occupation) {
      byOccupation[a.current_occupation] = (byOccupation[a.current_occupation] || 0) + 1;
    }
  });

  let summary = `Total assessments: ${total}\n`;
  summary += `With job offer: ${withJobOffer} (${Math.round(withJobOffer/total*100)}%)\n\n`;

  summary += 'By degree level:\n';
  Object.entries(byDegree).sort((a, b) => b[1] - a[1]).forEach(([deg, count]) => {
    summary += `  ${deg}: ${count}\n`;
  });

  summary += '\nTop countries:\n';
  Object.entries(byCountry).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([country, count]) => {
    summary += `  ${country}: ${count}\n`;
  });

  summary += '\nTop occupations:\n';
  Object.entries(byOccupation).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([occ, count]) => {
    summary += `  ${occ}: ${count}\n`;
  });

  return summary;
}
