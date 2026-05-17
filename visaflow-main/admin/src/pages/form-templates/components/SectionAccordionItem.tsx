import { useState, useMemo, useCallback } from 'react';
import { useFormContext, useFieldArray, useWatch } from 'react-hook-form';
import { ChevronDownIcon, ChevronRightIcon, PlusIcon, TrashIcon, Bars3Icon } from '@heroicons/react/24/outline';
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
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '~/components/Card';
import { Input } from '~/components/forms/Input';
import Button from '~/components/Button';
import { FieldAccordionItem } from './FieldAccordionItem';
import { AddFieldModal } from './AddFieldModal';
import { StatusBadge } from './StatusBadge';
import { createDefaultField, type FormTemplateValues, type FormFieldValues } from '../formTemplateSchema';
import type { ItemStatus } from '../useDirtyStatus';

// =============================================================================
// Props
// =============================================================================

interface SectionAccordionItemProps {
  sectionId: string;
  sectionIndex: number;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  getSectionStatus: (sectionIndex: number) => ItemStatus;
  getFieldStatus: (sectionIndex: number, fieldIndex: number) => ItemStatus;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Accordion item for editing a single form section.
 * Uses useFormContext() to register section fields and useFieldArray for nested fields.
 * Supports drag-and-drop reordering via DND Kit.
 */
export function SectionAccordionItem({
  sectionId,
  sectionIndex,
  isExpanded,
  onToggle,
  onDelete,
  getSectionStatus,
  getFieldStatus,
}: SectionAccordionItemProps) {
  const { register, control, setValue, getValues } = useFormContext<FormTemplateValues>();
  const basePath = `sections.${sectionIndex}` as const;

  // DND Kit sortable hook
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sectionId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : undefined,
  };

  // Field array for nested fields within this section
  const { fields, append, remove } = useFieldArray({
    control,
    name: `${basePath}.fields`,
  });

  // Watch section values for display in header
  const sectionTitle = useWatch({ name: `${basePath}.title` });
  const sectionKey = useWatch({ name: `${basePath}.sectionKey` });

  // Local UI state
  const [expandedFieldId, setExpandedFieldId] = useState<string | null>(null);
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);

  // DND Kit sensors for field-level drag-and-drop
  const fieldSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get field IDs in current array order for SortableContext
  const fieldIds = useMemo(() => {
    return fields.map((f) => f.id || f._tempId || '');
  }, [fields]);

  // Handle drag end to reorder fields within this section
  const handleFieldDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    // Find indices in the fields array
    const oldIndex = fields.findIndex((f) => (f.id || f._tempId) === active.id);
    const newIndex = fields.findIndex((f) => (f.id || f._tempId) === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder the array and update orderIndex values
    const currentFields = getValues(`${basePath}.fields`);
    const reorderedFields = arrayMove([...currentFields], oldIndex, newIndex).map(
      (field, index) => ({ ...field, orderIndex: index })
    );

    // Set the entire fields array at once
    setValue(`${basePath}.fields`, reorderedFields, { shouldDirty: true });
  }, [fields, getValues, setValue, basePath]);

  const handleAddField = (fieldData: FormFieldValues) => {
    append(fieldData);
    setShowAddFieldModal(false);
  };

  const handleDeleteField = (fieldIndex: number) => {
    remove(fieldIndex);
    if (expandedFieldId === fields[fieldIndex]?.id) {
      setExpandedFieldId(null);
    }
  };

  return (
    <>
      <div ref={setNodeRef} style={style}>
        <Card className="overflow-hidden">
          {/* Section Header */}
          <div className="w-full flex items-center justify-between px-6 py-4 bg-gray-50 hover:bg-gray-100">
            {/* Drag Handle */}
            <div
              {...attributes}
              {...listeners}
              className="p-1 mr-2 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
              title="Drag to reorder"
            >
              <Bars3Icon className="h-5 w-5" />
            </div>

            {/* Toggle Button */}
            <button
              type="button"
              onClick={onToggle}
              className="flex-1 flex items-center gap-3 text-left"
            >
              {isExpanded ? (
                <ChevronDownIcon className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronRightIcon className="h-5 w-5 text-gray-500" />
              )}
              <div>
                <span className="font-medium text-gray-900">{sectionTitle || '(untitled)'}</span>
                <span className="ml-2 text-sm text-gray-500">({sectionKey || 'no key'})</span>
              </div>
              <StatusBadge status={getSectionStatus(sectionIndex)} />
              <span className="text-sm text-gray-400">
                {fields.length} field{fields.length !== 1 ? 's' : ''}
              </span>
            </button>
          </div>

          {/* Section Content */}
          {isExpanded && (
            <CardContent className="space-y-4">
              {/* Section Properties */}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Title"
                  placeholder="Section Title"
                  {...register(`${basePath}.title`)}
                />
                <Input
                  label="Section Key"
                  placeholder="section_key"
                  {...register(`${basePath}.sectionKey`)}
                />
              </div>

              <Input
                label="Description"
                placeholder="Section description"
                {...register(`${basePath}.description`)}
              />

              <Input
                label="Help Text"
                placeholder="Help text for the section"
                {...register(`${basePath}.helpText`)}
              />

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  {...register(`${basePath}.isRequired`)}
                />
                <label className="text-sm text-gray-700">Section is required</label>
              </div>

              {/* Fields */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-gray-700">Fields</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddFieldModal(true)}
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add Field
                  </Button>
                </div>

                {fields.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No fields in this section</p>
                ) : (
                  <DndContext
                    sensors={fieldSensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleFieldDragEnd}
                  >
                    <SortableContext items={fieldIds} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2">
                        {fields.map((field, fieldIndex) => {
                          const fieldId = field.id || field._tempId || '';
                          return (
                            <FieldAccordionItem
                              key={fieldId}
                              fieldId={fieldId}
                              sectionIndex={sectionIndex}
                              fieldIndex={fieldIndex}
                              isExpanded={expandedFieldId === fieldId}
                              onToggle={() => setExpandedFieldId(expandedFieldId === fieldId ? null : fieldId)}
                              onDelete={() => handleDeleteField(fieldIndex)}
                              getFieldStatus={getFieldStatus}
                            />
                          );
                        })}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>

              {/* Delete Section Button */}
              <div className="border-t border-gray-200 pt-4">
                <button
                  type="button"
                  onClick={onDelete}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md"
                >
                  <TrashIcon className="h-4 w-4" />
                  Delete Section
                </button>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Add Field Modal */}
      <AddFieldModal
        isOpen={showAddFieldModal}
        onClose={() => setShowAddFieldModal(false)}
        onAdd={handleAddField}
        nextOrderIndex={fields.length}
      />
    </>
  );
}
