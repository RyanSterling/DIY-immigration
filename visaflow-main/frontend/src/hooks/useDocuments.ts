import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { client, handleResponse, type InferResponse, type InferSuccessResponse } from "~/lib/api";
import type { DocumentType } from "~/components/forms/types";

// Types inferred from backend routes - use InferSuccessResponse to exclude error variants
type DocumentsListResponse = InferSuccessResponse<
  InferResponse<Awaited<ReturnType<typeof client.api.documents.$get>>>
>;

// Document type - now the response IS the document (no wrapper)
export type Document = InferSuccessResponse<
  InferResponse<Awaited<ReturnType<(typeof client.api.documents)[":id"]["$get"]>>>
>;

// Upload URL response - now direct object (no wrapper)
type UploadUrlResponse = InferSuccessResponse<
  InferResponse<Awaited<ReturnType<(typeof client.api.documents)["upload-url"]["$post"]>>>
>;

// Check status response type
type CheckStatusResponse = {
  status: string;
  errorMessage?: string;
  queueBearStatus?: string;
  retryCount?: number;
};

// Retry response type
type RetryResponse = {
  success: boolean;
  message: string;
  queueBearMessageId: string;
};

interface UseDocumentsOptions {
  clientId: string;
  enabled?: boolean;
  defaultPageSize?: number;
}

export function useDocuments({
  clientId,
  enabled = true,
  defaultPageSize = 20,
}: UseDocumentsOptions) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // Pagination handlers
  const goToPage = useCallback((newPage: number) => {
    setPage(Math.max(1, newPage));
  }, []);

  const changePageSize = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  }, []);

  // List query
  const listQuery = useQuery({
    queryKey: ["documents", "list", clientId, { page, pageSize }],
    queryFn: async () => {
      const response = await client.api.documents.$get({
        query: {
          clientId,
          page: String(page),
          pageSize: String(pageSize),
        },
      });
      return handleResponse<DocumentsListResponse>(response);
    },
    enabled: enabled && !!clientId,
    placeholderData: (previousData) => previousData,
    // Poll every 3 seconds if there are pending/processing documents
    refetchInterval: (query) => {
      const items = query.state.data?.items;
      if (!items) return false;
      const hasPending = items.some(
        (doc) =>
          doc.extraction?.status === "pending" ||
          doc.extraction?.status === "processing"
      );
      return hasPending ? 3000 : false;
    },
  });

  // Get single document - response IS the document (no wrapper)
  const useGet = (id: string | undefined) => {
    return useQuery({
      queryKey: ["documents", "detail", id],
      queryFn: async () => {
        const response = await client.api.documents[":id"].$get({
          param: { id: id! },
        });
        return handleResponse<Document>(response);
      },
      enabled: enabled && !!id,
    });
  };

  // Upload mutation
  const useUpload = () => {
    return useMutation({
      mutationFn: async ({
        file,
        documentType,
      }: {
        file: File;
        documentType: DocumentType;
      }) => {
        // Step 1: Get pre-signed upload URL - response is now direct object
        const uploadUrlResponse = await client.api.documents["upload-url"].$post({
          json: {
            clientId,
            documentType,
            filename: file.name,
            contentType: file.type,
          },
        });
        const uploadData = await handleResponse<UploadUrlResponse>(uploadUrlResponse);

        // Step 2: Upload file directly to S3
        const s3Response = await fetch(uploadData.uploadUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        });

        if (!s3Response.ok) {
          throw new Error(`Failed to upload file: ${s3Response.statusText}`);
        }

        // Step 3: Create document record in database - response is now direct object
        const createResponse = await client.api.documents.$post({
          json: {
            documentId: uploadData.documentId,
            clientId,
            documentType,
            filePath: uploadData.key,
            originalFilename: file.name,
            mimeType: file.type,
            fileSize: file.size,
          },
        });
        const document = await handleResponse<Document>(createResponse);

        return document;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["documents", "list", clientId],
        });
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Operation failed");
      },
    });
  };

  // Delete mutation
  const useDelete = () => {
    return useMutation({
      mutationFn: async (id: string) => {
        const response = await client.api.documents[":id"].$delete({
          param: { id },
        });
        return handleResponse<{ success: boolean }>(response);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["documents", "list", clientId],
        });
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Operation failed");
      },
    });
  };

  // Retry failed document mutation
  const useRetry = () => {
    return useMutation({
      mutationFn: async (id: string) => {
        const response = await client.api.documents[":id"].retry.$post({
          param: { id },
        });
        return handleResponse<RetryResponse>(response);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["documents", "list", clientId],
        });
        toast.success("Document queued for reprocessing");
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Failed to retry");
      },
    });
  };

  // Check and sync status with QueueBear
  const useCheckStatus = () => {
    return useMutation({
      mutationFn: async (id: string) => {
        const response = await client.api.documents[":id"]["check-status"].$get({
          param: { id },
        });
        return handleResponse<CheckStatusResponse>(response);
      },
      onSuccess: (data) => {
        // If status changed, invalidate queries to refresh UI
        if (data.status === "failed" || data.status === "completed") {
          queryClient.invalidateQueries({
            queryKey: ["documents", "list", clientId],
          });
        }
      },
    });
  };

  return {
    // List data - items array directly (no need for data.data)
    data: listQuery.data?.items ?? [],
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    error: listQuery.error,
    refetch: listQuery.refetch,
    // Pagination state
    page,
    pageSize,
    totalPages: listQuery.data?.totalPages ?? 0,
    total: listQuery.data?.total ?? 0,
    // Pagination handlers
    goToPage,
    changePageSize,
    // CRUD hooks
    useGet,
    useUpload,
    useDelete,
    useRetry,
    useCheckStatus,
  };
}
