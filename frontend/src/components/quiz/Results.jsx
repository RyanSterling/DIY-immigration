import { useNavigate } from 'react-router-dom';
import { useAuth, SignUpButton } from '@clerk/react';
import { VISA_TYPES } from '../../data/visaTypes';

export default function Results({ visaResults, aiContent }) {
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();

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
                {topResult.likelihood.charAt(0).toUpperCase() + topResult.likelihood.slice(1)} Likelihood
              </div>
            </div>

            <p style={{
              fontFamily: 'Soehne, sans-serif',
              opacity: 0.9,
              marginBottom: '1.5rem'
            }}>
              {topVisa.description}
            </p>

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

          {/* Next Steps */}
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

          {/* K-1 Purchase CTA */}
          {isK1 && isEligible && (
            <div style={{
              backgroundColor: '#1E3A5F',
              borderRadius: '12px',
              padding: '2rem',
              marginTop: '2rem',
              color: 'white',
              textAlign: 'center'
            }}>
              <h3 style={{
                fontFamily: 'Libre Baskerville, serif',
                fontSize: '1.5rem',
                marginBottom: '1rem'
              }}>
                Ready to Start Your K-1 Application?
              </h3>
              <p style={{
                fontFamily: 'Soehne, sans-serif',
                opacity: 0.9,
                marginBottom: '1.5rem',
                maxWidth: '500px',
                marginLeft: 'auto',
                marginRight: 'auto'
              }}>
                Get step-by-step guidance, document checklists, and track your progress
                through the entire K-1 fiancé visa process.
              </p>

              {isSignedIn ? (
                <button
                  onClick={() => navigate('/visa/k1/pricing')}
                  className="px-8 py-3 rounded-full font-medium transition-all hover:opacity-90"
                  style={{
                    backgroundColor: 'white',
                    color: '#1E3A5F',
                    fontFamily: 'Soehne, sans-serif',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Get Started - $400
                </button>
              ) : (
                <SignUpButton mode="modal" forceRedirectUrl="/visa/k1/pricing">
                  <button
                    className="px-8 py-3 rounded-full font-medium transition-all hover:opacity-90"
                    style={{
                      backgroundColor: 'white',
                      color: '#1E3A5F',
                      fontFamily: 'Soehne, sans-serif',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Create Account to Get Started - $400
                  </button>
                </SignUpButton>
              )}

              <p style={{
                fontFamily: 'Soehne, sans-serif',
                fontSize: '0.75rem',
                opacity: 0.7,
                marginTop: '1rem'
              }}>
                One-time purchase. Lifetime access.
              </p>
            </div>
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
