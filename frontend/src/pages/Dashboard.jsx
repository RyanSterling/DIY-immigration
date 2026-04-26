/**
 * User Dashboard
 * Shows assessment history and account management
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserButton, useAuth } from '@clerk/react';
import { useCurrentUser, syncUserToBackend } from '../lib/auth';
import { VISA_TYPES } from '../data/visaTypes';

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'http://localhost:8787';

export default function Dashboard() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { user, isLoaded } = useCurrentUser();
  const [assessments, setAssessments] = useState([]);
  const [isLoadingAssessments, setIsLoadingAssessments] = useState(true);
  const [syncComplete, setSyncComplete] = useState(false);

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
        setIsLoadingAssessments(false);
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
    <div className="min-h-screen" style={{ backgroundColor: '#EFEDEC' }}>
      {/* Header */}
      <header className="border-b" style={{ backgroundColor: 'white', borderColor: '#E6E4E1' }}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" style={{ fontFamily: 'Libre Baskerville, serif', fontSize: '1.25rem', color: '#1E3A5F', textDecoration: 'none' }}>
            Immigration DIY
          </Link>
          <div className="flex items-center gap-4">
            <span style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.875rem', color: '#77716E' }}>
              {user?.email}
            </span>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 style={{
          fontFamily: 'Libre Baskerville, serif',
          fontSize: '2rem',
          color: '#1E1F1C',
          marginBottom: '0.5rem'
        }}>
          Welcome, {user?.firstName || 'there'}
        </h1>
        <p style={{
          fontFamily: 'Soehne, sans-serif',
          fontSize: '1rem',
          color: '#77716E',
          marginBottom: '2rem'
        }}>
          Track your visa assessments and application progress.
        </p>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => navigate('/k1')}
            className="p-6 rounded-lg text-left transition-all hover:shadow-md"
            style={{ backgroundColor: 'white', border: '1px solid #E6E4E1' }}
          >
            <h3 style={{ fontFamily: 'Soehne, sans-serif', fontWeight: '600', color: '#1E3A5F', marginBottom: '0.5rem' }}>
              K-1 Fiancé Visa Assessment
            </h3>
            <p style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.875rem', color: '#77716E' }}>
              Check your eligibility for a K-1 fiancé visa
            </p>
          </button>
          <button
            onClick={() => navigate('/')}
            className="p-6 rounded-lg text-left transition-all hover:shadow-md"
            style={{ backgroundColor: 'white', border: '1px solid #E6E4E1' }}
          >
            <h3 style={{ fontFamily: 'Soehne, sans-serif', fontWeight: '600', color: '#1E3A5F', marginBottom: '0.5rem' }}>
              Work Visa Assessment
            </h3>
            <p style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.875rem', color: '#77716E' }}>
              Explore H-1B, L-1, O-1, and other work visa options
            </p>
          </button>
        </div>

        {/* Assessment History */}
        <div className="rounded-lg p-6" style={{ backgroundColor: 'white', border: '1px solid #E6E4E1' }}>
          <h2 style={{
            fontFamily: 'Libre Baskerville, serif',
            fontSize: '1.5rem',
            color: '#1E1F1C',
            marginBottom: '1rem'
          }}>
            Your Assessments
          </h2>

          {isLoadingAssessments ? (
            <p style={{ fontFamily: 'Soehne, sans-serif', color: '#77716E' }}>Loading your assessments...</p>
          ) : assessments.length === 0 ? (
            <div className="text-center py-8">
              <p style={{ fontFamily: 'Soehne, sans-serif', color: '#77716E', marginBottom: '1rem' }}>
                You haven't completed any assessments yet.
              </p>
              <button
                onClick={() => navigate('/k1')}
                className="px-6 py-2 rounded-full transition-all hover:opacity-90"
                style={{ backgroundColor: '#1E3A5F', color: 'white', fontFamily: 'Soehne, sans-serif' }}
              >
                Take K-1 Assessment
              </button>
            </div>
          ) : (
            <div className="space-y-4">
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
      </main>
    </div>
  );
}
