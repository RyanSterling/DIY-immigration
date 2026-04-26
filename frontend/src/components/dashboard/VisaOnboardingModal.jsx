/**
 * VisaOnboardingModal Component
 * Generic onboarding modal that uses preferencesSchema from visa config.
 * Dynamically renders questions based on the visa type's configuration.
 */

import { useState, useMemo } from 'react';

export default function VisaOnboardingModal({ visaConfig, onComplete, onClose }) {
  const { preferencesSchema } = visaConfig;

  // Build initial answers state from schema
  const initialAnswers = useMemo(() => {
    const answers = {};
    preferencesSchema?.forEach(q => {
      answers[q.key] = null;
    });
    return answers;
  }, [preferencesSchema]);

  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState(initialAnswers);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get visible questions (filtering out conditional ones that don't apply)
  const visibleQuestions = useMemo(() => {
    return preferencesSchema?.filter(q => {
      if (!q.conditionalOn) return true;
      return answers[q.conditionalOn] === true;
    }) || [];
  }, [preferencesSchema, answers]);

  const currentQuestion = visibleQuestions[currentStep];
  const totalSteps = visibleQuestions.length;
  const isLastStep = currentStep >= totalSteps - 1;

  const handleAnswer = (value) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.key]: value
    }));
  };

  const handleNext = () => {
    if (answers[currentQuestion?.key] === null) return;

    // Check if there's a next visible question
    const nextVisibleQuestions = preferencesSchema?.filter(q => {
      if (!q.conditionalOn) return true;
      // Check with updated answers including current answer
      const updatedAnswers = { ...answers };
      return updatedAnswers[q.conditionalOn] === true;
    }) || [];

    const nextStep = currentStep + 1;

    if (nextStep >= nextVisibleQuestions.length) {
      // No more questions, complete
      handleComplete();
    } else {
      setCurrentStep(nextStep);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      // Build final preferences object
      const preferences = {};
      preferencesSchema?.forEach(q => {
        preferences[q.key] = answers[q.key] || false;
      });
      preferences.onboarding_completed = true;

      await onComplete(preferences);
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = currentQuestion && answers[currentQuestion.key] !== null;

  // If no preferences schema, just complete immediately
  if (!preferencesSchema || preferencesSchema.length === 0) {
    return null;
  }

  // If no visible questions (all conditional and none apply), complete
  if (visibleQuestions.length === 0) {
    handleComplete();
    return null;
  }

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
          {visibleQuestions.map((_, index) => (
            <div
              key={index}
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: index <= currentStep ? '#1E3A5F' : '#E5E7EB' }}
            />
          ))}
        </div>

        {/* Current Question */}
        {currentQuestion && (
          <div>
            <h2
              className="text-xl font-semibold mb-2"
              style={{ fontFamily: 'Libre Baskerville, serif', color: '#1E1F1C' }}
            >
              {currentStep === 0 ? 'Quick Setup' : 'One More Question'}
            </h2>
            <p className="text-gray-600 mb-6" style={{ fontWeight: '400' }}>
              {currentQuestion.helperText || 'We\'ll customize your document checklist based on your situation.'}
            </p>

            <div className="mb-6">
              <p className="font-medium text-gray-900 mb-4">
                {currentQuestion.prompt}
              </p>

              {currentQuestion.type === 'boolean' && (
                <div className="space-y-3">
                  <button
                    onClick={() => handleAnswer(true)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                      answers[currentQuestion.key] === true
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="font-medium">Yes</span>
                    {currentQuestion.yesDescription && (
                      <p className="text-sm text-gray-500 mt-1" style={{ fontWeight: '400' }}>
                        {currentQuestion.yesDescription}
                      </p>
                    )}
                  </button>
                  <button
                    onClick={() => handleAnswer(false)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                      answers[currentQuestion.key] === false
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="font-medium">No</span>
                    {currentQuestion.noDescription && (
                      <p className="text-sm text-gray-500 mt-1" style={{ fontWeight: '400' }}>
                        {currentQuestion.noDescription}
                      </p>
                    )}
                  </button>
                </div>
              )}

              {currentQuestion.type === 'choice' && currentQuestion.options && (
                <div className="space-y-3">
                  {currentQuestion.options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleAnswer(option.value)}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                        answers[currentQuestion.key] === option.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="font-medium">{option.label}</span>
                      {option.description && (
                        <p className="text-sm text-gray-500 mt-1" style={{ fontWeight: '400' }}>
                          {option.description}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
          {currentStep > 0 ? (
            <button
              onClick={handleBack}
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
            {isSubmitting ? 'Saving...' : isLastStep ? 'Complete' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
