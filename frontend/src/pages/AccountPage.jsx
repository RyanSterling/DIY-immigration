/**
 * Account Page
 * Shows user's visa applications, assessments, and account settings
 * Lives within the sidebar layout
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@clerk/react';
import { useCurrentUser, syncUserToBackend } from '../lib/auth';
import { VISA_TYPES } from '../data/visaTypes';
import { getUserPurchases } from '../lib/stripeApi';
import AccountSidebar from '../components/dashboard/AccountSidebar';

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'http://localhost:8787';

export default function AccountPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { getToken } = useAuth();
  const { user, isLoaded } = useCurrentUser();
  const [assessments, setAssessments] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncComplete, setSyncComplete] = useState(false);

  // Determine which view to show based on path
  const currentView = location.pathname === '/account/take-assessment'
    ? 'take-assessment'
    : location.pathname === '/account/history'
    ? 'history'
    : 'account';

  // Build visa applications from purchases
  const visaApplications = purchases.map(p => ({
    type: p.visa_type,
    name: VISA_TYPES[p.visa_type]?.name || p.visa_type.toUpperCase(),
    progress: undefined
  }));

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

  // Fetch assessments and purchases after sync
  useEffect(() => {
    async function fetchData() {
      if (!syncComplete) return;

      try {
        const token = await getToken();

        // Fetch assessments and purchases in parallel
        const [assessmentsResponse, purchasesData] = await Promise.all([
          fetch(`${WORKER_URL}/my-assessments`, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          }),
          getUserPurchases(token)
        ]);

        if (assessmentsResponse.ok) {
          const data = await assessmentsResponse.json();
          setAssessments(data.assessments || []);
        }

        setPurchases(purchasesData.purchases || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [syncComplete, getToken]);

  // Helper to check if a visa type is purchased
  const isPurchased = (visaType) => {
    return purchases.some(p => p.visa_type === visaType);
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#EFEDEC' }}>
        <p style={{ fontFamily: 'Soehne, sans-serif', color: '#77716E' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <AccountSidebar visaApplications={visaApplications} />

      {/* Main Content */}
      <main className="flex-1 p-8" style={{ backgroundColor: '#EFEDEC' }}>
        <div className="max-w-4xl">
          {/* My Account View */}
          {currentView === 'account' && (
            <>
              <h1 style={{
                fontFamily: 'Libre Baskerville, serif',
                fontSize: '2rem',
                color: '#1E1F1C',
                marginBottom: '0.5rem'
              }}>
                Welcome back, {user?.firstName || 'there'}
              </h1>
              <p style={{
                fontFamily: 'Soehne, sans-serif',
                fontSize: '1rem',
                color: '#77716E',
                marginBottom: '2rem'
              }}>
                Manage your visa applications and track your progress.
              </p>

              {/* My Visa Applications */}
              <section>
                <h2 style={{
                  fontFamily: 'Libre Baskerville, serif',
                  fontSize: '1.25rem',
                  color: '#1E1F1C',
                  marginBottom: '1rem'
                }}>
                  My Visa Applications
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {visaApplications.length === 0 && !isLoading && (
                    <div
                      className="col-span-full p-6 rounded-lg text-center"
                      style={{ backgroundColor: '#F8F7F6', border: '1px solid #E6E4E1' }}
                    >
                      <p style={{ fontFamily: 'Soehne, sans-serif', color: '#77716E', marginBottom: '0.5rem' }}>
                        No active visa applications yet.
                      </p>
                      <button
                        onClick={() => navigate('/account/take-assessment')}
                        className="text-sm underline"
                        style={{ fontFamily: 'Soehne, sans-serif', color: '#1E3A5F', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        Take an assessment to find the right visa for you
                      </button>
                    </div>
                  )}

                  {visaApplications.map((visa) => (
                    <button
                      key={visa.type}
                      onClick={() => navigate(`/visa/${visa.type}`)}
                      className="p-6 rounded-lg text-left transition-all hover:shadow-lg"
                      style={{ backgroundColor: '#1E3A5F', border: 'none' }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className="px-2 py-0.5 rounded text-xs"
                          style={{
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            color: 'white',
                            fontFamily: 'Soehne, sans-serif'
                          }}
                        >
                          GUIDE
                        </span>
                        <svg className="w-5 h-5" fill="none" stroke="white" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                      <h3 style={{ fontFamily: 'Soehne, sans-serif', fontWeight: '600', color: 'white', marginBottom: '0.5rem' }}>
                        {visa.name}
                      </h3>
                      <p style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)' }}>
                        Step-by-step application guidance
                      </p>
                    </button>
                  ))}

                  {/* Add New Visa Card */}
                  <button
                    onClick={() => navigate('/account/take-assessment')}
                    className="p-6 rounded-lg text-left transition-all hover:shadow-md border-2 border-dashed"
                    style={{ backgroundColor: 'transparent', borderColor: '#D1D5DB' }}
                  >
                    <div className="flex flex-col items-center justify-center h-full text-center py-4">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                        style={{ backgroundColor: '#F3F4F6' }}
                      >
                        <svg className="w-6 h-6" fill="none" stroke="#6B7280" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                      <p style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.875rem', color: '#6B7280' }}>
                        Explore more visas
                      </p>
                    </div>
                  </button>
                </div>
              </section>
            </>
          )}

          {/* Take Assessment View */}
          {currentView === 'take-assessment' && (
            <>
              <h1 style={{
                fontFamily: 'Libre Baskerville, serif',
                fontSize: '2rem',
                color: '#1E1F1C',
                marginBottom: '0.5rem'
              }}>
                Take an Assessment
              </h1>
              <p style={{
                fontFamily: 'Soehne, sans-serif',
                fontSize: '1rem',
                color: '#77716E',
                marginBottom: '2rem'
              }}>
                Find out which visa options you may qualify for.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <button
                  onClick={() => navigate('/assessment/k1')}
                  className="p-8 rounded-lg text-left transition-all hover:shadow-lg"
                  style={{ backgroundColor: 'white', border: '1px solid #E6E4E1' }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
                    style={{ backgroundColor: '#FEE2E2' }}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="#991B1B" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <h3 style={{ fontFamily: 'Libre Baskerville, serif', fontSize: '1.25rem', color: '#1E1F1C', marginBottom: '0.5rem' }}>
                    K-1 Fiancé Visa
                  </h3>
                  <p style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.875rem', color: '#77716E', marginBottom: '1rem' }}>
                    For US citizens engaged to a foreign national who want to bring their fiancé(e) to the US for marriage.
                  </p>
                  <span style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.875rem', color: '#1E3A5F', fontWeight: '500' }}>
                    Start Assessment →
                  </span>
                </button>

                <button
                  onClick={() => navigate('/assessment')}
                  className="p-8 rounded-lg text-left transition-all hover:shadow-lg"
                  style={{ backgroundColor: 'white', border: '1px solid #E6E4E1' }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
                    style={{ backgroundColor: '#DBEAFE' }}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="#1E40AF" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 style={{ fontFamily: 'Libre Baskerville, serif', fontSize: '1.25rem', color: '#1E1F1C', marginBottom: '0.5rem' }}>
                    Work Visas
                  </h3>
                  <p style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.875rem', color: '#77716E', marginBottom: '1rem' }}>
                    H-1B, L-1, O-1, EB-1A, EB-2 NIW, and other employment-based visa options.
                  </p>
                  <span style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.875rem', color: '#1E3A5F', fontWeight: '500' }}>
                    Start Assessment →
                  </span>
                </button>
              </div>
            </>
          )}

          {/* Assessment History View */}
          {currentView === 'history' && (
            <>
              <h1 style={{
                fontFamily: 'Libre Baskerville, serif',
                fontSize: '2rem',
                color: '#1E1F1C',
                marginBottom: '0.5rem'
              }}>
                Assessment History
              </h1>
              <p style={{
                fontFamily: 'Soehne, sans-serif',
                fontSize: '1rem',
                color: '#77716E',
                marginBottom: '2rem'
              }}>
                Your most recent assessment results.
              </p>

              {isLoading ? (
                <div className="rounded-lg p-8 text-center" style={{ backgroundColor: 'white', border: '1px solid #E6E4E1' }}>
                  <p style={{ fontFamily: 'Soehne, sans-serif', color: '#77716E' }}>Loading...</p>
                </div>
              ) : assessments.length === 0 ? (
                <div className="rounded-lg p-8 text-center" style={{ backgroundColor: 'white', border: '1px solid #E6E4E1' }}>
                  <p style={{ fontFamily: 'Soehne, sans-serif', color: '#77716E', marginBottom: '1rem' }}>
                    No assessments yet.
                  </p>
                  <button
                    onClick={() => navigate('/account/take-assessment')}
                    className="px-6 py-2 rounded-lg font-medium transition-all"
                    style={{ backgroundColor: '#1E3A5F', color: 'white', fontFamily: 'Soehne, sans-serif', border: 'none', cursor: 'pointer' }}
                  >
                    Take Your First Assessment
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Filter to most recent assessment per type (K-1 vs Work) */}
                  {(() => {
                    const mostRecentK1 = assessments.find(a => a.k1_answers !== null);
                    const mostRecentWork = assessments.find(a => a.k1_answers === null);
                    const uniqueAssessments = [mostRecentK1, mostRecentWork].filter(Boolean);

                    return uniqueAssessments.map((assessment) => {
                      const visaResults = assessment.visa_eligibility_results || [];
                      const topVisa = visaResults[0];
                      const isK1Assessment = assessment.k1_answers !== null;
                      const topVisaInfo = topVisa ? VISA_TYPES[topVisa.visa_type_id] : null;
                      const purchased = topVisa ? isPurchased(topVisa.visa_type_id) : false;

                      // Get strengths and challenges from the result
                      const strengths = topVisa?.key_strengths || [];
                      const challenges = topVisa?.key_challenges || [];

                      return (
                        <div
                          key={assessment.id}
                          className="rounded-xl overflow-hidden"
                          style={{ backgroundColor: 'white', border: '1px solid #E6E4E1' }}
                        >
                          {/* Header */}
                          <div
                            className="p-6"
                            style={{ backgroundColor: '#1E3A5F' }}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-10 h-10 rounded-full flex items-center justify-center"
                                  style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
                                >
                                  {isK1Assessment ? (
                                    <svg className="w-5 h-5" fill="none" stroke="white" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                  ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="white" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                  )}
                                </div>
                                <div>
                                  <h3 style={{ fontFamily: 'Libre Baskerville, serif', fontSize: '1.25rem', color: 'white', margin: 0 }}>
                                    {topVisaInfo?.name || (isK1Assessment ? 'K-1 Fiancé Visa' : 'Work Visa')}
                                  </h3>
                                  <p style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
                                    Assessed {new Date(assessment.created_at).toLocaleDateString('en-US', {
                                      month: 'long',
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}
                                  </p>
                                </div>
                              </div>
                              {topVisa && (
                                <span
                                  className="px-3 py-1 rounded-full text-sm font-medium"
                                  style={{
                                    backgroundColor: topVisa.likelihood_rating === 'high' ? '#166534' :
                                                   topVisa.likelihood_rating === 'medium' ? '#B45309' : '#991B1B',
                                    color: 'white',
                                    fontFamily: 'Soehne, sans-serif'
                                  }}
                                >
                                  {isK1Assessment
                                    ? (topVisa.likelihood_rating === 'high' ? 'Strong Case' :
                                       topVisa.likelihood_rating === 'medium' ? 'Good Case' : 'May Need Work')
                                    : `${topVisa.likelihood_rating.charAt(0).toUpperCase()}${topVisa.likelihood_rating.slice(1)} Likelihood`}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Results Body */}
                          <div className="p-6">
                            <div className="grid md:grid-cols-2 gap-6 mb-6">
                              {/* Strengths */}
                              {strengths.length > 0 && (
                                <div>
                                  <h4 style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.75rem', color: '#77716E', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                                    Your Strengths
                                  </h4>
                                  <ul className="space-y-2">
                                    {strengths.slice(0, 4).map((strength, i) => (
                                      <li key={i} className="flex items-start gap-2">
                                        <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="#059669" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.875rem', color: '#1E1F1C' }}>
                                          {strength}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Considerations */}
                              {challenges.length > 0 && (
                                <div>
                                  <h4 style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.75rem', color: '#77716E', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                                    Considerations
                                  </h4>
                                  <ul className="space-y-2">
                                    {challenges.slice(0, 3).map((challenge, i) => (
                                      <li key={i} className="flex items-start gap-2">
                                        <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="#D97706" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        <span style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.875rem', color: '#1E1F1C' }}>
                                          {challenge}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>

                            {/* CTA */}
                            <div className="pt-4" style={{ borderTop: '1px solid #E6E4E1' }}>
                              {purchased ? (
                                <button
                                  onClick={() => navigate(`/visa/${topVisa.visa_type_id}`)}
                                  className="w-full md:w-auto px-8 py-3 rounded-lg font-medium transition-all hover:opacity-90"
                                  style={{ backgroundColor: '#1E3A5F', color: 'white', fontFamily: 'Soehne, sans-serif', border: 'none', cursor: 'pointer' }}
                                >
                                  Continue Your Application
                                </button>
                              ) : topVisaInfo?.pricing ? (
                                <div className="flex flex-col md:flex-row md:items-center gap-4">
                                  <button
                                    onClick={() => navigate(`/visa/${topVisa.visa_type_id}/pricing`)}
                                    className="px-8 py-3 rounded-lg font-medium transition-all hover:opacity-90"
                                    style={{ backgroundColor: '#1E3A5F', color: 'white', fontFamily: 'Soehne, sans-serif', border: 'none', cursor: 'pointer' }}
                                  >
                                    Start Your {topVisaInfo.name} Application
                                  </button>
                                  <span style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.875rem', color: '#77716E' }}>
                                    {topVisaInfo.pricing.display} one-time
                                  </span>
                                </div>
                              ) : (
                                <button
                                  onClick={() => navigate(isK1Assessment ? '/assessment/k1' : '/assessment')}
                                  className="px-6 py-3 rounded-lg font-medium transition-all hover:shadow-md"
                                  style={{ backgroundColor: 'white', color: '#1E3A5F', fontFamily: 'Soehne, sans-serif', border: '1px solid #E6E4E1', cursor: 'pointer' }}
                                >
                                  Retake Assessment
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
