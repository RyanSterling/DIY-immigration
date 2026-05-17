import { Link, useParams, useBlocker, useSearchParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "react-toastify";
import { MultiStepForm } from "~/components/multi-step-form";
import type { MultiStepFormRef } from "~/components/multi-step-form/MultiStepForm";
import type {
  MultiStepFormConfig,
  StepConfig,
  FieldConfig,
  ConditionalRule,
} from "~/components/multi-step-form/types";
import {
  useFormTemplates,
  usePdfTemplateUrl,
  type FormTemplateDetail,
  type FormSection,
  type FormField,
} from "~/hooks/useFormTemplates";
import { useFormInstance, useFormInstanceMutations } from "~/hooks/useFormInstancesApi";
import { useClients } from "~/hooks/useClients";
import Button from "~/atoms/Button";
import Spinner from "~/atoms/Spinner";
import { buildAutofillData } from "~/lib/form-utils";
import { PDFReviewStep } from "~/components/pdf-review/PDFReviewStep";

/**
 * Transform API template response to MultiStepFormConfig format
 */
function transformTemplateToConfig(
  template: FormTemplateDetail
): MultiStepFormConfig {
  return {
    id: template.id,
    title: template.title,
    steps: template.sections.map((section) => transformSection(section)),
  };
}

/**
 * Transform API section to StepConfig
 */
function transformSection(section: FormSection): StepConfig {
  return {
    id: section.sectionKey,
    title: section.title,
    description: section.description ?? undefined,
    helpText: section.helpText ?? undefined,
    required: section.isRequired,
    fields: section.fields.map((field) => transformField(field)),
    ...(section.buttonConfig
      ? {
          nextButton: (section.buttonConfig as { nextButton?: unknown })
            .nextButton as StepConfig["nextButton"],
          prevButton: (section.buttonConfig as { prevButton?: unknown })
            .prevButton as StepConfig["prevButton"],
        }
      : {}),
  };
}

/**
 * Transform API field to FieldConfig
 */
function transformField(field: FormField): FieldConfig {
  // Cast showWhen to ConditionalRule[] - the API returns value as unknown but it's always compatible
  const showWhen: ConditionalRule[] | undefined = field.showWhen?.map((rule) => ({
    field: rule.field,
    operator: rule.operator,
    value: rule.value as ConditionalRule["value"],
  })) ?? undefined;

  const baseConfig = {
    name: field.name,
    label: field.label,
    placeholder: field.placeholder ?? undefined,
    helpText: field.helpText ?? undefined,
    defaultValue: field.defaultValue ?? undefined,
    disabled: field.disabled,
    hideLabel: field.hideLabel,
    className: field.className ?? undefined,
    width: field.width as FieldConfig["width"],
    showWhen,
  };

  // Get type-specific config from fieldConfig
  const fieldConfig = field.fieldConfig ?? {};

  switch (field.fieldType) {
    case "textarea":
      return {
        ...baseConfig,
        type: "textarea",
        rows: (fieldConfig as { rows?: number }).rows,
      };
    case "select":
      return {
        ...baseConfig,
        type: "select",
        options: field.options ?? [],
        allowEmpty: (fieldConfig as { allowEmpty?: boolean }).allowEmpty,
        emptyOptionLabel: (fieldConfig as { emptyOptionLabel?: string })
          .emptyOptionLabel,
      };
    case "checkbox":
      return {
        ...baseConfig,
        type: "checkbox",
        options: field.options ?? undefined,
      };
    case "radio":
      return {
        ...baseConfig,
        type: "radio",
        options: field.options ?? [],
        direction: (fieldConfig as { direction?: "horizontal" | "vertical" })
          .direction,
      };
    case "date":
      return {
        ...baseConfig,
        type: "date",
        minDate: (fieldConfig as { minDate?: string }).minDate,
        maxDate: (fieldConfig as { maxDate?: string }).maxDate,
      };
    case "file":
      return {
        ...baseConfig,
        type: "file",
        accept: (fieldConfig as { accept?: Record<string, string[]> }).accept,
        maxSizeMb: (fieldConfig as { maxSizeMb?: number }).maxSizeMb,
        maxFiles: (fieldConfig as { maxFiles?: number }).maxFiles,
      };
    default:
      return {
        ...baseConfig,
        type: field.fieldType as "text" | "email" | "phone" | "number",
      };
  }
}

/**
 * Transform instance responses to flat FormData
 */
function responsesToFormData(
  responses: Record<
    string,
    { value: string | null; version: number; formFieldId: string }
  >
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const [fieldName, response] of Object.entries(responses)) {
    if (response.value !== null) {
      // Try to parse JSON values (arrays, objects)
      try {
        data[fieldName] = JSON.parse(response.value);
      } catch {
        data[fieldName] = response.value;
      }
    }
  }
  return data;
}

/**
 * Build field name to ID mapping from template
 */
function buildFieldIdMap(
  template: FormTemplateDetail
): Map<string, string> {
  const map = new Map<string, string>();
  for (const section of template.sections) {
    for (const field of section.fields) {
      map.set(field.name, field.id);
    }
  }
  return map;
}

export default function FormInstance() {
  const { templateId, instanceId } = useParams<{
    templateId: string;
    instanceId: string;
  }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Form ref for bidirectional sync with PDF editor
  const formRef = useRef<MultiStepFormRef>(null);

  // For new forms, track the instance ID once created
  const [createdInstanceId, setCreatedInstanceId] = useState<string | null>(null);

  // PDF Review mode is URL-controlled via ?step=review
  const stepParam = searchParams.get("step");
  const isPdfReviewMode = stepParam === "review";

  // Ref to store form data for PDF review mode (used when RHF form is unmounted)
  const currentFormDataRef = useRef<Record<string, unknown>>({});

  // State to track PDF edits for sync back to form when returning from PDF review
  const [pdfEdits, setPdfEdits] = useState<Record<string, unknown>>({});

  // Determine if this is a new (unsaved) form
  const isNewForm = instanceId === "new";
  // For new forms, get clientId from URL params; for existing forms, get from instance
  const urlClientId = searchParams.get("clientId");

  // Fetch template from API
  const { useGet: useGetTemplate } = useFormTemplates();
  const {
    data: template,
    isLoading: isTemplateLoading,
    isError: isTemplateError,
  } = useGetTemplate(templateId);

  // Fetch instance from API (skip for new forms or if we just created one)
  const effectiveInstanceId = createdInstanceId ?? (isNewForm ? undefined : instanceId);
  const {
    data: instance,
    isLoading: isInstanceLoading,
    isError: isInstanceError,
  } = useFormInstance(effectiveInstanceId);

  // Get mutations
  const {
    createMutation,
    saveResponsesMutation,
    updateMutation,
    generatePdfMutation,
  } = useFormInstanceMutations();

  // Fetch PDF template URL for client-side filling (only when in review mode)
  const { data: pdfTemplateData, isLoading: isPdfTemplateLoading } = usePdfTemplateUrl(
    isPdfReviewMode ? templateId : undefined
  );

  // Get client data for autofill
  // For new forms use URL param, for existing forms use instance's clientId
  const { useGet: useGetClient } = useClients();
  const clientIdToFetch = isNewForm ? urlClientId : instance?.clientId;
  const { data: client, isLoading: isClientLoading } = useGetClient(
    clientIdToFetch ?? undefined
  );

  // Transform template to MultiStepFormConfig
  const formConfig = useMemo(() => {
    if (!template) return null;
    return transformTemplateToConfig(template);
  }, [template]);

  // Build field name -> field ID map
  const fieldIdMap = useMemo(() => {
    if (!template) return new Map<string, string>();
    return buildFieldIdMap(template);
  }, [template]);

  // Determine if form has saved data (not a new/unsaved form)
  const hasSavedData = useMemo(() => {
    // New forms that haven't been saved yet don't have saved data
    if (isNewForm && !createdInstanceId) return false;
    return instance?.responses && Object.keys(instance.responses).length > 0;
  }, [isNewForm, createdInstanceId, instance?.responses]);

  // Transform instance responses to flat form data
  // For saved forms, use only saved responses (skip autofill computation)
  // For new/unsaved forms, build autofill from client's active values
  const initialData = useMemo(() => {
    if (!template) return undefined;

    let baseData: Record<string, unknown>;

    // For saved forms, use only saved responses (no prefill needed)
    if (hasSavedData) {
      baseData = responsesToFormData(instance!.responses);
    } else {
      // For new/unsaved forms, build autofill from client's active values
      baseData = client?.activeValues
        ? buildAutofillData(template.sections, client.activeValues)
        : {};
    }

    // Merge PDF edits on top of base data (for bidirectional sync)
    return {
      ...baseData,
      ...pdfEdits,
    };
  }, [template, client?.activeValues, instance?.responses, hasSavedData, pdfEdits]);

  // Block navigation when form has unsaved changes
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (!isDirty) {
      return false;
    }
    // Same pathname = step change only, allow it
    if (currentLocation.pathname === nextLocation.pathname) {
      return false;
    }
    // Different pathname = leaving page, block if dirty
    return true;
  });

  // Handle browser/tab close with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Handle react-router navigation blocking
  useEffect(() => {
    if (blocker.state === "blocked") {
      const confirmLeave = window.confirm(
        "You have unsaved changes. Are you sure you want to leave?"
      );
      if (confirmLeave) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker]);

  // Handle form data change (marks form as dirty)
  const handleChange = useCallback(() => {
    setIsDirty(true);
  }, []);

  // Get client display name
  const getClientName = useCallback(() => {
    if (!client?.activeValues) return null;
    const firstName = client.activeValues.first_name?.rawValue || "";
    const lastName = client.activeValues.last_name?.rawValue || "";
    const name = [firstName, lastName].filter(Boolean).join(" ");
    return name || null;
  }, [client]);

  // Handle save
  const handleSave = useCallback(
    async (data: Record<string, unknown>) => {
      if (!templateId) return;

      setIsSaving(true);
      try {
        // Convert form data to API format
        const responses = Object.entries(data)
          .filter(([fieldName]) => fieldIdMap.has(fieldName))
          .map(([fieldName, value]) => ({
            formFieldId: fieldIdMap.get(fieldName)!,
            value:
              value === undefined || value === null || value === ""
                ? null
                : typeof value === "object"
                  ? JSON.stringify(value)
                  : String(value),
          }));

        // Determine the instance ID to save to
        let targetInstanceId = createdInstanceId ?? (isNewForm ? null : instanceId);

        // For new forms, create the instance first
        if (!targetInstanceId && isNewForm && urlClientId) {
          const newInstance = await createMutation.mutateAsync({
            formTemplateId: templateId,
            clientId: urlClientId,
          });
          targetInstanceId = newInstance.id;
          setCreatedInstanceId(newInstance.id);
          // Update URL to reflect the real instance ID
          navigate(`/forms/${templateId}/${newInstance.id}`, { replace: true });
        }

        if (!targetInstanceId) {
          toast.error("Cannot save: missing form instance");
          return;
        }

        await saveResponsesMutation.mutateAsync({
          id: targetInstanceId,
          responses,
        });
        setIsDirty(false);
        setPdfEdits({});
        toast.success("Form saved");
      } catch {
        // Error handled by mutation's onError
      } finally {
        setIsSaving(false);
      }
    },
    [templateId, instanceId, fieldIdMap, saveResponsesMutation, isNewForm, urlClientId, createdInstanceId, createMutation, navigate]
  );

  // Handle complete (transition to PDF review)
  const handleComplete = useCallback(
    async (data: Record<string, unknown>) => {
      if (!templateId || !template) return;

      setIsSaving(true);
      try {
        // Save responses first
        const responses = Object.entries(data)
          .filter(([fieldName]) => fieldIdMap.has(fieldName))
          .map(([fieldName, value]) => ({
            formFieldId: fieldIdMap.get(fieldName)!,
            value:
              value === undefined || value === null || value === ""
                ? null
                : typeof value === "object"
                  ? JSON.stringify(value)
                  : String(value),
          }));

        // Determine the instance ID to save to
        let targetInstanceId = createdInstanceId ?? (isNewForm ? null : instanceId);

        // For new forms, create the instance first
        if (!targetInstanceId && isNewForm && urlClientId) {
          const newInstance = await createMutation.mutateAsync({
            formTemplateId: templateId,
            clientId: urlClientId,
          });
          targetInstanceId = newInstance.id;
          setCreatedInstanceId(newInstance.id);
          // Update URL to reflect the real instance ID (will add ?step=review below)
          navigate(`/forms/${templateId}/${newInstance.id}?step=review`, { replace: true });
          // Store form data for PDF review (RHF form will unmount)
          currentFormDataRef.current = { ...data };
          setIsDirty(false);
          return; // Navigation handles the transition
        }

        if (!targetInstanceId) {
          toast.error("Cannot complete: missing form instance");
          return;
        }

        await saveResponsesMutation.mutateAsync({
          id: targetInstanceId,
          responses,
        });

        // Store current form data for PDF review (RHF form will unmount)
        currentFormDataRef.current = { ...data };

        // Transition to PDF review mode via URL
        setSearchParams({ step: "review" });
        setIsDirty(false);
      } catch {
        // Error handled by mutation's onError
      } finally {
        setIsSaving(false);
      }
    },
    [templateId, template, instanceId, fieldIdMap, saveResponsesMutation, isNewForm, urlClientId, createdInstanceId, createMutation, navigate, setSearchParams]
  );

  // Handle back from PDF review to form editing
  const handleBackToForm = useCallback(() => {
    // Navigate to the last form step
    const lastStepIndex = template?.sections ? template.sections.length - 1 : 0;
    setSearchParams({ step: lastStepIndex.toString() });
  }, [template?.sections, setSearchParams]);

  // Handle form data changes from PDF edits (bidirectional sync with RHF)
  const handlePdfFormDataChange = useCallback((updates: Record<string, unknown>) => {
    // Update RHF form state if form is mounted
    for (const [fieldName, value] of Object.entries(updates)) {
      formRef.current?.setValue(fieldName, value);
    }
    // Also update our ref (used when form is unmounted during PDF review)
    currentFormDataRef.current = {
      ...currentFormDataRef.current,
      ...updates,
    };
    // Update state so initialData can pick up changes when form remounts
    setPdfEdits(prev => ({
      ...prev,
      ...updates,
    }));
    // Mark as dirty so changes get saved
    setIsDirty(true);
  }, []);

  // Handle PDF generation via backend (for server-side XFA form filling)
  const handleGeneratePdf = useCallback(async () => {
    const targetInstanceId = createdInstanceId ?? instanceId;
    if (!targetInstanceId || targetInstanceId === "new") {
      throw new Error("Cannot generate PDF for unsaved form");
    }

    const result = await generatePdfMutation.mutateAsync({
      id: targetInstanceId,
      type: "review",
    });

    return {
      pdfUrl: result.pdfUrl,
      fileName: result.fileName,
    };
  }, [generatePdfMutation, createdInstanceId, instanceId]);

  // Handle final completion after PDF review
  const handleFinalComplete = useCallback(async () => {
    const targetInstanceId = createdInstanceId ?? instanceId;
    if (!targetInstanceId) return;

    setIsSaving(true);
    try {
      // Save any changes made in PDF review
      if (isDirty) {
        const responses = Object.entries(currentFormDataRef.current)
          .filter(([fieldName]) => fieldIdMap.has(fieldName))
          .map(([fieldName, value]) => ({
            formFieldId: fieldIdMap.get(fieldName)!,
            value:
              value === undefined || value === null || value === ""
                ? null
                : typeof value === "object"
                  ? JSON.stringify(value)
                  : String(value),
          }));

        await saveResponsesMutation.mutateAsync({
          id: targetInstanceId,
          responses,
        });
      }

      // Mark form as completed
      await updateMutation.mutateAsync({
        id: targetInstanceId,
        status: "completed",
      });

      setIsDirty(false);
      setPdfEdits({});
      toast.success("Form completed");

      // Clear the step param to show the completed form
      setSearchParams({});
    } catch {
      // Error handled by mutation's onError
    } finally {
      setIsSaving(false);
    }
  }, [createdInstanceId, instanceId, isDirty, fieldIdMap, saveResponsesMutation, updateMutation, setSearchParams]);

  // Loading state - wait for template, instance (if not new), and client data for autofill
  // For new forms, we don't need to wait for instance to load
  // In PDF review mode, also wait for PDF template URL
  const isLoadingInstance = !isNewForm && !createdInstanceId && isInstanceLoading;
  const isLoadingPdfTemplate = isPdfReviewMode && isPdfTemplateLoading;
  if (isTemplateLoading || isLoadingInstance || isClientLoading || isLoadingPdfTemplate) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  // Error state: template not found or error
  if (isTemplateError || !template || !formConfig) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Template not found
        </h2>
        <p className="text-gray-600 mb-4">
          The form template you're looking for doesn't exist.
        </p>
        <Button href="/forms">Back to Forms</Button>
      </div>
    );
  }

  // Error state: new form without client ID
  if (isNewForm && !urlClientId) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Missing client
        </h2>
        <p className="text-gray-600 mb-4">
          A client must be selected to start a new form.
        </p>
        <Button href="/forms">Back to Forms</Button>
      </div>
    );
  }

  // Error state: instance not found or error (only for existing forms)
  if (!isNewForm && !createdInstanceId && (isInstanceError || !instance)) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Form instance not found
        </h2>
        <p className="text-gray-600 mb-4">
          The form instance you're looking for doesn't exist or has been
          deleted.
        </p>
        <Button href="/forms">Back to Forms</Button>
      </div>
    );
  }

  // Wait for initialData to be computed (should be ready after loading states pass)
  if (initialData === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  const clientName = getClientName();

  // Determine the client ID for the link (use URL param for new forms, instance for existing)
  const displayClientId = isNewForm ? urlClientId : instance?.clientId;

  // Determine display status
  const displayStatus = isPdfReviewMode
    ? "PDF Review"
    : instance?.status === "completed"
      ? "Completed"
      : isNewForm && !createdInstanceId
        ? "New"
        : "Draft";
  const statusColorClass = isPdfReviewMode
    ? "text-blue-600"
    : instance?.status === "completed"
      ? "text-green-600"
      : "text-amber-600";

  // PDF Review Mode - uses client-side PDF filling with react-acroform
  if (isPdfReviewMode && pdfTemplateData?.pdfTemplateUrl) {
    // Build filename from template and client info
    const lastName = client?.activeValues?.last_name?.rawValue || 'form';
    const pdfFileName = `${template.formNumber}-${lastName}.pdf`;

    // Ensure we have form data for PDF review
    // If ref is empty (e.g., direct navigation/refresh), use saved instance data
    const hasRefData = Object.keys(currentFormDataRef.current).length > 0;
    const pdfFormData = hasRefData ? currentFormDataRef.current : (initialData ?? {});

    return (
      <div className="h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center gap-2 text-gray-600">
            <span>Form {template.formNumber}</span>
            {clientName && displayClientId && (
              <>
                <span className="text-gray-400">|</span>
                <Link
                  to={`/clients/${displayClientId}`}
                  className="text-primary-600 hover:text-primary-800"
                >
                  {clientName}
                </Link>
              </>
            )}
            <span className="text-gray-400">|</span>
            <span className={statusColorClass}>{displayStatus}</span>
          </div>
        </div>

        {/* PDF Review Step - PDF viewer uses client-side rendering, download uses server-side generation */}
        <div className="h-[calc(100%-2rem)] border border-gray-200 rounded-lg overflow-hidden">
          <PDFReviewStep
            pdfTemplateUrl={pdfTemplateData.pdfTemplateUrl}
            template={template}
            formData={pdfFormData}
            onFormDataChange={handlePdfFormDataChange}
            onBack={handleBackToForm}
            onComplete={handleFinalComplete}
            isCompleting={isSaving}
            fileName={pdfFileName}
            instanceId={effectiveInstanceId}
            onGeneratePdf={effectiveInstanceId ? handleGeneratePdf : undefined}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-gray-600">
          <span>Form {template.formNumber}</span>
          {clientName && displayClientId && (
            <>
              <span className="text-gray-400">|</span>
              <Link
                to={`/clients/${displayClientId}`}
                className="text-primary-600 hover:text-primary-800"
              >
                {clientName}
              </Link>
            </>
          )}
          <span className="text-gray-400">|</span>
          <span className={statusColorClass}>
            {displayStatus}
          </span>
        </div>
      </div>

      {/* Multi-step form */}
      <MultiStepForm
        ref={formRef}
        config={formConfig}
        initialData={initialData}
        onSave={handleSave}
        onSubmit={handleComplete}
        onChange={handleChange}
        isSaving={isSaving}
      />
    </div>
  );
}
