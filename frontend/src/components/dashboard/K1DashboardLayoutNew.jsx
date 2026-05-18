/**
 * K1DashboardLayoutNew Component
 * Sidebar-based layout for the redesigned K-1 DIY Dashboard
 */

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import K1Sidebar from './K1Sidebar';
import K1MainContent from './K1MainContent';
import DocumentPanel from './DocumentPanel';
import CommentThread from './CommentThread';
import VideoModal from './VideoModal';
import FormFillerView, { FILLABLE_FORMS } from './FormFillerView';
import { fetchFormData } from '../../lib/visaApi';

export default function K1DashboardLayoutNew({
  documents,
  dashboardData,
  comments = {},
  onStatusChange,
  onAddComment,
  onLoadComments,
  getToken
}) {
  // URL-synced state for phase and form
  const [searchParams, setSearchParams] = useSearchParams();
  const activePhase = searchParams.get('phase') || 'phase-1';
  const urlFormType = searchParams.get('form');

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

  // Form filler state - derived from URL
  const showFormFiller = !!urlFormType;
  const [activeFormType, setActiveFormType] = useState(urlFormType);
  const [activeFormName, setActiveFormName] = useState(null);
  const [formProgress, setFormProgress] = useState({}); // { 'i-129f': true, 'i-134': false, ... }

  // Sync form type from URL
  useEffect(() => {
    if (urlFormType) {
      setActiveFormType(urlFormType);
      // Find the form name from FILLABLE_FORMS
      const formConfig = Object.values(FILLABLE_FORMS).find(f => f.formType === urlFormType);
      if (formConfig) {
        setActiveFormName(formConfig.displayName);
      }
    } else {
      setActiveFormType(null);
      setActiveFormName(null);
    }
  }, [urlFormType]);

  // Handle phase change - also closes form filler
  const handlePhaseChange = useCallback((newPhase) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('phase', newPhase);
      next.delete('form'); // Close form when changing phase
      return next;
    });
  }, [setSearchParams]);

  // Check if user has existing form progress for all fillable forms
  useEffect(() => {
    const checkAllFormProgress = async () => {
      if (!getToken) return;

      const token = await getToken();
      if (!token) return;

      const progress = {};
      for (const [, config] of Object.entries(FILLABLE_FORMS)) {
        // Only check forms that belong to K-1 visa type
        if (!config.visaTypes || !config.visaTypes.includes('k1')) continue;
        try {
          const result = await fetchFormData(token, 'k1', config.formType);
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
    setActiveFormName(formName);
    // Add form to URL while preserving phase
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('phase', activePhase);
      next.set('form', formType);
      return next;
    });
    // Close any open panels
    handleClosePanel();
    handleCloseComments();
  };

  const handleCloseFormFiller = async () => {
    const closedFormType = activeFormType;
    // Remove form from URL, keep phase
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('form');
      return next;
    });

    // Refresh progress data for the form that was just closed
    if (getToken && closedFormType) {
      try {
        const token = await getToken();
        if (!token) return;
        const result = await fetchFormData(token, 'k1', closedFormType);
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
      <K1Sidebar
        activePhase={activePhase}
        onPhaseChange={handlePhaseChange}
        documents={documents}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main content area */}
      <main
        className="flex-1 overflow-y-auto p-6 lg:p-8"
        style={{ backgroundColor: '#EEEEEF' }}
      >
        <div className="max-w-3xl mx-auto">
          {showFormFiller ? (
            <FormFillerView
              getToken={getToken}
              onBack={handleCloseFormFiller}
              formType={activeFormType}
              formName={activeFormName}
              visaType="k1"
            />
          ) : (
            <K1MainContent
              activePhase={activePhase}
              documents={documents}
              commentCounts={commentCounts}
              onOpenPanel={handleOpenPanel}
              onStatusChange={onStatusChange}
              onOpenComments={handleOpenComments}
              dashboardData={dashboardData}
              onOpenFormFiller={handleOpenFormFiller}
              formProgress={formProgress}
            />
          )}
        </div>
      </main>

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
