import { useState } from 'react';
import { useAuth, SignUpButton } from '@clerk/react';
import { VISA_TYPES } from '../../data/visaTypes';
import { redirectToCheckout } from '../../lib/stripeApi';

export default function Results({ visaResults, aiContent }) {
  const { isSignedIn, getToken } = useAuth();
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);

  // Check if this is a K-1 result
  const isK1 = visaResults?.length > 0 && visaResults[0].visaCode === 'k1';
  const isEligible = visaResults?.length > 0 && visaResults[0].likelihood !== 'ineligible';
  if (!visaResults || visaResults.length === 0) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#EFEDEC' }}>
        <div className="flex-1 pt-12 pb-8 px-4">
          <div className="max-w-3xl mx-auto">
            <h1 style={{
              fontFamily: 'Libre Baskerville, serif',
              fontSize: '2rem',
              color: '#1E1F1C',
              marginBottom: '1.5rem'
            }}>
              Your Assessment Results
            </h1>

            <div style={{
              backgroundColor: '#FEF3C7',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '2rem'
            }}>
              <p style={{
                fontFamily: 'Soehne, sans-serif',
                color: '#92400E'
              }}>
                Based on your responses, you may need to explore additional pathways or consult
                with an immigration attorney for personalized guidance. Your situation may require
                a more detailed analysis.
              </p>
            </div>

            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '2rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{
                fontFamily: 'Libre Baskerville, serif',
                fontSize: '1.25rem',
                color: '#1E1F1C',
                marginBottom: '1rem'
              }}>
                Recommended Next Steps
              </h3>
              <ul style={{
                fontFamily: 'Soehne, sans-serif',
                color: '#77716E',
                lineHeight: '1.8'
              }}>
                <li>Schedule a consultation with an immigration attorney</li>
                <li>Gather documentation about your education and work experience</li>
                <li>Research visa categories that may apply to your specific situation</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const topResult = visaResults[0];
  const topVisa = VISA_TYPES[topResult.visaCode];

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#EFEDEC' }}>
      <div className="flex-1 pt-12 pb-8 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 style={{
            fontFamily: 'Libre Baskerville, serif',
            fontSize: '2rem',
            color: '#1E1F1C',
            marginBottom: '0.5rem'
          }}>
            Your Visa Eligibility Results
          </h1>

          <p style={{
            fontFamily: 'Soehne, sans-serif',
            color: '#77716E',
            marginBottom: '2rem'
          }}>
            Based on your responses, here are the visa options you may qualify for:
          </p>

          {/* Top Recommendation */}
          <div style={{
            backgroundColor: '#1E3A5F',
            borderRadius: '16px',
            padding: '2rem',
            marginBottom: '1.5rem',
            color: 'white'
          }}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <span style={{
                  fontFamily: 'Soehne, sans-serif',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  opacity: 0.8
                }}>
                  Top Recommendation
                </span>
                <h2 style={{
                  fontFamily: 'Libre Baskerville, serif',
                  fontSize: '1.5rem',
                  marginTop: '0.25rem'
                }}>
                  {topVisa.name}
                </h2>
              </div>
              <div style={{
                backgroundColor: getLikelihoodColor(topResult.likelihood),
                borderRadius: '20px',
                padding: '0.5rem 1rem',
                fontFamily: 'Soehne, sans-serif',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}>
                {isK1 ? getCaseStrengthLabel(topResult.likelihood) : `${topResult.likelihood.charAt(0).toUpperCase() + topResult.likelihood.slice(1)} Likelihood`}
              </div>
            </div>

            <p style={{
              fontFamily: 'Soehne, sans-serif',
              opacity: 0.9,
              marginBottom: '1.5rem'
            }}>
              {topVisa.description}
            </p>

            {/* Hide cost/time for K-1 as they vary significantly */}
            {!isK1 && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <span style={{ opacity: 0.7, fontSize: '0.875rem' }}>Estimated Cost</span>
                  <p style={{ fontSize: '1.25rem', fontWeight: '500' }}>
                    ${topResult.estimatedCost.toLocaleString()}
                  </p>
                </div>
                <div>
                  <span style={{ opacity: 0.7, fontSize: '0.875rem' }}>Processing Time</span>
                  <p style={{ fontSize: '1.25rem', fontWeight: '500' }}>
                    {formatDays(topResult.estimatedDays)}
                  </p>
                </div>
              </div>
            )}

            {/* Strengths */}
            {topResult.strengths.length > 0 && (
              <div className="mb-4">
                <span style={{ opacity: 0.7, fontSize: '0.875rem' }}>Your Strengths</span>
                <ul style={{ marginTop: '0.5rem' }}>
                  {topResult.strengths.slice(0, 4).map((strength, i) => (
                    <li key={i} className="flex items-center gap-2" style={{ marginBottom: '0.25rem' }}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8L6.5 11.5L13 5" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      <span style={{ fontSize: '0.875rem' }}>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Challenges */}
            {topResult.challenges.length > 0 && (
              <div>
                <span style={{ opacity: 0.7, fontSize: '0.875rem' }}>Considerations</span>
                <ul style={{ marginTop: '0.5rem' }}>
                  {topResult.challenges.slice(0, 3).map((challenge, i) => (
                    <li key={i} className="flex items-center gap-2" style={{ marginBottom: '0.25rem' }}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="6" stroke="#FBBF24" strokeWidth="2"/>
                        <path d="M8 5V8M8 10.5V11" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      <span style={{ fontSize: '0.875rem' }}>{challenge}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Other Options */}
          {visaResults.length > 1 && (
            <>
              <h3 style={{
                fontFamily: 'Libre Baskerville, serif',
                fontSize: '1.25rem',
                color: '#1E1F1C',
                marginBottom: '1rem',
                marginTop: '2rem'
              }}>
                Other Visa Options
              </h3>

              <div className="space-y-4">
                {visaResults.slice(1).map((result) => {
                  const visa = VISA_TYPES[result.visaCode];
                  return (
                    <div
                      key={result.visaCode}
                      style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                      }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 style={{
                          fontFamily: 'Libre Baskerville, serif',
                          fontSize: '1.125rem',
                          color: '#1E1F1C'
                        }}>
                          {visa.name}
                        </h4>
                        <span style={{
                          backgroundColor: getLikelihoodBgColor(result.likelihood),
                          color: getLikelihoodTextColor(result.likelihood),
                          borderRadius: '12px',
                          padding: '0.25rem 0.75rem',
                          fontFamily: 'Soehne, sans-serif',
                          fontSize: '0.75rem',
                          fontWeight: '500'
                        }}>
                          {result.likelihood.charAt(0).toUpperCase() + result.likelihood.slice(1)}
                        </span>
                      </div>

                      <p style={{
                        fontFamily: 'Soehne, sans-serif',
                        fontSize: '0.875rem',
                        color: '#77716E',
                        marginBottom: '1rem'
                      }}>
                        {visa.description}
                      </p>

                      <div className="flex gap-6" style={{ fontSize: '0.875rem' }}>
                        <div>
                          <span style={{ color: '#8B8886' }}>Cost: </span>
                          <span style={{ color: '#1E1F1C', fontWeight: '500' }}>
                            ${result.estimatedCost.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: '#8B8886' }}>Time: </span>
                          <span style={{ color: '#1E1F1C', fontWeight: '500' }}>
                            {formatDays(result.estimatedDays)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* AI Content */}
          {aiContent && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '2rem',
              marginTop: '2rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{
                fontFamily: 'Libre Baskerville, serif',
                fontSize: '1.25rem',
                color: '#1E1F1C',
                marginBottom: '1rem'
              }}>
                Personalized Recommendations
              </h3>
              <p style={{
                fontFamily: 'Soehne, sans-serif',
                color: '#77716E',
                lineHeight: '1.7',
                whiteSpace: 'pre-line'
              }}>
                {aiContent.recommendations}
              </p>
            </div>
          )}

          {/* Next Steps - hide for K-1 since we show pricing block instead */}
          {!isK1 && (
            <div style={{
              backgroundColor: '#E6E4E1',
              borderRadius: '12px',
              padding: '2rem',
              marginTop: '2rem'
            }}>
              <h3 style={{
                fontFamily: 'Libre Baskerville, serif',
                fontSize: '1.25rem',
                color: '#1E1F1C',
                marginBottom: '1rem'
              }}>
                Next Steps
              </h3>
              <ol style={{
                fontFamily: 'Soehne, sans-serif',
                color: '#77716E',
                lineHeight: '1.8',
                paddingLeft: '1.25rem'
              }}>
                <li>Review the visa options above and research requirements in detail</li>
                <li>Gather supporting documents (education credentials, work experience, etc.)</li>
                <li>Consider consulting with an immigration attorney for complex cases</li>
                <li>Check current processing times and visa bulletin dates</li>
              </ol>
            </div>
          )}

          {/* K-1 Pricing Block */}
          {isK1 && isEligible && (
            <K1PricingBlock
              isSignedIn={isSignedIn}
              getToken={getToken}
              isCheckoutLoading={isCheckoutLoading}
              setIsCheckoutLoading={setIsCheckoutLoading}
              checkoutError={checkoutError}
              setCheckoutError={setCheckoutError}
            />
          )}

          {/* Disclaimer */}
          <p style={{
            fontFamily: 'Soehne, sans-serif',
            fontSize: '0.75rem',
            color: '#8B8886',
            marginTop: '2rem',
            textAlign: 'center'
          }}>
            This assessment provides general information only and does not constitute legal advice.
            Immigration laws are complex and frequently change. We recommend consulting with a
            qualified immigration attorney for advice specific to your situation.
          </p>
        </div>
      </div>
    </div>
  );
}

function formatDays(days) {
  if (days < 30) return `${days} days`;
  if (days < 365) return `${Math.round(days / 30)} months`;
  return `${Math.round(days / 365)} year${days >= 730 ? 's' : ''}`;
}

function getLikelihoodColor(likelihood) {
  switch (likelihood) {
    case 'high': return '#166534';
    case 'medium': return '#B45309';
    case 'low': return '#991B1B';
    default: return '#6B7280';
  }
}

function getLikelihoodBgColor(likelihood) {
  switch (likelihood) {
    case 'high': return '#DCFCE7';
    case 'medium': return '#FEF3C7';
    case 'low': return '#FEE2E2';
    default: return '#F3F4F6';
  }
}

function getLikelihoodTextColor(likelihood) {
  switch (likelihood) {
    case 'high': return '#166534';
    case 'medium': return '#92400E';
    case 'low': return '#991B1B';
    default: return '#6B7280';
  }
}

function getCaseStrengthLabel(likelihood) {
  switch (likelihood) {
    case 'high': return 'Strong Case';
    case 'medium': return 'Good Case';
    case 'low': return 'May Need Work';
    default: return 'Needs Review';
  }
}

// K-1 Pricing Block Component
function K1PricingBlock({ isSignedIn, getToken, isCheckoutLoading, setIsCheckoutLoading, checkoutError, setCheckoutError }) {
  const visaInfo = VISA_TYPES.k1;

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

  async function handleCheckout() {
    setIsCheckoutLoading(true);
    setCheckoutError(null);

    try {
      const token = await getToken();
      await redirectToCheckout(token, 'k1');
    } catch (err) {
      console.error('Checkout error:', err);
      setCheckoutError(err.message || 'Failed to start checkout');
      setIsCheckoutLoading(false);
    }
  }

  return (
    <div
      className="rounded-xl p-8 mt-8"
      style={{ backgroundColor: 'white', border: '1px solid #E6E4E1' }}
    >
      {/* Header */}
      <div className="text-center mb-6">
        <span
          className="inline-block px-3 py-1 rounded-full text-sm mb-3"
          style={{ backgroundColor: '#E0E7FF', color: '#3730A3', fontFamily: 'Soehne, sans-serif' }}
        >
          Application Guide
        </span>
        <h3 style={{
          fontFamily: 'Libre Baskerville, serif',
          fontSize: '1.5rem',
          color: '#1E1F1C',
          marginBottom: '0.5rem'
        }}>
          Start Your K-1 Application
        </h3>
      </div>

      {/* Price */}
      <div className="text-center mb-6">
        <div className="flex items-baseline justify-center gap-1 mb-2">
          <span style={{
            fontFamily: 'Soehne, sans-serif',
            fontSize: '2.5rem',
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
          Lifetime access to your guide
        </p>
      </div>

      {/* Benefits */}
      <div className="mb-6">
        <h4 style={{
          fontFamily: 'Soehne, sans-serif',
          fontWeight: '600',
          color: '#1E1F1C',
          marginBottom: '0.75rem',
          fontSize: '0.875rem'
        }}>
          What's included:
        </h4>
        <ul className="space-y-2">
          {benefits.map((benefit, index) => (
            <li key={index} className="flex items-start gap-2">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="#059669" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span style={{ fontFamily: 'Soehne, sans-serif', color: '#1E1F1C', fontSize: '0.875rem' }}>
                {benefit}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Error message */}
      {checkoutError && (
        <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: '#FEE2E2', border: '1px solid #FECACA' }}>
          <p style={{ fontFamily: 'Soehne, sans-serif', color: '#991B1B', fontSize: '0.875rem' }}>{checkoutError}</p>
        </div>
      )}

      {/* CTA button */}
      {isSignedIn ? (
        <button
          onClick={handleCheckout}
          disabled={isCheckoutLoading}
          className="w-full py-3 px-6 rounded-lg font-medium transition-all disabled:opacity-50"
          style={{
            backgroundColor: '#1E3A5F',
            color: 'white',
            fontFamily: 'Soehne, sans-serif',
            fontSize: '1rem'
          }}
        >
          {isCheckoutLoading ? 'Redirecting to checkout...' : 'Get Started'}
        </button>
      ) : (
        <SignUpButton mode="modal" forceRedirectUrl="/visa/k1/pricing">
          <button
            className="w-full py-3 px-6 rounded-lg font-medium transition-all"
            style={{
              backgroundColor: '#1E3A5F',
              color: 'white',
              fontFamily: 'Soehne, sans-serif',
              fontSize: '1rem'
            }}
          >
            Create Account to Get Started
          </button>
        </SignUpButton>
      )}

      {/* Stripe badge */}
      <div className="mt-3 flex items-center justify-center gap-2">
        <svg className="w-4 h-4" fill="#77716E" viewBox="0 0 24 24">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
        </svg>
        <span style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.75rem', color: '#77716E' }}>
          Secure checkout powered by Stripe
        </span>
      </div>

      {/* Government fees note */}
      <div className="mt-6 p-3 rounded-lg" style={{ backgroundColor: '#F8F7F6', border: '1px solid #E6E4E1' }}>
        <div className="flex items-start gap-2">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="#77716E" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.75rem', color: '#77716E' }}>
            Government filing fees (approximately ${visaInfo.costs?.governmentFees || 800}) are paid separately directly to USCIS when you submit your application.
          </p>
        </div>
      </div>
    </div>
  );
}
