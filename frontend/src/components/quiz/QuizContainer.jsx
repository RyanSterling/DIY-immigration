import { useState } from 'react';
import Welcome from './Welcome';
import Question from './Question';
import ProgressBar from './ProgressBar';
import FreeTextInput from './FreeTextInput';
import EmailCapture from './EmailCapture';
import LoadingScreen from './LoadingScreen';
import Results from './Results';
import { QUESTIONS, getVisibleQuestions, getTotalQuestionCount } from '../../data/questions';
import { calculateVisaEligibility, prepareAssessmentData } from '../../lib/scoring';
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

export default function QuizContainer() {
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
  const visibleQuestions = getVisibleQuestions(answers);
  const currentQuestion = visibleQuestions[currentQuestionIndex];
  const totalQuestions = getTotalQuestionCount(answers);

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
      const updatedVisibleQuestions = getVisibleQuestions(answersToUse);
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
      // Calculate visa eligibility locally
      const calculatedResults = calculateVisaEligibility(answers);
      setVisaResults(calculatedResults);

      // Prepare assessment data
      const assessmentData = prepareAssessmentData(answers, email, freeText, utmParams);

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
          is_recommended: result === calculatedResults[0]
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
          topVisa: calculatedResults[0].visaCode,
          visaCount: calculatedResults.length,
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
    return <Welcome onStart={handleStart} />;
  }

  if (currentStep === STEPS.QUESTIONS) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#EFEDEC' }}>
        <div className={`transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
          <ProgressBar current={currentQuestionIndex + 1} total={totalQuestions + 2} />
          <Question
            question={currentQuestion}
            value={answers[currentQuestion.id]}
            onChange={(value, callback) => handleAnswer(currentQuestion.id, value, callback)}
            onNext={handleNext}
            onBack={handleBack}
            showBack={currentQuestionIndex > 0}
            current={currentQuestionIndex + 1}
            total={totalQuestions}
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
      />
    );
  }

  return null;
}
