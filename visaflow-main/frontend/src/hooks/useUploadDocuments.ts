import { useState, useCallback } from "react";
import { useDocuments } from "./useDocuments";
import type { UploadFile, DocumentType } from "~/components/forms/types";

interface UseUploadDocumentsOptions {
  clientId: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface UseUploadDocumentsReturn {
  uploadDocuments: (files: UploadFile[]) => Promise<void>;
  isUploading: boolean;
}

export function useUploadDocuments({
  clientId,
  onSuccess,
  onError,
}: UseUploadDocumentsOptions): UseUploadDocumentsReturn {
  const [isUploading, setIsUploading] = useState(false);
  const { useUpload } = useDocuments({ clientId, enabled: !!clientId });
  const uploadMutation = useUpload();

  const uploadDocuments = useCallback(
    async (files: UploadFile[]) => {
      const filesToUpload = files.filter((f) => f.documentType && !f.error);
      if (filesToUpload.length === 0) return;

      setIsUploading(true);
      try {
        for (const uploadFile of filesToUpload) {
          await uploadMutation.mutateAsync({
            file: uploadFile.file,
            documentType: uploadFile.documentType as DocumentType,
          });
        }
        onSuccess?.();
      } catch (error) {
        onError?.(error as Error);
        console.error("Upload failed:", error);
      } finally {
        setIsUploading(false);
      }
    },
    [uploadMutation, onSuccess, onError]
  );

  return { uploadDocuments, isUploading };
}
