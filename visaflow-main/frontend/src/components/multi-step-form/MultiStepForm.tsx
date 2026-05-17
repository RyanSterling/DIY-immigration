import { forwardRef, useImperativeHandle, useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import Button from "~/atoms/Button";
import { cn } from "~/utils/cn";
import { StepIndicator } from "./StepIndicator";
import { StepContent } from "./StepContent";
import { useFormNavigation } from "./useFormNavigation";
import type { MultiStepFormProps, FormData } from "./types";

export interface MultiStepFormRef {
  setValue: (name: string, value: unknown) => void;
  getValues: () => FormData;
}

export const MultiStepForm = forwardRef<MultiStepFormRef, MultiStepFormProps>(
  function MultiStepForm(
    {
      config,
      initialData = {},
      onSave,
      onSubmit,
      onStepChange,
      onChange,
      stepParamKey = "step",
      initialCompletedSteps,
      isSaving = false,
      className,
    },
    ref
  ) {
    const methods = useForm<FormData>({
      defaultValues: initialData,
    });

    useImperativeHandle(ref, () => ({
      setValue: methods.setValue,
      getValues: methods.getValues,
    }));

    // Reset form when initialData changes (e.g., when client data loads for autofill)
    useEffect(() => {
      console.log("[DEBUG] MultiStepForm useEffect - initialData:", initialData);
      if (initialData && Object.keys(initialData).length > 0) {
        console.log("[DEBUG] Calling methods.reset with:", initialData);
        methods.reset(initialData);
      }
    }, [initialData, methods]);

    // Watch for form changes and notify parent
    useEffect(() => {
      if (!onChange) return;
      const subscription = methods.watch(() => {
        onChange();
      });
      return () => subscription.unsubscribe();
    }, [methods, onChange]);

  const {
    currentStep,
    isFirstStep,
    isLastStep,
    completedSteps,
    goToStep,
    goToNextStep,
    goToPreviousStep,
    markStepCompleted,
  } = useFormNavigation({
    steps: config.steps,
    stepParamKey,
    initialCompletedSteps,
    onStepChange,
  });

  const currentStepConfig = config.steps[currentStep];
  const totalSteps = config.steps.length;

  const handleSave = async () => {
    const data = methods.getValues();
    await onSave(data, currentStep);
  };

  const handleNext = () => {
    // Mark current step as completed when moving forward
    markStepCompleted(currentStep);

    if (isLastStep) {
      methods.handleSubmit(async (data) => {
        await onSubmit(data);
      })();
    } else {
      goToNextStep();
    }
  };

  const handleStepClick = (index: number) => {
    // Mark current step as completed if moving forward
    if (index > currentStep) {
      markStepCompleted(currentStep);
    }
    goToStep(index);
  };

  return (
    <FormProvider {...methods}>
      <div className={cn("flex gap-8 min-h-[85vh]", className)}>
        {/* Main content area */}
        <div className="flex-1 flex flex-col mt-10">
          {/* Step counter */}

          <span className="text-sm font-bold text-primary-600 mb-2">
            Step {currentStep + 1}/{totalSteps}
          </span>

          {currentStepConfig.title && (
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              {currentStepConfig.title}
            </h3>
          )}

          {/* Step content */}
          <StepContent step={currentStepConfig} />
        </div>

        {/* Sidebar */}
        <div className="w-72 shrink-0 flex flex-col mt-10 border-l pl-8 border-gray-200">
          {/* Form title */}
          {config.title && (
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {config.title}
            </h2>
          )}

          {/* Step indicator */}
          <StepIndicator
            steps={config.steps}
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepClick={handleStepClick}
            className="mb-auto"
          />

          {/* Navigation buttons */}
          <div className="flex items-center pt-6 mt-4 gap-2">
            {isFirstStep ? (
              <span className="flex-1 px-4" />
            ) : (
              <Button
                type="button"
                variant={currentStepConfig.prevButton?.variant ?? "outline"}
                onClick={goToPreviousStep}
                disabled={isSaving}
                fullWidth
              >
                {currentStepConfig.prevButton?.label ?? "Back"}
              </Button>
            )}

            {config.saveButton?.hidden !== true && (
              <Button
                type="button"
                variant={config.saveButton?.variant ?? "secondary"}
                onClick={handleSave}
                isLoading={isSaving}
                fullWidth
              >
                {config.saveButton?.label ?? "Save"}
              </Button>
            )}

            <Button
              type="button"
              fullWidth
              variant={
                isLastStep
                  ? config.submitButton?.variant ?? "primary"
                  : currentStepConfig.nextButton?.variant ?? "primary"
              }
              onClick={handleNext}
              disabled={isSaving}
            >
              {isLastStep
                ? config.submitButton?.label ?? "Complete"
                : currentStepConfig.nextButton?.label ?? "Next"}
            </Button>
          </div>
        </div>
      </div>
    </FormProvider>
  );
  }
);
