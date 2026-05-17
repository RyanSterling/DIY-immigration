import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client, handleResponse, type InferResponse } from '~/lib/api';

// =============================================================================
// Types
// =============================================================================

// Field type enum
export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'email'
  | 'phone'
  | 'file';

// Autofill mapping
export interface AutofillMapping {
  id?: string;
  canonicalField: string;
  transformationRule?: string | null;
  fallbackValue?: string | null;
}

// Form field
export interface FormField {
  id: string;
  name: string;
  label: string;
  fieldType: FormFieldType;
  pdfMappings?: unknown | null;
  placeholder?: string | null;
  helpText?: string | null;
  options?: unknown | null;
  validationRules?: unknown | null;
  defaultValue?: string | null;
  width?: string | null;
  isRequired: boolean;
  disabled: boolean;
  hideLabel: boolean;
  className?: string | null;
  fieldConfig?: unknown | null;
  orderIndex: number;
  showWhen?: unknown | null;
  createdAt: string;
  updatedAt: string;
  autofillMapping?: AutofillMapping | null;
}

// Form section
export interface FormSection {
  id: string;
  sectionKey: string;
  title: string;
  description?: string | null;
  helpText?: string | null;
  isRequired: boolean;
  buttonConfig?: unknown | null;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
  fields: FormField[];
}

// Form template (list item)
export interface FormTemplateListItem {
  id: string;
  organizationId?: string | null;
  formNumber: string;
  title: string;
  revision?: string | null;
  pdfTemplateUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  sectionCount: number;
}

// Form template (full detail)
export interface FormTemplateDetail {
  id: string;
  organizationId?: string | null;
  formNumber: string;
  title: string;
  revision?: string | null;
  pdfTemplateUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  updatedBy?: string | null;
  sections: FormSection[];
}

// Paginated response
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Create/Update input types
export interface CreateFieldInput {
  name: string;
  label: string;
  fieldType: FormFieldType;
  pdfMappings?: unknown | null;
  placeholder?: string | null;
  helpText?: string | null;
  options?: unknown | null;
  validationRules?: unknown | null;
  defaultValue?: string | null;
  width?: string | null;
  isRequired?: boolean;
  disabled?: boolean;
  hideLabel?: boolean;
  className?: string | null;
  fieldConfig?: unknown | null;
  orderIndex: number;
  showWhen?: unknown | null;
  autofillMapping?: {
    canonicalField: string;
    transformationRule?: string | null;
    fallbackValue?: string | null;
  } | null;
}

export interface CreateSectionInput {
  sectionKey: string;
  title: string;
  description?: string | null;
  helpText?: string | null;
  isRequired?: boolean;
  buttonConfig?: unknown | null;
  orderIndex: number;
  fields?: CreateFieldInput[];
}

export interface CreateTemplateInput {
  formNumber: string;
  title: string;
  revision?: string | null;
  pdfTemplateUrl?: string | null;
  organizationId?: string | null;
  sections?: CreateSectionInput[];
}

export interface UpdateTemplateInput {
  formNumber?: string;
  title?: string;
  revision?: string | null;
  pdfTemplateUrl?: string | null;
  organizationId?: string | null;
}

export interface UpdateSectionInput {
  sectionKey?: string;
  title?: string;
  description?: string | null;
  helpText?: string | null;
  isRequired?: boolean;
  buttonConfig?: unknown | null;
  orderIndex?: number;
}

export interface UpdateFieldInput {
  name?: string;
  label?: string;
  fieldType?: FormFieldType;
  pdfMappings?: unknown | null;
  placeholder?: string | null;
  helpText?: string | null;
  options?: unknown | null;
  validationRules?: unknown | null;
  defaultValue?: string | null;
  width?: string | null;
  isRequired?: boolean;
  disabled?: boolean;
  hideLabel?: boolean;
  className?: string | null;
  fieldConfig?: unknown | null;
  orderIndex?: number;
  showWhen?: unknown | null;
  autofillMapping?: {
    canonicalField: string;
    transformationRule?: string | null;
    fallbackValue?: string | null;
  } | null;
}

// Full save input types (for single-save refactor)
export interface FullSaveFieldInput {
  id?: string; // Present for existing fields
  _deleted?: boolean; // True to mark for deletion
  name?: string;
  label?: string;
  fieldType?: FormFieldType;
  pdfMappings?: unknown | null;
  placeholder?: string | null;
  helpText?: string | null;
  options?: unknown | null;
  validationRules?: unknown | null;
  defaultValue?: string | null;
  width?: string | null;
  isRequired?: boolean;
  disabled?: boolean;
  hideLabel?: boolean;
  className?: string | null;
  fieldConfig?: unknown | null;
  orderIndex?: number;
  showWhen?: unknown | null;
  autofillMapping?: {
    canonicalField: string;
    transformationRule?: string | null;
    fallbackValue?: string | null;
  } | null;
}

export interface FullSaveSectionInput {
  id?: string; // Present for existing sections
  _deleted?: boolean; // True to mark for deletion
  sectionKey?: string;
  title?: string;
  description?: string | null;
  helpText?: string | null;
  isRequired?: boolean;
  buttonConfig?: unknown | null;
  orderIndex?: number;
  fields?: FullSaveFieldInput[];
}

export interface FullSaveTemplateInput {
  formNumber?: string;
  title?: string;
  revision?: string | null;
  pdfTemplateUrl?: string | null;
  organizationId?: string | null;
  sections?: FullSaveSectionInput[];
}

export interface ReorderItem {
  id: string;
  orderIndex: number;
}

// =============================================================================
// Response type inference
// =============================================================================

type TemplatesListResponse = InferResponse<
  Awaited<ReturnType<typeof client.api.admin['form-templates']['$get']>>
>;

type TemplateDetailResponse = InferResponse<
  Awaited<ReturnType<(typeof client.api.admin['form-templates'])[':id']['$get']>>
>;

type InstanceCountResponse = InferResponse<
  Awaited<ReturnType<(typeof client.api.admin['form-templates'])[':id']['instance-count']['$get']>>
>;

// =============================================================================
// Query Options
// =============================================================================

interface UseAdminFormTemplatesOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  organizationId?: string | null;
}

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * List form templates with pagination and search
 */
export function useAdminFormTemplates(options: UseAdminFormTemplatesOptions = {}) {
  const { page = 1, pageSize = 20, search = '', organizationId } = options;

  return useQuery({
    queryKey: ['admin', 'form-templates', 'list', { page, pageSize, search, organizationId }],
    queryFn: async () => {
      const response = await client.api.admin['form-templates'].$get({
        query: {
          page: String(page),
          pageSize: String(pageSize),
          ...(search && { search }),
          ...(organizationId !== undefined && { organizationId: organizationId ?? 'null' }),
        },
      });
      return handleResponse<TemplatesListResponse>(response);
    },
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Get a single form template with sections and fields
 */
export function useAdminFormTemplate(id: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'form-templates', 'detail', id],
    queryFn: async () => {
      const response = await client.api.admin['form-templates'][':id'].$get({
        param: { id: id! },
      });
      return handleResponse<TemplateDetailResponse>(response);
    },
    enabled: !!id,
  });
}

/**
 * Get the count of form instances using a template
 */
export function useTemplateInstanceCount(id: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'form-templates', 'instance-count', id],
    queryFn: async () => {
      const response = await client.api.admin['form-templates'][':id']['instance-count'].$get({
        param: { id: id! },
      });
      return handleResponse<InstanceCountResponse>(response);
    },
    enabled: !!id,
  });
}

// =============================================================================
// Template Mutations
// =============================================================================

/**
 * Create a new form template (with optional nested sections/fields)
 */
export function useCreateFormTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTemplateInput) => {
      const response = await client.api.admin['form-templates'].$post({
        json: data,
      });
      return handleResponse(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'form-templates'] });
    },
  });
}

/**
 * Update form template with optional nested sections and fields.
 * Supports full save: pass sections array to create/update/delete sections and fields in one request.
 */
export function useUpdateFormTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FullSaveTemplateInput }) => {
      const response = await client.api.admin['form-templates'][':id'].$patch({
        param: { id },
        json: data,
      });
      return handleResponse(response);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'form-templates'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'form-templates', 'detail', variables.id] });
    },
  });
}

/**
 * Soft delete a form template
 */
export function useDeleteFormTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await client.api.admin['form-templates'][':id'].$delete({
        param: { id },
      });
      return handleResponse(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'form-templates'] });
    },
  });
}

/**
 * Duplicate a form template
 */
export function useDuplicateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await client.api.admin['form-templates'][':id'].duplicate.$post({
        param: { id },
      });
      return handleResponse(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'form-templates'] });
    },
  });
}

// =============================================================================
// Section Mutations
// =============================================================================

/**
 * @deprecated Use useUpdateFormTemplate with sections array for single-save pattern
 * Add a section to a template
 */
export function useCreateSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      data,
    }: {
      templateId: string;
      data: Omit<CreateSectionInput, 'fields'>;
    }) => {
      const response = await client.api.admin['form-templates'][':id'].sections.$post({
        param: { id: templateId },
        json: data,
      });
      return handleResponse(response);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'form-templates'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'form-templates', 'detail', variables.templateId] });
    },
  });
}

/**
 * @deprecated Use useUpdateFormTemplate with sections array for single-save pattern
 * Update a section
 */
export function useUpdateSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      sectionId,
      data,
    }: {
      templateId: string;
      sectionId: string;
      data: UpdateSectionInput;
    }) => {
      const response = await client.api.admin['form-templates'][':id'].sections[':sectionId'].$patch({
        param: { id: templateId, sectionId },
        json: data,
      });
      return handleResponse(response);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'form-templates'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'form-templates', 'detail', variables.templateId] });
    },
  });
}

/**
 * @deprecated Use useUpdateFormTemplate with sections array for single-save pattern
 * Delete a section
 */
export function useDeleteSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ templateId, sectionId }: { templateId: string; sectionId: string }) => {
      const response = await client.api.admin['form-templates'][':id'].sections[':sectionId'].$delete({
        param: { id: templateId, sectionId },
      });
      return handleResponse(response);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'form-templates'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'form-templates', 'detail', variables.templateId] });
    },
  });
}

/**
 * Reorder sections within a template
 */
export function useReorderSections() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ templateId, items }: { templateId: string; items: ReorderItem[] }) => {
      const response = await client.api.admin['form-templates'][':id'].sections.reorder.$patch({
        param: { id: templateId },
        json: { items },
      });
      return handleResponse(response);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'form-templates', 'detail', variables.templateId] });
    },
  });
}

// =============================================================================
// Field Mutations
// =============================================================================

/**
 * @deprecated Use useUpdateFormTemplate with sections array for single-save pattern
 * Add a field to a section
 */
export function useCreateField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      sectionId,
      data,
    }: {
      templateId: string;
      sectionId: string;
      data: CreateFieldInput;
    }) => {
      const response = await client.api.admin['form-templates'][':id'].sections[':sectionId'].fields.$post({
        param: { id: templateId, sectionId },
        json: data,
      });
      return handleResponse(response);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'form-templates', 'detail', variables.templateId] });
    },
  });
}

/**
 * @deprecated Use useUpdateFormTemplate with sections array for single-save pattern
 * Update a field
 */
export function useUpdateField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      sectionId,
      fieldId,
      data,
    }: {
      templateId: string;
      sectionId: string;
      fieldId: string;
      data: UpdateFieldInput;
    }) => {
      const response = await client.api.admin['form-templates'][':id'].sections[':sectionId'].fields[':fieldId'].$patch({
        param: { id: templateId, sectionId, fieldId },
        json: data,
      });
      return handleResponse(response);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'form-templates', 'detail', variables.templateId] });
    },
  });
}

/**
 * @deprecated Use useUpdateFormTemplate with sections array for single-save pattern
 * Delete a field
 */
export function useDeleteField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      sectionId,
      fieldId,
  }: {
      templateId: string;
      sectionId: string;
      fieldId: string;
    }) => {
      const response = await client.api.admin['form-templates'][':id'].sections[':sectionId'].fields[':fieldId'].$delete({
        param: { id: templateId, sectionId, fieldId },
      });
      return handleResponse(response);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'form-templates', 'detail', variables.templateId] });
    },
  });
}

/**
 * Reorder fields within a section
 */
export function useReorderFields() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      sectionId,
      items,
    }: {
      templateId: string;
      sectionId: string;
      items: ReorderItem[];
    }) => {
      const response = await client.api.admin['form-templates'][':id'].sections[':sectionId'].fields.reorder.$patch({
        param: { id: templateId, sectionId },
        json: { items },
      });
      return handleResponse(response);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'form-templates', 'detail', variables.templateId] });
    },
  });
}
