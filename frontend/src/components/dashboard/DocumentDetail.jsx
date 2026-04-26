/**
 * DocumentDetail Component
 * Expandable document card showing status and guidance
 */

import { useState } from 'react';

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started', color: '#E6E4E1', textColor: '#77716E' },
  { value: 'in_progress', label: 'In Progress', color: '#FEF3C7', textColor: '#92400E' },
  { value: 'completed', label: 'Completed', color: '#D1FAE5', textColor: '#065F46' },
  { value: 'not_applicable', label: 'N/A', color: '#F3F4F6', textColor: '#6B7280' }
];

export default function DocumentDetail({
  document,
  guidance,
  isExpanded,
  onToggle,
  onStatusChange
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const currentStatus = document.progress?.status || 'not_started';
  const statusInfo = STATUS_OPTIONS.find(s => s.value === currentStatus) || STATUS_OPTIONS[0];

  const handleStatusChange = async (newStatus) => {
    if (newStatus === currentStatus || isUpdating) return;
    setIsUpdating(true);
    try {
      await onStatusChange(document.id, newStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div
      className="rounded-lg overflow-hidden transition-all"
      style={{
        backgroundColor: 'white',
        border: '1px solid #E6E4E1',
        opacity: isUpdating ? 0.7 : 1
      }}
    >
      {/* Header - always visible */}
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3 flex-1">
          {/* Status indicator */}
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: statusInfo.color }}
          >
            {currentStatus === 'completed' && (
              <svg className="w-4 h-4" fill={statusInfo.textColor} viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
            {currentStatus === 'in_progress' && (
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusInfo.textColor }} />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span style={{
                fontFamily: 'Soehne, sans-serif',
                fontWeight: '500',
                color: '#1E1F1C',
                fontSize: '0.9375rem'
              }}>
                {document.document_name}
              </span>
              {document.is_required && (
                <span style={{
                  fontFamily: 'Soehne, sans-serif',
                  fontSize: '0.75rem',
                  color: '#DC2626',
                  fontWeight: '500'
                }}>
                  Required
                </span>
              )}
            </div>
            <p style={{
              fontFamily: 'Soehne, sans-serif',
              fontSize: '0.8125rem',
              color: '#77716E',
              marginTop: '2px'
            }}>
              {document.document_description}
            </p>
          </div>
        </div>

        {/* Expand/collapse icon */}
        <svg
          className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="#77716E"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: '#E6E4E1' }}>
          {/* Status selector */}
          <div className="mt-4 mb-4">
            <p style={{
              fontFamily: 'Soehne, sans-serif',
              fontSize: '0.8125rem',
              fontWeight: '600',
              color: '#1E1F1C',
              marginBottom: '0.5rem'
            }}>
              Status
            </p>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusChange(status.value);
                  }}
                  disabled={isUpdating}
                  className="px-3 py-1.5 rounded-full text-sm transition-all"
                  style={{
                    fontFamily: 'Soehne, sans-serif',
                    backgroundColor: currentStatus === status.value ? status.color : 'transparent',
                    color: currentStatus === status.value ? status.textColor : '#77716E',
                    border: `1px solid ${currentStatus === status.value ? status.color : '#E6E4E1'}`,
                    cursor: isUpdating ? 'not-allowed' : 'pointer'
                  }}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          {/* Guidance content */}
          {guidance && (
            <div className="space-y-4">
              <div>
                <p style={{
                  fontFamily: 'Soehne, sans-serif',
                  fontSize: '0.8125rem',
                  fontWeight: '600',
                  color: '#1E1F1C',
                  marginBottom: '0.5rem'
                }}>
                  What is this?
                </p>
                <p style={{
                  fontFamily: 'Soehne, sans-serif',
                  fontSize: '0.875rem',
                  fontWeight: '400',
                  color: '#4B5563',
                  lineHeight: '1.5'
                }}>
                  {guidance.description}
                </p>
              </div>

              <div>
                <p style={{
                  fontFamily: 'Soehne, sans-serif',
                  fontSize: '0.8125rem',
                  fontWeight: '600',
                  color: '#1E1F1C',
                  marginBottom: '0.5rem'
                }}>
                  How to obtain
                </p>
                <ol className="list-decimal pl-5 space-y-1">
                  {guidance.steps.map((step, i) => (
                    <li key={i} style={{
                      fontFamily: 'Soehne, sans-serif',
                      fontSize: '0.875rem',
                      fontWeight: '400',
                      color: '#4B5563',
                      lineHeight: '1.5'
                    }}>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              {guidance.tips && (
                <div
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: '#1E3A5F' }}
                >
                  <p style={{
                    fontFamily: 'Soehne, sans-serif',
                    fontSize: '0.8125rem',
                    fontWeight: '600',
                    color: 'white',
                    marginBottom: '0.25rem'
                  }}>
                    Tips
                  </p>
                  <p style={{
                    fontFamily: 'Soehne, sans-serif',
                    fontSize: '0.875rem',
                    fontWeight: '400',
                    color: 'rgba(255,255,255,0.9)',
                    lineHeight: '1.5'
                  }}>
                    {guidance.tips}
                  </p>
                </div>
              )}

              {guidance.links && guidance.links.length > 0 && (
                <div>
                  <p style={{
                    fontFamily: 'Soehne, sans-serif',
                    fontSize: '0.8125rem',
                    fontWeight: '600',
                    color: '#1E1F1C',
                    marginBottom: '0.5rem'
                  }}>
                    Helpful Links
                  </p>
                  <ul className="space-y-1">
                    {guidance.links.map((link, i) => (
                      <li key={i}>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            fontFamily: 'Soehne, sans-serif',
                            fontSize: '0.875rem',
                            color: '#1E3A5F',
                            textDecoration: 'underline'
                          }}
                        >
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {guidance.estimatedTime && (
                <p style={{
                  fontFamily: 'Soehne, sans-serif',
                  fontSize: '0.8125rem',
                  color: '#77716E'
                }}>
                  Estimated time: {guidance.estimatedTime}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
