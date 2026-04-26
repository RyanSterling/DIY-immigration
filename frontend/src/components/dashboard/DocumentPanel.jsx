/**
 * DocumentPanel Component
 * Slide-out panel showing detailed document guidance with video support
 */

import { useEffect, useRef } from 'react';
import { K1_GUIDANCE } from '../../data/k1Guidance';

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Complete', hint: 'You still need to gather this document' },
  { value: 'completed', label: 'Complete', hint: 'You have this document ready' },
  { value: 'not_applicable', label: 'N/A', hint: 'This document doesn\'t apply to your situation' }
];

export default function DocumentPanel({
  document,
  isOpen,
  onClose,
  onStatusChange,
  onOpenVideo,
  onOpenComments
}) {
  const panelRef = useRef(null);
  const guidance = document ? K1_GUIDANCE[document.document_name] : null;
  const currentStatus = document?.progress?.status || 'not_started';

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

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) && isOpen) {
        onClose();
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

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
          fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b z-10" style={{ borderColor: '#E6E4E1' }}>
          <div className="flex items-start justify-between p-4">
            <div className="flex-1 min-w-0 pr-4">
              <h2
                style={{
                  fontFamily: 'Libre Baskerville, serif',
                  fontSize: '1.25rem',
                  color: '#1E1F1C',
                  lineHeight: '1.3'
                }}
              >
                {document.document_name}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-2 -mr-2 -mt-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="#6B7280" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Status selector */}
          <div className="px-4 pb-4">
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status.value}
                  onClick={() => onStatusChange(document.id, status.value)}
                  className="px-3 py-1.5 rounded-full text-sm transition-all"
                  style={{
                    fontFamily: 'Soehne, sans-serif',
                    backgroundColor: currentStatus === status.value ? '#1E3A5F' : '#F3F4F6',
                    color: currentStatus === status.value ? 'white' : '#6B7280',
                    fontWeight: currentStatus === status.value ? '500' : '400'
                  }}
                  title={status.hint}
                >
                  {status.label}
                </button>
              ))}
            </div>
            {/* Status helper text */}
            <p
              className="mt-2 text-xs"
              style={{
                fontFamily: 'Soehne, sans-serif',
                color: '#9CA3AF'
              }}
            >
              {STATUS_OPTIONS.find(s => s.value === currentStatus)?.hint}
            </p>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto h-[calc(100%-140px)] p-4 space-y-6">
          {/* Video card (if video exists) */}
          {guidance?.video && (
            <button
              onClick={() => onOpenVideo(guidance.video)}
              className="w-full rounded-xl overflow-hidden text-left transition-transform hover:scale-[1.02]"
              style={{
                backgroundColor: '#1E3A5F'
              }}
            >
              <div className="relative aspect-video flex items-center justify-center">
                {/* Play button */}
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                >
                  <svg className="w-8 h-8 ml-1" fill="white" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>

                {/* Duration badge */}
                {guidance.video.duration && (
                  <div
                    className="absolute bottom-3 right-3 px-2 py-1 rounded text-xs"
                    style={{
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      color: 'white',
                      fontFamily: 'Soehne, sans-serif'
                    }}
                  >
                    {guidance.video.duration}
                  </div>
                )}
              </div>
              <div className="p-4">
                <p
                  className="text-sm font-medium text-white"
                  style={{ fontFamily: 'Soehne, sans-serif' }}
                >
                  {guidance.video.title || 'Watch tutorial video'}
                </p>
                {guidance.video.description && (
                  <p
                    className="text-sm mt-1"
                    style={{
                      fontFamily: 'Soehne, sans-serif',
                      color: 'rgba(255,255,255,0.7)'
                    }}
                  >
                    {guidance.video.description}
                  </p>
                )}
              </div>
            </button>
          )}

          {/* Description */}
          {guidance?.description && (
            <section>
              <h3
                className="mb-2"
                style={{
                  fontFamily: 'Soehne, sans-serif',
                  fontSize: '0.8125rem',
                  fontWeight: '600',
                  color: '#1E1F1C',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                What is this?
              </h3>
              <p
                style={{
                  fontFamily: 'Soehne, sans-serif',
                  fontSize: '0.9375rem',
                  fontWeight: '400',
                  color: '#4B5563',
                  lineHeight: '1.6'
                }}
              >
                {guidance.description}
              </p>
            </section>
          )}

          {/* Steps */}
          {guidance?.steps && guidance.steps.length > 0 && (
            <section>
              <h3
                className="mb-3"
                style={{
                  fontFamily: 'Soehne, sans-serif',
                  fontSize: '0.8125rem',
                  fontWeight: '600',
                  color: '#1E1F1C',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                How to obtain
              </h3>
              <ol className="space-y-3">
                {guidance.steps.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
                      style={{
                        backgroundColor: '#F3F4F6',
                        color: '#6B7280',
                        fontFamily: 'Soehne, sans-serif'
                      }}
                    >
                      {i + 1}
                    </span>
                    <p
                      style={{
                        fontFamily: 'Soehne, sans-serif',
                        fontSize: '0.9375rem',
                        fontWeight: '400',
                        color: '#4B5563',
                        lineHeight: '1.5'
                      }}
                    >
                      {step}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Tips */}
          {guidance?.tips && (
            <section
              className="rounded-xl p-4"
              style={{ backgroundColor: '#1E3A5F' }}
            >
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5" fill="white" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h4
                    className="font-medium mb-1"
                    style={{
                      fontFamily: 'Soehne, sans-serif',
                      fontSize: '0.875rem',
                      color: 'white'
                    }}
                  >
                    Pro tip
                  </h4>
                  <p
                    style={{
                      fontFamily: 'Soehne, sans-serif',
                      fontSize: '0.875rem',
                      fontWeight: '400',
                      color: 'rgba(255,255,255,0.9)',
                      lineHeight: '1.5'
                    }}
                  >
                    {guidance.tips}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Helpful links */}
          {guidance?.links && guidance.links.length > 0 && (
            <section>
              <h3
                className="mb-3"
                style={{
                  fontFamily: 'Soehne, sans-serif',
                  fontSize: '0.8125rem',
                  fontWeight: '600',
                  color: '#1E1F1C',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                Helpful Links
              </h3>
              <div className="space-y-2">
                {guidance.links.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 rounded-lg transition-colors hover:bg-gray-50"
                    style={{ border: '1px solid #E5E7EB' }}
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="#6B7280" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    <span
                      style={{
                        fontFamily: 'Soehne, sans-serif',
                        fontSize: '0.875rem',
                        color: '#1E3A5F'
                      }}
                    >
                      {link.label}
                    </span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Estimated time and difficulty */}
          {(guidance?.estimatedTime || guidance?.difficulty) && (
            <section className="flex gap-4 pt-2">
              {guidance.estimatedTime && (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="#9CA3AF" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span
                    style={{
                      fontFamily: 'Soehne, sans-serif',
                      fontSize: '0.8125rem',
                      color: '#6B7280'
                    }}
                  >
                    {guidance.estimatedTime}
                  </span>
                </div>
              )}
              {guidance.difficulty && (
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-0.5 rounded text-xs font-medium"
                    style={{
                      fontFamily: 'Soehne, sans-serif',
                      backgroundColor: guidance.difficulty === 'easy' ? '#D1FAE5' :
                                       guidance.difficulty === 'moderate' ? '#FEF3C7' : '#FEE2E2',
                      color: guidance.difficulty === 'easy' ? '#065F46' :
                             guidance.difficulty === 'moderate' ? '#92400E' : '#991B1B'
                    }}
                  >
                    {guidance.difficulty.charAt(0).toUpperCase() + guidance.difficulty.slice(1)}
                  </span>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Footer with comments button */}
        <div
          className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t"
          style={{ borderColor: '#E6E4E1' }}
        >
          <button
            onClick={() => onOpenComments(document)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl transition-colors hover:bg-gray-50"
            style={{
              border: '1px solid #E5E7EB',
              fontFamily: 'Soehne, sans-serif',
              fontSize: '0.875rem',
              color: '#6B7280'
            }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            View Comments & Notes
          </button>
        </div>
      </div>
    </>
  );
}
