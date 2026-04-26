/**
 * Webhook integration for email provider (n8n/ConvertKit)
 */

/**
 * Send assessment data to webhook
 */
export async function sendWebhook(env, data) {
  try {
    const webhookUrl = env.N8N_WEBHOOK_URL;

    if (!webhookUrl) {
      console.warn('N8N_WEBHOOK_URL not configured');
      return { success: true }; // Don't fail if webhook not configured
    }

    const payload = {
      email: data.email,
      top_visa: data.topVisa,
      visa_count: data.visaCount,
      utm_source: data.utmSource || null,
      utm_campaign: data.utmCampaign || null,
      timestamp: data.timestamp,
      source: 'immigration-diy-quiz'
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status}`);
    }

    return { success: true, error: null };

  } catch (error) {
    console.error('Webhook error:', error);
    return { success: false, error: error.message };
  }
}
