import { useState, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FormProvider, useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import Button from "~/atoms/Button";
import { StepIndicator } from "~/components/multi-step-form/StepIndicator";
import { useClients } from "~/hooks/useClients";
import { usePendingDocuments } from "~/hooks/usePendingDocuments";
import { useClientFieldValues } from "~/hooks/useClientFieldValues";
import ClientNewDocuments from "./ClientNewDocuments";
import ClientNewDetails from "./ClientNewDetails";
import {
  STEPS,
  type ClientNewFormData,
  type FieldValueSelection,
} from "./types";

/**
 * Check if any field has an unresolved conflict (has conflict but no selection made).
 */
function hasUnresolvedConflicts(
  fieldSelections: Record<string, FieldValueSelection>
): boolean {
  return Object.values(fieldSelections).some(
    (selection) =>
      selection?.hasConflict &&
      selection.selectedValueId === null &&
      !selection.useManual &&
      !selection.noValueNeeded
  );
}

export default function ClientNew() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  const { useCreate } = useClients();
  const { useAssignClient } = usePendingDocuments();
  const { useBulkCreate } = useClientFieldValues();

  const createMutation = useCreate();
  const assignClientMutation = useAssignClient();
  const bulkCreateFieldValuesMutation = useBulkCreate();

  // Form setup
  const methods = useForm<ClientNewFormData>({
    defaultValues: {
      documents: [],
      uploadedDocumentIds: [],
      fieldSelections: {},
      email: "",
      phone: "",
      address: "",
    },
  });

  // Step navigation from URL
  const currentStep = useMemo(() => {
    const stepParam = searchParams.get("step");
    if (stepParam === null) return 0;
    const parsed = parseInt(stepParam, 10);
    if (isNaN(parsed) || parsed < 0 || parsed >= STEPS.length) return 0;
    return parsed;
  }, [searchParams]);

  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === STEPS.length - 1;

  // Navigation helpers
  const goToStep = useCallback(
    (index: number) => {
      if (index < 0 || index >= STEPS.length) return;
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (index === 0) {
            next.delete("step");
          } else {
            next.set("step", index.toString());
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const markStepCompleted = useCallback((index: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  }, []);

  const handleNext = useCallback(() => {
    markStepCompleted(currentStep);
    if (!isLastStep) {
      goToStep(currentStep + 1);
    }
  }, [currentStep, isLastStep, goToStep, markStepCompleted]);

  const handlePrevious = useCallback(() => {
    if (!isFirstStep) {
      goToStep(currentStep - 1);
    }
  }, [currentStep, isFirstStep, goToStep]);

  const handleStepClick = useCallback(
    (index: number) => {
      // Allow clicking completed steps or current/previous steps
      if (completedSteps.has(index) || index <= currentStep) {
        goToStep(index);
      }
    },
    [completedSteps, currentStep, goToStep]
  );

  /**
   * Prepare field values for bulk creation from field selections.
   * Only includes manual entries - extraction values are already created by assign-client endpoint.
   */
  const prepareFieldValues = (
    fieldSelections: Record<string, FieldValueSelection>
  ) => {
    const values: Array<{
      canonicalField: string;
      rawValue: string;
      valueType?: "text" | "date" | "number" | "boolean" | "country";
      normalizedValue?: unknown;
      source?: "document_extraction" | "user_edit";
      documentId?: string;
      setActive: boolean;
    }> = [];

    for (const [canonicalField, selection] of Object.entries(fieldSelections)) {
      // Skip fields marked as "no value needed" - don't create any record
      if (selection.noValueNeeded) {
        continue;
      }

      // Only include manual entries - extraction values are created by assign-client
      if (selection.useManual) {
        const manualValue = selection.manualValue?.trim();
        if (manualValue) {
          values.push({
            canonicalField,
            rawValue: manualValue,
            valueType: "text",
            normalizedValue: {
              display: manualValue,
              original: manualValue,
            },
            source: "user_edit",
            setActive: true,
          });
        }
      }
      // Skip extraction selections - already handled by assign-client endpoint
    }

    return values;
  };

  // Handle form submission
  const handleSubmit = methods.handleSubmit(async (data) => {
    try {
      // 1. Create the client (minimal data - clients table is just an identity container)
      const client = await createMutation.mutateAsync({});
      const clientId = client.id;

      // 2. If there are uploaded documents, assign them to the client
      if (data.uploadedDocumentIds.length > 0) {
        await assignClientMutation.mutateAsync({
          documentIds: data.uploadedDocumentIds,
          clientId,
        });
      }

      // 3. Save field values from selections
      const fieldValues = prepareFieldValues(data.fieldSelections);

      // Also add contact fields (manual entry with normalized value for consistency)
      if (data.email?.trim()) {
        const emailValue = data.email.trim();
        fieldValues.push({
          canonicalField: "email",
          rawValue: emailValue,
          valueType: "text",
          normalizedValue: { display: emailValue, original: emailValue },
          source: "user_edit",
          setActive: true,
        });
      }
      if (data.phone?.trim()) {
        const phoneValue = data.phone.trim();
        fieldValues.push({
          canonicalField: "phone",
          rawValue: phoneValue,
          valueType: "text",
          normalizedValue: { display: phoneValue, original: phoneValue },
          source: "user_edit",
          setActive: true,
        });
      }
      if (data.address?.trim()) {
        const addressValue = data.address.trim();
        fieldValues.push({
          canonicalField: "address",
          rawValue: addressValue,
          valueType: "text",
          normalizedValue: { display: addressValue, original: addressValue },
          source: "user_edit",
          setActive: true,
        });
      }

      if (fieldValues.length > 0) {
        await bulkCreateFieldValuesMutation.mutateAsync({
          clientId,
          values: fieldValues,
        });
      }

      // Invalidate clients cache after all operations complete
      await queryClient.invalidateQueries({ queryKey: ["clients"] });

      navigate(`/clients/${clientId}`);
    } catch (error) {
      console.error("Error creating client:", error);
    }
  });

  const isSaving =
    createMutation.isPending ||
    bulkCreateFieldValuesMutation.isPending ||
    isProcessing;

  // Watch field selections for conflict validation
  const fieldSelections = methods.watch("fieldSelections");
  const hasConflictsToResolve = useMemo(
    () => hasUnresolvedConflicts(fieldSelections || {}),
    [fieldSelections]
  );

  // Get current step config
  const currentStepConfig = STEPS[currentStep];

  return (
    <div className="max-w-5xl mx-auto h-full">
      <FormProvider {...methods}>
        <div className="flex gap-8 min-h-[85vh]">
          {/* Main content area */}
          <div className="flex-1 flex flex-col mt-10">
            {/* Step counter */}
            <span className="text-sm font-bold text-primary-600 mb-2">
              Step {currentStep + 1}/{STEPS.length}
            </span>

            {currentStepConfig.title && (
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                {currentStepConfig.title}
              </h3>
            )}

            {/* Step content */}
            <div className="mt-4">
              {currentStep === 0 && (
                <ClientNewDocuments onProcessingChange={setIsProcessing} />
              )}
              {currentStep === 1 && <ClientNewDetails />}
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-72 shrink-0 flex flex-col mt-10 border-l pl-8 border-gray-200">
            {/* Form title */}
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              New Client
            </h2>

            {/* Step indicator */}
            <StepIndicator
              steps={STEPS}
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
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={isSaving}
                  fullWidth
                >
                  Back
                </Button>
              )}

              {isLastStep ? (
                <div className="flex-1 flex flex-col">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleSubmit}
                    disabled={isSaving || hasConflictsToResolve}
                    isLoading={createMutation.isPending}
                    fullWidth
                  >
                    Create
                  </Button>
                  {hasConflictsToResolve && (
                    <p className="text-xs text-amber-600 mt-1 text-center">
                      Resolve all conflicts to create client
                    </p>
                  )}
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleNext}
                  disabled={isSaving}
                  fullWidth
                >
                  Next
                </Button>
              )}
            </div>
          </div>
        </div>
      </FormProvider>

      {createMutation.isError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">
            Failed to create client. Please try again.
          </p>
        </div>
      )}
    </div>
  );
}
