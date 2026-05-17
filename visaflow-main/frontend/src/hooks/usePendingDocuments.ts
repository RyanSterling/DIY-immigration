import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client, handleResponse, type InferResponse, type InferSuccessResponse } from "~/lib/api";
import type { DocumentType } from "~/components/forms/types";

// Types inferred from backend routes - use InferSuccessResponse to exclude error variants
type UploadUrlResponse = InferSuccessResponse<
  InferResponse<Awaited<ReturnType<(typeof client.api.documents)["upload-url"]["$post"]>>>
>;
type DocumentResponse = InferSuccessResponse<
  InferResponse<Awaited<ReturnType<(typeof client.api.documents)[":id"]["$get"]>>>
>;

// Extracted field type from backend
export interface ExtractedField {
  canonicalField: string;
  rawFieldName: string;
  rawValue: string;
  valueType: "text" | "date" | "number" | "boolean" | "country";
  normalizedValue?: {
    display: string;     // Formatted for display (e.g., "04/09/2003", "Mexico")
    original: string;    // Original extracted text
    iso?: string;        // For dates: ISO format (YYYY-MM-DD)
    code?: string;       // For countries/gender: short code (e.g., "MEX", "M")
  } | null;
  confidenceScore?: number;
  boundingBox?: {
    width: number;
    height: number;
    left: number;
    top: number;
  };
}

interface ExtractedFieldsResponse {
  items: ExtractedField[];
  status: "pending" | "processing" | "completed" | "failed";
  message?: string;
}

interface AssignClientResponse {
  success: boolean;
  assignedCount: number;
}

/**
 * Hook for managing pending document uploads (documents without a client).
 * Used in the new client creation flow where documents are uploaded before the client exists.
 */
export function usePendingDocuments() {
  const queryClient = useQueryClient();
  const [uploadedDocumentIds, setUploadedDocumentIds] = useState<string[]>([]);
  // Ref to track document IDs synchronously for polling - avoids stale closure issues
  const uploadedDocumentIdsRef = useRef<string[]>([]);

  /**
   * Upload a document without a client (pending document).
   * Returns the document ID for tracking.
   */
  const useUploadPending = () => {
    return useMutation({
      mutationFn: async ({
        file,
        documentType,
      }: {
        file: File;
        documentType: DocumentType;
      }): Promise<string> => {
        // Step 1: Get pre-signed upload URL (no clientId)
        console.log("[Upload] Step 1: Getting pre-signed URL for:", file.name, documentType);
        const uploadUrlResponse = await client.api.documents["upload-url"].$post({
          json: {
            documentType,
            filename: file.name,
            contentType: file.type,
            // clientId is intentionally omitted for pending documents
          },
        });
        const uploadData = await handleResponse<UploadUrlResponse>(uploadUrlResponse);
        console.log("[Upload] Got upload data:", { documentId: uploadData.documentId, key: uploadData.key });

        // Step 2: Upload file directly to S3
        console.log("[Upload] Uploading to S3:", uploadData.uploadUrl.substring(0, 100) + "...");
        console.log("[Upload] File:", file.name, file.type, file.size);

        const s3Response = await fetch(uploadData.uploadUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        });

        console.log("[Upload] S3 response status:", s3Response.status, s3Response.statusText);

        if (!s3Response.ok) {
          const errorText = await s3Response.text();
          console.error("[Upload] S3 error response:", errorText);
          throw new Error(`Failed to upload file: ${s3Response.statusText} - ${errorText}`);
        }

        console.log("[Upload] S3 upload successful, creating document record...");

        // Step 3: Create document record in database (no clientId)
        const createResponse = await client.api.documents.$post({
          json: {
            documentId: uploadData.documentId,
            documentType,
            filePath: uploadData.key,
            originalFilename: file.name,
            mimeType: file.type,
            fileSize: file.size,
            // clientId is intentionally omitted for pending documents
          },
        });
        await handleResponse<DocumentResponse>(createResponse);

        // Return the document ID for tracking
        return uploadData.documentId;
      },
      onSuccess: (documentId) => {
        // Update ref first (synchronous, immediately visible to polling)
        uploadedDocumentIdsRef.current = [...uploadedDocumentIdsRef.current, documentId];
        // Then update state (triggers re-render)
        setUploadedDocumentIds(uploadedDocumentIdsRef.current);
      },
    });
  };

  /**
   * Get a single document's details and extraction status.
   */
  const useGetDocument = (documentId: string | undefined) => {
    return useQuery({
      queryKey: ["documents", "detail", documentId],
      queryFn: async () => {
        const response = await client.api.documents[":id"].$get({
          param: { id: documentId! },
        });
        return handleResponse<DocumentResponse>(response);
      },
      enabled: !!documentId,
      // Poll for extraction status - response IS the document (no wrapper)
      refetchInterval: (query) => {
        const doc = query.state.data;
        if (!doc) return false;
        const isPending =
          doc.extraction?.status === "pending" ||
          doc.extraction?.status === "processing";
        return isPending ? 3000 : false;
      },
    });
  };

  /**
   * Get extracted fields from a document (parsed from rawTextractResponse).
   * Used before the document is assigned to a client.
   */
  const useExtractedFields = (documentId: string | undefined) => {
    return useQuery({
      queryKey: ["documents", "extracted-fields", documentId],
      queryFn: async () => {
        const response = await client.api.documents[":id"]["extracted-fields"].$get({
          param: { id: documentId! },
        });
        return handleResponse<ExtractedFieldsResponse>(response);
      },
      enabled: !!documentId,
      // Poll until extraction is completed
      refetchInterval: (query) => {
        const data = query.state.data;
        if (!data) return 3000;
        return data.status === "completed" || data.status === "failed"
          ? false
          : 3000;
      },
    });
  };

  /**
   * Assign documents to a client.
   * This is called after the client is created to link pending documents.
   */
  const useAssignClient = () => {
    return useMutation({
      mutationFn: async ({
        documentIds,
        clientId,
      }: {
        documentIds: string[];
        clientId: string;
      }) => {
        const response = await client.api.documents["assign-client"].$patch({
          json: { documentIds, clientId },
        });
        return handleResponse<AssignClientResponse>(response);
      },
      onSuccess: () => {
        // Clear tracked document IDs (both ref and state)
        uploadedDocumentIdsRef.current = [];
        setUploadedDocumentIds([]);
        // Invalidate document queries
        queryClient.invalidateQueries({
          queryKey: ["documents"],
        });
      },
    });
  };

  /**
   * Clear tracked document IDs (e.g., when resetting the form).
   */
  const clearUploadedDocuments = useCallback(() => {
    uploadedDocumentIdsRef.current = [];
    setUploadedDocumentIds([]);
  }, []);

  return {
    // State
    uploadedDocumentIds,
    // Ref for polling (avoids stale closure issues)
    uploadedDocumentIdsRef,
    // Mutations
    useUploadPending,
    useGetDocument,
    useExtractedFields,
    useAssignClient,
    // Helpers
    clearUploadedDocuments,
  };
}
