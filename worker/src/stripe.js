/**
 * Stripe Integration for Immigration DIY
 * Handles checkout sessions and webhooks
 */

import Stripe from 'stripe';

// Visa pricing configuration (cents)
// This can be moved to database later
export const VISA_PRICING = {
  k1: {
    amountCents: 40000, // $400
    name: 'K-1 Fiancé Visa DIY Guide',
    description: 'Complete step-by-step K-1 visa application guidance'
  }
  // Add more visa types as needed
};

/**
 * Create Stripe client
 */
export function getStripeClient(env) {
  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
  });
}

/**
 * Create a Stripe Checkout session for visa purchase
 */
export async function createCheckoutSession(env, {
  userId,
  userEmail,
  visaType,
  successUrl,
  cancelUrl
}) {
  const stripe = getStripeClient(env);

  // Get pricing for this visa type
  const pricing = VISA_PRICING[visaType];
  if (!pricing) {
    throw new Error(`No pricing configured for visa type: ${visaType}`);
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: userEmail,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: pricing.amountCents,
          product_data: {
            name: pricing.name,
            description: pricing.description,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId,
      visaType,
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return session;
}

/**
 * Construct and verify Stripe webhook event
 */
export function constructWebhookEvent(stripe, payload, signature, webhookSecret) {
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}
