import { useState } from 'react';
import Question from './Question';
import ProgressBar from './ProgressBar';
import FreeTextInput from './FreeTextInput';
import EmailCapture from './EmailCapture';
import LoadingScreen from './LoadingScreen';
import Results from './Results';
import { K1_QUESTIONS, getVisibleK1Questions, getTotalK1QuestionCount, getQuestionText } from '../../data/k1Questions';
import { calculateK1Eligibility } from '../../lib/scoring';
import { getUtmParams } from '../../lib/utm';
import { generateSessionId } from '../../lib/session';
import { saveAssessment, saveVisaResults, trackQuizStart, markQuizCompleted } from '../../lib/supabase';
import { generateAssessment, sendWebhook } from '../../lib/api';

const STEPS = {
  WELCOME: 'welcome',
  QUESTIONS: 'questions',
  FREE_TEXT: 'free_text',
  EMAIL: 'email',
  LOADING: 'loading',
  RESULTS: 'results'
};

function K1Welcome({ onStart }) {
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
            K-1 Fiancé Visa Assessment
          </h1>

          <p style={{
            fontFamily: 'Soehne, sans-serif',
            fontSize: '1.125rem',
            color: '#77716E',
            lineHeight: '1.6',
            marginBottom: '2rem'
          }}>
            Whether you're the US citizen or the foreign fiancé(e), answer a few questions about your
            relationship to see if you qualify for a K-1 fiancé visa, understand the requirements,
            estimated costs, and timeline.
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
              Personalized K-1 eligibility assessment, required documentation checklist,
              cost estimates, processing timeline, and guidance on your next steps.
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
            Takes about 2-3 minutes. Your answers are confidential.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function K1QuizContainer() {
  const [currentStep, setCurrentStep] = useState(STEPS.WELCOME);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [freeText, setFreeText] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Results data
  const [visaResults, setVisaResults] = useState(null);
  const [aiContent, setAiContent] = useState(null);

  // UTM and session tracking
  const [utmParams, setUtmParams] = useState({});
  const [sessionId, setSessionId] = useState('');

  // Get visible questions based on current answers
  const visibleQuestions = getVisibleK1Questions(answers);
  const currentQuestion = visibleQuestions[currentQuestionIndex];
  const totalQuestions = getTotalK1QuestionCount(answers);

  const handleStart = async () => {
    const session = generateSessionId();
    const utm = getUtmParams();

    setSessionId(session);
    setUtmParams(utm);

    await trackQuizStart(session, utm);

    setCurrentStep(STEPS.QUESTIONS);
  };

  const handleAnswer = (questionId, value, callback) => {
    setAnswers(prev => {
      const newAnswers = { ...prev, [questionId]: value };
      if (callback) {
        setTimeout(() => callback(newAnswers), 0);
      }
      return newAnswers;
    });
  };

  const handleNext = (updatedAnswers) => {
    const answersToUse = updatedAnswers || answers;

    setIsTransitioning(true);

    setTimeout(() => {
      const updatedVisibleQuestions = getVisibleK1Questions(answersToUse);
      const nextIndex = currentQuestionIndex + 1;

      if (nextIndex < updatedVisibleQuestions.length) {
        setCurrentQuestionIndex(nextIndex);
      } else {
        setCurrentStep(STEPS.FREE_TEXT);
      }

      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 300);
  };

  const handleBack = () => {
    if (currentStep === STEPS.EMAIL) {
      setCurrentStep(STEPS.FREE_TEXT);
    } else if (currentStep === STEPS.FREE_TEXT) {
      setCurrentStep(STEPS.QUESTIONS);
      setCurrentQuestionIndex(visibleQuestions.length - 1);
    } else if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleFreeTextNext = () => {
    setCurrentStep(STEPS.EMAIL);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setCurrentStep(STEPS.LOADING);

    try {
      // Calculate K-1 eligibility locally
      const calculatedResults = calculateK1Eligibility(answers);
      setVisaResults(calculatedResults);

      // Prepare assessment data for K-1
      const assessmentData = {
        email,
        session_id: sessionId,
        country_of_citizenship: null, // Not collected for K-1
        current_country: 'outside_us',
        current_visa_status: null,
        highest_degree: null,
        degree_field: null,
        years_experience: null,
        current_occupation: null,
        has_job_offer: false,
        employer_type: null,
        has_extraordinary_ability: false,
        additional_context: freeText || null,
        utm_source: utmParams?.utm_source || null,
        utm_campaign: utmParams?.utm_campaign || null,
        utm_content: utmParams?.utm_content || null,
        utm_term: utmParams?.utm_term || null,
        // K-1 specific data stored in additional_context or a future k1_data column
        k1_answers: JSON.stringify(answers)
      };

      // Try to generate AI content
      let aiResult = null;
      if (freeText && freeText.trim().length > 0) {
        try {
          aiResult = await generateAssessment({
            email,
            answers,
            freeText,
            visaResults: calculatedResults
          });

          if (!aiResult.rateLimited && aiResult.recommendations) {
            setAiContent(aiResult);
          }
        } catch (error) {
          console.error('AI assessment failed:', error);
        }
      }

      // Save to database (non-blocking - results still show if DB fails)
      assessmentData.ai_assessment = aiResult ? JSON.stringify(aiResult) : null;
      const { data: savedAssessment, error: saveError } = await saveAssessment(assessmentData);

      if (saveError) {
        console.warn('Database save failed, but showing results anyway:', saveError);
      }

      // Save visa results if assessment was saved
      if (!saveError && savedAssessment && calculatedResults.length > 0) {
        const visaResultsForDb = calculatedResults.map(result => ({
          visa_type_id: result.visaCode,
          eligibility_score: result.score,
          likelihood_rating: result.likelihood,
          estimated_processing_days: result.estimatedDays,
          estimated_total_cost: result.estimatedCost,
          key_strengths: result.strengths,
          key_challenges: result.challenges,
          is_recommended: true
        }));

        await saveVisaResults(savedAssessment.id, visaResultsForDb);
      }

      // Mark quiz as completed if we have an assessment
      if (!saveError && savedAssessment) {
        await markQuizCompleted(sessionId, savedAssessment.id);
      }

      // Send webhook
      if (calculatedResults.length > 0) {
        await sendWebhook({
          email,
          topVisa: 'k1',
          visaCount: 1,
          utmSource: utmParams.utm_source,
          utmCampaign: utmParams.utm_campaign
        });
      }

      setCurrentStep(STEPS.RESULTS);

    } catch (error) {
      console.error('Error submitting quiz:', error);
      alert('There was an error processing your assessment. Please try again.');
      setCurrentStep(STEPS.EMAIL);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render current step
  if (currentStep === STEPS.WELCOME) {
    return <K1Welcome onStart={handleStart} />;
  }

  if (currentStep === STEPS.QUESTIONS) {
    // Get dynamic question text based on user's role
    const questionWithDynamicText = {
      ...currentQuestion,
      text: getQuestionText(currentQuestion, answers)
    };

    return (
      <div className="min-h-screen" style={{ backgroundColor: '#EFEDEC' }}>
        <div className={`transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
          <ProgressBar current={currentQuestionIndex + 1} total={totalQuestions + 2} />
          <Question
            question={questionWithDynamicText}
            value={answers[currentQuestion.id]}
            onChange={(value, callback) => handleAnswer(currentQuestion.id, value, callback)}
            onNext={handleNext}
            onBack={handleBack}
            showBack={currentQuestionIndex > 0}
            current={currentQuestionIndex + 1}
            total={totalQuestions}
            hideTotal={true}
            onTransitionStart={() => setIsTransitioning(true)}
          />
        </div>
      </div>
    );
  }

  if (currentStep === STEPS.FREE_TEXT) {
    return (
      <>
        <ProgressBar current={totalQuestions + 1} total={totalQuestions + 2} />
        <FreeTextInput
          value={freeText}
          onChange={setFreeText}
          onNext={handleFreeTextNext}
          onBack={handleBack}
          placeholder="Tell us more about your relationship, how you met, any concerns about the process, or questions you have..."
        />
      </>
    );
  }

  if (currentStep === STEPS.EMAIL) {
    return (
      <>
        <ProgressBar current={totalQuestions + 2} total={totalQuestions + 2} />
        <EmailCapture
          value={email}
          onChange={setEmail}
          onSubmit={handleSubmit}
          onBack={handleBack}
          isSubmitting={isSubmitting}
        />
      </>
    );
  }

  if (currentStep === STEPS.LOADING) {
    return <LoadingScreen />;
  }

  if (currentStep === STEPS.RESULTS) {
    return (
      <Results
        visaResults={visaResults}
        aiContent={aiContent}
        isK1={true}
      />
    );
  }

  return null;
}
