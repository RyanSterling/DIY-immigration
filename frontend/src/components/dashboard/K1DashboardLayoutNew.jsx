/**
 * K1DashboardLayoutNew Component
 * Sidebar-based layout for the redesigned K-1 DIY Dashboard
 */

import { useState } from 'react';
import K1Sidebar from './K1Sidebar';
import K1MainContent from './K1MainContent';
import DocumentPanel from './DocumentPanel';
import CommentThread from './CommentThread';
import VideoModal from './VideoModal';

export default function K1DashboardLayoutNew({
  documents,
  dashboardData,
  comments = {},
  onStatusChange,
  onAddComment,
  onLoadComments
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

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <K1Sidebar
        activePhase={activePhase}
        onPhaseChange={setActivePhase}
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
          <K1MainContent
            activePhase={activePhase}
            documents={documents}
            commentCounts={commentCounts}
            onOpenPanel={handleOpenPanel}
            onStatusChange={onStatusChange}
            onOpenComments={handleOpenComments}
            dashboardData={dashboardData}
          />
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
