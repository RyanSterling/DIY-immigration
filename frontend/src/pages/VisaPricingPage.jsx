/**
 * Visa Pricing Page
 * Shows pricing and benefits for a visa DIY guide
 * Includes Stripe checkout button
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@clerk/react';
import { useCurrentUser, syncUserToBackend } from '../lib/auth';
import { VISA_TYPES } from '../data/visaTypes';
import { redirectToCheckout, checkPurchaseStatus } from '../lib/stripeApi';

export default function VisaPricingPage() {
  const { visaType } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { getToken } = useAuth();
  const { user, isLoaded } = useCurrentUser();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [syncComplete, setSyncComplete] = useState(false);
  const [alreadyPurchased, setAlreadyPurchased] = useState(false);

  const visaInfo = VISA_TYPES[visaType];
  const cancelled = searchParams.get('cancelled') === 'true';

  // Sync user to backend on mount
  useEffect(() => {
    async function sync() {
      if (isLoaded && user) {
        await syncUserToBackend(getToken, user);
        setSyncComplete(true);
      }
    }
    sync();
  }, [isLoaded, user, getToken]);

  // Check if already purchased
  useEffect(() => {
    async function checkPurchase() {
      if (!syncComplete) return;

      try {
        const token = await getToken();
        const { hasPurchased } = await checkPurchaseStatus(token, visaType);
        if (hasPurchased) {
          setAlreadyPurchased(true);
        }
      } catch (err) {
        console.error('Error checking purchase:', err);
      }
    }
    checkPurchase();
  }, [syncComplete, getToken, visaType]);

  // Handle checkout
  async function handleCheckout() {
    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();
      await redirectToCheckout(token, visaType);
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err.message || 'Failed to start checkout');
      setIsLoading(false);
    }
  }

  // Redirect if already purchased
  if (alreadyPurchased) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#EFEDEC' }}>
        <div className="text-center p-8 rounded-lg" style={{ backgroundColor: 'white', maxWidth: '400px' }}>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D1FAE5' }}>
            <svg className="w-8 h-8" fill="none" stroke="#065F46" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 style={{ fontFamily: 'Libre Baskerville, serif', fontSize: '1.5rem', color: '#1E1F1C', marginBottom: '0.5rem' }}>
            Already Purchased
          </h2>
          <p style={{ fontFamily: 'Soehne, sans-serif', color: '#77716E', marginBottom: '1.5rem' }}>
            You already have access to this DIY guide.
          </p>
          <button
            onClick={() => navigate(`/visa/${visaType}`)}
            className="w-full py-3 px-6 rounded-lg font-medium transition-all"
            style={{ backgroundColor: '#1E3A5F', color: 'white', fontFamily: 'Soehne, sans-serif' }}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!visaInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#EFEDEC' }}>
        <p style={{ fontFamily: 'Soehne, sans-serif', color: '#77716E' }}>Visa type not found</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#EFEDEC' }}>
        <p style={{ fontFamily: 'Soehne, sans-serif', color: '#77716E' }}>Loading...</p>
      </div>
    );
  }

  const benefits = [
    'Step-by-step application walkthrough',
    'Complete document checklist with guidance',
    'Form instructions and tips',
    'Timeline tracking to stay on schedule',
    'Video tutorials for complex sections',
    'Evidence organization guidance',
    'Common mistakes to avoid',
    'Updates when requirements change'
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#EFEDEC' }}>
      {/* Header */}
      <header className="py-4 px-6 border-b" style={{ backgroundColor: 'white', borderColor: '#E6E4E1' }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/account')}
            className="flex items-center gap-2 text-sm"
            style={{ fontFamily: 'Soehne, sans-serif', color: '#77716E' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Account
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Cancelled notice */}
        {cancelled && (
          <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: '#FEF3C7', border: '1px solid #FDE68A' }}>
            <p style={{ fontFamily: 'Soehne, sans-serif', color: '#92400E' }}>
              Your checkout was cancelled. You can try again when you're ready.
            </p>
          </div>
        )}

        {/* Hero section */}
        <div className="text-center mb-10">
          <span
            className="inline-block px-3 py-1 rounded-full text-sm mb-4"
            style={{ backgroundColor: '#E0E7FF', color: '#3730A3', fontFamily: 'Soehne, sans-serif' }}
          >
            DIY Guide
          </span>
          <h1 style={{
            fontFamily: 'Libre Baskerville, serif',
            fontSize: '2.5rem',
            color: '#1E1F1C',
            marginBottom: '0.75rem'
          }}>
            {visaInfo.name}
          </h1>
          <p style={{
            fontFamily: 'Soehne, sans-serif',
            fontSize: '1.125rem',
            color: '#77716E',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            {visaInfo.description}
          </p>
        </div>

        {/* Pricing card */}
        <div
          className="rounded-xl p-8 mb-8"
          style={{ backgroundColor: 'white', border: '1px solid #E6E4E1' }}
        >
          {/* Price */}
          <div className="text-center mb-8">
            <div className="flex items-baseline justify-center gap-1 mb-2">
              <span style={{
                fontFamily: 'Soehne, sans-serif',
                fontSize: '3rem',
                fontWeight: '700',
                color: '#1E1F1C'
              }}>
                {visaInfo.pricing?.display || '$400'}
              </span>
              <span style={{ fontFamily: 'Soehne, sans-serif', color: '#77716E' }}>
                one-time
              </span>
            </div>
            <p style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.875rem', color: '#77716E' }}>
              Lifetime access to your DIY guide
            </p>
          </div>

          {/* Benefits */}
          <div className="mb-8">
            <h3 style={{
              fontFamily: 'Soehne, sans-serif',
              fontWeight: '600',
              color: '#1E1F1C',
              marginBottom: '1rem'
            }}>
              What's included:
            </h3>
            <ul className="space-y-3">
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-3">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="#059669" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span style={{ fontFamily: 'Soehne, sans-serif', color: '#1E1F1C' }}>
                    {benefit}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: '#FEE2E2', border: '1px solid #FECACA' }}>
              <p style={{ fontFamily: 'Soehne, sans-serif', color: '#991B1B' }}>{error}</p>
            </div>
          )}

          {/* CTA button */}
          <button
            onClick={handleCheckout}
            disabled={isLoading}
            className="w-full py-4 px-6 rounded-lg font-medium transition-all disabled:opacity-50"
            style={{
              backgroundColor: '#1E3A5F',
              color: 'white',
              fontFamily: 'Soehne, sans-serif',
              fontSize: '1.125rem'
            }}
          >
            {isLoading ? 'Redirecting to checkout...' : 'Start My Application'}
          </button>

          {/* Stripe badge */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="#77716E" viewBox="0 0 24 24">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
            </svg>
            <span style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.75rem', color: '#77716E' }}>
              Secure checkout powered by Stripe
            </span>
          </div>
        </div>

        {/* Government fees note */}
        <div className="p-4 rounded-lg" style={{ backgroundColor: '#F8F7F6', border: '1px solid #E6E4E1' }}>
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="#77716E" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p style={{ fontFamily: 'Soehne, sans-serif', fontWeight: '600', color: '#1E1F1C', marginBottom: '0.25rem' }}>
                Government Filing Fees
              </p>
              <p style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.875rem', color: '#77716E' }}>
                USCIS filing fees (approximately ${visaInfo.costs?.governmentFees || 800}) are paid separately directly to the government when you submit your application.
              </p>
            </div>
          </div>
        </div>

        {/* Assessment nudge */}
        <div className="mt-8 text-center">
          <p style={{ fontFamily: 'Soehne, sans-serif', color: '#77716E', marginBottom: '0.5rem' }}>
            Not sure if {visaInfo.name} is right for you?
          </p>
          <button
            onClick={() => navigate(visaType === 'k1' ? '/assessment/k1' : '/assessment')}
            className="text-sm underline"
            style={{ fontFamily: 'Soehne, sans-serif', color: '#1E3A5F' }}
          >
            Take the free assessment first
          </button>
        </div>
      </main>
    </div>
  );
}
