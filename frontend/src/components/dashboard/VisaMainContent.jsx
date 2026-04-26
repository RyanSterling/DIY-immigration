/**
 * VisaMainContent Component
 * Generic main content area for visa dashboards.
 * Accepts all config as props instead of importing K-1 specific data.
 */

import { useMemo, useState } from 'react';
import DocumentCard from './DocumentCard';
import TimelineView from './TimelineView';

// Mailing Checklist Component for mailing phases
function MailingChecklist({
  documents,
  onOpenPanel,
  mailingDocs,
  mailingAddresses,
  filingFee,
  filingFeePayableTo
}) {
  // Track which items have been placed in the packet
  const [inPacket, setInPacket] = useState({});

  // Find document by name
  const getDocByName = (name) => documents.find(d => d.document_name === name);

  // Toggle whether an item is in the packet
  const toggleInPacket = (name, e) => {
    e.stopPropagation();
    setInPacket(prev => ({ ...prev, [name]: !prev[name] }));
  };

  // Categorize items
  const requiredItems = mailingDocs.filter(d => d.required);
  const conditionalItems = mailingDocs.filter(d => d.conditional);

  // Optional items only show if they're completed
  const completedOptionalItems = mailingDocs.filter(d => {
    if (!d.optional) return false;
    const doc = getDocByName(d.name);
    return doc?.progress?.status === 'completed';
  });

  // Count documents that are both completed AND in packet
  const inPacketCount = Object.values(inPacket).filter(Boolean).length;

  // Count required documents that are completed
  const requiredReadyCount = requiredItems.filter(item => {
    const doc = getDocByName(item.name);
    return doc?.progress?.status === 'completed';
  }).length;

  const ChecklistItem = ({ item }) => {
    const doc = getDocByName(item.name);
    const isDocComplete = doc?.progress?.status === 'completed';
    const isInPacket = inPacket[item.name] || false;

    return (
      <div
        onClick={() => doc && onOpenPanel(doc)}
        className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all hover:bg-gray-50 ${
          isInPacket ? 'bg-green-50' : ''
        }`}
        style={{ border: `1px solid ${isInPacket ? '#BBF7D0' : '#E5E7EB'}` }}
      >
        {/* Checkbox */}
        <button
          onClick={(e) => toggleInPacket(item.name, e)}
          className="flex-shrink-0 pt-0.5"
        >
          {isInPacket ? (
            <div className="w-5 h-5 rounded flex items-center justify-center" style={{ backgroundColor: '#22C55E' }}>
              <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          ) : (
            <div
              className="w-5 h-5 rounded border-2 hover:border-gray-400 transition-colors"
              style={{ borderColor: '#D1D5DB' }}
            />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              style={{
                fontFamily: 'Soehne, sans-serif',
                fontSize: '0.9375rem',
                fontWeight: '500',
                color: isInPacket ? '#22C55E' : '#1E1F1C'
              }}
            >
              {isInPacket ? '✓ In packet' : item.name}
            </span>
            {item.optional && (
              <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>Recommended</span>
            )}
            {item.conditional && (
              <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>If applicable</span>
            )}
            {isDocComplete && !isInPacket && (
              <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}>Ready</span>
            )}
          </div>
          <p
            className="mt-0.5 text-sm"
            style={{ fontFamily: 'Soehne, sans-serif', fontWeight: '400', color: '#6B7280' }}
          >
            {isInPacket ? item.name : item.note}
          </p>
          {!isDocComplete && !item.optional && !item.conditional && (
            <span
              className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}
            >
              Not complete - go back to gather this document
            </span>
          )}
        </div>

        {/* Arrow */}
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Video placeholder */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: '#1E3A5F' }}
      >
        <div className="relative aspect-video flex items-center justify-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
          >
            <svg className="w-8 h-8 ml-1" fill="white" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
        <div className="p-4">
          <p
            className="text-sm font-medium text-white"
            style={{ fontFamily: 'Soehne, sans-serif' }}
          >
            How to organize and mail your petition
          </p>
          <p
            className="text-sm mt-1"
            style={{ fontFamily: 'Soehne, sans-serif', color: 'rgba(255,255,255,0.7)' }}
          >
            Step-by-step guide to assembling your petition package
          </p>
        </div>
      </div>

      {/* Progress summary */}
      <div
        className="p-4 rounded-xl"
        style={{
          backgroundColor: requiredReadyCount === requiredItems.length ? '#F0FDF4' : '#FFFBEB',
          border: `1px solid ${requiredReadyCount === requiredItems.length ? '#BBF7D0' : '#FDE68A'}`
        }}
      >
        <div className="flex items-center gap-3">
          {requiredReadyCount === requiredItems.length ? (
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#22C55E' }}>
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F59E0B' }}>
              <span className="text-white font-bold" style={{ fontFamily: 'Soehne, sans-serif' }}>
                {requiredReadyCount}/{requiredItems.length}
              </span>
            </div>
          )}
          <div>
            <p style={{ fontFamily: 'Soehne, sans-serif', fontWeight: '600', color: '#1E1F1C' }}>
              {requiredReadyCount === requiredItems.length
                ? 'All required documents ready!'
                : `${requiredItems.length - requiredReadyCount} required documents still needed`}
            </p>
            <p className="text-sm" style={{ fontFamily: 'Soehne, sans-serif', color: '#6B7280' }}>
              {requiredReadyCount === requiredItems.length
                ? 'You can mail your petition now'
                : 'Gather all required documents before mailing'}
            </p>
          </div>
        </div>
      </div>

      {/* Filing fee reminder */}
      {filingFee && (
        <div
          className="p-4 rounded-xl flex gap-3"
          style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="#DC2626" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <p style={{ fontFamily: 'Soehne, sans-serif', fontWeight: '600', color: '#991B1B' }}>
              Don't forget the {filingFee} filing fee!
            </p>
            <p className="text-sm" style={{ fontFamily: 'Soehne, sans-serif', color: '#991B1B' }}>
              Include a check or money order payable to "{filingFeePayableTo || 'U.S. Department of Homeland Security'}"
            </p>
          </div>
        </div>
      )}

      {/* Core documents checklist */}
      <section>
        <h3
          className="mb-3 flex items-center gap-2"
          style={{
            fontFamily: 'Soehne, sans-serif',
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#1E1F1C',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          Confirm Documents ({requiredReadyCount}/{requiredItems.length} ready)
        </h3>
        <div className="space-y-2">
          {requiredItems.map(item => (
            <ChecklistItem key={item.name} item={item} />
          ))}
        </div>
      </section>

      {/* Conditional documents */}
      {conditionalItems.length > 0 && (
        <section>
          <h3
            className="mb-3 flex items-center gap-2"
            style={{
              fontFamily: 'Soehne, sans-serif',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#6B7280',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            If Applicable
          </h3>
          <div className="space-y-2">
            {conditionalItems.map(item => (
              <ChecklistItem key={item.name} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* Completed optional documents */}
      {completedOptionalItems.length > 0 && (
        <section>
          <h3
            className="mb-3 flex items-center gap-2"
            style={{
              fontFamily: 'Soehne, sans-serif',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#92400E',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            Recommended (Ready to Include)
          </h3>
          <p
            className="mb-3 text-sm"
            style={{ fontFamily: 'Soehne, sans-serif', fontWeight: '400', color: '#6B7280' }}
          >
            You completed these on the "Strengthen Your Case" page - include them in your packet
          </p>
          <div className="space-y-2">
            {completedOptionalItems.map(item => (
              <ChecklistItem key={item.name} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* Mailing addresses */}
      {mailingAddresses && (
        <section className="p-4 rounded-xl" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
          <h3
            className="mb-3 flex items-center gap-2"
            style={{
              fontFamily: 'Soehne, sans-serif',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#1E1F1C',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Mailing Addresses
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {mailingAddresses.usps && (
              <div>
                <p className="text-xs font-medium mb-1" style={{ fontFamily: 'Soehne, sans-serif', color: '#6B7280' }}>
                  {mailingAddresses.usps.label}:
                </p>
                <p className="text-sm whitespace-pre-line" style={{ fontFamily: 'Soehne, sans-serif', color: '#1E1F1C' }}>
                  {mailingAddresses.usps.address}
                </p>
              </div>
            )}
            {mailingAddresses.express && (
              <div>
                <p className="text-xs font-medium mb-1" style={{ fontFamily: 'Soehne, sans-serif', color: '#6B7280' }}>
                  {mailingAddresses.express.label}:
                </p>
                <p className="text-sm whitespace-pre-line" style={{ fontFamily: 'Soehne, sans-serif', color: '#1E1F1C' }}>
                  {mailingAddresses.express.address}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Final reminder */}
      <div
        className="p-4 rounded-xl flex gap-3"
        style={{ backgroundColor: '#1E3A5F' }}
      >
        <svg className="w-5 h-5 flex-shrink-0" fill="white" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <div>
          <p style={{ fontFamily: 'Soehne, sans-serif', fontWeight: '600', color: 'white' }}>
            Before you mail
          </p>
          <ul className="mt-1 text-sm space-y-1" style={{ fontFamily: 'Soehne, sans-serif', fontWeight: '400', color: 'rgba(255,255,255,0.9)' }}>
            <li>• Make copies of EVERYTHING</li>
            <li>• Send via USPS Priority Mail with tracking</li>
            <li>• Keep your tracking number safe</li>
            <li>• Do NOT send original documents (except check)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// Optional Evidence Section Component
function OptionalEvidenceSection({ documents, commentCounts, onOpenPanel, onStatusChange, onOpenComments, guidance }) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <section
      className="mt-8 pt-6 border-t-2 rounded-lg p-4"
      style={{
        borderColor: '#FDE68A',
        backgroundColor: '#FFFBEB'
      }}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div>
          <h2
            className="flex items-center gap-2"
            style={{
              fontFamily: 'Soehne, sans-serif',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#92400E',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            Strengthen Your Case (Recommended)
          </h2>
          <p
            className="mt-1 text-sm"
            style={{
              fontFamily: 'Soehne, sans-serif',
              fontWeight: '400',
              color: '#92400E'
            }}
          >
            Include these with your petition to make your case stronger
          </p>
        </div>
        <svg
          className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          style={{ color: '#92400E' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          {documents.map(doc => {
            const docGuidance = guidance?.[doc.document_name];
            return (
              <div key={doc.id}>
                <DocumentCard
                  document={doc}
                  commentCount={commentCounts[doc.id] || 0}
                  onOpenPanel={onOpenPanel}
                  onStatusChange={onStatusChange}
                  onOpenComments={onOpenComments}
                  isOptional
                />
                {docGuidance?.strengthening_reason && (
                  <p
                    className="mt-2 ml-9 text-sm italic"
                    style={{
                      fontFamily: 'Soehne, sans-serif',
                      fontWeight: '400',
                      color: '#78716C'
                    }}
                  >
                    Why it helps: {docGuidance.strengthening_reason}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function VisaMainContent({
  activePhase,
  documents,
  commentCounts = {},
  onOpenPanel,
  onStatusChange,
  onOpenComments,
  dashboardData,
  // Visa config props
  visaConfig,
  timeline,
  guidance,
  optionalDocs,
  conditionalDocs,
  mailingPhase,
  filingFee,
  mailingDocs,
  mailingAddresses
}) {
  // Phase 1 contains the long lead-time documents (priority)
  const PHASE_1_DOCS = timeline[0]?.docsNeeded || [];

  // Get phase config
  const phaseConfig = useMemo(() => {
    if (activePhase === 'overview' || activePhase === 'timeline') return null;

    const phaseNum = parseInt(activePhase.replace('phase-', ''));
    return timeline.find(p => p.phase === phaseNum);
  }, [activePhase, timeline]);

  // Filter documents for current phase
  const phaseDocuments = useMemo(() => {
    if (!phaseConfig || !phaseConfig.docsNeeded) return [];

    return documents.filter(doc =>
      phaseConfig.docsNeeded.includes(doc.document_name)
    );
  }, [phaseConfig, documents]);

  // Get documents grouped by status for overview
  const overviewData = useMemo(() => {
    if (activePhase !== 'overview') return null;

    // Separate optional docs from required docs
    const requiredDocs = documents.filter(d => !optionalDocs?.includes(d.document_name));
    const optionalDocsList = documents.filter(d => optionalDocs?.includes(d.document_name));

    const inProgress = requiredDocs.filter(d => d.progress?.status === 'in_progress');
    const notStarted = requiredDocs.filter(d => !d.progress?.status || d.progress?.status === 'not_started');
    const completed = requiredDocs.filter(d => d.progress?.status === 'completed');

    // Long lead-time documents (Phase 1) that aren't completed
    const longLeadTimeDocs = notStarted
      .filter(d => PHASE_1_DOCS.includes(d.document_name));

    // Suggested next: first incomplete required doc not in phase 1
    const suggestedNext = notStarted
      .filter(d => d.is_required && !PHASE_1_DOCS.includes(d.document_name))
      .slice(0, 2);

    return {
      inProgress,
      notStarted,
      completed,
      longLeadTimeDocs,
      suggestedNext,
      optionalDocs: optionalDocsList,
      stats: {
        total: requiredDocs.length,
        completed: completed.length,
        inProgress: inProgress.length,
        notStarted: notStarted.length
      }
    };
  }, [activePhase, documents, optionalDocs, PHASE_1_DOCS]);

  // Render timeline view
  if (activePhase === 'timeline') {
    return (
      <div className="max-w-3xl">
        <TimelineView assessment={dashboardData?.assessment} />
      </div>
    );
  }

  // Render overview
  if (activePhase === 'overview' && overviewData) {
    const percentComplete = overviewData.stats.total > 0
      ? Math.round((overviewData.stats.completed / overviewData.stats.total) * 100)
      : 0;

    return (
      <div className="space-y-8">
        {/* Progress header */}
        <div>
          <h1
            style={{
              fontFamily: 'Libre Baskerville, serif',
              fontSize: '1.75rem',
              color: '#1E1F1C'
            }}
          >
            Your {visaConfig?.name || 'Visa'} Progress
          </h1>
          <p
            className="mt-1"
            style={{
              fontFamily: 'Soehne, sans-serif',
              fontSize: '1rem',
              fontWeight: '400',
              color: '#6B7280'
            }}
          >
            {overviewData.stats.completed} of {overviewData.stats.total} documents completed
          </p>

          {/* Segmented progress bar */}
          <div className="mt-4 flex gap-1">
            {Array.from({ length: overviewData.stats.total }).map((_, i) => (
              <div
                key={i}
                className="h-2 flex-1 rounded-full transition-all duration-300"
                style={{
                  backgroundColor: i < overviewData.stats.completed ? '#22C55E' :
                                   i < overviewData.stats.completed + overviewData.stats.inProgress ? '#F59E0B' :
                                   'white',
                  maxWidth: '2rem'
                }}
              />
            ))}
          </div>
          <p
            className="mt-2 text-sm"
            style={{
              fontFamily: 'Soehne, sans-serif',
              color: '#6B7280'
            }}
          >
            {percentComplete}% complete
          </p>
        </div>

        {/* In Progress section */}
        {overviewData.inProgress.length > 0 && (
          <section>
            <h2
              className="mb-3 flex items-center gap-2"
              style={{
                fontFamily: 'Soehne, sans-serif',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#1E1F1C',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: '#F59E0B' }}
              />
              In Progress
            </h2>
            <div className="space-y-3">
              {overviewData.inProgress.map(doc => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  commentCount={commentCounts[doc.id] || 0}
                  onOpenPanel={onOpenPanel}
                  onStatusChange={onStatusChange}
                  onOpenComments={onOpenComments}
                />
              ))}
            </div>
          </section>
        )}

        {/* Start Here - Long Lead-Time Documents section */}
        {overviewData.longLeadTimeDocs.length > 0 && (
          <section
            className="p-4 rounded-xl"
            style={{ backgroundColor: '#FEF3C7', border: '1px solid #FDE68A' }}
          >
            <h2
              className="mb-1 flex items-center gap-2"
              style={{
                fontFamily: 'Soehne, sans-serif',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#92400E',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Start Here
            </h2>
            <p
              className="mb-3 text-sm"
              style={{
                fontFamily: 'Soehne, sans-serif',
                fontWeight: '400',
                color: '#92400E'
              }}
            >
              <strong>These documents have long lead times</strong> — they can take weeks or even months to obtain. Start gathering these now so they don't delay your petition later.
            </p>
            <div className="space-y-3">
              {overviewData.longLeadTimeDocs.map(doc => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  commentCount={commentCounts[doc.id] || 0}
                  onOpenPanel={onOpenPanel}
                  onStatusChange={onStatusChange}
                  onOpenComments={onOpenComments}
                  isLongLeadTime
                />
              ))}
            </div>
          </section>
        )}

        {/* Suggested next */}
        {overviewData.suggestedNext.length > 0 && overviewData.inProgress.length === 0 && (
          <section>
            <h2
              className="mb-3"
              style={{
                fontFamily: 'Soehne, sans-serif',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#1E1F1C',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              Suggested Next
            </h2>
            <div className="space-y-3">
              {overviewData.suggestedNext.map(doc => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  commentCount={commentCounts[doc.id] || 0}
                  onOpenPanel={onOpenPanel}
                  onStatusChange={onStatusChange}
                  onOpenComments={onOpenComments}
                />
              ))}
            </div>
          </section>
        )}

        {/* Completed section */}
        {overviewData.completed.length > 0 && (
          <section>
            <h2
              className="mb-3 flex items-center gap-2"
              style={{
                fontFamily: 'Soehne, sans-serif',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#22C55E',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Completed ({overviewData.completed.length})
            </h2>
            <div className="space-y-3">
              {overviewData.completed.map(doc => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  commentCount={commentCounts[doc.id] || 0}
                  onOpenPanel={onOpenPanel}
                  onStatusChange={onStatusChange}
                  onOpenComments={onOpenComments}
                />
              ))}
            </div>
          </section>
        )}

        {/* Optional Evidence section */}
        {overviewData.optionalDocs.length > 0 && (
          <OptionalEvidenceSection
            documents={overviewData.optionalDocs}
            commentCounts={commentCounts}
            onOpenPanel={onOpenPanel}
            onStatusChange={onStatusChange}
            onOpenComments={onOpenComments}
            guidance={guidance}
          />
        )}
      </div>
    );
  }

  // Render mailing phase with special mailing checklist
  if (phaseConfig && phaseConfig.phase === mailingPhase && mailingDocs) {
    return (
      <div className="space-y-6">
        {/* Phase header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
              style={{
                backgroundColor: '#1E3A5F',
                color: 'white',
                fontFamily: 'Soehne, sans-serif'
              }}
            >
              {phaseConfig.phase}
            </span>
            <h1
              style={{
                fontFamily: 'Libre Baskerville, serif',
                fontSize: '1.5rem',
                color: '#1E1F1C'
              }}
            >
              {phaseConfig.title}
            </h1>
          </div>
          <p
            style={{
              fontFamily: 'Soehne, sans-serif',
              fontSize: '1rem',
              fontWeight: '400',
              color: '#6B7280',
              lineHeight: '1.5'
            }}
          >
            {phaseConfig.description}
          </p>
        </div>

        {/* Mailing Checklist */}
        <MailingChecklist
          documents={documents}
          onOpenPanel={onOpenPanel}
          mailingDocs={mailingDocs}
          mailingAddresses={mailingAddresses}
          filingFee={filingFee}
          filingFeePayableTo={visaConfig?.filingFeePayableTo}
        />
      </div>
    );
  }

  // Render other phase documents
  if (phaseConfig) {
    const completedCount = phaseDocuments.filter(d => d.progress?.status === 'completed').length;

    return (
      <div className="space-y-6">
        {/* Phase header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
              style={{
                backgroundColor: '#1E3A5F',
                color: 'white',
                fontFamily: 'Soehne, sans-serif'
              }}
            >
              {phaseConfig.phase}
            </span>
            <h1
              style={{
                fontFamily: 'Libre Baskerville, serif',
                fontSize: '1.5rem',
                color: '#1E1F1C'
              }}
            >
              {phaseConfig.title}
            </h1>
          </div>
          <p
            style={{
              fontFamily: 'Soehne, sans-serif',
              fontSize: '1rem',
              fontWeight: '400',
              color: '#6B7280',
              lineHeight: '1.5'
            }}
          >
            {phaseConfig.description}
          </p>

          {/* Phase progress */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex gap-1">
              {phaseDocuments.map((doc, i) => (
                <div
                  key={i}
                  className="w-6 h-1.5 rounded-full"
                  style={{
                    backgroundColor: doc.progress?.status === 'completed' ? '#22C55E' :
                                     doc.progress?.status === 'in_progress' ? '#F59E0B' :
                                     'white'
                  }}
                />
              ))}
            </div>
            <span
              className="text-sm"
              style={{
                fontFamily: 'Soehne, sans-serif',
                color: '#6B7280'
              }}
            >
              {completedCount} of {phaseDocuments.length} complete
            </span>
          </div>

          {/* Phase tip */}
          {phaseConfig.tips && (
            <div
              className="mt-4 p-3 rounded-lg flex gap-3"
              style={{ backgroundColor: '#1E3A5F' }}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="white" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <p
                style={{
                  fontFamily: 'Soehne, sans-serif',
                  fontSize: '0.875rem',
                  fontWeight: '400',
                  color: 'white',
                  lineHeight: '1.5'
                }}
              >
                {phaseConfig.tips}
              </p>
            </div>
          )}
        </div>

        {/* Document list */}
        <div className="space-y-3">
          {phaseDocuments.map(doc => (
            <DocumentCard
              key={doc.id}
              document={doc}
              commentCount={commentCounts[doc.id] || 0}
              onOpenPanel={onOpenPanel}
              onStatusChange={onStatusChange}
              onOpenComments={onOpenComments}
              isLongLeadTime={PHASE_1_DOCS.includes(doc.document_name)}
            />
          ))}
        </div>

        {phaseDocuments.length === 0 && (
          <div
            className="text-center py-12 rounded-xl"
            style={{ backgroundColor: '#F9FAFB' }}
          >
            <p
              style={{
                fontFamily: 'Soehne, sans-serif',
                fontSize: '1rem',
                color: '#6B7280'
              }}
            >
              No documents required for this phase
            </p>
            <p
              className="mt-1"
              style={{
                fontFamily: 'Soehne, sans-serif',
                fontSize: '0.875rem',
                color: '#9CA3AF'
              }}
            >
              This is a waiting period - check the timeline for details
            </p>
          </div>
        )}
      </div>
    );
  }

  return null;
}
