import { useState, useCallback, useEffect, useRef } from "react";
import { useFormContext } from "react-hook-form";
import FileUpload from "~/components/forms/FileUpload";
import {
  usePendingDocuments,
  type ExtractedField,
} from "~/hooks/usePendingDocuments";
import { client, handleResponse } from "~/lib/api";
import type { UploadFile, UploadFileStatus, DocumentType } from "~/components/forms/types";
import type { ClientNewFormData, FieldValueSelection, ExtractedFieldValue } from "./types";
import { generateFileId } from "~/components/forms/types";

interface ClientNewDocumentsProps {
  onProcessingChange?: (isProcessing: boolean) => void;
}

// Extended type to include document info for each extracted field
interface ExtractedFieldWithSource extends ExtractedField {
  documentId: string;
  documentType: DocumentType;
}

/**
 * Aggregate extracted fields from multiple documents into FieldValueSelection format.
 * Groups by canonicalField and detects conflicts when multiple different values exist.
 * - If conflict: no pre-selection (user must explicitly choose)
 * - If no conflict: auto-select the value
 */
function aggregateExtractedFields(
  fieldsByDocument: ExtractedFieldWithSource[]
): Record<string, FieldValueSelection> {
  const grouped: Record<string, ExtractedFieldValue[]> = {};

  // Group all values by canonical field
  for (const field of fieldsByDocument) {
    if (!grouped[field.canonicalField]) {
      grouped[field.canonicalField] = [];
    }

    grouped[field.canonicalField].push({
      id: generateFileId(), // Generate unique ID for UI keying
      // Use normalized display if available, otherwise use raw value
      value: field.normalizedValue?.display ?? field.rawValue,
      rawValue: field.rawValue,
      normalizedValue: field.normalizedValue ?? null,
      valueType: field.valueType,
      source: "extraction",
      documentId: field.documentId,
      documentType: field.documentType,
      confidenceScore: field.confidenceScore,
    });
  }

  // Convert to FieldValueSelection format
  const result: Record<string, FieldValueSelection> = {};

  for (const [canonicalField, values] of Object.entries(grouped)) {
    // Sort by confidence (highest first)
    const sortedValues = [...values].sort(
      (a, b) => (b.confidenceScore ?? 0) - (a.confidenceScore ?? 0)
    );

    // Detect conflict: check if there are multiple DIFFERENT rawValues
    const uniqueRawValues = new Set(values.map((v) => v.rawValue));
    const hasConflict = uniqueRawValues.size > 1;

    result[canonicalField] = {
      canonicalField,
      values: sortedValues,
      // Force explicit selection for conflicts, auto-select for non-conflicts
      selectedValueId: hasConflict ? null : (sortedValues[0]?.id ?? null),
      manualValue: "",
      useManual: false,
      noValueNeeded: false,
      hasConflict,
    };
  }

  return result;
}

export default function ClientNewDocuments({
  onProcessingChange,
}: ClientNewDocumentsProps) {
  const { setValue, getValues } = useFormContext<ClientNewFormData>();
  const [isProcessing, setIsProcessing] = useState(false);

  const { uploadedDocumentIdsRef, useUploadPending } = usePendingDocuments();

  const uploadPendingMutation = useUploadPending();

  // Track mapping between file IDs (client-side) and document IDs (backend)
  const fileToDocumentMapRef = useRef<Record<string, string>>({});

  // Track document types for each document ID
  const documentTypeMapRef = useRef<Record<string, DocumentType>>({});

  // Track expected number of uploads to wait for before polling completes
  const expectedUploadCountRef = useRef<number>(0);

  // Track extraction completion for each document
  const [_documentExtractionStatus, setDocumentExtractionStatus] = useState<
    Record<string, "pending" | "processing" | "completed" | "failed">
  >({});

  // Notify parent of processing state changes
  useEffect(() => {
    onProcessingChange?.(isProcessing);
  }, [isProcessing, onProcessingChange]);

  // Helper function to update a specific file's status
  // Uses getValues() to get current state at call time, avoiding stale closure issues
  const updateFileStatus = useCallback(
    (fileId: string, status: UploadFileStatus) => {
      const currentFiles = getValues("documents") || [];
      const updatedFiles = currentFiles.map((f) =>
        f.id === fileId ? { ...f, status } : f
      );
      setValue("documents", updatedFiles);
    },
    [getValues, setValue]
  );

  // Helper function to update multiple files' status
  // Uses getValues() to get current state at call time, avoiding stale closure issues
  const updateFilesStatus = useCallback(
    (
      updates: {
        fileId: string;
        status: UploadFileStatus;
        processed?: boolean;
      }[]
    ) => {
      const currentFiles = getValues("documents") || [];
      const updatedFiles = currentFiles.map((f) => {
        const update = updates.find((u) => u.fileId === f.id);
        if (update) {
          return {
            ...f,
            status: update.status,
            processed: update.processed ?? f.processed,
          };
        }
        return f;
      });
      setValue("documents", updatedFiles);
    },
    [getValues, setValue]
  );

  // Poll extracted fields for each uploaded document
  // Uses ref to avoid stale closures and includes cleanup to prevent multiple polling loops
  useEffect(() => {
    // Cancellation flag to prevent stale callbacks from executing
    let cancelled = false;

    const pollExtractions = async () => {
      // Early exit if this polling instance was cancelled
      if (cancelled) return;

      // IMPORTANT: Read from ref to get CURRENT value, not stale closure
      const currentDocIds = uploadedDocumentIdsRef.current;

      // Wait until all expected uploads have completed before polling
      if (currentDocIds.length < expectedUploadCountRef.current) {
        console.log(
          "[Polling] Waiting for all uploads to complete:",
          currentDocIds.length,
          "/",
          expectedUploadCountRef.current
        );
        if (!cancelled) {
          setTimeout(pollExtractions, 1000);
        }
        return;
      }

      // Don't poll if there are no documents
      if (currentDocIds.length === 0) return;

      console.log(
        "[Polling] Checking extraction status for documents:",
        currentDocIds
      );
      const allFieldsWithSource: ExtractedFieldWithSource[] = [];
      const newStatus: Record<
        string,
        "pending" | "processing" | "completed" | "failed"
      > = {};

      for (const docId of currentDocIds) {
        // Check cancellation between API calls
        if (cancelled) return;

        try {
          const response = await client.api.documents[":id"][
            "extracted-fields"
          ].$get({
            param: { id: docId },
          });
          const result = await handleResponse<{
            items: ExtractedField[];
            status: "pending" | "processing" | "completed" | "failed";
          }>(response);

          console.log(
            `[Polling] Document ${docId} status:`,
            result.status,
            "fields:",
            result.items?.length ?? 0
          );

          newStatus[docId] = result.status || "pending";

          if (result.status === "completed" && result.items) {
            // Add document info to each field
            const docType = documentTypeMapRef.current[docId];
            for (const field of result.items) {
              allFieldsWithSource.push({
                ...field,
                documentId: docId,
                documentType: docType,
              });
            }
          }
        } catch (err) {
          console.error(`[Polling] Error fetching document ${docId}:`, err);
          newStatus[docId] = "failed";
        }
      }

      // Early exit if cancelled during API calls
      if (cancelled) return;

      setDocumentExtractionStatus(newStatus);
      console.log("[Polling] All statuses:", newStatus);

      // Update file statuses based on document extraction status
      const documentToFileMap = Object.fromEntries(
        Object.entries(fileToDocumentMapRef.current).map(([fileId, docId]) => [
          docId,
          fileId,
        ])
      );
      const fileStatusUpdates: {
        fileId: string;
        status: UploadFileStatus;
        processed?: boolean;
      }[] = [];
      for (const [docId, status] of Object.entries(newStatus)) {
        const fileId = documentToFileMap[docId];
        if (fileId) {
          if (status === "completed") {
            fileStatusUpdates.push({
              fileId,
              status: "completed",
              processed: true,
            });
          } else if (status === "failed") {
            fileStatusUpdates.push({
              fileId,
              status: "failed",
              processed: false,
            });
          }
        }
      }
      if (fileStatusUpdates.length > 0) {
        updateFilesStatus(fileStatusUpdates);
      }

      // Check if all documents are processed
      const allCompleted = Object.values(newStatus).every(
        (status) => status === "completed" || status === "failed"
      );

      console.log(
        "[Polling] All completed?",
        allCompleted,
        "Total fields:",
        allFieldsWithSource.length
      );

      if (allCompleted && allFieldsWithSource.length > 0) {
        // Aggregate extracted fields into fieldSelections format
        const fieldSelections = aggregateExtractedFields(allFieldsWithSource);
        console.log("[Polling] Aggregated field selections:", fieldSelections);

        // Update form with field selections
        setValue("fieldSelections", fieldSelections);

        expectedUploadCountRef.current = 0;
        setIsProcessing(false);
      } else if (!allCompleted) {
        // Continue polling
        console.log("[Polling] Not all complete, polling again in 3s...");
        if (!cancelled) {
          setTimeout(pollExtractions, 3000);
        }
      } else {
        // All completed but no fields extracted
        console.log("[Polling] All completed but no fields extracted");
        expectedUploadCountRef.current = 0;
        setIsProcessing(false);
      }
    };

    if (isProcessing) {
      pollExtractions();
    }

    // Cleanup: cancel this polling instance when effect re-runs or unmounts
    return () => {
      cancelled = true;
    };
  }, [isProcessing, uploadedDocumentIdsRef, updateFilesStatus, setValue]);

  // Handler for Process All button
  const handleProcessAll = useCallback(
    async (files: UploadFile[]) => {
      console.log(
        "[ClientNewDocuments] handleProcessAll called with",
        files.length,
        "files"
      );

      // Get files that haven't been processed yet (excluding failed ones which can be retried)
      const unprocessedFiles = files.filter(
        (f) => !f.processed && f.status !== "completed"
      );

      // Check if any unprocessed files are missing a document type
      const filesMissingType = unprocessedFiles.filter((f) => !f.documentType);

      if (filesMissingType.length > 0) {
        // Set error on files missing document type
        const updatedFiles = files.map((f) => {
          if (!f.documentType && !f.processed && f.status !== "completed") {
            return { ...f, error: "Please select a document type" };
          }
          // Clear previous "select type" errors if type is now selected
          if (f.error === "Please select a document type" && f.documentType) {
            return { ...f, error: undefined };
          }
          return f;
        });
        setValue("documents", updatedFiles);
        console.log(
          "[ClientNewDocuments] Files missing document type:",
          filesMissingType.length
        );
        return;
      }

      // Filter files that have a document type, no errors, and haven't been processed yet
      const filesToUpload = unprocessedFiles.filter(
        (f) => f.documentType && !f.error
      );

      console.log(
        "[ClientNewDocuments] Files to upload after filtering:",
        filesToUpload.length
      );

      if (filesToUpload.length === 0) {
        console.log(
          "[ClientNewDocuments] No files to process - all filtered out"
        );
        return;
      }

      setIsProcessing(true);
      // Clear the mappings for a fresh start
      fileToDocumentMapRef.current = {};
      documentTypeMapRef.current = {};
      // Track how many uploads we're expecting so polling waits for all of them
      expectedUploadCountRef.current = filesToUpload.length;

      // Set all files to 'uploading' status immediately
      // Use getValues to get current state, avoiding stale closure issues
      const currentFiles = getValues("documents") || [];
      const updatedFiles = currentFiles.map((f) => {
        const isBeingUploaded = filesToUpload.some((u) => u.id === f.id);
        return isBeingUploaded ? { ...f, status: "uploading" as const } : f;
      });
      setValue("documents", updatedFiles);

      // Upload all files in parallel
      const uploadPromises = filesToUpload.map(async (uploadFile) => {
        try {
          console.log(
            "[ClientNewDocuments] Starting upload for:",
            uploadFile.file.name,
            uploadFile.documentType
          );
          const documentId = await uploadPendingMutation.mutateAsync({
            file: uploadFile.file,
            documentType: uploadFile.documentType!,
          });
          console.log(
            "[ClientNewDocuments] Upload completed for:",
            uploadFile.file.name,
            "documentId:",
            documentId
          );

          // Track the mapping and update status to 'processing'
          fileToDocumentMapRef.current[uploadFile.id] = documentId;
          documentTypeMapRef.current[documentId] = uploadFile.documentType!;
          updateFileStatus(uploadFile.id, "processing");

          return { success: true, fileId: uploadFile.id, documentId };
        } catch (error) {
          console.error(
            "[ClientNewDocuments] Error uploading:",
            uploadFile.file.name,
            error
          );
          updateFileStatus(uploadFile.id, "failed");
          return { success: false, fileId: uploadFile.id, error };
        }
      });

      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter((r) => r.success);

      if (successfulUploads.length > 0) {
        // Extract document IDs directly from successful upload results
        // (avoids stale closure issue with uploadedDocumentIds from hook state)
        const newDocumentIds = successfulUploads
          .filter((r): r is { success: true; fileId: string; documentId: string } => r.success)
          .map((r) => r.documentId);

        // Sync to form state for use in submit handler
        setValue("uploadedDocumentIds", newDocumentIds);
        console.log(
          "[ClientNewDocuments] Uploads completed:",
          successfulUploads.length,
          "successful, document IDs synced to form:",
          newDocumentIds
        );
      } else {
        console.log("[ClientNewDocuments] All uploads failed");
        expectedUploadCountRef.current = 0;
        setIsProcessing(false);
      }
    },
    [getValues, uploadPendingMutation, updateFileStatus, setValue]
  );

  // Handle file changes from FileUpload
  // This callback is called after FileUpload updates RHF, so we only need to
  // setValue if we actually modify any files
  const handleFilesChange = useCallback(
    (files: UploadFile[]) => {
      // Clear "Please select a document type" error when user selects a type
      const hasFilesToUpdate = files.some(
        (f) => f.error === "Please select a document type" && f.documentType
      );

      if (hasFilesToUpdate) {
        const updatedFiles = files.map((f) => {
          if (f.error === "Please select a document type" && f.documentType) {
            return { ...f, error: undefined };
          }
          return f;
        });
        setValue("documents", updatedFiles);
      }
    },
    [setValue]
  );

  return (
    <div className="space-y-4">
      <p className="text-gray-600 text-sm">
        We'll automatically extract names, dates, addresses, and immigration
        details to pre-fill all your forms.
      </p>

      <FileUpload
        name="documents"
        onFilesChange={handleFilesChange}
        onProcessAll={handleProcessAll}
        isLoading={isProcessing}
        helperText="Upload passports, visas, resumes, or other supporting documents"
      />
    </div>
  );
}
