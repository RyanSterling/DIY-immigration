import { useState, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { client, handleResponse } from '~/lib/api';

const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface UploadUrlResponse {
  uploadUrl: string;
  key: string;
}

interface DownloadUrlResponse {
  downloadUrl: string;
}

interface UseFormTemplatePdfUploadOptions {
  templateId: string;
  onSuccess?: (key: string) => void;
  onError?: (error: Error) => void;
}

interface UseFormTemplatePdfUploadReturn {
  uploadPdf: (file: File) => Promise<string | null>;
  getDownloadUrl: () => Promise<string | null>;
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
  validateFile: (file: File) => { valid: boolean; error?: string };
  pendingFile: File | null;
  pendingFilePreviewUrl: string | null;
  stageFile: (file: File) => boolean;
  clearPendingFile: () => void;
  uploadPendingFile: () => Promise<string | null>;
}

/**
 * Hook for uploading and downloading PDF templates for form templates.
 * Handles file validation, pre-signed URL generation, and S3 upload.
 */
export function useFormTemplatePdfUpload({
  templateId,
  onSuccess,
  onError,
}: UseFormTemplatePdfUploadOptions): UseFormTemplatePdfUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingFilePreviewUrl, setPendingFilePreviewUrl] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Clean up preview URL on unmount
  useEffect(() => {
    return () => {
      if (pendingFilePreviewUrl) {
        URL.revokeObjectURL(pendingFilePreviewUrl);
      }
    };
  }, [pendingFilePreviewUrl]);

  /**
   * Validate a file before upload
   */
  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    // Check file type
    if (file.type !== 'application/pdf') {
      return { valid: false, error: 'File must be a PDF' };
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return { valid: false, error: `File size must be less than ${MAX_FILE_SIZE_MB}MB` };
    }

    return { valid: true };
  }, []);

  /**
   * Upload a PDF file to S3 and return the S3 key
   */
  const uploadPdf = useCallback(async (file: File): Promise<string | null> => {
    setError(null);
    setUploadProgress(0);

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      onError?.(new Error(validation.error || 'Invalid file'));
      return null;
    }

    setIsUploading(true);

    try {
      // Step 1: Get pre-signed upload URL
      const uploadUrlResponse = await client.api.admin['form-templates'][':id']['pdf-upload-url'].$post({
        param: { id: templateId },
        json: {
          filename: file.name,
          contentType: 'application/pdf',
        },
      });
      const { uploadUrl, key } = await handleResponse<UploadUrlResponse>(uploadUrlResponse);

      setUploadProgress(20);

      // Step 2: Upload file to S3
      const s3Response = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': 'application/pdf',
        },
      });

      if (!s3Response.ok) {
        throw new Error(`Failed to upload file: ${s3Response.statusText}`);
      }

      setUploadProgress(100);

      // Invalidate the template query to refresh the data
      queryClient.invalidateQueries({ queryKey: ['admin', 'form-templates', 'detail', templateId] });

      onSuccess?.(key);
      return key;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [templateId, validateFile, onSuccess, onError, queryClient]);

  /**
   * Get a pre-signed download URL for the existing PDF
   */
  const getDownloadUrl = useCallback(async (): Promise<string | null> => {
    try {
      const response = await client.api.admin['form-templates'][':id']['pdf-download-url'].$get({
        param: { id: templateId },
      });
      const { downloadUrl } = await handleResponse<DownloadUrlResponse>(response);
      return downloadUrl;
    } catch (err) {
      console.error('Failed to get download URL:', err);
      return null;
    }
  }, [templateId]);

  /**
   * Stage a file for upload (validates and stores locally, doesn't upload yet)
   * Returns true if file is valid and was staged
   */
  const stageFile = useCallback((file: File): boolean => {
    setError(null);

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return false;
    }

    // Revoke old preview URL if exists
    if (pendingFilePreviewUrl) {
      URL.revokeObjectURL(pendingFilePreviewUrl);
    }

    // Create new preview URL and store file
    const previewUrl = URL.createObjectURL(file);
    setPendingFile(file);
    setPendingFilePreviewUrl(previewUrl);
    return true;
  }, [validateFile, pendingFilePreviewUrl]);

  /**
   * Clear the pending file and revoke preview URL
   */
  const clearPendingFile = useCallback(() => {
    if (pendingFilePreviewUrl) {
      URL.revokeObjectURL(pendingFilePreviewUrl);
    }
    setPendingFile(null);
    setPendingFilePreviewUrl(null);
    setError(null);
  }, [pendingFilePreviewUrl]);

  /**
   * Upload the staged pending file to S3
   * Returns the S3 key on success, null on failure or if no file staged
   */
  const uploadPendingFile = useCallback(async (): Promise<string | null> => {
    if (!pendingFile) {
      return null;
    }

    const key = await uploadPdf(pendingFile);
    if (key) {
      // Clear pending state on successful upload
      clearPendingFile();
    }
    return key;
  }, [pendingFile, uploadPdf, clearPendingFile]);

  return {
    uploadPdf,
    getDownloadUrl,
    isUploading,
    uploadProgress,
    error,
    validateFile,
    pendingFile,
    pendingFilePreviewUrl,
    stageFile,
    clearPendingFile,
    uploadPendingFile,
  };
}
