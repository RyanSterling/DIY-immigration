import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db, schema } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireOrg } from "../middleware/requireOrg.js";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { invalidateCache, cacheKeys } from "../lib/redis.js";

// Validation schemas
const createFieldValueSchema = z.object({
  clientId: z.uuid(),
  canonicalField: z.string().min(1),
  rawValue: z.string(),
  valueType: z
    .enum(["text", "date", "number", "boolean", "country"])
    .optional()
    .default("text"),
  normalizedValue: z.any().optional(),
  setActive: z.boolean().optional().default(true), // Default to true for user edits
  source: z
    .enum(["document_extraction", "user_edit"])
    .optional()
    .default("user_edit"),
});

const bulkCreateFieldValuesSchema = z.object({
  clientId: z.uuid(),
  values: z.array(
    z.object({
      canonicalField: z.string().min(1),
      rawValue: z.string(),
      valueType: z
        .enum(["text", "date", "number", "boolean", "country"])
        .optional()
        .default("text"),
      normalizedValue: z.any().optional(),
      setActive: z.boolean().optional().default(true),
      source: z
        .enum(["document_extraction", "user_edit"])
        .optional()
        .default("user_edit"),
      documentId: z.uuid().optional(),
    })
  ),
});

// Create app with chained routes for type inference
const app = new Hono()
  // Apply auth to all routes
  .use("*", authMiddleware)
  .use("*", requireOrg)
  // Create a new field value (user edit)
  .post("/", zValidator("json", createFieldValueSchema), async (c) => {
    try {
      const user = c.get("user");
      const {
        clientId,
        canonicalField,
        rawValue,
        valueType,
        normalizedValue,
        setActive,
        source,
      } = c.req.valid("json");

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

      // If setActive is true, first deactivate all existing values for this field
      if (setActive) {
        await db
          .update(schema.clientFieldValues)
          .set({ isActive: false })
          .where(
            and(
              eq(schema.clientFieldValues.clientId, clientId),
              eq(schema.clientFieldValues.canonicalField, canonicalField)
            )
          );
      }

      // Create the new field value
      const [fieldValue] = await db
        .insert(schema.clientFieldValues)
        .values({
          organizationId: user.organizationId!,
          clientId,
          source: source ?? "user_edit",
          canonicalField,
          rawValue,
          valueType,
          normalizedValue,
          isActive: setActive,
          createdBy: user.id,
        })
        .returning();

      // Invalidate client cache
      await invalidateCache(cacheKeys.allClients());

      return c.json(fieldValue, 201);
    } catch (error) {
      console.error("Error creating field value:", error);
      return c.json(
        { error: "Failed to create field value", details: String(error) },
        500
      );
    }
  })
  // Bulk create field values (user edits)
  .post("/bulk", zValidator("json", bulkCreateFieldValuesSchema), async (c) => {
    try {
      const user = c.get("user");
      const { clientId, values } = c.req.valid("json");

      if (values.length === 0) {
        return c.json({ data: [] }, 201);
      }

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

      // Use a transaction for atomicity
      const createdValues = await db.transaction(async (tx) => {
        // Collect fields that need to be deactivated (where setActive is true)
        const fieldsToDeactivate = [
          ...new Set(
            values
              .filter((v) => v.setActive !== false)
              .map((v) => v.canonicalField)
          ),
        ];

        // Deactivate existing values for those fields in one query
        if (fieldsToDeactivate.length > 0) {
          await tx
            .update(schema.clientFieldValues)
            .set({ isActive: false })
            .where(
              and(
                eq(schema.clientFieldValues.clientId, clientId),
                inArray(
                  schema.clientFieldValues.canonicalField,
                  fieldsToDeactivate
                )
              )
            );
        }

        // Batch insert all new values
        const insertedValues = await tx
          .insert(schema.clientFieldValues)
          .values(
            values.map((v) => ({
              organizationId: user.organizationId!,
              clientId,
              source: v.source ?? "user_edit",
              canonicalField: v.canonicalField,
              rawValue: v.rawValue,
              valueType: v.valueType,
              normalizedValue: v.normalizedValue,
              documentId: v.documentId,
              isActive: v.setActive !== false,
              createdBy: user.id,
            }))
          )
          .returning();

        return insertedValues;
      });

      // Invalidate client cache once
      await invalidateCache(cacheKeys.allClients());

      return c.json({ items: createdValues }, 201);
    } catch (error) {
      console.error("Error bulk creating field values:", error);
      return c.json(
        { error: "Failed to bulk create field values", details: String(error) },
        500
      );
    }
  })
  // Set a field value as active
  .put("/:id/set-active", async (c) => {
    try {
      const user = c.get("user");
      const { id } = c.req.param();

      // Get the field value and verify ownership
      const [fieldValue] = await db
        .select()
        .from(schema.clientFieldValues)
        .where(
          and(
            eq(schema.clientFieldValues.id, id),
            eq(schema.clientFieldValues.organizationId, user.organizationId!)
          )
        )
        .limit(1);

      if (!fieldValue) {
        return c.json({ error: "Field value not found" }, 404);
      }

      // Deactivate all values for this client+field combination
      await db
        .update(schema.clientFieldValues)
        .set({ isActive: false })
        .where(
          and(
            eq(schema.clientFieldValues.clientId, fieldValue.clientId),
            eq(
              schema.clientFieldValues.canonicalField,
              fieldValue.canonicalField
            )
          )
        );

      // Activate the selected value
      await db
        .update(schema.clientFieldValues)
        .set({ isActive: true })
        .where(eq(schema.clientFieldValues.id, id));

      // Invalidate client cache
      await invalidateCache(cacheKeys.allClients());

      return c.json({ success: true });
    } catch (error) {
      console.error("Error setting active field value:", error);
      return c.json(
        { error: "Failed to set active field value", details: String(error) },
        500
      );
    }
  })
  // Get all stacked values for a client (for conflict resolution UI)
  .get("/client/:clientId", async (c) => {
    try {
      const user = c.get("user");
      const { clientId } = c.req.param();

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

      // Get all field values for this client, ordered by creation date
      const fieldValues = await db
        .select()
        .from(schema.clientFieldValues)
        .where(eq(schema.clientFieldValues.clientId, clientId))
        .orderBy(
          schema.clientFieldValues.canonicalField,
          schema.clientFieldValues.createdAt
        );

      // Group by canonical field
      const groupedValues: Record<
        string,
        Array<{
          id: string;
          rawValue: string;
          valueType: string;
          normalizedValue: unknown;
          documentId: string | null;
          confidenceScore: string | null;
          source: string;
          isActive: boolean;
          createdAt: Date;
        }>
      > = {};

      for (const value of fieldValues) {
        if (!groupedValues[value.canonicalField]) {
          groupedValues[value.canonicalField] = [];
        }
        groupedValues[value.canonicalField].push({
          id: value.id,
          rawValue: value.rawValue,
          valueType: value.valueType,
          normalizedValue: value.normalizedValue,
          documentId: value.documentId,
          confidenceScore: value.confidenceScore,
          source: value.source,
          isActive: value.isActive,
          createdAt: value.createdAt,
        });
      }

      return c.json(groupedValues);
    } catch (error) {
      console.error("Error getting client field values:", error);
      return c.json(
        { error: "Failed to get client field values", details: String(error) },
        500
      );
    }
  });

export default app;
