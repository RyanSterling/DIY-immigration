import { useQuery } from "@tanstack/react-query";
import { client, handleResponse } from "~/lib/api";

// Type definitions for form templates

export interface FormFieldAutofillMapping {
  canonicalField: string;
  transformationRule: string | null;
  fallbackValue: string | null;
}

export interface FormField {
  id: string;
  name: string;
  label: string;
  fieldType: string;
  pdfMappings: Record<string, string> | null;
  placeholder: string | null;
  helpText: string | null;
  options: { label: string; value: string }[] | null;
  validationRules: unknown | null;
  defaultValue: string | null;
  width: string | null;
  isRequired: boolean;
  disabled: boolean;
  hideLabel: boolean;
  className: string | null;
  fieldConfig: Record<string, unknown> | null;
  orderIndex: number;
  showWhen: Array<{
    field: string;
    operator: "equals" | "notEquals" | "contains" | "isEmpty" | "isNotEmpty";
    value?: unknown;
  }> | null;
  autofillMapping: FormFieldAutofillMapping | null;
}

export interface FormSection {
  id: string;
  sectionKey: string;
  title: string;
  description: string | null;
  helpText: string | null;
  isRequired: boolean;
  buttonConfig: unknown | null;
  orderIndex: number;
  fields: FormField[];
}

export interface FormTemplateListItem {
  id: string;
  formNumber: string;
  title: string;
  revision: string;
  pdfTemplateUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FormTemplateDetail extends FormTemplateListItem {
  sections: FormSection[];
}

interface FormTemplatesListResponse {
  items: FormTemplateListItem[];
}

export function useFormTemplates() {
  // List query - fetches all available templates (metadata only)
  const listQuery = useQuery({
    queryKey: ["form-templates", "list"],
    queryFn: async () => {
      const response = await client.api["form-templates"].$get();
      return handleResponse<FormTemplatesListResponse>(response);
    },
    staleTime: 1000 * 60 * 30, // 30 minutes - templates rarely change
  });

  // Get single template with full structure
  const useGet = (id: string | undefined) => {
    return useQuery({
      queryKey: ["form-templates", "detail", id],
      queryFn: async () => {
        const response = await client.api["form-templates"][":id"].$get({
          param: { id: id! },
        });
        return handleResponse<FormTemplateDetail>(response);
      },
      enabled: !!id,
      staleTime: 1000 * 60 * 30, // 30 minutes - templates rarely change
    });
  };

  return {
    // List data
    data: listQuery.data?.items ?? [],
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    error: listQuery.error,
    refetch: listQuery.refetch,
    // Single template hook
    useGet,
  };
}

/**
 * Hook to fetch a signed URL for the blank PDF template.
 * Used for client-side PDF filling with react-acroform.
 */
export function usePdfTemplateUrl(templateId: string | undefined) {
  return useQuery({
    queryKey: ["form-templates", "pdf-template-url", templateId],
    queryFn: async () => {
      const response = await client.api["form-templates"][":id"]["pdf-template-url"].$get({
        param: { id: templateId! },
      });
      return handleResponse<{ pdfTemplateUrl: string }>(response);
    },
    enabled: !!templateId,
    staleTime: 1000 * 60 * 14, // 14 minutes (URL expires in 1 hour)
  });
}
