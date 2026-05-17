/**
 * VisaDashboardLayout Component
 * Generic sidebar-based layout for visa DIY dashboards.
 * Accepts visa config as prop instead of importing K-1 specific data.
 */

import { useState, useEffect } from 'react';
import VisaSidebar from './VisaSidebar';
import VisaMainContent from './VisaMainContent';
import DocumentPanel from './DocumentPanel';
import CommentThread from './CommentThread';
import VideoModal from './VideoModal';
import FormFillerView, { FILLABLE_FORMS } from './FormFillerView';
import { fetchFormData } from '../../lib/k1Api';
import { getFormGuidance } from '../../data/formGuidance';

export default function VisaDashboardLayout({
  visaConfig,
  documents,
  dashboardData,
  comments = {},
  onStatusChange,
  onAddComment,
  onLoadComments,
  getToken
}) {
  const [activePhase, setActivePhase] = useState('phase-1');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Panel states
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Comment panel states
  const [commentDocument, setCommentDocument] = useState(null);
  const [isCommentPanelOpen, setIsCommentPanelOpen] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  // Video modal state
  const [activeVideo, setActiveVideo] = useState(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  // Form filler state
  const [showFormFiller, setShowFormFiller] = useState(false);
  const [activeFormType, setActiveFormType] = useState(null);
  const [activeFormName, setActiveFormName] = useState(null);
  const [formProgress, setFormProgress] = useState({});
  const [activeTipSection, setActiveTipSection] = useState('overview');

  // Get form guidance for tips panel
  const formGuidance = activeFormType ? getFormGuidance(activeFormType) : null;

  // Handle phase change - also closes form filler
  const handlePhaseChange = (newPhase) => {
    setActivePhase(newPhase);
    setShowFormFiller(false);
    setActiveFormType(null);
    setActiveFormName(null);
  };

  // Check if user has existing form progress for all fillable forms
  useEffect(() => {
    const checkAllFormProgress = async () => {
      if (!getToken) return;

      const token = await getToken();
      if (!token) return;

      const progress = {};
      for (const [, config] of Object.entries(FILLABLE_FORMS)) {
        try {
          const result = await fetchFormData(token, config.formType);
          progress[config.formType] = !!(result.formData && Object.keys(result.formData).length > 0);
        } catch (err) {
          progress[config.formType] = false;
        }
      }
      setFormProgress(progress);
    };
    checkAllFormProgress();
  }, [getToken]);

  // Count comments per document
  const commentCounts = Object.keys(comments).reduce((acc, docId) => {
    acc[docId] = comments[docId]?.length || 0;
    return acc;
  }, {});

  // Handlers
  const handleOpenPanel = (document) => {
    setSelectedDocument(document);
    setIsPanelOpen(true);
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
    setTimeout(() => setSelectedDocument(null), 300);
  };

  const handleOpenComments = async (document) => {
    setCommentDocument(document);
    setIsCommentPanelOpen(true);

    // Load comments if not already loaded
    if (!comments[document.id] && onLoadComments) {
      setIsLoadingComments(true);
      await onLoadComments(document.id);
      setIsLoadingComments(false);
    }
  };

  const handleCloseComments = () => {
    setIsCommentPanelOpen(false);
    setTimeout(() => setCommentDocument(null), 300);
  };

  const handleOpenVideo = (video) => {
    setActiveVideo(video);
    setIsVideoModalOpen(true);
    // Close the document panel when opening video
    handleClosePanel();
  };

  const handleCloseVideo = () => {
    setIsVideoModalOpen(false);
    setTimeout(() => setActiveVideo(null), 300);
  };

  const handleAddComment = async (docId, content) => {
    if (onAddComment) {
      await onAddComment(docId, content);
    }
  };

  // Form filler handlers
  const handleOpenFormFiller = (formType, formName) => {
    setActiveFormType(formType);
    setActiveFormName(formName);
    setShowFormFiller(true);
    // Close any open panels
    handleClosePanel();
    handleCloseComments();
  };

  const handleCloseFormFiller = async () => {
    const closedFormType = activeFormType;
    setShowFormFiller(false);
    setActiveFormType(null);
    setActiveFormName(null);

    // Refresh progress data for the form that was just closed
    if (getToken && closedFormType) {
      try {
        const token = await getToken();
        if (!token) return;
        const result = await fetchFormData(token, closedFormType);
        const hasProgress = !!(result.formData && Object.keys(result.formData).length > 0);
        setFormProgress(prev => ({
          ...prev,
          [closedFormType]: hasProgress
        }));
      } catch (err) {
        // Ignore errors
      }
    }
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <VisaSidebar
        activePhase={activePhase}
        onPhaseChange={handlePhaseChange}
        documents={documents}
        timeline={visaConfig.timeline}
        progressTitle={visaConfig.progressTitle}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main content area */}
      {showFormFiller ? (
        /* Form filler uses full width with tips panel on right */
        <div className="flex-1 flex overflow-hidden" style={{ backgroundColor: '#EEEEEF' }}>
          {/* Form filler - takes available space */}
          <div className="flex-1 overflow-y-auto p-6 lg:p-8">
            <FormFillerView
              getToken={getToken}
              onBack={handleCloseFormFiller}
              formType={activeFormType}
              formName={activeFormName}
            />
          </div>

          {/* Tips Panel - fixed width on right, hidden on mobile */}
          {formGuidance && (
            <div
              className="hidden xl:flex xl:flex-col xl:w-80 2xl:w-96 bg-white border-l overflow-hidden flex-shrink-0"
              style={{ borderColor: '#E5E7EB' }}
            >
              {/* Header */}
              <div className="p-4 border-b" style={{ borderColor: '#E5E7EB' }}>
                <h3
                  className="font-semibold"
                  style={{ fontFamily: 'Libre Baskerville, serif', color: '#1E1F1C' }}
                >
                  Tips & Guidance
                </h3>
                <p
                  className="text-xs mt-0.5"
                  style={{ fontFamily: 'Soehne, sans-serif', color: '#9CA3AF' }}
                >
                  Helpful info as you fill out your form
                </p>
              </div>

              {/* Section tabs */}
              <div className="flex gap-1 p-3 border-b overflow-x-auto" style={{ borderColor: '#E5E7EB' }}>
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'sections', label: 'Sections' },
                  { id: 'mistakes', label: 'Mistakes' },
                  { id: 'tips', label: 'Pro Tips' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTipSection(tab.id)}
                    className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                      activeTipSection === tab.id
                        ? 'bg-[#1E3A5F] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    style={{ fontFamily: 'Soehne, sans-serif' }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {activeTipSection === 'overview' && (
                  <>
                    <div>
                      <h3
                        className="text-lg font-semibold mb-1"
                        style={{ fontFamily: 'Libre Baskerville, serif', color: '#1E1F1C' }}
                      >
                        {formGuidance.displayName}
                      </h3>
                      <p
                        className="text-sm text-gray-500 mb-3"
                        style={{ fontFamily: 'Soehne, sans-serif' }}
                      >
                        {formGuidance.subtitle}
                      </p>
                      <p
                        className="text-sm leading-relaxed"
                        style={{ fontFamily: 'Soehne, sans-serif', color: '#4B5563' }}
                      >
                        {formGuidance.overview}
                      </p>
                    </div>
                    {formGuidance.estimatedTime && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span style={{ fontFamily: 'Soehne, sans-serif' }}>Est. {formGuidance.estimatedTime}</span>
                      </div>
                    )}
                    {formGuidance.links?.length > 0 && (
                      <div className="pt-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2" style={{ fontFamily: 'Soehne, sans-serif' }}>
                          Helpful Links
                        </h4>
                        <div className="space-y-2">
                          {formGuidance.links.map((link, i) => (
                            <a
                              key={i}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm text-[#1E3A5F] hover:underline"
                              style={{ fontFamily: 'Soehne, sans-serif' }}
                            >
                              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              {link.label}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {activeTipSection === 'sections' && formGuidance.sections && (
                  <div className="space-y-4">
                    {formGuidance.sections.map((section, i) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-3">
                        <h4
                          className="font-medium text-sm mb-2"
                          style={{ fontFamily: 'Soehne, sans-serif', color: '#1E1F1C' }}
                        >
                          {section.title}
                        </h4>
                        <ul className="space-y-1.5">
                          {section.tips.map((tip, j) => (
                            <li key={j} className="flex gap-2 text-sm" style={{ fontFamily: 'Soehne, sans-serif', color: '#4B5563' }}>
                              <span className="text-[#1E3A5F] flex-shrink-0">•</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                {activeTipSection === 'mistakes' && formGuidance.commonMistakes && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-amber-600 mb-2">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="font-medium text-sm" style={{ fontFamily: 'Soehne, sans-serif' }}>Avoid These Mistakes</span>
                    </div>
                    {formGuidance.commonMistakes.map((mistake, i) => (
                      <div
                        key={i}
                        className="flex gap-2 text-sm bg-amber-50 border border-amber-100 rounded-lg p-3"
                        style={{ fontFamily: 'Soehne, sans-serif', color: '#92400E' }}
                      >
                        <span className="flex-shrink-0 font-medium">{i + 1}.</span>
                        <span>{mistake}</span>
                      </div>
                    ))}
                  </div>
                )}

                {activeTipSection === 'tips' && formGuidance.proTips && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-green-600 mb-2">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="font-medium text-sm" style={{ fontFamily: 'Soehne, sans-serif' }}>Pro Tips</span>
                    </div>
                    {formGuidance.proTips.map((tip, i) => (
                      <div
                        key={i}
                        className="flex gap-2 text-sm bg-green-50 border border-green-100 rounded-lg p-3"
                        style={{ fontFamily: 'Soehne, sans-serif', color: '#065F46' }}
                      >
                        <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Normal content with max-width constraint */
        <main
          className="flex-1 overflow-y-auto p-6 lg:p-8"
          style={{ backgroundColor: '#EEEEEF' }}
        >
          <div className="max-w-3xl mx-auto">
            <VisaMainContent
              activePhase={activePhase}
              documents={documents}
              commentCounts={commentCounts}
              onOpenPanel={handleOpenPanel}
              onStatusChange={onStatusChange}
              onOpenComments={handleOpenComments}
              dashboardData={dashboardData}
              // Pass visa config data as props
              visaConfig={visaConfig}
              timeline={visaConfig.timeline}
              guidance={visaConfig.guidance}
              optionalDocs={visaConfig.optionalDocs}
              conditionalDocs={visaConfig.conditionalDocs}
              mailingPhase={visaConfig.mailingPhase}
              filingFee={visaConfig.filingFee}
              mailingDocs={visaConfig.mailingDocs}
              mailingAddresses={visaConfig.mailingAddresses}
              // Form filler props
              onOpenFormFiller={handleOpenFormFiller}
              formProgress={formProgress}
            />
          </div>
        </main>
      )}

      {/* Document detail panel */}
      <DocumentPanel
        document={selectedDocument}
        isOpen={isPanelOpen}
        onClose={handleClosePanel}
        onStatusChange={onStatusChange}
        onOpenVideo={handleOpenVideo}
        onOpenComments={handleOpenComments}
      />

      {/* Comment thread panel */}
      <CommentThread
        document={commentDocument}
        comments={commentDocument ? (comments[commentDocument.id] || []) : []}
        isOpen={isCommentPanelOpen}
        onClose={handleCloseComments}
        onAddComment={handleAddComment}
        isLoading={isLoadingComments}
      />

      {/* Video modal */}
      <VideoModal
        video={activeVideo}
        isOpen={isVideoModalOpen}
        onClose={handleCloseVideo}
      />
    </div>
  );
}
