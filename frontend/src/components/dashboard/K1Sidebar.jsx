/**
 * K1Sidebar Component
 * Phase-based navigation for the K-1 dashboard
 */

import { Link } from 'react-router-dom';
import { UserButton } from '@clerk/react';
import { K1_TIMELINE } from '../../data/k1Guidance';

// Map phases to their document requirements for progress calculation
// Include phases with documents OR special phases like mailing
const PHASE_CONFIG = K1_TIMELINE
  .filter(p => (p.docsNeeded && p.docsNeeded.length > 0) || p.isMailingPhase)
  .map(phase => ({
    id: `phase-${phase.phase}`,
    phaseNumber: phase.phase,
    label: phase.title,
    description: phase.duration,
    docsNeeded: phase.docsNeeded,
    isOptional: phase.isOptional,
    isMailingPhase: phase.isMailingPhase,
    icon: 'folder'
  }));

export default function K1Sidebar({
  activePhase,
  onPhaseChange,
  documents,
  isCollapsed,
  onToggleCollapse
}) {
  // Calculate progress for each phase
  const getPhaseProgress = (phaseConfig) => {
    // Mailing phase doesn't have document progress
    if (phaseConfig.isMailingPhase) return null;

    const phaseDocs = documents.filter(doc =>
      phaseConfig.docsNeeded?.includes(doc.document_name)
    );

    const completed = phaseDocs.filter(d =>
      d.progress?.status === 'completed'
    ).length;

    const total = phaseDocs.filter(d =>
      d.progress?.status !== 'not_applicable'
    ).length;

    return { completed, total };
  };

  // Get overall progress
  const getOverallProgress = () => {
    const completed = documents.filter(d =>
      d.progress?.status === 'completed'
    ).length;
    const total = documents.filter(d =>
      d.progress?.status !== 'not_applicable'
    ).length;
    return { completed, total, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  const overall = getOverallProgress();

  return (
    <aside
      className={`
        flex flex-col h-screen sticky top-0 transition-all duration-300
        ${isCollapsed ? 'w-16' : 'w-64'}
      `}
      style={{ backgroundColor: '#151A22' }}
    >
      {/* Collapse toggle for mobile */}
      <button
        onClick={onToggleCollapse}
        className="lg:hidden absolute top-4 right-4 p-2 rounded"
        style={{ color: 'white' }}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isCollapsed ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          )}
        </svg>
      </button>

      {/* Logo */}
      <div className={`p-4 border-b border-white/10 ${isCollapsed ? 'px-2' : ''}`}>
        {!isCollapsed ? (
          <Link
            to="/"
            style={{
              fontFamily: 'Libre Baskerville, serif',
              fontSize: '1.125rem',
              color: 'white',
              textDecoration: 'none'
            }}
          >
            Immigration DIY
          </Link>
        ) : (
          <Link
            to="/"
            className="flex justify-center"
            style={{ color: 'white', textDecoration: 'none' }}
          >
            <span style={{ fontFamily: 'Libre Baskerville, serif', fontSize: '1rem' }}>ID</span>
          </Link>
        )}
      </div>

      {/* Progress Header */}
      <div className={`p-4 border-b border-white/10 ${isCollapsed ? 'px-2' : ''}`}>
        {!isCollapsed && (
          <>
            <h2
              className="text-white font-medium mb-1"
              style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.875rem' }}
            >
              K-1 Visa Progress
            </h2>

            {/* Overall progress bar */}
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                <span>{overall.completed} of {overall.total}</span>
                <span>{overall.percent}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${overall.percent}%`,
                    backgroundColor: '#4ADE80'
                  }}
                />
              </div>
            </div>
          </>
        )}

        {isCollapsed && (
          <div className="flex justify-center">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
            >
              {overall.percent}%
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {PHASE_CONFIG.map((phase) => {
          const progress = getPhaseProgress(phase);
          const isActive = activePhase === phase.id;
          const isComplete = progress && progress.completed === progress.total && progress.total > 0;

          return (
            <button
              key={phase.id}
              onClick={() => onPhaseChange(phase.id)}
              className={`
                w-full text-left transition-all
                ${isCollapsed ? 'px-2 py-3' : 'px-4 py-3'}
              `}
              style={{
                backgroundColor: isActive ? '#21252C' : 'transparent',
                borderLeft: isActive ? '3px solid #4ADE80' : '3px solid transparent'
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
                {/* Phase indicator */}
                <div
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: isComplete ? '#4ADE80' : phase.isOptional ? '#FDE68A' : phase.isMailingPhase ? '#3B82F6' : '#2E333D',
                    color: isComplete ? '#151A22' : phase.isOptional ? '#92400E' : 'white'
                  }}
                >
                  {phase.isMailingPhase ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  ) : phase.isOptional ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  ) : isComplete ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <span style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.75rem', fontWeight: '600' }}>
                      {phase.phaseNumber}
                    </span>
                  )}
                </div>

                {/* Label and progress */}
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div
                      className="truncate"
                      style={{
                        fontFamily: 'Soehne, sans-serif',
                        fontSize: '0.875rem',
                        fontWeight: isActive ? '600' : '400',
                        color: 'white'
                      }}
                    >
                      {phase.label}
                    </div>
                    {progress && (
                      <div
                        className="text-xs mt-0.5"
                        style={{ color: 'rgba(255,255,255,0.5)' }}
                      >
                        {progress.completed}/{progress.total} complete
                      </div>
                    )}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer - Timeline link */}
      {!isCollapsed && (
        <div className="p-4 border-t border-white/10">
          <button
            onClick={() => onPhaseChange('timeline')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
            style={{
              backgroundColor: activePhase === 'timeline' ? '#21252C' : 'transparent'
            }}
            onMouseEnter={(e) => { if (activePhase !== 'timeline') e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; }}
            onMouseLeave={(e) => { if (activePhase !== 'timeline') e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <svg className="w-4 h-4" fill="none" stroke="white" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.875rem', color: 'white' }}>
              Full Timeline
            </span>
          </button>
        </div>
      )}

      {/* Footer - My Account */}
      <div className="mt-auto p-4 border-t border-white/10">
        {!isCollapsed ? (
          <div className="flex items-center gap-3">
            <UserButton afterSignOutUrl="/" />
            <Link
              to="/dashboard"
              style={{
                fontFamily: 'Soehne, sans-serif',
                fontSize: '0.875rem',
                color: 'rgba(255,255,255,0.7)',
                textDecoration: 'none'
              }}
            >
              My Account
            </Link>
          </div>
        ) : (
          <div className="flex justify-center">
            <UserButton afterSignOutUrl="/" />
          </div>
        )}
      </div>
    </aside>
  );
}

export { PHASE_CONFIG };
