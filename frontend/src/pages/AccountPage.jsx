/**
 * Account Page
 * Shows user's visa applications, assessments, and account settings
 * Lives within the sidebar layout
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/react';
import { useCurrentUser, syncUserToBackend } from '../lib/auth';
import { VISA_TYPES } from '../data/visaTypes';
import AccountSidebar from '../components/dashboard/AccountSidebar';

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'http://localhost:8787';

export default function AccountPage() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { user, isLoaded } = useCurrentUser();
  const [assessments, setAssessments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncComplete, setSyncComplete] = useState(false);

  // For now, hardcode K-1 as the available visa application
  // In the future, this would come from the backend based on user purchases/progress
  const visaApplications = [
    { type: 'k1', name: 'K-1 Fiancé Visa', progress: undefined }
  ];

  // Sync user to backend on mount
  useEffect(() => {
    async function sync() {
      if (isLoaded && user) {
        await syncUserToBackend(getToken);
        setSyncComplete(true);
      }
    }
    sync();
  }, [isLoaded, user, getToken]);

  // Fetch assessments after sync
  useEffect(() => {
    async function fetchAssessments() {
      if (!syncComplete) return;

      try {
        const token = await getToken();
        const response = await fetch(`${WORKER_URL}/my-assessments`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setAssessments(data.assessments || []);
        }
      } catch (error) {
        console.error('Error fetching assessments:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAssessments();
  }, [syncComplete, getToken]);

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
          <section className="mb-8">
            <h2 style={{
              fontFamily: 'Libre Baskerville, serif',
              fontSize: '1.25rem',
              color: '#1E1F1C',
              marginBottom: '1rem'
            }}>
              My Visa Applications
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                      DIY GUIDE
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
                onClick={() => navigate('/')}
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

          {/* Take an Assessment */}
          <section className="mb-8">
            <h2 style={{
              fontFamily: 'Libre Baskerville, serif',
              fontSize: '1.25rem',
              color: '#1E1F1C',
              marginBottom: '1rem'
            }}>
              Take an Assessment
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <button
                onClick={() => navigate('/assessment/k1')}
                className="p-5 rounded-lg text-left transition-all hover:shadow-md"
                style={{ backgroundColor: 'white', border: '1px solid #E6E4E1' }}
              >
                <h3 style={{ fontFamily: 'Soehne, sans-serif', fontWeight: '600', color: '#1E3A5F', marginBottom: '0.25rem' }}>
                  K-1 Fiancé Visa
                </h3>
                <p style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.875rem', color: '#77716E' }}>
                  Check eligibility for fiancé visa
                </p>
              </button>
              <button
                onClick={() => navigate('/assessment')}
                className="p-5 rounded-lg text-left transition-all hover:shadow-md"
                style={{ backgroundColor: 'white', border: '1px solid #E6E4E1' }}
              >
                <h3 style={{ fontFamily: 'Soehne, sans-serif', fontWeight: '600', color: '#1E3A5F', marginBottom: '0.25rem' }}>
                  Work Visas
                </h3>
                <p style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.875rem', color: '#77716E' }}>
                  H-1B, L-1, O-1, and more
                </p>
              </button>
            </div>
          </section>

          {/* Assessment History */}
          <section>
            <div className="rounded-lg p-6" style={{ backgroundColor: 'white', border: '1px solid #E6E4E1' }}>
              <h2 style={{
                fontFamily: 'Libre Baskerville, serif',
                fontSize: '1.25rem',
                color: '#1E1F1C',
                marginBottom: '1rem'
              }}>
                Assessment History
              </h2>

              {isLoading ? (
                <p style={{ fontFamily: 'Soehne, sans-serif', color: '#77716E' }}>Loading...</p>
              ) : assessments.length === 0 ? (
                <p style={{ fontFamily: 'Soehne, sans-serif', color: '#77716E' }}>
                  No assessments yet. Take one above to get started.
                </p>
              ) : (
                <div className="space-y-3">
                  {assessments.map((assessment) => {
                    const topVisa = assessment.visa_eligibility_results?.[0];
                    const visaInfo = topVisa ? VISA_TYPES[topVisa.visa_type_id] : null;

                    return (
                      <div
                        key={assessment.id}
                        className="p-4 rounded-lg"
                        style={{ backgroundColor: '#F8F7F6', border: '1px solid #E6E4E1' }}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p style={{ fontFamily: 'Soehne, sans-serif', fontWeight: '600', color: '#1E1F1C' }}>
                              {visaInfo?.name || 'Visa Assessment'}
                            </p>
                            <p style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.875rem', color: '#77716E' }}>
                              {new Date(assessment.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                          {topVisa && (
                            <span
                              className="px-3 py-1 rounded-full text-sm"
                              style={{
                                backgroundColor: topVisa.likelihood_rating === 'high' ? '#D1FAE5' :
                                               topVisa.likelihood_rating === 'medium' ? '#FEF3C7' : '#FEE2E2',
                                color: topVisa.likelihood_rating === 'high' ? '#065F46' :
                                      topVisa.likelihood_rating === 'medium' ? '#92400E' : '#991B1B',
                                fontFamily: 'Soehne, sans-serif'
                              }}
                            >
                              {topVisa.likelihood_rating} likelihood
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
