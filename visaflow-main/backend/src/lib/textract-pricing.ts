import type {
  GetDocumentAnalysisCommandOutput,
  AnalyzeIDCommandOutput,
} from "@aws-sdk/client-textract";

/**
 * AWS Textract pricing (us-east-1, 2025)
 * https://aws.amazon.com/textract/pricing/
 */
export const TEXTRACT_PRICING = {
  // AnalyzeDocument with FORMS + TABLES features
  ANALYZE_DOCUMENT: {
    TIER_1: { maxPages: 1_000_000, pricePerThousand: 1.5 },
    TIER_2: { maxPages: 5_000_000, pricePerThousand: 0.6 },
    TIER_3: { maxPages: Infinity, pricePerThousand: 0.3 },
  },
  // AnalyzeID (for passports/IDs)
  ANALYZE_ID: { pricePerThousand: 12.0 },
} as const;

export type TextractOperationType = "AnalyzeDocument" | "AnalyzeID";
export type PricingTier = "TIER_1" | "TIER_2" | "TIER_3";

/**
 * Calculate estimated cost for a Textract operation.
 * Uses tier-based pricing for AnalyzeDocument, flat rate for AnalyzeID.
 */
export function calculateTextractCost(
  operationType: TextractOperationType,
  pageCount: number,
  pricingTier: PricingTier = "TIER_1"
): number {
  if (operationType === "AnalyzeID") {
    return (pageCount / 1000) * TEXTRACT_PRICING.ANALYZE_ID.pricePerThousand;
  }

  const tierPricing = TEXTRACT_PRICING.ANALYZE_DOCUMENT[pricingTier];
  return (pageCount / 1000) * tierPricing.pricePerThousand;
}

/**
 * Get current billing period in YYYY-MM format.
 */
export function getCurrentBillingPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Extract page count from GetDocumentAnalysis response.
 * Falls back to 1 if not available.
 */
export function extractPageCountFromAnalyzeDocument(
  response: GetDocumentAnalysisCommandOutput
): number {
  return response.DocumentMetadata?.Pages ?? 1;
}

/**
 * Extract page count from AnalyzeID response.
 * AnalyzeID processes identity documents, typically 1 page per document.
 */
export function extractPageCountFromAnalyzeID(
  response: AnalyzeIDCommandOutput
): number {
  return response.IdentityDocuments?.length ?? 1;
}
