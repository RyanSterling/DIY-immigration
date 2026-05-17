import { DOCUMENT_TYPE_OPTIONS } from "~/components/forms/types";

/**
 * Get display label for a document type
 */
export function getDocumentTypeLabel(type?: string): string {
  if (!type) return "Unknown";
  const option = DOCUMENT_TYPE_OPTIONS.find((opt) => opt.value === type);
  return option?.label ?? type;
}

/**
 * Format confidence score as percentage
 * Handles both number and string inputs
 */
export function formatConfidence(score?: number | string | null): string {
  if (score === undefined || score === null) return "";
  const numScore = typeof score === "string" ? parseFloat(score) : score;
  if (isNaN(numScore)) return "";
  return `${Math.round(numScore * 100)}%`;
}

/**
 * Get Tailwind classes for confidence badge color
 * Handles both number and string inputs
 */
export function getConfidenceBadgeClass(score?: number | string | null): string {
  const numScore = typeof score === "string" ? parseFloat(score) : score;
  if (numScore === undefined || numScore === null || isNaN(numScore)) {
    return "bg-gray-100 text-gray-600";
  }
  if (numScore >= 0.9) return "bg-green-100 text-green-700";
  if (numScore >= 0.7) return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-700";
}
