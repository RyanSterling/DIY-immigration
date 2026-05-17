import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/react';
import { useNavigate } from 'react-router-dom';
import PDFFormViewer from '../components/pdf/PDFFormViewer';

export default function K1FormFillerPage() {
  const { getToken, isSignedIn } = useAuth();
  const navigate = useNavigate();
  const [token, setToken] = useState(null);

  useEffect(() => {
    const fetchToken = async () => {
      if (isSignedIn) {
        try {
          const t = await getToken();
          setToken(t);
        } catch (err) {
          console.error('Error getting token:', err);
        }
      }
    };
    fetchToken();
  }, [isSignedIn, getToken]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header - matches dashboard style */}
      <header
        className="bg-white border-b px-6 py-4 flex items-center justify-between"
        style={{ borderColor: '#E6E4E1' }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard/k1')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.875rem' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
          <div className="h-6 w-px bg-gray-200" />
          <div>
            <h1
              style={{
                fontFamily: 'Libre Baskerville, serif',
                fontSize: '1.25rem',
                color: '#1E3A5F',
                fontWeight: '600'
              }}
            >
              Form I-129F
            </h1>
            <p
              style={{
                fontFamily: 'Soehne, sans-serif',
                fontSize: '0.8125rem',
                color: '#6B7280'
              }}
            >
              Petition for Alien Fiancé(e)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status indicator */}
          {isSignedIn ? (
            <span
              className="flex items-center gap-1.5 text-green-600"
              style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.8125rem' }}
            >
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Auto-saving enabled
            </span>
          ) : (
            <span
              className="flex items-center gap-1.5 text-amber-600"
              style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.8125rem' }}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Sign in to save
            </span>
          )}
        </div>
      </header>

      {/* Info banner */}
      <div
        className="px-6 py-3 border-b"
        style={{ backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }}
      >
        <div className="flex items-start gap-3 max-w-4xl">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="#0284C7" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.875rem', color: '#0369A1', lineHeight: '1.5' }}>
            Fill out the form fields directly on the PDF. Your progress is automatically saved.
            When you're ready to submit, you'll need to print or download the completed form.
          </p>
        </div>
      </div>

      {/* PDF Viewer */}
      <main className="flex-1 flex flex-col">
        <PDFFormViewer token={token} />
      </main>
    </div>
  );
}
