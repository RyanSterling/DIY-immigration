import { useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import Button from '~/components/Button';
import { useFormTemplatePdfUpload } from '~/hooks/useFormTemplatePdfUpload';
import { cn } from '~/utils/cn';

export interface PdfTemplateUploadHandle {
  uploadPendingFile: () => Promise<string | null>;
  hasPendingFile: boolean;
}

interface PdfTemplateUploadProps {
  templateId: string;
  currentPdfUrl: string | null | undefined;
  onUploadComplete: (key: string) => void;
  onPendingFileChange?: (file: File | null) => void;
  disabled?: boolean;
}

/**
 * Component for uploading and managing PDF templates for form templates.
 * Shows current state (no PDF / has PDF with filename) and provides upload functionality.
 * File selection stages the file locally; actual upload happens when parent calls uploadPendingFile.
 */
export const PdfTemplateUpload = forwardRef<PdfTemplateUploadHandle, PdfTemplateUploadProps>(
  function PdfTemplateUpload(
    {
      templateId,
      currentPdfUrl,
      onUploadComplete,
      onPendingFileChange,
      disabled = false,
    },
    ref
  ) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const {
    getDownloadUrl,
    isUploading,
    uploadProgress,
    error,
    pendingFile,
    stageFile,
    clearPendingFile,
    uploadPendingFile,
  } = useFormTemplatePdfUpload({
    templateId,
    onSuccess: onUploadComplete,
  });

  // Expose uploadPendingFile and hasPendingFile to parent via ref
  useImperativeHandle(ref, () => ({
    uploadPendingFile,
    get hasPendingFile() { return !!pendingFile; },
  }), [uploadPendingFile, pendingFile]);

  // Extract filename from S3 key (format: form-templates/{templateId}/{filename})
  const currentFilename = currentPdfUrl
    ? currentPdfUrl.split('/').pop() || 'PDF Template'
    : null;

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const isValid = stageFile(file);
      if (isValid) {
        onPendingFileChange?.(file);
      }

      // Reset the input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [stageFile, onPendingFileChange]
  );

  const handleCancelPending = useCallback(() => {
    clearPendingFile();
    onPendingFileChange?.(null);
  }, [clearPendingFile, onPendingFileChange]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleDownloadClick = useCallback(async () => {
    if (!currentPdfUrl) return;

    setIsDownloading(true);
    try {
      const downloadUrl = await getDownloadUrl();
      if (downloadUrl) {
        // Open the download URL in a new tab
        window.open(downloadUrl, '_blank');
      }
    } finally {
      setIsDownloading(false);
    }
  }, [currentPdfUrl, getDownloadUrl]);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        PDF Template
      </label>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {/* Pending file state (yellow border) */}
      {pendingFile && !isUploading && (
        <div className="rounded-md border-2 border-yellow-400 bg-yellow-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                className="h-5 w-5 text-yellow-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <span className="text-sm font-medium text-yellow-800">{pendingFile.name}</span>
                <span className="ml-2 text-xs text-yellow-600 bg-yellow-200 px-2 py-0.5 rounded">
                  Pending upload
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCancelPending}
                disabled={disabled}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUploadClick}
                disabled={disabled}
              >
                Change
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Current state display (when no pending file) */}
      {!pendingFile && (
        <div
          className={cn(
            'rounded-md border p-4',
            currentPdfUrl
              ? 'border-green-200 bg-green-50'
              : 'border-gray-200 bg-gray-50'
          )}
        >
          {currentPdfUrl ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span className="text-sm text-gray-700">{currentFilename}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDownloadClick}
                  disabled={disabled || isDownloading}
                >
                  {isDownloading ? 'Opening...' : 'View'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUploadClick}
                  disabled={disabled || isUploading}
                >
                  {isUploading ? 'Uploading...' : 'Replace'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">No PDF template uploaded</span>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleUploadClick}
                disabled={disabled || isUploading}
              >
                {isUploading ? 'Uploading...' : 'Upload PDF'}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Upload progress */}
      {isUploading && (
        <div className="space-y-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-primary-600 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">Uploading... {uploadProgress}%</p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Help text */}
      <p className="text-xs text-gray-500">
        {pendingFile
          ? 'Click "Save All Changes" to upload this file.'
          : 'Upload a PDF file (max 50MB). This will be used as the template for form generation.'}
      </p>
    </div>
  );
});
