/**
 * API client for worker endpoints
 */

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'http://localhost:8787';

/**
 * Generate AI visa assessment
 */
export async function generateAssessment(assessmentData) {
  try {
    const response = await fetch(`${WORKER_URL}/generate-assessment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(assessmentData),
    });

    const data = await response.json();

    // Check for rate limit
    if (response.status === 429) {
      return {
        error: data.error,
        rateLimited: true,
        rateLimitType: data.type
      };
    }

    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate assessment');
    }

    return data;
  } catch (error) {
    console.error('Error generating assessment:', error);
    return {
      visaResults: null,
      error: error.message
    };
  }
}

/**
 * Save assessment to database via worker API
 */
export async function saveAssessmentToApi(assessmentData, visaResults = null) {
  try {
    const response = await fetch(`${WORKER_URL}/save-assessment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...assessmentData,
        visa_results: visaResults
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to save assessment');
    }

    return { data: data.data, error: null };
  } catch (error) {
    console.error('Error saving assessment:', error);
    return { data: null, error };
  }
}

/**
 * Send webhook to email provider
 */
export async function sendWebhook(webhookData) {
  try {
    const response = await fetch(`${WORKER_URL}/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...webhookData,
        timestamp: new Date().toISOString()
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Webhook failed');
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending webhook:', error);
    return { success: false, error: error.message };
  }
}
