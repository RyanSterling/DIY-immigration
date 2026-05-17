import { Hono } from "hono";
import { db, schema } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { cacheMiddleware } from "../middleware/cache.js";
import { requireOrg } from "../middleware/requireOrg.js";
import { eq, isNull, sql, and } from "drizzle-orm";
import { invalidateCache, cacheKeys } from "../lib/redis.js";

// Create app with chained routes for type inference
const app = new Hono()
  // Apply auth to all routes
  .use("*", authMiddleware)
  .use("*", requireOrg)
  // Cache GET responses (24h TTL, invalidated on mutations)
  .use("*", cacheMiddleware())
  // List clients for the user's organization with search support
  // Returns firstName and lastName from active field values
  .get("/", async (c) => {
    try {
      const user = c.get("user");

      const page = parseInt(c.req.query("page") || "1");
      const pageSize = parseInt(c.req.query("pageSize") || "20");
      const search = c.req.query("search");
      const offset = (page - 1) * pageSize;

      // Build query with active field values for firstName and lastName
      // Search is performed on active first_name, last_name, and email field values
      const searchCondition = search
        ? sql`
          EXISTS (
            SELECT 1 FROM client_field_values search_cfv
            WHERE search_cfv.client_id = clients.id
              AND search_cfv.is_active = true
              AND search_cfv.canonical_field IN ('first_name', 'last_name', 'nationality')
              AND search_cfv.raw_value ILIKE ${`%${search}%`}
          )
        `
        : sql`true`;

      // Query clients with their active firstName and lastName
      const clientsQuery = sql`
        SELECT
          c.id,
          c.organization_id as "organizationId",
          c.created_at as "createdAt",
          c.updated_at as "updatedAt",
          c.deleted_at as "deletedAt",
          c.created_by as "createdBy",
          c.updated_by as "updatedBy",
          MAX(CASE WHEN cfv.canonical_field = 'first_name' AND cfv.is_active = true THEN cfv.raw_value END) as "firstName",
          MAX(CASE WHEN cfv.canonical_field = 'last_name' AND cfv.is_active = true THEN cfv.raw_value END) as "lastName",
          MAX(CASE WHEN cfv.canonical_field = 'nationality' AND cfv.is_active = true THEN cfv.raw_value END) as "nationality"
        FROM clients c
        LEFT JOIN client_field_values cfv ON c.id = cfv.client_id
        WHERE c.organization_id = ${user.organizationId}
          AND c.deleted_at IS NULL
          AND ${searchCondition}
        GROUP BY c.id
        ORDER BY c.created_at DESC
        LIMIT ${pageSize}
        OFFSET ${offset}
      `;

      const countQuery = sql`
        SELECT COUNT(DISTINCT c.id)::int as count
        FROM clients c
        WHERE c.organization_id = ${user.organizationId}
          AND c.deleted_at IS NULL
          AND ${searchCondition}
      `;

      const [clients, countResult] = await Promise.all([
        db.execute(clientsQuery),
        db.execute(countQuery),
      ]);

      const total = (countResult[0] as { count: number })?.count ?? 0;

      console.log(clients);

      return c.json({
        items: clients,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      });
    } catch (error) {
      console.error("Error listing clients:", error);
      return c.json(
        { error: "Failed to list clients", details: String(error) },
        500
      );
    }
  })
  // Get single client with all active field values
  .get("/:id", async (c) => {
    try {
      const user = c.get("user");
      const { id } = c.req.param();

      // Get the client
      const [client] = await db
        .select()
        .from(schema.clients)
        .where(
          and(
            eq(schema.clients.id, id),
            eq(schema.clients.organizationId, user.organizationId!),
            isNull(schema.clients.deletedAt)
          )
        )
        .limit(1);

      if (!client) {
        return c.json({ error: "Client not found" }, 404);
      }

      // Get all active field values for this client
      const activeValues = await db
        .select({
          id: schema.clientFieldValues.id,
          canonicalField: schema.clientFieldValues.canonicalField,
          rawValue: schema.clientFieldValues.rawValue,
          valueType: schema.clientFieldValues.valueType,
          normalizedValue: schema.clientFieldValues.normalizedValue,
          documentId: schema.clientFieldValues.documentId,
          confidenceScore: schema.clientFieldValues.confidenceScore,
          source: schema.clientFieldValues.source,
          createdAt: schema.clientFieldValues.createdAt,
        })
        .from(schema.clientFieldValues)
        .where(
          and(
            eq(schema.clientFieldValues.clientId, id),
            eq(schema.clientFieldValues.isActive, true)
          )
        );

      // Transform active values into an object keyed by canonicalField
      const activeValuesMap: Record<
        string,
        {
          id: string;
          rawValue: string;
          valueType: string;
          normalizedValue: unknown;
          documentId: string | null;
          confidenceScore: string | null;
          source: string;
          createdAt: Date;
        }
      > = {};

      for (const value of activeValues) {
        activeValuesMap[value.canonicalField] = {
          id: value.id,
          rawValue: value.rawValue,
          valueType: value.valueType,
          normalizedValue: value.normalizedValue,
          documentId: value.documentId,
          confidenceScore: value.confidenceScore,
          source: value.source,
          createdAt: value.createdAt,
        };
      }

      return c.json({
        ...client,
        activeValues: activeValuesMap,
      });
    } catch (error) {
      return c.json(
        { error: "Failed to get client", details: String(error) },
        500
      );
    }
  })
  // Create client (identity container only - no personal data)
  // Personal data is added later via document extraction or manual field value creation
  .post("/", async (c) => {
    try {
      const user = c.get("user");

      const [client] = await db
        .insert(schema.clients)
        .values({
          organizationId: user.organizationId!,
          createdBy: user.id,
          updatedBy: user.id,
        })
        .returning();

      await invalidateCache(cacheKeys.allClients());

      return c.json(client, 201);
    } catch (error) {
      return c.json(
        { error: "Failed to create client", details: String(error) },
        500
      );
    }
  })
  // PATCH endpoint removed - all personal data updates go through clientFieldValues
  // Soft delete client
  .delete("/:id", async (c) => {
    try {
      const user = c.get("user");
      const { id } = c.req.param();

      const [existing] = await db
        .select()
        .from(schema.clients)
        .where(
          and(
            eq(schema.clients.id, id),
            eq(schema.clients.organizationId, user.organizationId!),
            isNull(schema.clients.deletedAt)
          )
        )
        .limit(1);

      if (!existing) {
        return c.json({ error: "Client not found" }, 404);
      }

      await db
        .update(schema.clients)
        .set({
          deletedAt: new Date(),
          updatedBy: user.id,
        })
        .where(eq(schema.clients.id, id));

      await invalidateCache(cacheKeys.allClients());

      return c.json({ success: true });
    } catch (error) {
      return c.json(
        { error: "Failed to delete client", details: String(error) },
        500
      );
    }
  });

export default app;
