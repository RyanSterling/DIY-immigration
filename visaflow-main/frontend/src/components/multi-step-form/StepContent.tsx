import { cn } from "~/utils/cn";
import { FieldRenderer } from "./FieldRenderer";
import { useConditionalFields } from "./useConditionalFields";
import type { StepConfig } from "./types";

interface StepContentProps {
  step: StepConfig;
  className?: string;
}

export function StepContent({ step, className }: StepContentProps) {
  const { isFieldVisible } = useConditionalFields(step.fields);

  // Width to col-span mapping (12-column grid)
  const widthToColSpan: Record<string, string> = {
    "1-1": "col-span-12", // 12/12 = 100%
    "1-2": "col-span-6", // 6/12 = 50%
    "1-3": "col-span-4", // 4/12 = 33.3%
    "1-4": "col-span-3", // 3/12 = 25%
  };

  return (
    <div className={className}>
      {/* Step description */}
      {step.description && (
        <p className="mb-6 font-semibold text-gray-900 text-lg">
          {step.description}
        </p>
      )}

      {/* Fields */}
      <div className="grid grid-cols-12 gap-6">
        {step.fields.map((field) => (
          <div
            key={field.name}
            className={cn(
              widthToColSpan[field.width ?? "1-1"],
              !isFieldVisible(field.name) && "hidden"
            )}
          >
            <FieldRenderer field={field} />
          </div>
        ))}
      </div>
    </div>
  );
}
