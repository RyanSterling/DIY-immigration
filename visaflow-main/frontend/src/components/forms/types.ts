export type DocumentType =
  | 'passport'
  | 'visa'
  | 'resume'
  | 'birth_certificate'
  | 'marriage_certificate'
  | 'i94';

export type UploadFileStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed';

export interface UploadFile {
  id: string;
  file: File;
  documentType?: DocumentType;
  error?: string;
  processed?: boolean;
  status?: UploadFileStatus;
}

export const DOCUMENT_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: 'passport', label: 'Passport' },
  { value: 'visa', label: 'Visa' },
  { value: 'resume', label: 'Resume/CV' },
  { value: 'birth_certificate', label: 'Birth Certificate' },
  { value: 'marriage_certificate', label: 'Marriage Certificate' },
  { value: 'i94', label: 'I-94 Entry Record' },
];

/**
 * Generate a unique ID for uploaded files
 */
export function generateFileId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 14);
  return `${timestamp}-${randomPart}`;
}
