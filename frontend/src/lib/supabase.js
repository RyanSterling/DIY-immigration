import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Save assessment response to database
 */
export async function saveAssessment(assessmentData) {
  try {
    const { data, error } = await supabase
      .from('assessments')
      .insert([assessmentData])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error saving assessment:', error);
    return { data: null, error };
  }
}

/**
 * Save visa eligibility results
 */
export async function saveVisaResults(assessmentId, visaResults) {
  try {
    const resultsWithAssessmentId = visaResults.map(result => ({
      ...result,
      assessment_id: assessmentId
    }));

    const { data, error } = await supabase
      .from('visa_eligibility_results')
      .insert(resultsWithAssessmentId)
      .select();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error saving visa results:', error);
    return { data: null, error };
  }
}

/**
 * Track quiz start for abandonment analysis
 */
export async function trackQuizStart(sessionId, utmParams) {
  try {
    const { error } = await supabase
      .from('quiz_starts')
      .insert([{
        session_id: sessionId,
        utm_source: utmParams?.utm_source || null,
        utm_campaign: utmParams?.utm_campaign || null,
        completed: false
      }]);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error tracking quiz start:', error);
    return { success: false };
  }
}

/**
 * Mark quiz as completed
 */
export async function markQuizCompleted(sessionId, assessmentId) {
  try {
    const { error } = await supabase
      .from('quiz_starts')
      .update({
        completed: true,
        completed_at: new Date().toISOString(),
        assessment_id: assessmentId
      })
      .eq('session_id', sessionId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error marking quiz completed:', error);
    return { success: false };
  }
}

/**
 * Get all assessments (admin)
 */
export async function getAllAssessments() {
  try {
    const { data, error } = await supabase
      .from('assessments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching assessments:', error);
    return { data: null, error };
  }
}
