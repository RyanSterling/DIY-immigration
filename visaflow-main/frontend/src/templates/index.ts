import type { FormTemplate } from "~/components/multi-step-form/types";
import { i765Template } from "./i-765";

/**
 * Lightweight info object for template listing.
 * Used when you need template metadata without loading the full template.
 */
export interface FormTemplateInfo {
  id: string;
  formNumber: string;
  title: string;
  revision: string;
  description?: string;
}

/**
 * All available form templates.
 */
export const formTemplates: FormTemplate[] = [i765Template];

/**
 * Get lightweight info for all available templates.
 * Extracts description from the first step's description if available.
 */
export function getTemplateInfoList(): FormTemplateInfo[] {
  return formTemplates.map((template) => ({
    id: template.id,
    formNumber: template.formNumber,
    title: template.title,
    revision: template.revision,
    description: template.steps[0]?.description,
  }));
}

/**
 * Find a template by its ID.
 */
export function getTemplateById(id: string): FormTemplate | undefined {
  return formTemplates.find((template) => template.id === id);
}
