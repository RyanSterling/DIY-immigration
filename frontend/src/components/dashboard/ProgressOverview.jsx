/**
 * ProgressOverview Component
 * Shows overall progress stats and quick summary
 */

export default function ProgressOverview({ data, documents }) {
  const stats = data?.stats || { total: 16, completed: 0, in_progress: 0, not_started: 16 };
  const percentComplete = data?.percentComplete || 0;

  // Find next incomplete required document
  const nextRequiredDoc = documents?.find(
    d => d.is_required && d.progress?.status !== 'completed' && d.progress?.status !== 'not_applicable'
  );

  // Count by status
  const completedCount = stats.completed;
  const inProgressCount = stats.in_progress;
  const notStartedCount = stats.not_started;

  return (
    <div className="space-y-6">
      {/* Progress ring and stats */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Progress circle */}
        <div
          className="rounded-lg p-6 flex flex-col items-center justify-center"
          style={{ backgroundColor: 'white', border: '1px solid #E6E4E1' }}
        >
          <div className="relative w-40 h-40">
            <svg className="w-full h-full transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke="#E6E4E1"
                strokeWidth="12"
              />
              {/* Progress circle */}
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke="#1E3A5F"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${(percentComplete / 100) * 440} 440`}
                style={{ transition: 'stroke-dasharray 0.5s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span style={{
                fontFamily: 'Libre Baskerville, serif',
                fontSize: '2.5rem',
                color: '#1E3A5F',
                fontWeight: '400'
              }}>
                {percentComplete}%
              </span>
              <span style={{
                fontFamily: 'Soehne, sans-serif',
                fontSize: '0.875rem',
                color: '#77716E'
              }}>
                Complete
              </span>
            </div>
          </div>

          <p style={{
            fontFamily: 'Soehne, sans-serif',
            fontSize: '0.9375rem',
            color: '#4B5563',
            marginTop: '1rem',
            textAlign: 'center'
          }}>
            {completedCount} of {stats.total} documents completed
          </p>
        </div>

        {/* Stats breakdown */}
        <div
          className="rounded-lg p-6"
          style={{ backgroundColor: 'white', border: '1px solid #E6E4E1' }}
        >
          <h3 style={{
            fontFamily: 'Libre Baskerville, serif',
            fontSize: '1.125rem',
            color: '#1E1F1C',
            marginBottom: '1rem'
          }}>
            Progress Breakdown
          </h3>

          <div className="space-y-4">
            {/* Completed */}
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#D1FAE5' }}
              >
                <svg className="w-5 h-5" fill="#065F46" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p style={{ fontFamily: 'Soehne, sans-serif', fontWeight: '500', color: '#1E1F1C' }}>
                  Completed
                </p>
                <p style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.875rem', color: '#77716E' }}>
                  {completedCount} documents
                </p>
              </div>
            </div>

            {/* In Progress */}
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#FEF3C7' }}
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#92400E' }} />
              </div>
              <div className="flex-1">
                <p style={{ fontFamily: 'Soehne, sans-serif', fontWeight: '500', color: '#1E1F1C' }}>
                  In Progress
                </p>
                <p style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.875rem', color: '#77716E' }}>
                  {inProgressCount} documents
                </p>
              </div>
            </div>

            {/* Not Started */}
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#E6E4E1' }}
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#77716E' }} />
              </div>
              <div className="flex-1">
                <p style={{ fontFamily: 'Soehne, sans-serif', fontWeight: '500', color: '#1E1F1C' }}>
                  Not Started
                </p>
                <p style={{ fontFamily: 'Soehne, sans-serif', fontSize: '0.875rem', color: '#77716E' }}>
                  {notStartedCount} documents
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Next step suggestion */}
      {nextRequiredDoc && (
        <div
          className="rounded-lg p-6"
          style={{ backgroundColor: '#1E3A5F' }}
        >
          <h3 style={{
            fontFamily: 'Soehne, sans-serif',
            fontWeight: '600',
            color: 'white',
            marginBottom: '0.5rem'
          }}>
            Next Step
          </h3>
          <p style={{
            fontFamily: 'Soehne, sans-serif',
            color: 'rgba(255, 255, 255, 0.9)',
            marginBottom: '1rem'
          }}>
            Work on: <strong>{nextRequiredDoc.document_name}</strong>
          </p>
          <p style={{
            fontFamily: 'Soehne, sans-serif',
            fontSize: '0.875rem',
            color: 'rgba(255, 255, 255, 0.7)'
          }}>
            {nextRequiredDoc.document_description}
          </p>
        </div>
      )}

      {/* Assessment summary if available */}
      {data?.assessment && (
        <div
          className="rounded-lg p-6"
          style={{ backgroundColor: 'white', border: '1px solid #E6E4E1' }}
        >
          <h3 style={{
            fontFamily: 'Libre Baskerville, serif',
            fontSize: '1.125rem',
            color: '#1E1F1C',
            marginBottom: '0.5rem'
          }}>
            Your K-1 Assessment
          </h3>
          <p style={{
            fontFamily: 'Soehne, sans-serif',
            fontSize: '0.875rem',
            color: '#77716E',
            marginBottom: '1rem'
          }}>
            Completed {new Date(data.assessment.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
          {data.assessment.visa_eligibility_results?.[0] && (
            <span
              className="inline-block px-3 py-1 rounded-full text-sm"
              style={{
                fontFamily: 'Soehne, sans-serif',
                backgroundColor: data.assessment.visa_eligibility_results[0].likelihood_rating === 'high' ? '#D1FAE5' :
                               data.assessment.visa_eligibility_results[0].likelihood_rating === 'medium' ? '#FEF3C7' : '#FEE2E2',
                color: data.assessment.visa_eligibility_results[0].likelihood_rating === 'high' ? '#065F46' :
                      data.assessment.visa_eligibility_results[0].likelihood_rating === 'medium' ? '#92400E' : '#991B1B'
              }}
            >
              {data.assessment.visa_eligibility_results[0].likelihood_rating} likelihood
            </span>
          )}
        </div>
      )}
    </div>
  );
}
