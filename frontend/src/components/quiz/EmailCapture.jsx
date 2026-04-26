import { useState } from 'react';

export default function EmailCapture({ value, onChange, onSubmit, onBack, isSubmitting }) {
  const [error, setError] = useState('');
  const [privacyConsent, setPrivacyConsent] = useState(false);

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!value || !value.trim()) {
      setError('Email is required');
      return;
    }

    if (!validateEmail(value)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!privacyConsent) {
      setError('Please agree to the Privacy Policy to continue');
      return;
    }

    setError('');
    onSubmit();
  };

  const handleChange = (newValue) => {
    setError('');
    onChange(newValue);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#EFEDEC' }}>
      <div className="flex-1 pt-20 pb-8 px-4">
        <div className="max-w-3xl mx-auto flex flex-col h-full">
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 mb-auto">
              <h2 style={{
                fontFamily: 'Libre Baskerville, serif',
                fontSize: '1.875rem',
                color: '#1E1F1C',
                lineHeight: '1.3',
                fontWeight: '400'
              }}>
                Where should we send your visa eligibility report?
              </h2>

              <div className="space-y-2">
                <input
                  type="email"
                  value={value}
                  onChange={(e) => handleChange(e.target.value)}
                  placeholder="Enter your email address"
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 transition-colors"
                  style={{
                    backgroundColor: '#E6E4E1',
                    borderRadius: '12px',
                    border: error ? '2px solid #DC2626' : 'none',
                    fontFamily: 'Soehne, sans-serif',
                    fontSize: '1rem',
                    color: '#1E1F1C',
                    outline: 'none'
                  }}
                />
                {error && (
                  <p className="text-sm" style={{
                    fontFamily: 'Soehne, sans-serif',
                    color: '#DC2626'
                  }}>
                    {error}
                  </p>
                )}
              </div>

              <p className="text-sm" style={{
                fontFamily: 'Soehne, sans-serif',
                color: '#77716E'
              }}>
                You'll see your results on the next screen. We'll also send a detailed report with next steps to your email.
              </p>

              <div className="flex items-start gap-3 mt-6">
                <input
                  type="checkbox"
                  id="privacy-consent"
                  checked={privacyConsent}
                  onChange={(e) => {
                    setPrivacyConsent(e.target.checked);
                    setError('');
                  }}
                  disabled={isSubmitting}
                  className="mt-1 cursor-pointer"
                  style={{
                    width: '18px',
                    height: '18px',
                    accentColor: '#1E3A5F'
                  }}
                />
                <label
                  htmlFor="privacy-consent"
                  className="text-sm cursor-pointer"
                  style={{
                    fontFamily: 'Soehne, sans-serif',
                    color: '#6D6B6B',
                    lineHeight: '1.5'
                  }}
                >
                  I agree to the{' '}
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#1E3A5F',
                      textDecoration: 'underline'
                    }}
                  >
                    Privacy Policy
                  </a>
                  {' '}and consent to my data being processed to provide visa eligibility results.
                </label>
              </div>
            </div>

            <div className="flex justify-between items-center mt-8">
              <button
                type="button"
                onClick={onBack}
                disabled={isSubmitting}
                className="font-medium transition-colors disabled:opacity-50"
                style={{
                  fontFamily: 'Soehne, sans-serif',
                  color: '#77716E'
                }}
              >
                &#8592; Back
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: '#1E3A5F',
                  color: 'white',
                  borderRadius: '27px',
                  fontFamily: 'Soehne, sans-serif'
                }}
              >
                {isSubmitting ? 'Processing...' : 'Get My Results'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
