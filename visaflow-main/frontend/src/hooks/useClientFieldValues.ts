import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { client, handleResponse } from "~/lib/api";

// Type for creating a field value
interface CreateFieldValueInput {
  clientId: string;
  canonicalField: string;
  rawValue: string;
  valueType?: "text" | "date" | "number" | "boolean" | "country";
  normalizedValue?: unknown;
  setActive?: boolean;
  source?: "document_extraction" | "user_edit";
  documentId?: string;
}

// Type for bulk create input
interface BulkCreateFieldValuesInput {
  clientId: string;
  values: Array<{
    canonicalField: string;
    rawValue: string;
    valueType?: "text" | "date" | "number" | "boolean" | "country";
    normalizedValue?: unknown;
    setActive?: boolean;
    source?: "document_extraction" | "user_edit";
    documentId?: string;
  }>;
}

// Field value from the API
interface FieldValue {
  id: string;
  rawValue: string;
  valueType: string;
  normalizedValue: unknown;
  documentId: string | null;
  confidenceScore: string | null;
  source: string;
  isActive: boolean;
  createdAt: Date;
}

// Grouped values response
type GroupedFieldValues = Record<string, FieldValue[]>;

/**
 * Hook for CRUD operations on client field values.
 */
export function useClientFieldValues() {
  const queryClient = useQueryClient();

  /**
   * Create a single field value - response IS the field value (no wrapper)
   */
  const useCreate = () => {
    return useMutation({
      mutationFn: async (input: CreateFieldValueInput) => {
        const response = await client.api["client-field-values"].$post({
          json: {
            clientId: input.clientId,
            canonicalField: input.canonicalField,
            rawValue: input.rawValue,
            valueType: input.valueType ?? "text",
            normalizedValue: input.normalizedValue,
            setActive: input.setActive ?? true,
            source: input.source,
          },
        });
        return handleResponse<FieldValue>(response);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["client-field-values"] });
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Operation failed");
      },
    });
  };

  /**
   * Create multiple field values at once using the bulk endpoint.
   * Response uses { items: [...] } pattern for arrays.
   */
  const useBulkCreate = () => {
    return useMutation({
      mutationFn: async (input: BulkCreateFieldValuesInput) => {
        if (input.values.length === 0) {
          return [];
        }

        const payload = {
          clientId: input.clientId,
          values: input.values.map((v) => ({
            canonicalField: v.canonicalField,
            rawValue: v.rawValue,
            valueType: v.valueType ?? "text",
            normalizedValue: v.normalizedValue,
            setActive: v.setActive ?? true,
            source: v.source,
            documentId: v.documentId,
          })),
        };

        const response = await client.api["client-field-values"].bulk.$post({
          json: payload,
        });
        const result = await handleResponse<{ items: FieldValue[] }>(response);
        return result.items;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["client-field-values"] });
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Operation failed");
      },
    });
  };

  /**
   * Set a field value as active (for conflict resolution).
   */
  const useSetActive = () => {
    return useMutation({
      mutationFn: async (fieldValueId: string) => {
        const response = await client.api["client-field-values"][":id"][
          "set-active"
        ].$put({
          param: { id: fieldValueId },
        });
        return handleResponse<{ success: boolean }>(response);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["client-field-values"] });
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Operation failed");
      },
    });
  };

  /**
   * Get all field values for a client, grouped by canonical field.
   * Response IS the grouped values object directly (no wrapper).
   */
  const useGetByClient = (clientId: string | undefined) => {
    return useQuery({
      queryKey: ["client-field-values", "client", clientId],
      queryFn: async () => {
        const response = await client.api["client-field-values"].client[
          ":clientId"
        ].$get({
          param: { clientId: clientId! },
        });
        return handleResponse<GroupedFieldValues>(response);
      },
      enabled: !!clientId,
    });
  };

  return {
    useCreate,
    useBulkCreate,
    useSetActive,
    useGetByClient,
  };
}
