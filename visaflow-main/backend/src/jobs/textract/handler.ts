import {
  TextractClient,
  StartDocumentAnalysisCommand,
  GetDocumentAnalysisCommand,
  AnalyzeIDCommand,
  FeatureType,
  type GetDocumentAnalysisCommandOutput,
} from '@aws-sdk/client-textract';
import { db, schema } from '../../db/index.js';
import type { Document } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { env } from '../../lib/env.js';
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
  type ClientNameData,
} from '../../lib/textract-parser.js';
import { invalidateCache, cacheKeys } from '../../lib/redis.js';
import {
  extractPageCountFromAnalyzeDocument,
  extractPageCountFromAnalyzeID,
} from '../../lib/textract-pricing.js';
import { recordTextractCost } from '../../lib/cost-tracking.js';
import { prepareForTextract, cleanupProcessedFile } from '../../lib/document-processor.js';
import type { TextractJobData } from './types.js';

// Key fields that should be present for a complete passport extraction
const REQUIRED_PASSPORT_FIELDS = ['first_name', 'last_name', 'passport_number'];

// Key fields that should be present for a complete birth certificate extraction
const REQUIRED_BIRTH_CERTIFICATE_FIELDS = ['first_name', 'last_name', 'date_of_birth'];

// Key fields that should be present for a complete I-94 extraction
const REQUIRED_I94_FIELDS = ['first_name', 'last_name', 'i94_number'];

const textractClient = new TextractClient({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

const POLL_INTERVAL_MS = 5000; // 5 seconds
const MAX_POLL_ATTEMPTS = 60; // 5 minutes max

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function handleTextractJob(data: TextractJobData): Promise<void> {
  const { documentId, s3Key, organizationId } = data;

  console.log(`[Textract] Starting job for document ${documentId}`);

  // Declare outside try block so they're accessible in catch for cost tracking
  let document: Document | undefined;
  let jobId: string | undefined;

  try {
    // Verify extraction record exists (handle race condition with DB commit)
    // The job may start before the transaction that created the extraction record is visible
    const MAX_EXISTENCE_RETRIES = 5;
    const EXISTENCE_RETRY_DELAY_MS = 500;

    let extractionExists = false;
    for (let attempt = 1; attempt <= MAX_EXISTENCE_RETRIES; attempt++) {
      const [extraction] = await db
        .select({ id: schema.documentExtractions.id })
        .from(schema.documentExtractions)
        .where(eq(schema.documentExtractions.documentId, documentId))
        .limit(1);

      if (extraction) {
        extractionExists = true;
        break;
      }

      console.log(`[Textract] Extraction record not found for document ${documentId}, attempt ${attempt}/${MAX_EXISTENCE_RETRIES}`);

      if (attempt < MAX_EXISTENCE_RETRIES) {
        await sleep(EXISTENCE_RETRY_DELAY_MS);
      }
    }

    if (!extractionExists) {
      throw new Error(`Extraction record not found for document ${documentId} after ${MAX_EXISTENCE_RETRIES} attempts`);
    }

    // Update status to 'processing'
    await db
      .update(schema.documentExtractions)
      .set({
        status: 'processing',
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.documentExtractions.documentId, documentId));

    // Get document info for client ID
    console.log(`[Textract] Fetching document ${documentId} from database...`);
    const [fetchedDocument] = await db
      .select()
      .from(schema.documents)
      .where(eq(schema.documents.id, documentId))
      .limit(1);
    document = fetchedDocument;

    console.log(`[Textract] Document query result:`, document ? `found (clientId: ${document.clientId})` : 'NOT FOUND');

    if (!document) {
      // Try to see if document exists with any status
      const allDocs = await db.select({ id: schema.documents.id }).from(schema.documents).limit(5);
      console.log(`[Textract] Sample document IDs in DB:`, allDocs.map(d => d.id));
      throw new Error(`Document ${documentId} not found`);
    }

    // Prepare document for Textract (compress images, convert PDFs to images if needed)
    const textractS3Key = await prepareForTextract(s3Key, documentId);
    console.log(`[Textract] Using S3 key for Textract: ${textractS3Key}`);

    // Step 1: Run GetDocumentAnalysis for ALL document types (including passports)
    const startCommand = new StartDocumentAnalysisCommand({
      DocumentLocation: {
        S3Object: {
          Bucket: env.AWS_S3_BUCKET,
          Name: textractS3Key,
        },
      },
      FeatureTypes: [FeatureType.FORMS, FeatureType.TABLES],
    });

    const startResult = await textractClient.send(startCommand);
    jobId = startResult.JobId;

    if (!jobId) {
      throw new Error('Textract did not return a job ID');
    }

    console.log(`[Textract] Started job ${jobId} for document ${documentId}`);

    // Update extraction with job ID
    await db
      .update(schema.documentExtractions)
      .set({
        textractJobId: jobId,
        updatedAt: new Date(),
      })
      .where(eq(schema.documentExtractions.documentId, documentId));

    // Poll for GetDocumentAnalysis results
    let attempts = 0;
    let analysisResult: GetDocumentAnalysisCommandOutput | undefined;

    while (attempts < MAX_POLL_ATTEMPTS) {
      await sleep(POLL_INTERVAL_MS);
      attempts++;

      const getCommand = new GetDocumentAnalysisCommand({
        JobId: jobId,
      });

      const result = await textractClient.send(getCommand);

      if (result.JobStatus === 'SUCCEEDED') {
        analysisResult = result;
        break;
      } else if (result.JobStatus === 'FAILED') {
        throw new Error(`Textract job failed: ${result.StatusMessage}`);
      }

      console.log(
        `[Textract] Job ${jobId} still ${result.JobStatus}, attempt ${attempts}/${MAX_POLL_ATTEMPTS}`
      );
    }

    if (!analysisResult) {
      throw new Error(`Textract job timed out after ${MAX_POLL_ATTEMPTS} attempts`);
    }

    console.log(`[Textract] Job ${jobId} completed successfully`);

    // Extract page count and record cost for AnalyzeDocument operation
    const analyzeDocPageCount = extractPageCountFromAnalyzeDocument(analysisResult);
    console.log(`[Textract] Document has ${analyzeDocPageCount} page(s)`);

    await recordTextractCost({
      organizationId,
      clientId: document.clientId ?? undefined,
      documentId,
      operationType: 'AnalyzeDocument',
      pageCount: analyzeDocPageCount,
      jobId,
      status: 'success',
    });

    // Parse GetDocumentAnalysis results
    let extractedFields: ExtractedField[] = parseTextractResponse(analysisResult, document.documentType);
    let rawResponse: unknown = analysisResult;

    console.log(`[Textract] GetDocumentAnalysis extracted ${extractedFields.length} fields`);

    // Step 2: For passports, check for gaps and run AnalyzeID + MRZ if needed
    if (document.documentType === 'passport') {
      const extractedFieldNames = new Set(extractedFields.map(f => f.canonicalField));
      const missingFields = REQUIRED_PASSPORT_FIELDS.filter(f => !extractedFieldNames.has(f));

      console.log(`[Textract] Passport field check - extracted: [${Array.from(extractedFieldNames).join(', ')}], missing: [${missingFields.join(', ')}]`);

      if (missingFields.length > 0) {
        console.log(`[Textract] Running AnalyzeID + MRZ fallback for passport document ${documentId}`);

        const analyzeIdCommand = new AnalyzeIDCommand({
          DocumentPages: [
            {
              S3Object: {
                Bucket: env.AWS_S3_BUCKET,
                Name: textractS3Key,
              },
            },
          ],
        });

        const analyzeIdResult = await textractClient.send(analyzeIdCommand);
        console.log(`[Textract] AnalyzeID completed for document ${documentId}`);

        // Record cost for AnalyzeID operation (in addition to AnalyzeDocument)
        const analyzeIdPageCount = extractPageCountFromAnalyzeID(analyzeIdResult);
        await recordTextractCost({
          organizationId,
          clientId: document.clientId ?? undefined,
          documentId,
          operationType: 'AnalyzeID',
          pageCount: analyzeIdPageCount,
          jobId: `${jobId}-analyzeid`,
          status: 'success',
        });

        // Parse AnalyzeID + MRZ results
        const analyzeIdFields = parsePassportWithMerge(analyzeIdResult);
        console.log(`[Textract] AnalyzeID + MRZ extracted ${analyzeIdFields.length} fields`);

        // Merge results: GetDocumentAnalysis + AnalyzeID + MRZ
        extractedFields = mergePassportResults(extractedFields, analyzeIdFields);
        console.log(`[Textract] Merged result: ${extractedFields.length} total fields`);

        // Store both responses for debugging/audit
        rawResponse = {
          type: 'passport_hybrid',
          getDocumentAnalysis: analysisResult,
          analyzeId: analyzeIdResult,
        };
      }
    }

    // Step 3: For birth certificates, check for gaps and run enhanced extraction if needed
    if (document.documentType === 'birth_certificate') {
      const extractedFieldNames = new Set(extractedFields.map(f => f.canonicalField));
      const missingFields = REQUIRED_BIRTH_CERTIFICATE_FIELDS.filter(f => !extractedFieldNames.has(f));

      console.log(`[Textract] Birth certificate field check - extracted: [${Array.from(extractedFieldNames).join(', ')}], missing: [${missingFields.join(', ')}]`);

      // Always run enhanced extraction for birth certificates to get parent names and metadata
      console.log(`[Textract] Running enhanced birth certificate extraction for document ${documentId}`);
      const enhancedFields = extractBirthCertificateEnhanced(analysisResult, document.documentType);
      console.log(`[Textract] Enhanced extraction found ${enhancedFields.length} additional fields`);

      if (enhancedFields.length > 0) {
        extractedFields = mergeBirthCertificateResults(extractedFields, enhancedFields);
        console.log(`[Textract] Merged result: ${extractedFields.length} total fields`);

        // Store response with enhanced flag for debugging
        rawResponse = {
          type: 'birth_certificate_enhanced',
          getDocumentAnalysis: analysisResult,
        };
      }
    }

    // Step 4: For I-94 documents, run enhanced extraction to handle CBP's specific format
    if (document.documentType === 'i94') {
      const extractedFieldNames = new Set(extractedFields.map(f => f.canonicalField));
      const missingFields = REQUIRED_I94_FIELDS.filter(f => !extractedFieldNames.has(f));

      console.log(`[Textract] I-94 field check - extracted: [${Array.from(extractedFieldNames).join(', ')}], missing: [${missingFields.join(', ')}]`);

      // Always run enhanced extraction for I-94 to handle CBP's specific format
      console.log(`[Textract] Running enhanced I-94 extraction for document ${documentId}`);
      const enhancedFields = extractI94Enhanced(analysisResult, document.documentType);
      console.log(`[Textract] Enhanced extraction found ${enhancedFields.length} additional fields`);

      if (enhancedFields.length > 0) {
        extractedFields = mergeI94Results(extractedFields, enhancedFields);
        console.log(`[Textract] Merged result: ${extractedFields.length} total fields`);

        // Store response with enhanced flag for debugging
        rawResponse = {
          type: 'i94_enhanced',
          getDocumentAnalysis: analysisResult,
        };
      }
    }

    // Step 5: For visas, run enhanced extraction + MRZ parsing
    // AWS Textract AnalyzeID does NOT support visas, so we use:
    // GetDocumentAnalysis + Enhanced Pattern Extraction + Visa MRZ Parser
    if (document.documentType === 'visa') {
      console.log(`[Textract] Running enhanced visa extraction for document ${documentId}`);

      // Run enhanced extraction (includes MRZ detection and annotation parsing)
      const enhancedFields = extractVisaEnhanced(analysisResult, document.documentType);
      console.log(`[Textract] Enhanced visa extraction found ${enhancedFields.length} additional fields`);

      if (enhancedFields.length > 0) {
        // Merge with MRZ names taking priority over visual OCR
        extractedFields = mergeVisaResults(extractedFields, enhancedFields);
        console.log(`[Textract] Merged result: ${extractedFields.length} total fields`);

        // Store response with enhanced flag for debugging
        rawResponse = {
          type: 'visa_enhanced',
          getDocumentAnalysis: analysisResult,
        };
      }
    }

    // Step 6: For marriage certificates, run enhanced extraction with name resolution
    if (document.documentType === 'marriage_certificate') {
      console.log(`[Textract] Running enhanced marriage certificate extraction for document ${documentId}`);

      // Run enhanced extraction (pattern matching for Utah-style certificates)
      const { fields: enhancedFields, rawData } = extractMarriageCertificateEnhanced(analysisResult, document.documentType);
      console.log(`[Textract] Enhanced marriage certificate extraction found ${enhancedFields.length} additional fields`);

      // Get client's existing first_name and last_name for name resolution
      let clientName: ClientNameData = {};
      if (document.clientId) {
        const clientFieldValues = await db
          .select({
            canonicalField: schema.clientFieldValues.canonicalField,
            rawValue: schema.clientFieldValues.rawValue,
          })
          .from(schema.clientFieldValues)
          .where(
            and(
              eq(schema.clientFieldValues.clientId, document.clientId),
              eq(schema.clientFieldValues.isActive, true)
            )
          );

        const firstNameField = clientFieldValues.find(f => f.canonicalField === 'first_name');
        const lastNameField = clientFieldValues.find(f => f.canonicalField === 'last_name');

        if (firstNameField) clientName.firstName = firstNameField.rawValue;
        if (lastNameField) clientName.lastName = lastNameField.rawValue;

        console.log(`[Textract] Client name for resolution: ${clientName.firstName || 'N/A'} ${clientName.lastName || 'N/A'}`);
      }

      // Resolve which person is primary (client) vs spouse
      const resolvedNameFields = resolveMarriagePrimaryAndSpouse(rawData, clientName);
      console.log(`[Textract] Resolved ${resolvedNameFields.length} name fields`);

      // Combine enhanced fields with resolved name fields
      const allEnhancedFields = [...enhancedFields, ...resolvedNameFields];

      if (allEnhancedFields.length > 0) {
        extractedFields = mergeMarriageCertificateResults(extractedFields, allEnhancedFields);
        console.log(`[Textract] Merged result: ${extractedFields.length} total fields`);

        // Store response with enhanced flag for debugging
        rawResponse = {
          type: 'marriage_certificate_enhanced',
          getDocumentAnalysis: analysisResult,
        };
      }
    }

    console.log(`[Textract] Extracted ${extractedFields.length} fields from document ${documentId}`);

    // Save raw response and extracted data
    console.log(`[Textract] Saving results to database for document ${documentId}`);
    await db.transaction(async (tx) => {
      // Update extraction with raw response
      const updateResult = await tx
        .update(schema.documentExtractions)
        .set({
          status: 'completed',
          rawTextractResponse: rawResponse,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.documentExtractions.documentId, documentId))
        .returning();

      console.log(`[Textract] Updated extraction record:`, updateResult.length > 0 ? 'success' : 'NO ROWS UPDATED');

      // Insert extracted field values only if document has a clientId
      // For pending documents (no client), field values are created later when
      // the document is assigned to a client via PATCH /documents/assign-client
      const clientId = document!.clientId;
      if (extractedFields.length > 0 && clientId) {
        // Get a system user ID for createdBy (first admin in org or document uploader)
        const createdBy = document!.uploadedBy;

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

        await tx.insert(schema.clientFieldValues).values(
          extractedFields.map((field: ExtractedField) => ({
            organizationId,
            clientId,
            source: 'document_extraction' as const,
            documentId,
            canonicalField: field.canonicalField,
            rawFieldName: field.rawFieldName,
            rawValue: field.rawValue,
            valueType: field.valueType,
            normalizedValue: field.normalizedValue,
            confidenceScore: field.confidenceScore?.toString(),
            boundingBox: field.boundingBox,
            createdBy,
            // Auto-activate if no existing active value for this field
            isActive: !activeFieldSet.has(field.canonicalField),
          }))
        );
      } else if (extractedFields.length > 0 && !clientId) {
        console.log(`[Textract] Document ${documentId} has no client - skipping field value creation. Values will be created when document is assigned to a client.`);
      }
    });

    // Invalidate document and clients cache so polling gets fresh status
    await invalidateCache(cacheKeys.allDocuments());
    await invalidateCache(cacheKeys.allClients());
    console.log(`[Textract] Cache invalidated for documents and clients`);

    // Clean up the processed file if one was created
    await cleanupProcessedFile(documentId);

    console.log(`[Textract] Successfully processed document ${documentId}`);
  } catch (error) {
    console.error(`[Textract] Error processing document ${documentId}:`, error);

    // Track cost for failed job (AWS bills for partial processing)
    try {
      await recordTextractCost({
        organizationId,
        clientId: document?.clientId ?? undefined,
        documentId,
        operationType: 'AnalyzeDocument',
        pageCount: 1, // Minimum billing unit for failed jobs
        jobId,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    } catch (costError) {
      // Log but don't fail the job for cost tracking errors
      console.error(`[Textract] Failed to record cost for failed job:`, costError);
    }

    // Update status to 'failed' (protected - don't cascade errors)
    try {
      await db
        .update(schema.documentExtractions)
        .set({
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : String(error),
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.documentExtractions.documentId, documentId));
    } catch (updateError) {
      // Log but don't throw - the original error is more important
      console.error(`[Textract] Failed to update extraction status to failed:`, updateError);
    }

    throw error;
  }
}
