/**
 * Stripe API Functions
 */

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'http://localhost:8787';

/**
 * Create a Stripe Checkout session and redirect to payment
 */
export async function createCheckoutSession(token, visaType) {
  const response = await fetch(`${WORKER_URL}/stripe/create-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      visaType,
      successUrl: `${window.location.origin}/visa/${visaType}?purchase=success`,
      cancelUrl: `${window.location.origin}/visa/${visaType}/pricing?cancelled=true`
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to create checkout session');
  }

  return data;
}

/**
 * Check if user has purchased a specific visa type
 */
export async function checkPurchaseStatus(token, visaType) {
  const response = await fetch(`${WORKER_URL}/purchases/${visaType}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    return { hasPurchased: false, purchase: null };
  }

  return response.json();
}

/**
 * Get all user's purchases
 */
export async function getUserPurchases(token) {
  const response = await fetch(`${WORKER_URL}/my-purchases`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    return { purchases: [] };
  }

  return response.json();
}

/**
 * Redirect to Stripe Checkout
 */
export async function redirectToCheckout(token, visaType) {
  const { checkoutUrl } = await createCheckoutSession(token, visaType);
  window.location.href = checkoutUrl;
}
