/**
 * Types for the PDF microservice
 */

// Field types for PDF forms
export type PdfFieldType = "text" | "checkbox" | "radio" | "dropdown";

// Form type detection result
export interface FormTypeInfo {
  hasXFA: boolean;
  hasAcroForm: boolean;
  acroFormFieldCount: number;
  isXFAOnly: boolean;
  recommendedEngine: "pdf-lib" | "pdftk";
}

// Field info from PDF inspection
export interface PdfFieldInfo {
  name: string;
  type: PdfFieldType;
  value?: string;
  options?: string[]; // For radio/dropdown
}

// Fill request
export interface FillRequest {
  pdf: string; // Base64-encoded PDF
  fields: Record<string, string | boolean>;
  options?: {
    flatten?: boolean;
  };
}

// Fill response
export interface FillResponse {
  success: boolean;
  pdf?: string; // Base64-encoded filled PDF
  engine: "pdf-lib" | "pdftk";
  stats: {
    filledCount: number;
    skippedCount: number;
    errors: string[];
  };
  error?: string;
}

// Inspect request
export interface InspectRequest {
  pdf: string; // Base64-encoded PDF
}

// Inspect response
export interface InspectResponse {
  fields: PdfFieldInfo[];
  formType: FormTypeInfo;
}

// Detect request
export interface DetectRequest {
  pdf: string; // Base64-encoded PDF
}

// Detect response - same as FormTypeInfo
export type DetectResponse = FormTypeInfo;

// Health response
export interface HealthResponse {
  status: "ok" | "error";
  pdftk: "available" | "not installed";
  pdfLib: "available";
  error?: string;
}

// Fill stats from filling operations
export interface FillStats {
  filledCount: number;
  skippedCount: number;
  errors: string[];
}
