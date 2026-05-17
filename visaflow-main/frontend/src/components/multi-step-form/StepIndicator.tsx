import { cn } from "~/utils/cn";
import type { StepConfig } from "./types";

interface StepIndicatorProps {
  steps: StepConfig[];
  currentStep: number;
  completedSteps: Set<number>;
  onStepClick?: (index: number) => void;
  className?: string;
}

export function StepIndicator({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
  className,
}: StepIndicatorProps) {
  return (
    <nav aria-label="Form progress" className={className}>
      <ol className="flex flex-col">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.has(index);
          const isClickable = true;
          const isLastStep = index === steps.length - 1;
          const isPastOrCurrent = index <= currentStep;
          const isPastCompleted = index < currentStep && isCompleted;

          return (
            <li key={step.id} className="relative">
              {/* Vertical connector line - positioned absolutely behind the circle */}
              {!isLastStep && (
                <div
                  className={cn(
                    "absolute left-4 top-10 -bottom-2 w-0.5 -translate-x-1/2",
                    isPastCompleted ? "bg-primary-600" : "bg-gray-300"
                  )}
                />
              )}

              <button
                type="button"
                onClick={() => onStepClick?.(index)}
                disabled={!isClickable}
                className={cn(
                  "relative flex items-start w-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-lg py-2",
                  "cursor-pointer"
                )}
              >
                {/* Circle with number */}
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors shrink-0",
                    isPastOrCurrent && "bg-primary-600 text-white",
                    !isPastOrCurrent && "bg-gray-200 text-gray-500"
                  )}
                >
                  {index + 1}
                </span>

                {/* Step title */}
                <span className="mt-1.5 ml-3 text-sm font-medium text-gray-900 text-left">
                  {step.title}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
