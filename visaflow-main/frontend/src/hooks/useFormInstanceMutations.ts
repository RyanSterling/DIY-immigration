import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { client, handleResponse } from "~/lib/api";
import type { FormInstance } from "./useFormInstancesApi";

/**
 * All form instance mutations in one hook.
 * Shares queryClient for consistent cache invalidation.
 */
export function useFormInstanceMutations() {
  const queryClient = useQueryClient();

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: { clientId: string; formTemplateId: string }) => {
      const response = await client.api["form-instances"].$post({
        json: data,
      });
      return handleResponse<FormInstance>(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form-instances"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create form"
      );
    },
  });

  // Update mutation (status, step progress)
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      status?: "draft" | "in_progress" | "completed";
      currentStepIndex?: number;
      completedStepIds?: string[];
    }) => {
      const response = await client.api["form-instances"][":id"].$patch({
        param: { id },
        json: data,
      });
      return handleResponse<FormInstance>(response);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["form-instances", "detail", variables.id],
      });
      queryClient.invalidateQueries({ queryKey: ["form-instances", "list"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update form"
      );
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await client.api["form-instances"][":id"].$delete({
        param: { id },
      });
      return handleResponse<{ success: boolean }>(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form-instances"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete form"
      );
    },
  });

  // Save responses mutation
  const saveResponsesMutation = useMutation({
    mutationFn: async ({
      id,
      responses,
    }: {
      id: string;
      responses: Array<{
        formFieldId: string;
        value: string | null;
        version?: number;
      }>;
    }) => {
      const response = await client.api["form-instances"][":id"].responses
        .$patch({
          param: { id },
          json: { responses },
        });
      return handleResponse<{ success: boolean; updated: number; created: number }>(
        response
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["form-instances", "detail", variables.id],
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to save form data"
      );
    },
  });

  // Generate PDF mutation
  const generatePdfMutation = useMutation({
    mutationFn: async ({
      id,
      type = "review",
    }: {
      id: string;
      type?: "draft" | "review" | "final";
    }) => {
      const response = await client.api["form-instances"][":id"][
        "generate-pdf"
      ].$post({
        param: { id },
        query: { type },
      });
      return handleResponse<{
        pdfId: string;
        pdfUrl: string;
        filePath: string;
        fileName: string;
      }>(response);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["form-instances", "pdf", variables.id],
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate PDF"
      );
    },
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    saveResponsesMutation,
    generatePdfMutation,
  };
}

/**
 * Get autofill values for a form instance.
 */
export function useFormInstanceAutofill(id: string | undefined) {
  return useQuery({
    queryKey: ["form-instances", "autofill", id],
    queryFn: async () => {
      const response = await client.api["form-instances"][":id"].autofill.$get({
        param: { id: id! },
      });
      return handleResponse<Record<string, string | null>>(response);
    },
    enabled: !!id,
  });
}

/**
 * Get generated PDF for a form instance.
 */
export function useFormInstancePdf(
  id: string | undefined,
  type?: "draft" | "review" | "final"
) {
  return useQuery({
    queryKey: ["form-instances", "pdf", id, type],
    queryFn: async () => {
      const response = await client.api["form-instances"][":id"].pdf.$get({
        param: { id: id! },
        query: { type },
      });
      return handleResponse<{
        id: string;
        pdfUrl: string;
        filePath: string;
        fileName: string;
        generationType: "draft" | "review" | "final";
        generatedAt: string;
      }>(response);
    },
    enabled: !!id,
  });
}
