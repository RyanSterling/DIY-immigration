// Type definitions for form instances

export interface FormInstance {
  id: string;
  organizationId: string;
  clientId: string;
  formTemplateId: string;
  instanceNumber: number;
  status: "draft" | "in_progress" | "completed";
  currentStepIndex: number;
  completedStepIds: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  createdBy: string;
  updatedBy: string | null;
  submittedAt: string | null;
  submittedBy: string | null;
  // Joined from template
  formNumber?: string;
  title?: string;
  revision?: string;
}

export interface FormInstanceWithResponses extends FormInstance {
  responses: Record<
    string,
    { value: string | null; version: number; formFieldId: string }
  >;
}

export interface FormInstancesListResponse {
  items: FormInstance[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Re-export new hooks for cleaner imports
export { useFormInstancesList } from "./useFormInstancesList";
export { useFormInstance } from "./useFormInstance";
export {
  useFormInstanceMutations,
  useFormInstanceAutofill,
  useFormInstancePdf,
} from "./useFormInstanceMutations";

// Backward compatibility alias
// @deprecated Use useFormInstancesList instead
export { useFormInstancesList as useFormInstances } from "./useFormInstancesList";
