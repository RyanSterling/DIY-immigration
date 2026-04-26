export default function Privacy() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#EFEDEC' }}>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 style={{
          fontFamily: 'Libre Baskerville, serif',
          fontSize: '2.5rem',
          color: '#1E1F1C',
          marginBottom: '2rem'
        }}>
          Privacy Policy
        </h1>

        <div style={{
          fontFamily: 'Soehne, sans-serif',
          color: '#77716E',
          lineHeight: '1.8'
        }}>
          <p className="mb-6">
            <strong>Last updated:</strong> {new Date().toLocaleDateString()}
          </p>

          <h2 style={{
            fontFamily: 'Libre Baskerville, serif',
            fontSize: '1.5rem',
            color: '#1E1F1C',
            marginTop: '2rem',
            marginBottom: '1rem'
          }}>
            Information We Collect
          </h2>
          <p className="mb-4">
            When you use our visa eligibility assessment, we collect:
          </p>
          <ul className="list-disc pl-6 mb-6">
            <li>Your email address (to send your assessment results)</li>
            <li>Your responses to assessment questions</li>
            <li>Any additional context you provide</li>
            <li>Technical information (IP address, browser type) for security purposes</li>
          </ul>

          <h2 style={{
            fontFamily: 'Libre Baskerville, serif',
            fontSize: '1.5rem',
            color: '#1E1F1C',
            marginTop: '2rem',
            marginBottom: '1rem'
          }}>
            How We Use Your Information
          </h2>
          <p className="mb-4">
            We use your information to:
          </p>
          <ul className="list-disc pl-6 mb-6">
            <li>Provide personalized visa eligibility recommendations</li>
            <li>Send you your assessment results via email</li>
            <li>Improve our assessment tool and services</li>
            <li>Prevent abuse and ensure security</li>
          </ul>

          <h2 style={{
            fontFamily: 'Libre Baskerville, serif',
            fontSize: '1.5rem',
            color: '#1E1F1C',
            marginTop: '2rem',
            marginBottom: '1rem'
          }}>
            Data Security
          </h2>
          <p className="mb-6">
            We implement appropriate technical and organizational measures to protect your
            personal information. Your data is stored securely and we do not sell your
            personal information to third parties.
          </p>

          <h2 style={{
            fontFamily: 'Libre Baskerville, serif',
            fontSize: '1.5rem',
            color: '#1E1F1C',
            marginTop: '2rem',
            marginBottom: '1rem'
          }}>
            Your Rights
          </h2>
          <p className="mb-6">
            You have the right to:
          </p>
          <ul className="list-disc pl-6 mb-6">
            <li>Access your personal data</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Withdraw consent at any time</li>
          </ul>

          <h2 style={{
            fontFamily: 'Libre Baskerville, serif',
            fontSize: '1.5rem',
            color: '#1E1F1C',
            marginTop: '2rem',
            marginBottom: '1rem'
          }}>
            Contact Us
          </h2>
          <p className="mb-6">
            If you have any questions about this Privacy Policy, please contact us.
          </p>

          <div className="mt-8">
            <a
              href="/"
              style={{
                color: '#1E3A5F',
                textDecoration: 'underline'
              }}
            >
              &larr; Back to Assessment
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
