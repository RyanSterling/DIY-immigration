import { useQuery, useQueryClient } from "@tanstack/react-query";
import { client, handleResponse } from "~/lib/api";

// Types from the backend form-templates route

interface FieldOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface ConditionalRule {
  field: string;
  operator: "equals" | "notEquals" | "contains" | "isEmpty" | "isNotEmpty";
  value?: string | number | boolean | string[];
}

interface FieldConfig {
  name: string;
  label: string;
  type: string;
  placeholder?: string;
  helpText?: string;
  defaultValue?: unknown;
  disabled?: boolean;
  width?: "1-1" | "1-2" | "1-3" | "1-4";
  showWhen?: ConditionalRule[];
  options?: FieldOption[];
  rows?: number;
  allowEmpty?: boolean;
  emptyOptionLabel?: string;
  direction?: "horizontal" | "vertical";
}

export interface StepConfig {
  id: string;
  title: string;
  description?: string;
  fields: FieldConfig[];
}

// Full form template response from /api/form-templates/:id or /api/form-templates/by-form-number/:formNumber
export interface FormTemplate {
  id: string;
  title: string;
  formNumber: string;
  revision: string | null;
  steps: StepConfig[];
  pdfFieldMappings: Record<string, string>;
  autofillMappings: Record<string, string>;
}

// List item from /api/form-templates
export interface FormTemplateListItem {
  id: string;
  formNumber: string;
  title: string;
  revision: string | null;
  pdfTemplateUrl: string | null;
  organizationId: string | null;
  createdAt: string;
}

// List response from /api/form-templates
interface FormTemplatesListResponse {
  items: FormTemplateListItem[];
}

export function useFormTemplatesApi() {
  const queryClient = useQueryClient();

  // List all templates
  const listQuery = useQuery({
    queryKey: ["formTemplates", "list"],
    queryFn: async () => {
      const response = await client.api["form-templates"].$get();
      return handleResponse<FormTemplatesListResponse>(response);
    },
  });

  // Get single template by ID
  const useGet = (id: string | undefined) => {
    return useQuery({
      queryKey: ["formTemplates", "detail", id],
      queryFn: async () => {
        const response = await client.api["form-templates"][":id"].$get({
          param: { id: id! },
        });
        return handleResponse<FormTemplate>(response);
      },
      enabled: !!id,
    });
  };

  // Get template by form number (e.g., "I-765")
  const useGetByFormNumber = (formNumber: string | undefined) => {
    return useQuery({
      queryKey: ["formTemplates", "byFormNumber", formNumber],
      queryFn: async () => {
        const response = await client.api["form-templates"]["by-form-number"][
          ":formNumber"
        ].$get({
          param: { formNumber: formNumber! },
        });
        return handleResponse<FormTemplate>(response);
      },
      enabled: !!formNumber,
    });
  };

  return {
    // List data
    data: listQuery.data?.items ?? [],
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    error: listQuery.error,
    refetch: listQuery.refetch,
    // Query hooks
    useGet,
    useGetByFormNumber,
    // Query client for manual cache invalidation if needed
    queryClient,
  };
}
