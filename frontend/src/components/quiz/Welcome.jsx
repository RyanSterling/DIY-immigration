export default function Welcome({ onStart }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#EFEDEC' }}>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <h1 style={{
            fontFamily: 'Libre Baskerville, serif',
            fontSize: '2.5rem',
            color: '#1E1F1C',
            lineHeight: '1.2',
            fontWeight: '400',
            marginBottom: '1.5rem'
          }}>
            US Visa Eligibility Assessment
          </h1>

          <p style={{
            fontFamily: 'Soehne, sans-serif',
            fontSize: '1.125rem',
            color: '#77716E',
            lineHeight: '1.6',
            marginBottom: '2rem'
          }}>
            Answer a few questions about your background to discover which US visa options
            you may qualify for, estimated costs, processing times, and likelihood of approval.
          </p>

          <div style={{
            backgroundColor: '#E6E4E1',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '2rem'
          }}>
            <p style={{
              fontFamily: 'Soehne, sans-serif',
              fontSize: '0.875rem',
              color: '#77716E',
              lineHeight: '1.5'
            }}>
              <strong style={{ color: '#1E3A5F' }}>What you'll get:</strong>
              <br />
              Personalized visa recommendations based on your qualifications,
              cost estimates, timeline expectations, and next steps for each visa type.
            </p>
          </div>

          <button
            onClick={onStart}
            className="px-12 py-4 font-medium transition-all hover:opacity-90"
            style={{
              backgroundColor: '#1E3A5F',
              color: 'white',
              borderRadius: '27px',
              fontFamily: 'Soehne, sans-serif',
              fontSize: '1.125rem'
            }}
          >
            Start Assessment
          </button>

          <p className="mt-6" style={{
            fontFamily: 'Soehne, sans-serif',
            fontSize: '0.75rem',
            color: '#8B8886'
          }}>
            Takes about 3-5 minutes. Your answers are confidential.
          </p>
        </div>
      </div>
    </div>
  );
}
