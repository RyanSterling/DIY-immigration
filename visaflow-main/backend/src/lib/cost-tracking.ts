import { db, schema } from "../db/index.js";
import type { NewThirdPartyServiceCost } from "../db/schema.js";
import {
  calculateTextractCost,
  getCurrentBillingPeriod,
  type TextractOperationType,
} from "./textract-pricing.js";
import { env } from "./env.js";

export interface TextractCostParams {
  organizationId: string;
  clientId?: string;
  documentId: string;
  operationType: TextractOperationType;
  pageCount: number;
  jobId?: string;
  status: "success" | "failed";
  errorMessage?: string;
}

/**
 * Record the estimated cost for a Textract operation.
 * This should be called after each Textract API call completes.
 */
export async function recordTextractCost(
  params: TextractCostParams
): Promise<void> {
  const {
    organizationId,
    clientId,
    documentId,
    operationType,
    pageCount,
    jobId,
    status,
    errorMessage,
  } = params;

  const estimatedCost = calculateTextractCost(operationType, pageCount);
  const billingPeriod = getCurrentBillingPeriod();

  const costRecord: NewThirdPartyServiceCost = {
    organizationId,
    clientId: clientId ?? null,
    serviceProvider: "aws_textract",
    serviceCategory: "document_processing",
    operationType,
    operationDetails: {
      jobId,
      pageCount,
      status,
      errorMessage,
    },
    resourceId: documentId,
    resourceType: "document",
    quantity: pageCount,
    unitOfMeasure: "pages",
    estimatedCostUsd: estimatedCost.toFixed(4),
    billingPeriod,
    serviceRegion: env.AWS_REGION,
    pricingTier: "TIER_1",
  };

  await db.insert(schema.thirdPartyServiceCosts).values(costRecord);
}
