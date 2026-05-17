import { useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { StepConfig } from './types';

interface UseFormNavigationOptions {
  steps: StepConfig[];
  /** URL search param key for storing the current step (default: 'step') */
  stepParamKey?: string;
  initialCompletedSteps?: Set<number>;
  onStepChange?: (stepIndex: number) => void;
}

interface UseFormNavigationReturn {
  currentStep: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  completedSteps: Set<number>;
  goToStep: (index: number) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  markStepCompleted: (index: number) => void;
  markStepIncomplete: (index: number) => void;
  canNavigateToStep: (index: number) => boolean;
  getFirstIncompleteRequiredStep: (targetIndex: number) => number | null;
  totalSteps: number;
}

export function useFormNavigation({
  steps,
  stepParamKey = 'step',
  initialCompletedSteps,
  onStepChange,
}: UseFormNavigationOptions): UseFormNavigationReturn {
  const [searchParams, setSearchParams] = useSearchParams();
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(
    initialCompletedSteps ?? new Set()
  );

  const totalSteps = steps.length;

  // Get current step from URL, default to 0
  const currentStep = useMemo(() => {
    const stepParam = searchParams.get(stepParamKey);
    if (stepParam === null) {
      return 0;
    }
    const parsed = parseInt(stepParam, 10);
    if (isNaN(parsed) || parsed < 0 || parsed >= totalSteps) {
      return 0;
    }
    return parsed;
  }, [searchParams, stepParamKey, totalSteps]);

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  /**
   * Update the URL with the new step index
   */
  const setCurrentStep = useCallback(
    (index: number) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (index === 0) {
            // Remove param when at first step for cleaner URLs
            next.delete(stepParamKey);
          } else {
            next.set(stepParamKey, index.toString());
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams, stepParamKey]
  );

  /**
   * Get the first incomplete required step before the target index.
   * Returns null if all previous required steps are complete.
   */
  const getFirstIncompleteRequiredStep = useCallback(
    (targetIndex: number): number | null => {
      for (let i = 0; i < targetIndex; i++) {
        const step = steps[i];
        if (step.required && !completedSteps.has(i)) {
          return i;
        }
      }
      return null;
    },
    [steps, completedSteps]
  );

  /**
   * Check if navigation to the target step is allowed.
   * Navigation is allowed if all previous required steps are complete.
   */
  const canNavigateToStep = useCallback(
    (targetIndex: number): boolean => {
      if (targetIndex < 0 || targetIndex >= totalSteps) {
        return false;
      }

      // Can always go back to a completed step or the current step
      if (targetIndex <= currentStep || completedSteps.has(targetIndex)) {
        return true;
      }

      // Check if all previous required steps are complete
      return getFirstIncompleteRequiredStep(targetIndex) === null;
    },
    [currentStep, completedSteps, totalSteps, getFirstIncompleteRequiredStep]
  );

  /**
   * Navigate to a specific step.
   */
  const goToStep = useCallback(
    (targetIndex: number) => {
      if (targetIndex < 0 || targetIndex >= totalSteps) {
        return;
      }

      setCurrentStep(targetIndex);
      onStepChange?.(targetIndex);
    },
    [totalSteps, setCurrentStep, onStepChange]
  );

  const goToNextStep = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      const nextStep = currentStep + 1;
      goToStep(nextStep);
    }
  }, [currentStep, totalSteps, goToStep]);

  const goToPreviousStep = useCallback(() => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      onStepChange?.(prevStep);
    }
  }, [currentStep, setCurrentStep, onStepChange]);

  const markStepCompleted = useCallback((index: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  }, []);

  const markStepIncomplete = useCallback((index: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  }, []);

  return useMemo(
    () => ({
      currentStep,
      isFirstStep,
      isLastStep,
      completedSteps,
      goToStep,
      goToNextStep,
      goToPreviousStep,
      markStepCompleted,
      markStepIncomplete,
      canNavigateToStep,
      getFirstIncompleteRequiredStep,
      totalSteps,
    }),
    [
      currentStep,
      isFirstStep,
      isLastStep,
      completedSteps,
      goToStep,
      goToNextStep,
      goToPreviousStep,
      markStepCompleted,
      markStepIncomplete,
      canNavigateToStep,
      getFirstIncompleteRequiredStep,
      totalSteps,
    ]
  );
}
