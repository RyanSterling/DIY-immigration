import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { v4 as uuidv4 } from "uuid";
import { db, schema, documentTypeEnum } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { cacheMiddleware } from "../middleware/cache.js";
import { requireOrg } from "../middleware/requireOrg.js";
import { eq, and, isNull, sql, inArray } from "drizzle-orm";
import { invalidateCache, cacheKeys } from "../lib/redis.js";
import {
  generateUploadUrl,
  generateDownloadUrl,
  generateDocumentKey,
  deleteFile as _deleteFile, // Kept for cleanup purposes in the future.
} from "../lib/s3/index.js";
import { enqueueTextractJob } from "../jobs/queues.js";
import { qb } from "../lib/queuebear.js";
import {
  parseTextractResponse,
  parsePassportWithMerge,
  mergePassportResults,
  extractBirthCertificateEnhanced,
  mergeBirthCertificateResults,
  extractI94Enhanced,
  mergeI94Results,
  extractVisaEnhanced,
  mergeVisaResults,
  extractMarriageCertificateEnhanced,
  resolveMarriagePrimaryAndSpouse,
  mergeMarriageCertificateResults,
  type ExtractedField,
} from "../lib/textract-parser.js";
import type { GetDocumentAnalysisCommandOutput, AnalyzeIDCommandOutput } from "@aws-sdk/client-textract";

// Type for hybrid passport response (GetDocumentAnalysis + AnalyzeID)
interface PassportHybridResponse {
  type: 'passport_hybrid';
  getDocumentAnalysis: GetDocumentAnalysisCommandOutput;
  analyzeId: AnalyzeIDCommandOutput;
}

// Type for enhanced I-94 response
interface I94EnhancedResponse {
  type: 'i94_enhanced';
  getDocumentAnalysis: GetDocumentAnalysisCommandOutput;
}

// Type for enhanced birth certificate response
interface BirthCertificateEnhancedResponse {
  type: 'birth_certificate_enhanced';
  getDocumentAnalysis: GetDocumentAnalysisCommandOutput;
}

// Type for enhanced visa response
interface VisaEnhancedResponse {
  type: 'visa_enhanced';
  getDocumentAnalysis: GetDocumentAnalysisCommandOutput;
}

// Type for enhanced marriage certificate response
interface MarriageCertificateEnhancedResponse {
  type: 'marriage_certificate_enhanced';
  getDocumentAnalysis: GetDocumentAnalysisCommandOutput;
}

/**
 * Parse extracted fields from raw Textract response.
 * Handles both standard responses and hybrid passport responses.
 */
function parseExtractedFieldsFromResponse(
  rawResponse: unknown,
  documentType: string
): ExtractedField[] {
  // Check if this is a typed response (hybrid passport, i94_enhanced, birth_certificate_enhanced)
  if (
    typeof rawResponse === 'object' &&
    rawResponse !== null &&
    'type' in rawResponse
  ) {
    const typedResponse = rawResponse as { type: string };

    // Handle passport_hybrid
    if (typedResponse.type === 'passport_hybrid') {
      const hybridResponse = rawResponse as PassportHybridResponse;
      // Parse both responses and merge them
      const formFields = parseTextractResponse(hybridResponse.getDocumentAnalysis, documentType);
      const analyzeIdFields = parsePassportWithMerge(hybridResponse.analyzeId);
      return mergePassportResults(formFields, analyzeIdFields);
    }

    // Handle i94_enhanced
    if (typedResponse.type === 'i94_enhanced') {
      const i94Response = rawResponse as I94EnhancedResponse;
      const formFields = parseTextractResponse(i94Response.getDocumentAnalysis, documentType);
      const enhancedFields = extractI94Enhanced(i94Response.getDocumentAnalysis, documentType);
      return mergeI94Results(formFields, enhancedFields);
    }

    // Handle birth_certificate_enhanced
    if (typedResponse.type === 'birth_certificate_enhanced') {
      const bcResponse = rawResponse as BirthCertificateEnhancedResponse;
      const formFields = parseTextractResponse(bcResponse.getDocumentAnalysis, documentType);
      const enhancedFields = extractBirthCertificateEnhanced(bcResponse.getDocumentAnalysis, documentType);
      return mergeBirthCertificateResults(formFields, enhancedFields);
    }

    // Handle visa_enhanced
    if (typedResponse.type === 'visa_enhanced') {
      const visaResponse = rawResponse as VisaEnhancedResponse;
      const formFields = parseTextractResponse(visaResponse.getDocumentAnalysis, documentType);
      const enhancedFields = extractVisaEnhanced(visaResponse.getDocumentAnalysis, documentType);
      return mergeVisaResults(formFields, enhancedFields);
    }

    // Handle marriage_certificate_enhanced
    if (typedResponse.type === 'marriage_certificate_enhanced') {
      const mcResponse = rawResponse as MarriageCertificateEnhancedResponse;
      const formFields = parseTextractResponse(mcResponse.getDocumentAnalysis, documentType);
      const { fields: enhancedFields, rawData } = extractMarriageCertificateEnhanced(mcResponse.getDocumentAnalysis, documentType);
      // Note: For parsing saved response, we don't have client name data for resolution
      // The name fields will be extracted but without client-based primary/spouse assignment
      const resolvedNameFields = resolveMarriagePrimaryAndSpouse(rawData, {});
      const allEnhancedFields = [...enhancedFields, ...resolvedNameFields];
      return mergeMarriageCertificateResults(formFields, allEnhancedFields);
    }
  }

  // Standard response - determine parser based on document type and response structure
  if (documentType === "passport") {
    // Check if this is an AnalyzeID response (has IdentityDocuments property)
    if ('IdentityDocuments' in (rawResponse as object)) {
      return parsePassportWithMerge(rawResponse as AnalyzeIDCommandOutput);
    }
  }

  // Default: use GetDocumentAnalysis parser
  return parseTextractResponse(
    rawResponse as GetDocumentAnalysisCommandOutput,
    documentType
  );
}

// Document types - derived from Drizzle schema (single source of truth)
const documentTypeSchema = z.enum(documentTypeEnum.enumValues);

// Validation schemas
const uploadUrlRequestSchema = z.object({
  clientId: z.uuid().optional(), // Optional - for pending documents without a client
  documentType: documentTypeSchema,
  filename: z.string().min(1),
  contentType: z.string().min(1),
});

const createDocumentSchema = z.object({
  documentId: z.uuid(),
  clientId: z.uuid().optional(), // Optional - for pending documents without a client
  documentType: documentTypeSchema,
  filePath: z.string().min(1),
  originalFilename: z.string().min(1),
  mimeType: z.string().optional(),
  fileSize: z.number().optional(),
});

const assignClientSchema = z.object({
  documentIds: z.array(z.uuid()).min(1),
  clientId: z.uuid(),
});

// Create app with chained routes for type inference
const app = new Hono()
  // Apply auth to all routes
  .use("*", authMiddleware)
  .use("*", requireOrg)
  // Cache GET responses (24h TTL, invalidated on mutations)
  .use("*", cacheMiddleware())
  // Generate pre-signed upload URL
  .post(
    "/upload-url",
    zValidator("json", uploadUrlRequestSchema),
    async (c) => {
      try {
        const user = c.get("user");

        const { clientId, documentType: _documentType, filename, contentType } =
          c.req.valid("json");

        // If clientId is provided, verify client belongs to organization
        // Note: requireOrg middleware ensures organizationId is non-null
        if (clientId) {
          const [client] = await db
            .select()
            .from(schema.clients)
            .where(
              and(
                eq(schema.clients.id, clientId),
                eq(schema.clients.organizationId, user.organizationId!),
                isNull(schema.clients.deletedAt)
              )
            )
            .limit(1);

          if (!client) {
            return c.json({ error: "Client not found" }, 404);
          }
        }

        // Generate document ID and S3 key
        // If no clientId, document goes to pending folder
        const documentId = uuidv4();
        const key = generateDocumentKey(
          user.organizationId!,
          clientId ?? null,
          documentId,
          filename
        );

        // Generate pre-signed upload URL
        const uploadUrl = await generateUploadUrl(key, contentType);

        return c.json({
          documentId,
          uploadUrl,
          key,
        });
      } catch (error) {
        console.error("Error generating upload URL:", error);
        return c.json(
          { error: "Failed to generate upload URL", details: String(error) },
          500
        );
      }
    }
  )
  // Create document record after upload and trigger extraction
  .post("/", zValidator("json", createDocumentSchema), async (c) => {
    try {
      const user = c.get("user");

      const {
        documentId,
        clientId,
        documentType,
        filePath,
        originalFilename,
        mimeType,
        fileSize,
      } = c.req.valid("json");

      // If clientId is provided, verify client belongs to organization
      if (clientId) {
        const [client] = await db
          .select()
          .from(schema.clients)
          .where(
            and(
              eq(schema.clients.id, clientId),
              eq(schema.clients.organizationId, user.organizationId!),
              isNull(schema.clients.deletedAt)
            )
          )
          .limit(1);

        if (!client) {
          return c.json({ error: "Client not found" }, 404);
        }
      }

      // Create document and extraction records in a transaction
      const result = await db.transaction(async (tx) => {
        // Insert document record (clientId can be null for pending documents)
        const [document] = await tx
          .insert(schema.documents)
          .values({
            id: documentId,
            organizationId: user.organizationId!,
            clientId: clientId || null,
            documentType,
            filePath,
            originalFilename,
            mimeType,
            fileSize,
            uploadedBy: user.id,
          })
          .returning();

        // Insert extraction record
        const [extraction] = await tx
          .insert(schema.documentExtractions)
          .values({
            organizationId: user.organizationId!,
            documentId: document.id,
            status: "pending",
          })
          .returning();

        return { document, extraction };
      });

      // Enqueue Textract job and store messageId for status tracking
      console.log(`[Documents] Enqueuing Textract job for document ${documentId}, path: ${filePath}`);
      const queueBearMessageId = await enqueueTextractJob(documentId, filePath, user.organizationId!);
      console.log(`[Documents] Textract job enqueued successfully, messageId: ${queueBearMessageId}`);

      // Store the QueueBear messageId for status polling
      await db
        .update(schema.documentExtractions)
        .set({ queueBearMessageId })
        .where(eq(schema.documentExtractions.documentId, documentId));

      // Invalidate document cache
      await invalidateCache(cacheKeys.allDocuments());

      return c.json(
        {
          ...result.document,
          extraction: result.extraction,
        },
        201
      );
    } catch (error) {
      console.error("Error creating document:", error);
      return c.json(
        { error: "Failed to create document", details: String(error) },
        500
      );
    }
  })
  // List documents for a client with extraction status
  .get("/", async (c) => {
    try {
      const user = c.get("user");

      const clientId = c.req.query("clientId");
      if (!clientId) {
        return c.json({ error: "clientId query parameter is required" }, 400);
      }

      const page = parseInt(c.req.query("page") || "1");
      const pageSize = parseInt(c.req.query("pageSize") || "20");
      const offset = (page - 1) * pageSize;

      // Verify client belongs to organization
      const [client] = await db
        .select()
        .from(schema.clients)
        .where(
          and(
            eq(schema.clients.id, clientId),
            eq(schema.clients.organizationId, user.organizationId!),
            isNull(schema.clients.deletedAt)
          )
        )
        .limit(1);

      if (!client) {
        return c.json({ error: "Client not found" }, 404);
      }

      // Get documents with extraction status
      const baseConditions = and(
        eq(schema.documents.clientId, clientId),
        eq(schema.documents.organizationId, user.organizationId!),
        isNull(schema.documents.deletedAt)
      );

      const [documents, countResult] = await Promise.all([
        db
          .select({
            document: schema.documents,
            extraction: schema.documentExtractions,
          })
          .from(schema.documents)
          .leftJoin(
            schema.documentExtractions,
            eq(schema.documents.id, schema.documentExtractions.documentId)
          )
          .where(baseConditions)
          .limit(pageSize)
          .offset(offset)
          .orderBy(schema.documents.createdAt),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(schema.documents)
          .where(baseConditions),
      ]);

      const total = countResult[0]?.count ?? 0;

      // Generate download URLs for each document
      const documentsWithUrls = await Promise.all(
        documents.map(async ({ document, extraction }) => {
          const downloadUrl = await generateDownloadUrl(document.filePath);
          return {
            ...document,
            downloadUrl,
            extraction,
          };
        })
      );

      return c.json({
        items: documentsWithUrls,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      });
    } catch (error) {
      console.error("Error listing documents:", error);
      return c.json(
        { error: "Failed to list documents", details: String(error) },
        500
      );
    }
  })
  // Get single document with extraction status
  .get("/:id", async (c) => {
    try {
      const user = c.get("user");
      const { id } = c.req.param();

      const [result] = await db
        .select({
          document: schema.documents,
          extraction: schema.documentExtractions,
        })
        .from(schema.documents)
        .leftJoin(
          schema.documentExtractions,
          eq(schema.documents.id, schema.documentExtractions.documentId)
        )
        .where(
          and(
            eq(schema.documents.id, id),
            eq(schema.documents.organizationId, user.organizationId!),
            isNull(schema.documents.deletedAt)
          )
        )
        .limit(1);

      if (!result) {
        return c.json({ error: "Document not found" }, 404);
      }

      // Generate download URL
      const downloadUrl = await generateDownloadUrl(result.document.filePath);

      return c.json({
        ...result.document,
        downloadUrl,
        extraction: result.extraction,
      });
    } catch (error) {
      console.error("Error getting document:", error);
      return c.json(
        { error: "Failed to get document", details: String(error) },
        500
      );
    }
  })
  // Get extracted fields for a document (parsed from rawTextractResponse)
  // This is used for pending documents that don't have clientFieldValues yet
  .get("/:id/extracted-fields", async (c) => {
    try {
      const user = c.get("user");
      const { id } = c.req.param();

      // Get document with extraction data
      const [result] = await db
        .select({
          document: schema.documents,
          extraction: schema.documentExtractions,
        })
        .from(schema.documents)
        .leftJoin(
          schema.documentExtractions,
          eq(schema.documents.id, schema.documentExtractions.documentId)
        )
        .where(
          and(
            eq(schema.documents.id, id),
            eq(schema.documents.organizationId, user.organizationId!),
            isNull(schema.documents.deletedAt)
          )
        )
        .limit(1);

      if (!result) {
        return c.json({ error: "Document not found" }, 404);
      }

      // Check if extraction is completed
      if (!result.extraction || result.extraction.status !== "completed") {
        return c.json({
          items: [],
          status: result.extraction?.status ?? "pending",
          message: "Extraction not completed yet",
        });
      }

      // Parse the raw Textract response
      const rawResponse = result.extraction.rawTextractResponse;
      if (!rawResponse) {
        return c.json({ items: [], status: "completed" });
      }

      // Use the helper to parse fields from any response format
      const extractedFields = parseExtractedFieldsFromResponse(
        rawResponse,
        result.document.documentType
      );

      return c.json({
        items: extractedFields,
        status: "completed",
      });
    } catch (error) {
      console.error("Error getting extracted fields:", error);
      return c.json(
        { error: "Failed to get extracted fields", details: String(error) },
        500
      );
    }
  })
  // Assign documents to a client (for pending documents)
  // This also creates clientFieldValues from the extraction data
  .patch("/assign-client", zValidator("json", assignClientSchema), async (c) => {
    try {
      const user = c.get("user");
      const { documentIds, clientId } = c.req.valid("json");

      // Verify client belongs to organization
      const [client] = await db
        .select()
        .from(schema.clients)
        .where(
          and(
            eq(schema.clients.id, clientId),
            eq(schema.clients.organizationId, user.organizationId!),
            isNull(schema.clients.deletedAt)
          )
        )
        .limit(1);

      if (!client) {
        return c.json({ error: "Client not found" }, 404);
      }

      // Get all pending documents (must have no clientId)
      const documents = await db
        .select({
          document: schema.documents,
          extraction: schema.documentExtractions,
        })
        .from(schema.documents)
        .leftJoin(
          schema.documentExtractions,
          eq(schema.documents.id, schema.documentExtractions.documentId)
        )
        .where(
          and(
            inArray(schema.documents.id, documentIds),
            eq(schema.documents.organizationId, user.organizationId!),
            isNull(schema.documents.clientId), // Only pending documents
            isNull(schema.documents.deletedAt)
          )
        );

      if (documents.length === 0) {
        return c.json(
          { error: "No pending documents found with the provided IDs" },
          400
        );
      }

      // Update documents and create field values in a transaction
      await db.transaction(async (tx) => {
        // Update all documents to assign them to the client
        await tx
          .update(schema.documents)
          .set({
            clientId,
            updatedAt: new Date(),
          })
          .where(inArray(schema.documents.id, documentIds));

        // Get existing active fields for this client to determine which new values should be active
        const existingActiveFields = await tx
          .select({ canonicalField: schema.clientFieldValues.canonicalField })
          .from(schema.clientFieldValues)
          .where(
            and(
              eq(schema.clientFieldValues.clientId, clientId),
              eq(schema.clientFieldValues.isActive, true)
            )
          );

        const activeFieldSet = new Set(existingActiveFields.map(f => f.canonicalField));

        // For each document with completed extraction, create clientFieldValues
        for (const { document, extraction } of documents) {
          if (
            extraction?.status === "completed" &&
            extraction.rawTextractResponse
          ) {
            // Use the helper to parse fields from any response format
            const extractedFields = parseExtractedFieldsFromResponse(
              extraction.rawTextractResponse,
              document.documentType
            );

            if (extractedFields.length > 0) {
              await tx.insert(schema.clientFieldValues).values(
                extractedFields.map((field: ExtractedField) => ({
                  organizationId: user.organizationId!,
                  clientId,
                  source: "document_extraction" as const,
                  documentId: document.id,
                  canonicalField: field.canonicalField,
                  rawFieldName: field.rawFieldName,
                  rawValue: field.rawValue,
                  valueType: field.valueType,
                  normalizedValue: field.normalizedValue,
                  confidenceScore: field.confidenceScore?.toString(),
                  boundingBox: field.boundingBox,
                  createdBy: user.id,
                  // Auto-activate if no existing active value for this field
                  isActive: !activeFieldSet.has(field.canonicalField),
                }))
              );

              // Add newly activated fields to the set so subsequent documents don't re-activate them
              extractedFields.forEach((field: ExtractedField) => {
                if (!activeFieldSet.has(field.canonicalField)) {
                  activeFieldSet.add(field.canonicalField);
                }
              });
            }
          }
        }
      });

      // Invalidate caches
      await invalidateCache(cacheKeys.allDocuments());

      return c.json({
        success: true,
        assignedCount: documents.length,
      });
    } catch (error) {
      console.error("Error assigning documents to client:", error);
      return c.json(
        { error: "Failed to assign documents", details: String(error) },
        500
      );
    }
  })
  // Check and sync document extraction status with QueueBear
  // Called by frontend when document is stuck in "processing" for too long
  .get("/:id/check-status", async (c) => {
    try {
      const user = c.get("user");
      const { id } = c.req.param();

      // Get document with extraction
      const [result] = await db
        .select({
          document: schema.documents,
          extraction: schema.documentExtractions,
        })
        .from(schema.documents)
        .leftJoin(
          schema.documentExtractions,
          eq(schema.documents.id, schema.documentExtractions.documentId)
        )
        .where(
          and(
            eq(schema.documents.id, id),
            eq(schema.documents.organizationId, user.organizationId!),
            isNull(schema.documents.deletedAt)
          )
        )
        .limit(1);

      if (!result) {
        return c.json({ error: "Document not found" }, 404);
      }

      const extraction = result.extraction;

      // Only check QueueBear if we're in a non-terminal state and have a messageId
      if (
        extraction &&
        extraction.queueBearMessageId &&
        (extraction.status === "pending" || extraction.status === "processing")
      ) {
        try {
          const message = await qb.messages.get(extraction.queueBearMessageId);

          // If QueueBear says it's failed or in DLQ, update our status
          if (message.status === "failed" || message.status === "dlq") {
            const errorMessage = message.lastError || "Processing failed after multiple retries";

            await db
              .update(schema.documentExtractions)
              .set({
                status: "failed",
                errorMessage,
                completedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(schema.documentExtractions.documentId, id));

            // Invalidate cache
            await invalidateCache(cacheKeys.allDocuments());

            return c.json({
              status: "failed",
              errorMessage,
              queueBearStatus: message.status,
            });
          }

          // Return current status with QueueBear info
          return c.json({
            status: extraction.status,
            queueBearStatus: message.status,
            retryCount: message.retryCount,
          });
        } catch (qbError) {
          // If we can't reach QueueBear, just return current status
          console.error("[Documents] Failed to check QueueBear status:", qbError);
          return c.json({
            status: extraction.status,
            queueBearStatus: "unknown",
          });
        }
      }

      // Return current status for completed/failed or if no messageId
      return c.json({
        status: extraction?.status ?? "pending",
        errorMessage: extraction?.errorMessage,
      });
    } catch (error) {
      console.error("Error checking document status:", error);
      return c.json(
        { error: "Failed to check status", details: String(error) },
        500
      );
    }
  })
  // Retry a failed document extraction
  .post("/:id/retry", async (c) => {
    try {
      const user = c.get("user");
      const { id } = c.req.param();

      // Get document with extraction
      const [result] = await db
        .select({
          document: schema.documents,
          extraction: schema.documentExtractions,
        })
        .from(schema.documents)
        .leftJoin(
          schema.documentExtractions,
          eq(schema.documents.id, schema.documentExtractions.documentId)
        )
        .where(
          and(
            eq(schema.documents.id, id),
            eq(schema.documents.organizationId, user.organizationId!),
            isNull(schema.documents.deletedAt)
          )
        )
        .limit(1);

      if (!result) {
        return c.json({ error: "Document not found" }, 404);
      }

      // Only allow retry for failed extractions
      if (result.extraction?.status !== "failed") {
        return c.json(
          { error: "Only failed documents can be retried" },
          400
        );
      }

      // Reset extraction status and re-enqueue
      const queueBearMessageId = await enqueueTextractJob(
        id,
        result.document.filePath,
        user.organizationId!
      );

      await db
        .update(schema.documentExtractions)
        .set({
          status: "pending",
          queueBearMessageId,
          errorMessage: null,
          textractJobId: null,
          rawTextractResponse: null,
          startedAt: null,
          completedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(schema.documentExtractions.documentId, id));

      // Invalidate cache
      await invalidateCache(cacheKeys.allDocuments());

      return c.json({
        success: true,
        message: "Document queued for reprocessing",
        queueBearMessageId,
      });
    } catch (error) {
      console.error("Error retrying document:", error);
      return c.json(
        { error: "Failed to retry document", details: String(error) },
        500
      );
    }
  })
  // Soft delete document
  .delete("/:id", async (c) => {
    try {
      const user = c.get("user");
      const { id } = c.req.param();

      const [existing] = await db
        .select()
        .from(schema.documents)
        .where(
          and(
            eq(schema.documents.id, id),
            eq(schema.documents.organizationId, user.organizationId!),
            isNull(schema.documents.deletedAt)
          )
        )
        .limit(1);

      if (!existing) {
        return c.json({ error: "Document not found" }, 404);
      }

      // Soft delete the document
      await db
        .update(schema.documents)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.documents.id, id));

      // Optionally delete from S3 (uncomment if you want hard delete of file)
      // await deleteFile(existing.filePath);

      await invalidateCache(cacheKeys.allDocuments());

      return c.json({ success: true });
    } catch (error) {
      console.error("Error deleting document:", error);
      return c.json(
        { error: "Failed to delete document", details: String(error) },
        500
      );
    }
  });

export default app;
