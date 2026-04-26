/**
 * K1OnboardingModal Component
 * Asks users about conditional documents (divorce/death certificates)
 */

import { useState } from 'react';

export default function K1OnboardingModal({ onComplete, onClose }) {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState({
    previously_married: null,
    spouse_deceased: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAnswer = (field, value) => {
    setAnswers(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (step === 1 && answers.previously_married !== null) {
      // If not previously married, skip spouse deceased question
      if (!answers.previously_married) {
        handleComplete();
      } else {
        setStep(2);
      }
    } else if (step === 2 && answers.spouse_deceased !== null) {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      await onComplete({
        previously_married: answers.previously_married || false,
        spouse_deceased: answers.spouse_deceased || false,
        onboarding_completed: true
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = step === 1
    ? answers.previously_married !== null
    : answers.spouse_deceased !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
        style={{ fontFamily: 'Soehne, sans-serif' }}
      >
        {/* Progress indicator */}
        <div className="flex justify-center gap-2 mb-6">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: step >= 1 ? '#1E3A5F' : '#E5E7EB' }}
          />
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: step >= 2 ? '#1E3A5F' : '#E5E7EB' }}
          />
        </div>

        {/* Step 1: Previous Marriage */}
        {step === 1 && (
          <div>
            <h2
              className="text-xl font-semibold mb-2"
              style={{ fontFamily: 'Libre Baskerville, serif', color: '#1E1F1C' }}
            >
              Quick Setup
            </h2>
            <p className="text-gray-600 mb-6" style={{ fontWeight: '400' }}>
              We'll customize your document checklist based on your situation.
            </p>

            <div className="mb-6">
              <p className="font-medium text-gray-900 mb-4">
                Were you or your fiancé(e) previously married?
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => handleAnswer('previously_married', true)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    answers.previously_married === true
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="font-medium">Yes</span>
                  <p className="text-sm text-gray-500 mt-1" style={{ fontWeight: '400' }}>
                    You'll need to provide divorce or death certificates
                  </p>
                </button>
                <button
                  onClick={() => handleAnswer('previously_married', false)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    answers.previously_married === false
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="font-medium">No</span>
                  <p className="text-sm text-gray-500 mt-1" style={{ fontWeight: '400' }}>
                    This is the first marriage for both of us
                  </p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Spouse Deceased (only if previously married) */}
        {step === 2 && (
          <div>
            <h2
              className="text-xl font-semibold mb-2"
              style={{ fontFamily: 'Libre Baskerville, serif', color: '#1E1F1C' }}
            >
              One More Question
            </h2>
            <p className="text-gray-600 mb-6" style={{ fontWeight: '400' }}>
              This helps us show the right documents for your situation.
            </p>

            <div className="mb-6">
              <p className="font-medium text-gray-900 mb-4">
                Is the previous marriage ended due to spouse's death?
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => handleAnswer('spouse_deceased', true)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    answers.spouse_deceased === true
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="font-medium">Yes, spouse is deceased</span>
                  <p className="text-sm text-gray-500 mt-1" style={{ fontWeight: '400' }}>
                    You'll need to provide a death certificate
                  </p>
                </button>
                <button
                  onClick={() => handleAnswer('spouse_deceased', false)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    answers.spouse_deceased === false
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="font-medium">No, ended by divorce</span>
                  <p className="text-sm text-gray-500 mt-1" style={{ fontWeight: '400' }}>
                    You'll need to provide a divorce decree
                  </p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="text-gray-500 hover:text-gray-700"
            >
              Back
            </button>
          ) : (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              Skip for now
            </button>
          )}

          <button
            onClick={handleNext}
            disabled={!canProceed || isSubmitting}
            className="px-6 py-2 rounded-lg font-medium text-white transition-all disabled:opacity-50"
            style={{
              backgroundColor: canProceed ? '#1E3A5F' : '#9CA3AF',
              cursor: canProceed && !isSubmitting ? 'pointer' : 'not-allowed'
            }}
          >
            {isSubmitting ? 'Saving...' : step === 2 || !answers.previously_married ? 'Complete' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
