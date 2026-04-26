/**
 * TimelineView Component
 * Visual timeline of the K-1 visa process phases
 */

import { K1_TIMELINE } from '../../data/k1Guidance';

export default function TimelineView({ assessment }) {
  return (
    <div className="space-y-6">
      <div
        className="rounded-lg p-6"
        style={{ backgroundColor: 'white', border: '1px solid #E6E4E1' }}
      >
        <h3 style={{
          fontFamily: 'Libre Baskerville, serif',
          fontSize: '1.25rem',
          color: '#1E1F1C',
          marginBottom: '0.5rem'
        }}>
          K-1 Visa Process Timeline
        </h3>
        <p style={{
          fontFamily: 'Soehne, sans-serif',
          fontSize: '0.9375rem',
          color: '#77716E',
          marginBottom: '2rem'
        }}>
          The K-1 process typically takes 12-18 months from filing to marriage.
        </p>

        {/* Timeline */}
        <div className="relative">
          {K1_TIMELINE.map((phase, index) => (
            <div key={phase.phase} className="relative pl-8 pb-8 last:pb-0">
              {/* Vertical line */}
              {index < K1_TIMELINE.length - 1 && (
                <div
                  className="absolute left-[11px] top-6 bottom-0 w-0.5"
                  style={{ backgroundColor: '#E6E4E1' }}
                />
              )}

              {/* Phase number circle */}
              <div
                className="absolute left-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
                style={{
                  backgroundColor: '#1E3A5F',
                  color: 'white',
                  fontFamily: 'Soehne, sans-serif'
                }}
              >
                {phase.phase}
              </div>

              {/* Phase content */}
              <div>
                <h4 style={{
                  fontFamily: 'Soehne, sans-serif',
                  fontWeight: '600',
                  color: '#1E1F1C',
                  fontSize: '1rem',
                  marginBottom: '0.25rem'
                }}>
                  {phase.title}
                </h4>

                <p style={{
                  fontFamily: 'Soehne, sans-serif',
                  fontSize: '0.875rem',
                  fontWeight: '400',
                  color: '#4B5563',
                  marginBottom: '0.5rem',
                  lineHeight: '1.5'
                }}>
                  {phase.description}
                </p>

                <div className="flex flex-wrap gap-2 items-center">
                  <span
                    className="inline-block px-2 py-1 rounded text-xs"
                    style={{
                      backgroundColor: '#F3F4F6',
                      color: '#4B5563',
                      fontFamily: 'Soehne, sans-serif'
                    }}
                  >
                    {phase.duration}
                  </span>

                  {phase.docsNeeded && phase.docsNeeded.length > 0 && (
                    <span style={{
                      fontFamily: 'Soehne, sans-serif',
                      fontSize: '0.75rem',
                      color: '#77716E'
                    }}>
                      Documents: {phase.docsNeeded.length}
                    </span>
                  )}
                </div>

                {phase.tips && (
                  <p style={{
                    fontFamily: 'Soehne, sans-serif',
                    fontSize: '0.8125rem',
                    color: '#77716E',
                    marginTop: '0.5rem',
                    fontStyle: 'italic'
                  }}>
                    Tip: {phase.tips}
                  </p>
                )}

                {phase.docsNeeded && phase.docsNeeded.length > 0 && (
                  <div className="mt-2">
                    <p style={{
                      fontFamily: 'Soehne, sans-serif',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      color: '#77716E',
                      marginBottom: '0.25rem'
                    }}>
                      Documents needed:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {phase.docsNeeded.map((doc, i) => (
                        <span
                          key={i}
                          className="inline-block px-2 py-0.5 rounded text-xs"
                          style={{
                            backgroundColor: '#EFF6FF',
                            color: '#1E40AF',
                            fontFamily: 'Soehne, sans-serif'
                          }}
                        >
                          {doc}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Important notes */}
      <div
        className="rounded-lg p-6"
        style={{ backgroundColor: '#FEF3C7', border: '1px solid #FDE68A' }}
      >
        <h4 style={{
          fontFamily: 'Soehne, sans-serif',
          fontWeight: '600',
          color: '#92400E',
          marginBottom: '0.5rem'
        }}>
          Important Reminders
        </h4>
        <ul className="space-y-2">
          <li style={{
            fontFamily: 'Soehne, sans-serif',
            fontSize: '0.875rem',
            fontWeight: '400',
            color: '#92400E'
          }}>
            You must marry within 90 days of entering the US on a K-1 visa
          </li>
          <li style={{
            fontFamily: 'Soehne, sans-serif',
            fontWeight: '400',
            fontSize: '0.875rem',
            color: '#92400E'
          }}>
            The K-1 visa is valid for a single entry within 4 months of issuance
          </li>
          <li style={{
            fontFamily: 'Soehne, sans-serif',
            fontSize: '0.875rem',
            fontWeight: '400',
            color: '#92400E'
          }}>
            You cannot work until your EAD (work permit) is approved after filing I-485
          </li>
          <li style={{
            fontFamily: 'Soehne, sans-serif',
            fontSize: '0.875rem',
            fontWeight: '400',
            color: '#92400E'
          }}>
            Processing times vary significantly - check USCIS for current estimates
          </li>
        </ul>
      </div>
    </div>
  );
}
