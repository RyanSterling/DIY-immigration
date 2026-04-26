/**
 * DocumentCard Component
 * Simplified document card with single CTA and comment indicator
 */

import { useState } from 'react';

const STATUS_CONFIG = {
  not_started: {
    bgColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    dotColor: '#9CA3AF',
    label: 'Not Complete',
    cta: 'Complete',
    ctaStyle: 'primary'
  },
  in_progress: {
    bgColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    dotColor: '#9CA3AF',
    label: 'Not Complete',
    cta: 'Complete',
    ctaStyle: 'primary'
  },
  completed: {
    bgColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    dotColor: '#22C55E',
    label: 'Complete',
    cta: null,
    ctaStyle: null
  },
  not_applicable: {
    bgColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    dotColor: '#D1D5DB',
    label: 'N/A',
    cta: null,
    ctaStyle: null
  }
};

export default function DocumentCard({
  document,
  commentCount = 0,
  onOpenPanel,
  onStatusChange,
  onOpenComments,
  isLongLeadTime = false,
  isOptional = false
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const currentStatus = document.progress?.status || 'not_started';
  const config = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.not_started;

  const handleCTAClick = async (e) => {
    e.stopPropagation();
    if (isUpdating) return;

    setIsUpdating(true);
    try {
      // Binary toggle - go directly to completed
      await onStatusChange(document.id, 'completed');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCommentClick = (e) => {
    e.stopPropagation();
    onOpenComments(document);
  };

  return (
    <div
      onClick={() => onOpenPanel(document)}
      className="group relative rounded-xl p-4 cursor-pointer transition-all duration-200 hover:shadow-md"
      style={{
        backgroundColor: config.bgColor,
        border: `1px solid ${config.borderColor}`,
        opacity: isUpdating ? 0.7 : 1
      }}
    >
      {/* Long lead-time badge */}
      {isLongLeadTime && currentStatus !== 'completed' && (
        <div
          className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-xs font-medium"
          style={{
            backgroundColor: '#FEF3C7',
            color: '#92400E',
            fontFamily: 'Soehne, sans-serif',
            border: '1px solid #FDE68A'
          }}
        >
          Takes Weeks
        </div>
      )}
      {/* Optional badge */}
      {isOptional && (
        <div
          className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-xs font-medium"
          style={{
            backgroundColor: '#F3F4F6',
            color: '#6B7280',
            fontFamily: 'Soehne, sans-serif',
            border: '1px solid #E5E7EB'
          }}
        >
          Optional
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Status indicator */}
        <div className="flex-shrink-0 pt-0.5">
          {currentStatus === 'completed' ? (
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#22C55E' }}
            >
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          ) : (
            <div
              className="w-6 h-6 rounded-full border-2 flex items-center justify-center"
              style={{ borderColor: config.dotColor }}
            />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4
                className={`truncate ${currentStatus === 'completed' ? 'line-through opacity-60' : ''}`}
                style={{
                  fontFamily: 'Soehne, sans-serif',
                  fontSize: '0.9375rem',
                  fontWeight: '500',
                  color: '#1E1F1C'
                }}
              >
                {document.document_name}
              </h4>
              <p
                className="mt-0.5 line-clamp-1"
                style={{
                  fontFamily: 'Soehne, sans-serif',
                  fontSize: '0.8125rem',
                  fontWeight: '400',
                  color: '#6B7280'
                }}
              >
                {document.document_description}
              </p>
            </div>

          </div>

          {/* Actions row */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-3">
              {/* Comment indicator */}
              <button
                onClick={handleCommentClick}
                className="flex items-center gap-1 text-sm transition-colors hover:opacity-80"
                style={{
                  fontFamily: 'Soehne, sans-serif',
                  color: commentCount > 0 ? '#1E3A5F' : '#9CA3AF'
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {commentCount > 0 && <span>{commentCount}</span>}
              </button>

              {/* Info link */}
              <span
                className="text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  fontFamily: 'Soehne, sans-serif',
                  color: '#6B7280'
                }}
              >
                Click for details →
              </span>
            </div>

            {/* CTA Button */}
            {config.cta && (
              <button
                onClick={handleCTAClick}
                disabled={isUpdating}
                className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  fontFamily: 'Soehne, sans-serif',
                  backgroundColor: config.ctaStyle === 'primary' ? '#1E3A5F' : '#22C55E',
                  color: 'white',
                  opacity: isUpdating ? 0.5 : 1,
                  cursor: isUpdating ? 'not-allowed' : 'pointer'
                }}
              >
                {isUpdating ? '...' : config.cta}
              </button>
            )}

            {/* Completed state - subtle undo option */}
            {currentStatus === 'completed' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange(document.id, 'not_started');
                }}
                className="text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  fontFamily: 'Soehne, sans-serif',
                  color: '#9CA3AF'
                }}
              >
                Undo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
