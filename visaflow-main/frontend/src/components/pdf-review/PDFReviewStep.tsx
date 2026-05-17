import { useState, useCallback, useMemo, useRef } from "react";
import { PDFViewer, fillAndDownloadPDF } from "react-acroform";
import type { PDFDocumentInfo, FormFieldValue } from "react-acroform";
import { toast } from "react-toastify";
import Button from "~/atoms/Button";
import Spinner from "~/atoms/Spinner";
import type { FormTemplateDetail } from "~/hooks/useFormTemplates";
import {
  buildFieldMappings,
  appDataToPdfData,
  pdfChangeToAppChange,
  logUnmappedFields,
} from "./fieldNameMapper";
import {
  ArrowLeftIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

interface PDFReviewStepProps {
  /** URL of the blank PDF template (will be filled client-side) */
  pdfTemplateUrl: string;
  /** Form template with field definitions and PDF mappings */
  template: FormTemplateDetail;
  /** Current form data values */
  formData: Record<string, unknown>;
  /** Callback when form data changes from PDF edits (batch updates) */
  onFormDataChange: (updates: Record<string, unknown>) => void;
  /** Callback when user clicks "Back" button */
  onBack: () => void;
  /** Callback when user clicks "Complete" button */
  onComplete: () => void;
  /** Whether form completion is in progress */
  isCompleting?: boolean;
  /** PDF filename for download */
  fileName?: string;
  /** Form instance ID for server-side PDF generation */
  instanceId?: string;
  /** Callback to generate PDF via backend (returns download URL) */
  onGeneratePdf?: () => Promise<{ pdfUrl: string; fileName: string }>;
}

/**
 * PDF Review Step component with bidirectional sync.
 * Uses react-acroform for built-in PDF form field support.
 */
export function PDFReviewStep({
  pdfTemplateUrl,
  template,
  formData,
  onFormDataChange,
  onBack,
  onComplete,
  isCompleting = false,
  fileName = "form.pdf",
  onGeneratePdf,
}: PDFReviewStepProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  // Build field mappings from template
  const mappings = useMemo(() => buildFieldMappings(template), [template]);

  // Transform app data to PDF data format
  const pdfFormData = useMemo(
    () => appDataToPdfData(formData, mappings),
    [formData, mappings]
  );

  // Handle PDF field changes - transform back to app format
  const handlePdfFormChange = useCallback(
    (pdfFieldName: string, pdfValue: FormFieldValue) => {
      const change = pdfChangeToAppChange(
        pdfFieldName,
        pdfValue,
        mappings,
        formDataRef.current
      );
      if (change) {
        onFormDataChange({ [change.fieldName]: change.value });
      }
    },
    [mappings, onFormDataChange]
  );

  // Log unmapped fields when document loads
  const handleDocumentLoad = useCallback(
    (info: PDFDocumentInfo) => {
      console.log(
        `[PDFReviewStep] Document loaded: ${info.numPages} pages, ${info.fields.length} fields`
      );
      logUnmappedFields(info.fields, mappings);
    },
    [mappings]
  );

  // Handle PDF download with filled form data
  const handleDownload = useCallback(async () => {
    setIsDownloading(true);
    try {
      if (onGeneratePdf) {
        // Server-side generation (handles XFA forms correctly)
        const { pdfUrl, fileName: generatedFileName } = await onGeneratePdf();

        // Download from the signed S3 URL
        const response = await fetch(pdfUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = generatedFileName || fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        // Fallback to client-side (for forms without XFA)
        await fillAndDownloadPDF(pdfTemplateUrl, pdfFormData, fileName);
      }
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Failed to download PDF");
    } finally {
      setIsDownloading(false);
    }
  }, [onGeneratePdf, pdfTemplateUrl, pdfFormData, fileName]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">PDF Review</h2>
          <p className="text-sm text-gray-600">
            Review your filled form. Click on fields to edit directly in the PDF.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleDownload}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <Spinner size="sm" className="mr-2" />
            ) : (
              <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
            )}
            Download PDF
          </Button>
        </div>
      </div>

      
        {/* PDF Viewer */}
        <div className="flex-1 min-h-0">
          <PDFViewer
            src={pdfTemplateUrl}
            values={pdfFormData}
            onChange={handlePdfFormChange}
            onDocumentLoad={handleDocumentLoad}
            showNavigation={true}
            showThumbnails={true}
            scale="page-fit"
            workerSrc="/pdf.worker.min.mjs"
            className="h-full"
            thumbnailClassName="w-20"
          />
        </div>
 

      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-white">
        <Button variant="outline" onClick={onBack} disabled={isCompleting}>
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to Form
        </Button>
        <Button onClick={onComplete} disabled={isCompleting}>
          {isCompleting ? (
            <Spinner size="sm" className="mr-2" />
          ) : (
            <CheckCircleIcon className="w-4 h-4 mr-2" />
          )}
          Mark as Completed
        </Button>
      </div>
    </div>
  );
}

