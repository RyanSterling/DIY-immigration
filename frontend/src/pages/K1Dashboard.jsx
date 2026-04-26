/**
 * K-1 DIY Dashboard
 * Redesigned with sidebar navigation and phase-based document tracking
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@clerk/react';
import { useCurrentUser, syncUserToBackend } from '../lib/auth';
import {
  fetchK1Dashboard,
  fetchK1Documents,
  updateDocumentProgress,
  fetchDocumentComments,
  addDocumentComment,
  fetchK1Preferences,
  saveK1Preferences
} from '../lib/k1Api';
import { CONDITIONAL_DOCS } from '../data/k1Guidance';
import K1DashboardLayoutNew from '../components/dashboard/K1DashboardLayoutNew';
import K1OnboardingModal from '../components/dashboard/K1OnboardingModal';

export default function K1Dashboard() {
  const { getToken } = useAuth();
  const { user, isLoaded } = useCurrentUser();
  const [dashboardData, setDashboardData] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [comments, setComments] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncComplete, setSyncComplete] = useState(false);
  const [preferences, setPreferences] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

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

  // Load dashboard data after sync
  useEffect(() => {
    if (syncComplete) {
      loadDashboard();
    }
  }, [syncComplete]);

  async function loadDashboard() {
    try {
      setIsLoading(true);
      setError(null);
      const token = await getToken();

      const [dashboard, docsResponse, prefsResponse] = await Promise.all([
        fetchK1Dashboard(token),
        fetchK1Documents(token),
        fetchK1Preferences(token).catch(() => ({ preferences: null }))
      ]);

      setDashboardData(dashboard);
      setDocuments(docsResponse.documents || []);
      setPreferences(prefsResponse.preferences);

      // Show onboarding if preferences not set
      if (!prefsResponse.preferences?.onboarding_completed) {
        setShowOnboarding(true);
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  // Filter documents based on preferences (hide conditional docs that don't apply)
  const filteredDocuments = useMemo(() => {
    if (!preferences?.onboarding_completed) {
      return documents; // Show all until onboarding complete
    }

    return documents.filter(doc => {
      const conditionalDoc = CONDITIONAL_DOCS.find(c => c.name === doc.document_name);
      if (!conditionalDoc) return true; // Not a conditional doc, keep it

      // Check if this conditional doc applies based on preferences
      if (conditionalDoc.condition === 'previously_married') {
        return preferences.previously_married;
      }
      if (conditionalDoc.condition === 'spouse_deceased') {
        return preferences.spouse_deceased;
      }
      return true;
    });
  }, [documents, preferences]);

  // Handle saving onboarding preferences
  const handleOnboardingComplete = async (prefs) => {
    try {
      const token = await getToken();
      const response = await saveK1Preferences(token, prefs);
      setPreferences(response.preferences);
      setShowOnboarding(false);
    } catch (error) {
      console.error('Error saving preferences:', error);
      throw error;
    }
  };

  // Handle status changes
  const handleStatusChange = useCallback(async (docId, newStatus) => {
    try {
      const token = await getToken();
      await updateDocumentProgress(token, docId, { status: newStatus });

      // Optimistic update
      setDocuments(prev => prev.map(doc =>
        doc.id === docId
          ? { ...doc, progress: { ...doc.progress, status: newStatus } }
          : doc
      ));
    } catch (error) {
      console.error('Error updating document status:', error);
      // Revert on error
      loadDashboard();
    }
  }, [getToken]);

  // Load comments for a document
  const handleLoadComments = useCallback(async (docId) => {
    try {
      const token = await getToken();
      const response = await fetchDocumentComments(token, docId);
      setComments(prev => ({
        ...prev,
        [docId]: response.comments || []
      }));
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  }, [getToken]);

  // Add a new comment
  const handleAddComment = useCallback(async (docId, content) => {
    try {
      const token = await getToken();
      const response = await addDocumentComment(token, docId, content);

      // Add to local state
      setComments(prev => ({
        ...prev,
        [docId]: [...(prev[docId] || []), response.comment]
      }));
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }, [getToken]);

  if (!isLoaded || !syncComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#EEEEEF' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full" />
          <p style={{ fontFamily: 'Soehne, sans-serif', color: '#77716E' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#EEEEEF' }}>
      {/* Error state */}
      {error && (
        <div
          className="mx-4 mt-4 rounded-lg p-4"
          style={{ backgroundColor: '#FEE2E2', border: '1px solid #FECACA' }}
        >
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="#991B1B" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <p style={{ fontFamily: 'Soehne, sans-serif', color: '#991B1B', fontWeight: '500' }}>
                Error loading dashboard
              </p>
              <p style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.875rem', color: '#991B1B', marginTop: '0.25rem' }}>
                {error}
              </p>
              <button
                onClick={loadDashboard}
                className="mt-3 px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: '#991B1B',
                  color: 'white',
                  fontFamily: 'Soehne, sans-serif'
                }}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && !error && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full" />
            <p style={{ fontFamily: 'Soehne, sans-serif', color: '#77716E' }}>
              Loading your dashboard...
            </p>
          </div>
        </div>
      )}

      {/* Main dashboard */}
      {!isLoading && !error && (
        <K1DashboardLayoutNew
          documents={filteredDocuments}
          dashboardData={dashboardData}
          comments={comments}
          onStatusChange={handleStatusChange}
          onAddComment={handleAddComment}
          onLoadComments={handleLoadComments}
        />
      )}

      {/* Onboarding Modal */}
      {showOnboarding && (
        <K1OnboardingModal
          onComplete={handleOnboardingComplete}
          onClose={() => setShowOnboarding(false)}
        />
      )}
    </div>
  );
}
