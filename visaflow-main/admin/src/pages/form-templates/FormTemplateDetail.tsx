import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, FormProvider, useFieldArray, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeftIcon, PlusIcon } from '@heroicons/react/24/outline';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { Card, CardHeader, CardContent } from '~/components/Card';
import Button from '~/components/Button';
import Spinner from '~/components/Spinner';
import { toast } from 'react-toastify';
import { useOrganizations } from '~/hooks/useOrganizations';
import {
  useAdminFormTemplate,
  useUpdateFormTemplate,
  type FormSection,
  type FormField,
  type FormTemplateDetail as FormTemplateDetailType,
} from '~/hooks/useAdminFormTemplates';
import {
  formTemplateSchema,
  createDefaultSection,
  type FormTemplateValues,
  type FormSectionValues,
  type FormFieldValues,
} from './formTemplateSchema';
import { TemplateMetadataForm, type Organization } from './components/TemplateMetadataForm';
import type { PdfTemplateUploadHandle } from './components/PdfTemplateUpload';
import { SectionAccordionItem } from './components/SectionAccordionItem';
import { AddSectionModal } from './components/AddSectionModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { computeChanges } from './computeChanges';
import { useDirtyStatus } from './useDirtyStatus';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Transform API data to form values.
 * Maps API fields to form schema, handling the differences between
 * database-returned data and form-editable data.
 */
function transformToFormValues(template: FormTemplateDetailType): FormTemplateValues {
  return {
    formNumber: template.formNumber,
    title: template.title,
    revision: template.revision ?? null,
    pdfTemplateUrl: template.pdfTemplateUrl ?? null,
    organizationId: template.organizationId ?? null,
    sections: template.sections.map((section): FormSectionValues => ({
      id: section.id,
      sectionKey: section.sectionKey,
      title: section.title,
      description: section.description ?? null,
      helpText: section.helpText ?? null,
      isRequired: section.isRequired,
      orderIndex: section.orderIndex,
      buttonConfig: section.buttonConfig as Record<string, unknown> | null ?? null,
      fields: section.fields.map((field): FormFieldValues => ({
        id: field.id,
        name: field.name,
        label: field.label,
        fieldType: field.fieldType,
        placeholder: field.placeholder ?? null,
        helpText: field.helpText ?? null,
        defaultValue: field.defaultValue ?? null,
        width: field.width ?? null,
        className: field.className ?? null,
        isRequired: field.isRequired,
        disabled: field.disabled,
        hideLabel: field.hideLabel,
        orderIndex: field.orderIndex,
        options: field.options as FormFieldValues['options'] ?? null,
        showWhen: field.showWhen as FormFieldValues['showWhen'] ?? null,
        pdfMappings: field.pdfMappings as Record<string, string> | null ?? null,
        validationRules: field.validationRules as Record<string, unknown> | null ?? null,
        fieldConfig: field.fieldConfig as Record<string, unknown> | null ?? null,
        autofillMapping: field.autofillMapping ? {
          canonicalField: field.autofillMapping.canonicalField,
          transformationRule: field.autofillMapping.transformationRule ?? null,
          fallbackValue: field.autofillMapping.fallbackValue ?? null,
        } : null,
      })),
    })),
  };
}

// =============================================================================
// Inner Component (must be inside FormProvider to use useFormContext)
// =============================================================================

interface FormTemplateDetailContentProps {
  id: string;
  template: FormTemplateDetailType;
  organizations: Organization[];
  originalValues: FormTemplateValues | null;
  setOriginalValues: React.Dispatch<React.SetStateAction<FormTemplateValues | null>>;
  pdfUploadRef: React.RefObject<PdfTemplateUploadHandle | null>;
}

function FormTemplateDetailContent({
  id,
  template,
  organizations,
  originalValues,
  setOriginalValues,
  pdfUploadRef,
}: FormTemplateDetailContentProps) {
  const navigate = useNavigate();
  const methods = useFormContext<FormTemplateValues>();
  const updateMutation = useUpdateFormTemplate();

  // Track pending PDF upload state (stored outside React Hook Form)
  const [hasPendingUpload, setHasPendingUpload] = useState(false);

  // Field array for top-level sections
  const { fields: sections, remove: removeSection } = useFieldArray({
    control: methods.control,
    name: 'sections',
  });

  // Local UI state
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'section' | 'field';
    sectionIndex: number;
    name: string;
  }>({
    isOpen: false,
    type: 'section',
    sectionIndex: -1,
    name: '',
  });

  // Watch sections to react to changes (useFieldArray doesn't trigger on nested updates)
  const watchedSections = methods.watch('sections');

  // Get section IDs in current array order for SortableContext
  const sectionIds = useMemo(() => {
    if (!watchedSections) return [];
    return watchedSections.map((s) => s.id || s._tempId || '');
  }, [watchedSections]);

  // Dirty status tracking for badges (now safe to use inside FormProvider)
  const { getSectionStatus, getFieldStatus, hasAnyChanges } = useDirtyStatus({ originalValues });

  // Form submission handler - uses computeChanges for optimized payload
  const onSubmit = async (values: FormTemplateValues) => {
    try {
      // Upload pending PDF first if there is one
      if (pdfUploadRef.current) {
        const uploadedKey = await pdfUploadRef.current.uploadPendingFile();
        if (uploadedKey) {
          // Update form values with the new PDF key
          values = { ...values, pdfTemplateUrl: uploadedKey };
          methods.setValue('pdfTemplateUrl', uploadedKey);
        }
      }

      // Compute only the changes to send to the backend
      const { hasChanges, payload } = computeChanges(originalValues, values);

      if (!hasChanges) {
        toast.info('No changes to save');
        return;
      }

      await updateMutation.mutateAsync({
        id,
        data: payload,
      });

      // Update original values to reflect saved state
      setOriginalValues(values);
      methods.reset(values);
      // Clear pending upload state (file was uploaded successfully)
      setHasPendingUpload(false);
      toast.success('Template saved successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save template');
    }
  };

  // Section management handlers
  const handleAddSection = (sectionData: FormSectionValues) => {
    // Use setValue instead of appendSection to ensure proper dirty state tracking
    const currentSections = methods.getValues('sections');
    methods.setValue('sections', [...currentSections, sectionData], {
      shouldDirty: true,
      shouldValidate: false,
    });
    setShowAddSectionModal(false);
  };

  // DND Kit sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end to reorder sections
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || !watchedSections) return;

    // Find indices in the array
    const oldIndex = watchedSections.findIndex(
      (s) => (s.id || s._tempId) === active.id
    );
    const newIndex = watchedSections.findIndex(
      (s) => (s.id || s._tempId) === over.id
    );

    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder the array and update orderIndex values
    const reorderedSections = arrayMove([...watchedSections], oldIndex, newIndex).map(
      (section, index) => ({ ...section, orderIndex: index })
    );

    // Set the entire sections array at once
    methods.setValue('sections', reorderedSections, { shouldDirty: true });
  }, [watchedSections, methods]);

  const handleDeleteSection = (sectionIndex: number) => {
    const section = sections[sectionIndex];
    setDeleteModal({
      isOpen: true,
      type: 'section',
      sectionIndex,
      name: section.title || '(untitled)',
    });
  };

  const handleConfirmDelete = () => {
    if (deleteModal.type === 'section' && deleteModal.sectionIndex >= 0) {
      removeSection(deleteModal.sectionIndex);
    }
    setDeleteModal((prev) => ({ ...prev, isOpen: false }));
  };

  // Use hasAnyChanges from useDirtyStatus instead of formState.isDirty
  // This directly compares current values against originalValues, which updates on save
  // Also include hasPendingUpload for staged PDF files not yet in React Hook Form
  const isDirty = hasAnyChanges || hasPendingUpload;

  return (
    <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/form-templates')}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {template.formNumber}: {template.title}
            </h1>
            <p className="text-gray-500">Edit form template</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isDirty && (
            <span className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">
              Unsaved changes
            </span>
          )}
          <Button
            type="submit"
            variant="primary"
            disabled={!isDirty}
            isLoading={updateMutation.isPending}
          >
            Save All Changes
          </Button>
        </div>
      </div>

      {/* Template Metadata */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-gray-900">Template Details</h2>
        </CardHeader>
        <CardContent>
          <TemplateMetadataForm
            templateId={id}
            organizations={organizations}
            pdfUploadRef={pdfUploadRef}
            onPendingFileChange={setHasPendingUpload}
          />
        </CardContent>
      </Card>

      {/* Sections */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">
            Sections ({sections.length})
          </h2>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowAddSectionModal(true)}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Section
          </Button>
        </div>

        {!watchedSections || watchedSections.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">No sections yet. Add your first section!</p>
            </CardContent>
          </Card>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sectionIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {watchedSections.map((section, index) => {
                  const sectionId = section.id || section._tempId;
                  return (
                    <SectionAccordionItem
                      key={sectionId}
                      sectionId={sectionId!}
                      sectionIndex={index}
                      isExpanded={expandedSectionId === sectionId}
                      onToggle={() => setExpandedSectionId(expandedSectionId === sectionId ? null : sectionId!)}
                      onDelete={() => handleDeleteSection(index)}
                      getSectionStatus={getSectionStatus}
                      getFieldStatus={getFieldStatus}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Add Section Modal */}
      <AddSectionModal
        isOpen={showAddSectionModal}
        onClose={() => setShowAddSectionModal(false)}
        onAdd={handleAddSection}
        nextOrderIndex={watchedSections?.length ?? 0}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmDelete}
        itemType={deleteModal.type}
        itemName={deleteModal.name}
      />
    </form>
  );
}

// =============================================================================
// Main Component (handles data fetching and FormProvider setup)
// =============================================================================

export default function FormTemplateDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const pdfUploadRef = useRef<PdfTemplateUploadHandle | null>(null);

  // Data fetching
  const { data: templateData, isLoading: templateLoading } = useAdminFormTemplate(id);
  const { data: orgsData } = useOrganizations({ pageSize: 100 });

  // Form setup with React Hook Form
  const methods = useForm<FormTemplateValues>({
    resolver: zodResolver(formTemplateSchema),
    defaultValues: {
      formNumber: '',
      title: '',
      revision: null,
      pdfTemplateUrl: null,
      organizationId: null,
      sections: [],
    },
  });

  // Store original values for change detection
  const [originalValues, setOriginalValues] = useState<FormTemplateValues | null>(null);

  // Reset form when template data loads
  useEffect(() => {
    if (templateData?.data) {
      const formValues = transformToFormValues(templateData.data);
      methods.reset(formValues);
      setOriginalValues(formValues);
    }
  }, [templateData, methods]);

  const template = templateData?.data;
  const organizations = orgsData?.data ?? [];

  // Loading state
  if (templateLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  // Not found state
  if (!template || !id) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Template not found</p>
        <Button variant="outline" onClick={() => navigate('/form-templates')} className="mt-4">
          Back to Templates
        </Button>
      </div>
    );
  }

  return (
    <FormProvider {...methods}>
      <FormTemplateDetailContent
        id={id}
        template={template}
        organizations={organizations}
        originalValues={originalValues}
        setOriginalValues={setOriginalValues}
        pdfUploadRef={pdfUploadRef}
      />
    </FormProvider>
  );
}
