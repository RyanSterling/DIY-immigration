import { cn } from "~/utils/cn";
import {
  DOCUMENT_TYPE_OPTIONS,
  type DocumentType,
  type UploadFile,
} from "./types";

interface FileItemProps {
  file: UploadFile;
  onRemove: () => void;
  onTypeChange: (type: DocumentType) => void;
  errorMessage?: string;
}

function FileItem({
  file,
  onRemove,
  onTypeChange,
  errorMessage,
}: FileItemProps) {
  const hasError = !!errorMessage || !!file.error || file.status === "failed";
  const displayError = errorMessage || file.error;
  const isProcessing =
    file.status === "uploading" || file.status === "processing";
  const showProcessedStatus =
    isProcessing || file.processed || file.status === "failed";

  return (
    <div
      className={cn(
        "relative flex items-center gap-3 rounded-md border p-3",
        hasError ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"
      )}
    >
      {/* File Icon */}
      <div className="shrink-0">
        <svg
          className={cn("h-8 w-8", hasError ? "text-red-400" : "text-gray-400")}
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

      {/* File Name */}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm font-medium",
            hasError ? "text-red-700" : "text-gray-900"
          )}
          title={file.file.name}
        >
          {file.file.name}
        </p>
        {displayError && (
          <p className="mt-0.5 text-xs text-red-600">{displayError}</p>
        )}
      </div>

      {/* Document Type Dropdown */}
      <div className="shrink-0">
        <select
          value={file.documentType || ""}
          onChange={(e) => onTypeChange(e.target.value as DocumentType)}
          disabled={isProcessing || file.processed}
          className={cn(
            "block rounded-md border px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1",
            hasError
              ? "border-red-300 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:border-primary-500 focus:ring-primary-500",
            (isProcessing || file.processed) && "cursor-not-allowed opacity-50"
          )}
        >
          <option value="" disabled>
            Select type...
          </option>
          {DOCUMENT_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Status Indicator */}
      {showProcessedStatus && (
        <div className="shrink-0">
          {isProcessing ? (
            // Uploading/Processing - show spinner
            <svg
              className="h-5 w-5 animate-spin text-blue-500"
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
          ) : file.status === "failed" ? (
            // Failed - show red error icon
            <svg
              className="h-5 w-5 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
              />
            </svg>
          ) : file.processed || file.status === "completed" ? (
            // Completed - show green checkmark
            <svg
              className="h-5 w-5 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          ) : (
            // Idle - show empty circle
            <svg
              className="h-5 w-5 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          )}
        </div>
      )}

      {/* Remove Button - only enabled before processing starts */}
      {(!file.status || file.status === "idle") && (
        <button
          type="button"
          onClick={onRemove}
          className={cn(
            "shrink-0 rounded p-1 transition-colors",
            "text-gray-400 hover:bg-gray-100 hover:text-gray-600",
            "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
          )}
          aria-label={`Remove ${file.file.name}`}
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
              d="M6 18 18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

export default FileItem;
export type { FileItemProps };
