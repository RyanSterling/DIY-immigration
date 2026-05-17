import { cn } from "~/utils/cn";
import type { Document } from "~/hooks/useDocuments";
import { getDocumentTypeLabel } from "~/lib/document-utils";

interface DocumentItemProps {
  document: Document;
  onDelete?: () => void;
  onDownload?: () => void;
  onRetry?: () => void;
  isDeleting?: boolean;
  isRetrying?: boolean;
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentItem({
  document,
  onDelete,
  onDownload,
  onRetry,
  isDeleting = false,
  isRetrying = false,
}: DocumentItemProps) {
  const hasFailed = document.extraction?.status === "failed";

  return (
    <div
      className={cn(
        "relative flex items-center gap-3 rounded-md border p-3",
        hasFailed ? "border-red-200 bg-red-50" : "border-gray-200 bg-white"
      )}
    >
      {/* File Icon */}
      <div className="shrink-0">
        <svg
          className={cn(
            "h-8 w-8",
            hasFailed ? "text-red-400" : "text-gray-400"
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
          />
        </svg>
      </div>

      {/* File Info */}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm font-medium",
            hasFailed ? "text-red-700" : "text-gray-900"
          )}
          title={document.originalFilename}
        >
          {document.originalFilename}
        </p>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
          <span>{getDocumentTypeLabel(document.documentType)}</span>
          {document.fileSize && (
            <>
              <span>•</span>
              <span>{formatFileSize(document.fileSize)}</span>
            </>
          )}
        </div>
        {hasFailed && document.extraction?.errorMessage && (
          <p className="mt-1 text-xs text-red-600">
            {document.extraction.errorMessage}
          </p>
        )}
      </div>

      {/* Download Button */}
      {document.downloadUrl && onDownload && (
        <button
          type="button"
          onClick={onDownload}
          className={cn(
            "shrink-0 rounded p-1.5 transition-colors",
            "text-gray-400 hover:bg-gray-100 hover:text-gray-600",
            "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
          )}
          aria-label={`Download ${document.originalFilename}`}
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
            />
          </svg>
        </button>
      )}

      {/* Retry Button - only show for failed documents */}
      {hasFailed && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className={cn(
            "shrink-0 rounded p-1.5 transition-colors",
            "text-gray-400 hover:bg-gray-100 hover:text-blue-600",
            "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1",
            isRetrying && "cursor-not-allowed opacity-50"
          )}
          aria-label={`Retry processing ${document.originalFilename}`}
        >
          {isRetrying ? (
            <svg
              className="h-5 w-5 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
          )}
        </button>
      )}

      {/* Delete Button */}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className={cn(
            "shrink-0 rounded p-1.5 transition-colors",
            "text-gray-400 hover:bg-gray-100 hover:text-red-600",
            "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1",
            isDeleting && "cursor-not-allowed opacity-50"
          )}
          aria-label={`Delete ${document.originalFilename}`}
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
            />
          </svg>
        </button>
      )}

      {/* Deleting Overlay */}
      {isDeleting && (
        <div className="absolute inset-0 flex items-center justify-center rounded-md bg-white/70">
          <svg
            className="h-5 w-5 animate-spin text-primary-600"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

export default DocumentItem;
export type { DocumentItemProps };
