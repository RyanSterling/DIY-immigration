import { useFormContext } from 'react-hook-form';
import { Input } from '~/components/forms/Input';
import type { FormTemplateValues } from '../formTemplateSchema';
import { PdfTemplateUpload, type PdfTemplateUploadHandle } from './PdfTemplateUpload';

export interface Organization {
  id: string;
  name: string;
}

interface TemplateMetadataFormProps {
  templateId: string;
  organizations: Organization[];
  pdfUploadRef?: React.RefObject<PdfTemplateUploadHandle | null>;
  onPendingFileChange?: (hasPending: boolean) => void;
}

/**
 * Template metadata form section.
 * Uses useFormContext() to register fields with the parent FormProvider.
 */
export function TemplateMetadataForm({ templateId, organizations, pdfUploadRef, onPendingFileChange }: TemplateMetadataFormProps) {
  const { register, formState: { errors }, watch, setValue } = useFormContext<FormTemplateValues>();

  // Watch the current pdfTemplateUrl value
  const currentPdfUrl = watch('pdfTemplateUrl');

  // Handle upload completion - update the form field with the S3 key
  const handleUploadComplete = (key: string) => {
    setValue('pdfTemplateUrl', key, { shouldDirty: true });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Form Number"
          placeholder="I-485"
          error={errors.formNumber?.message}
          {...register('formNumber')}
        />
        <Input
          label="Title"
          placeholder="Application to Register Permanent Residence"
          error={errors.title?.message}
          {...register('title')}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Revision"
          placeholder="12/24"
          error={errors.revision?.message}
          {...register('revision')}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
          <select
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm"
            {...register('organizationId')}
          >
            <option value="">Global (All Organizations)</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <PdfTemplateUpload
        ref={pdfUploadRef}
        templateId={templateId}
        currentPdfUrl={currentPdfUrl}
        onUploadComplete={handleUploadComplete}
        onPendingFileChange={(file) => onPendingFileChange?.(!!file)}
      />
    </div>
  );
}
