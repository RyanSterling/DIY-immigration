import { db, schema } from '../../db/index.js';
import { and, isNull, lt, sql, eq } from 'drizzle-orm';
import { deleteFile } from '../../lib/s3/index.js';
import type { OrphanCleanupJobData } from './types.js';

const ORPHAN_AGE_HOURS = 24;

/**
 * Cleans up orphaned documents (documents without a clientId that are older than 24 hours).
 * This handles the case where a user uploads documents in the new client flow but abandons
 * before completing the client creation.
 */
export async function handleOrphanCleanup(_data: OrphanCleanupJobData): Promise<void> {
  console.log(`[Cleanup] Starting orphan document cleanup`);

  try {
    // Find orphaned documents (no clientId, older than ORPHAN_AGE_HOURS)
    const orphanedDocs = await db
      .select({
        document: schema.documents,
      })
      .from(schema.documents)
      .where(
        and(
          isNull(schema.documents.clientId),
          isNull(schema.documents.deletedAt),
          lt(
            schema.documents.createdAt,
            sql`NOW() - INTERVAL '${sql.raw(String(ORPHAN_AGE_HOURS))} hours'`
          )
        )
      );

    if (orphanedDocs.length === 0) {
      console.log(`[Cleanup] No orphaned documents found`);
      return;
    }

    console.log(`[Cleanup] Found ${orphanedDocs.length} orphaned documents to clean up`);

    let deletedCount = 0;
    let errorCount = 0;

    for (const { document } of orphanedDocs) {
      try {
        // Delete from S3
        await deleteFile(document.filePath);

        // Hard delete the document extraction record
        await db
          .delete(schema.documentExtractions)
          .where(eq(schema.documentExtractions.documentId, document.id));

        // Hard delete the document record
        await db
          .delete(schema.documents)
          .where(eq(schema.documents.id, document.id));

        deletedCount++;
        console.log(`[Cleanup] Deleted orphaned document ${document.id}`);
      } catch (error) {
        errorCount++;
        console.error(`[Cleanup] Error deleting document ${document.id}:`, error);
        // Continue with other documents even if one fails
      }
    }

    console.log(
      `[Cleanup] Completed. Deleted: ${deletedCount}, Errors: ${errorCount}`
    );
  } catch (error) {
    console.error(`[Cleanup] Error during orphan cleanup:`, error);
    throw error;
  }
}
