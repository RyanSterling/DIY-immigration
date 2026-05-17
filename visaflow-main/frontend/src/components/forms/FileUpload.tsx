import { useCallback, type ReactNode } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { useController, useFormContext } from "react-hook-form";
import { cn } from "~/utils/cn";
import { InputWrapper } from "~/atoms/InputWrapper";
import { getErrorMessage } from "~/lib/form-utils";
import FileItem from "./FileItem";
import Button from "~/atoms/Button";
import { generateFileId, type DocumentType, type UploadFile } from "./types";

interface FileUploadProps {
  name: string;
  label?: string;
  description?: string | ReactNode;
  descriptionPosition?: "top" | "bottom";
  accept?: Record<string, string[]>;
  maxSizeMb?: number;
  disabled?: boolean;
  hideLabel?: boolean;
  helperText?: string;
  id?: string;
  required?: boolean | string;
  onError?: (error: string) => void;
  onFilesChange?: (files: UploadFile[]) => void;
  onProcessAll?: (files: UploadFile[]) => void;
  isLoading?: boolean;
}

const DEFAULT_ACCEPT = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
};

const DEFAULT_MAX_SIZE_MB = 20;

function getDropzoneErrorMessage(code: string, maxSizeMb: number): string {
  switch (code) {
    case "file-too-large":
      return `File exceeds ${maxSizeMb}MB limit`;
    case "file-invalid-type":
      return "Invalid file type";
    case "too-many-files":
      return "Too many files";
    default:
      return "Upload failed";
  }
}

function FileUpload({
  name,
  label,
  description,
  descriptionPosition = "bottom",
  accept = DEFAULT_ACCEPT,
  maxSizeMb = DEFAULT_MAX_SIZE_MB,
  disabled = false,
  hideLabel = false,
  helperText,
  id,
  required = false,
  onError,
  onFilesChange,
  onProcessAll,
  isLoading = false,
}: FileUploadProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext();

  const fileId = id || name;
  const requiredMessage =
    typeof required === "string" ? required : "Please upload at least one file.";
  const errorMessage = getErrorMessage(name, errors);

  const { field } = useController({
    name,
    control,
    rules: {
      validate: required
        ? (value: UploadFile[]) => (value && value.length > 0) || requiredMessage
        : undefined,
    },
  });

  const files: UploadFile[] = field.value ?? [];
  const maxSizeBytes = maxSizeMb * 1024 * 1024;

  const updateFiles = useCallback(
    (newFiles: UploadFile[]) => {
      field.onChange(newFiles);
      onFilesChange?.(newFiles);
    },
    [field, onFilesChange]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      // Create UploadFile objects for accepted files
      const newAcceptedFiles: UploadFile[] = acceptedFiles.map((file) => ({
        id: generateFileId(),
        file,
      }));

      // Create UploadFile objects for rejected files with error messages
      const newRejectedFiles: UploadFile[] = rejectedFiles.map((rejection) => ({
        id: generateFileId(),
        file: rejection.file,
        error: getDropzoneErrorMessage(
          rejection.errors[0]?.code || "unknown",
          maxSizeMb
        ),
      }));

      // Report first error if any rejections
      if (rejectedFiles.length > 0 && onError) {
        const firstError = rejectedFiles[0].errors[0];
        onError(getDropzoneErrorMessage(firstError?.code || "unknown", maxSizeMb));
      }

      // Combine with existing files
      const allFiles = [...files, ...newAcceptedFiles, ...newRejectedFiles];
      updateFiles(allFiles);
    },
    [files, updateFiles, onError, maxSizeMb]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize: maxSizeBytes,
    disabled,
    multiple: true,
  });

  const handleRemove = useCallback(
    (fileIdToRemove: string) => {
      const updatedFiles = files.filter((f) => f.id !== fileIdToRemove);
      updateFiles(updatedFiles);
    },
    [files, updateFiles]
  );

  const handleTypeChange = useCallback(
    (fileIdToChange: string, documentType: DocumentType) => {
      const updatedFiles = files.map((f) =>
        f.id === fileIdToChange ? { ...f, documentType } : f
      );
      updateFiles(updatedFiles);
    },
    [files, updateFiles]
  );

  // Build helper text showing accepted formats
  const acceptedExtensions = Object.values(accept)
    .flat()
    .map((ext) => ext.replace(".", "").toUpperCase())
    .join(", ");

  const displayHelperText =
    helperText || `${acceptedExtensions} up to ${maxSizeMb}MB`;

  return (
    <InputWrapper
      description={description}
      descriptionPosition={descriptionPosition}
      disabled={disabled}
      error={errorMessage}
      hideLabel={hideLabel}
      htmlFor={fileId}
      label={label}
      required={Boolean(required)}
    >
      <div className="mt-1 space-y-3">
        {/* Drop Zone */}
        <div
          {...getRootProps()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
            isDragActive
              ? "border-primary-500 bg-primary-50"
              : errorMessage
                ? "border-red-300 bg-gray-50 hover:bg-gray-100"
                : "border-gray-300 bg-gray-50 hover:bg-gray-100",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          <input {...getInputProps()} id={fileId} />

          {/* Upload Icon */}
          <svg
            className={cn(
              "mb-3 h-10 w-10",
              isDragActive ? "text-primary-500" : "text-gray-400"
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z"
            />
          </svg>

          {/* Text */}
          <p className="mb-1 text-sm text-gray-600">
            <span className="font-semibold text-primary-600">
              Click to upload
            </span>{" "}
            or drag and drop
          </p>
          <p className="text-xs text-gray-500">{displayHelperText}</p>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((file) => (
              <FileItem
                key={file.id}
                file={file}
                onRemove={() => handleRemove(file.id)}
                onTypeChange={(type) => handleTypeChange(file.id, type)}
              />
            ))}
          </div>
        )}

        {/* Process All Button */}
        {onProcessAll && (
          <Button
            type="button"
            onClick={() => onProcessAll(files)}
            disabled={
              files.length === 0 ||
              disabled ||
              isLoading ||
              files.some(
                (f) => f.status === "uploading" || f.status === "processing"
              ) ||
              (files.length > 0 && files.every((f) => f.status === "completed"))
            }
            isLoading={
              isLoading ||
              files.some(
                (f) => f.status === "uploading" || f.status === "processing"
              )
            }
            variant="secondary"
            fullWidth
          >
            Start Processing
          </Button>
        )}

        {/* Processing Status Message */}
        {(isLoading ||
          files.some(
            (f) => f.status === "uploading" || f.status === "processing"
          )) && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-600">
              Processing documents... This may take a moment.
            </p>
          </div>
        )}
      </div>
    </InputWrapper>
  );
}

export default FileUpload;
export type { FileUploadProps };
