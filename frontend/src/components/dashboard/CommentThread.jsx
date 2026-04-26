/**
 * CommentThread Component
 * Slide-out panel for document comments/notes
 */

import { useState, useEffect, useRef } from 'react';

export default function CommentThread({
  document,
  comments = [],
  isOpen,
  onClose,
  onAddComment,
  isLoading = false
}) {
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAddComment(document.id, newComment.trim());
      setNewComment('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  if (!document) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 bg-black/20 transition-opacity duration-300 z-40
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`
          fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl z-50
          transform transition-transform duration-300 ease-out
          flex flex-col
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b p-4" style={{ borderColor: '#E6E4E1' }}>
          <div className="flex items-center justify-between">
            <div>
              <h2
                style={{
                  fontFamily: 'Soehne, sans-serif',
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#1E1F1C'
                }}
              >
                Notes & Comments
              </h2>
              <p
                className="mt-0.5 text-sm truncate max-w-[240px]"
                style={{
                  fontFamily: 'Soehne, sans-serif',
                  color: '#6B7280'
                }}
              >
                {document.document_name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 -mr-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="#6B7280" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full" />
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                style={{ backgroundColor: '#F3F4F6' }}
              >
                <svg className="w-6 h-6" fill="none" stroke="#9CA3AF" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p
                style={{
                  fontFamily: 'Soehne, sans-serif',
                  fontSize: '0.9375rem',
                  color: '#6B7280'
                }}
              >
                No comments yet
              </p>
              <p
                className="mt-1"
                style={{
                  fontFamily: 'Soehne, sans-serif',
                  fontSize: '0.8125rem',
                  color: '#9CA3AF'
                }}
              >
                Add notes to track your progress
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-xl p-3"
                  style={{ backgroundColor: '#F9FAFB' }}
                >
                  <p
                    style={{
                      fontFamily: 'Soehne, sans-serif',
                      fontSize: '0.9375rem',
                      color: '#1E1F1C',
                      lineHeight: '1.5',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {comment.content}
                  </p>
                  <p
                    className="mt-2 text-xs"
                    style={{
                      fontFamily: 'Soehne, sans-serif',
                      color: '#9CA3AF'
                    }}
                  >
                    {formatDate(comment.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input area */}
        <form
          onSubmit={handleSubmit}
          className="flex-shrink-0 border-t p-4"
          style={{ borderColor: '#E6E4E1' }}
        >
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a note..."
              rows={2}
              className="flex-1 resize-none rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              style={{
                fontFamily: 'Soehne, sans-serif',
                backgroundColor: '#F9FAFB',
                border: '1px solid #E5E7EB',
                color: '#1E1F1C'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <p
              className="text-xs"
              style={{
                fontFamily: 'Soehne, sans-serif',
                color: '#9CA3AF'
              }}
            >
              Press Enter to post
            </p>
            <button
              type="submit"
              disabled={!newComment.trim() || isSubmitting}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                fontFamily: 'Soehne, sans-serif',
                backgroundColor: '#1E3A5F',
                color: 'white'
              }}
            >
              {isSubmitting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
