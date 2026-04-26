import { useState, useEffect } from 'react';

const LOADING_MESSAGES = [
  "Analyzing your qualifications...",
  "Reviewing visa requirements...",
  "Calculating eligibility scores...",
  "Estimating processing times...",
  "Preparing your personalized report...",
  "Almost there..."
];

export default function LoadingScreen() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: '#EFEDEC' }}>
      <div className="max-w-md mx-auto px-4 text-center">
        <div className="mb-8 flex justify-center">
          <div
            className="animate-spin rounded-full border-4 border-solid"
            style={{
              width: '48px',
              height: '48px',
              borderColor: '#E6E4E1',
              borderTopColor: '#1E3A5F'
            }}
          />
        </div>

        <p
          className="text-xl transition-opacity duration-500"
          style={{
            fontFamily: 'Soehne, sans-serif',
            color: '#77716E'
          }}
        >
          {LOADING_MESSAGES[messageIndex]}
        </p>
      </div>
    </div>
  );
}
