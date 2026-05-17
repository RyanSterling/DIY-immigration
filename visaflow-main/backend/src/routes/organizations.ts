import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db, schema } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireSuperAdmin } from "../middleware/role.js";
import { cacheMiddleware } from "../middleware/cache.js";
import { eq, isNull, sql, ilike } from "drizzle-orm";
import { invalidateCache, cacheKeys } from "../lib/redis.js";

// Validation schemas
const createOrgSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/),
});

const updateOrgSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
});

// Create app with chained routes for type inference
const app = new Hono()
  // Apply auth to all routes
  .use("*", authMiddleware)
  .use("*", requireSuperAdmin)
  .use("*", cacheMiddleware())
  // List organizations
  .get("/", async (c) => {
    try {
    const page = parseInt(c.req.query("page") || "1");
    const pageSize = parseInt(c.req.query("pageSize") || "20");
    const search = c.req.query("search");
    const offset = (page - 1) * pageSize;

    let whereClause = isNull(schema.organizations.deletedAt);

    if (search) {
      whereClause = sql`${whereClause} AND (${ilike(
        schema.organizations.name,
        `%${search}%`
      )} OR ${ilike(schema.organizations.slug, `%${search}%`)})`;
    }

    const [organizations, countResult] = await Promise.all([
      db
        .select()
        .from(schema.organizations)
        .where(whereClause)
        .limit(pageSize)
        .offset(offset)
        .orderBy(schema.organizations.createdAt),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.organizations)
        .where(whereClause),
    ]);

    const total = countResult[0]?.count ?? 0;

    return c.json({
      data: organizations,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
    } catch (error) {
      return c.json({ error: "Failed to list organizations", details: String(error) }, 500);
    }
  })
  // Get single organization
  .get("/:id", async (c) => {
    try {
    const { id } = c.req.param();

    const [organization] = await db
      .select()
      .from(schema.organizations)
      .where(
        sql`${eq(schema.organizations.id, id)} AND ${isNull(
          schema.organizations.deletedAt
        )}`
      )
      .limit(1);

    if (!organization) {
      return c.json({ error: "Organization not found" }, 404);
    }

    return c.json({ data: organization });
    } catch (error) {
      return c.json({ error: "Failed to get organization", details: String(error) }, 500);
    }
  })
  // Create organization
  .post("/", zValidator("json", createOrgSchema), async (c) => {
    try {
    const { name, slug } = c.req.valid("json");

    // Check if slug already exists
    const [existing] = await db
      .select()
      .from(schema.organizations)
      .where(eq(schema.organizations.slug, slug))
      .limit(1);

    if (existing) {
      return c.json(
        { error: "Organization with this slug already exists" },
        409
      );
    }

    const [organization] = await db
      .insert(schema.organizations)
      .values({ name, slug })
      .returning();

    await invalidateCache(cacheKeys.allOrganizations());

    return c.json({ data: organization }, 201);
    } catch (error) {
      return c.json({ error: "Failed to create organization", details: String(error) }, 500);
    }
  })
  // Update organization
  .patch("/:id", zValidator("json", updateOrgSchema), async (c) => {
    try {
    const { id } = c.req.param();
    const data = c.req.valid("json");

    // Check if organization exists
    const [existing] = await db
      .select()
      .from(schema.organizations)
      .where(
        sql`${eq(schema.organizations.id, id)} AND ${isNull(
          schema.organizations.deletedAt
        )}`
      )
      .limit(1);

    if (!existing) {
      return c.json({ error: "Organization not found" }, 404);
    }

    // If updating slug, check it doesn't conflict
    if (data.slug) {
      const [slugConflict] = await db
        .select()
        .from(schema.organizations)
        .where(
          sql`${eq(schema.organizations.slug, data.slug)} AND ${
            schema.organizations.id
          } != ${id}`
        )
        .limit(1);

      if (slugConflict) {
        return c.json(
          { error: "Organization with this slug already exists" },
          409
        );
      }
    }

    const [organization] = await db
      .update(schema.organizations)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(schema.organizations.id, id))
      .returning();

    await invalidateCache(cacheKeys.allOrganizations());

    return c.json({ data: organization });
    } catch (error) {
      return c.json({ error: "Failed to update organization", details: String(error) }, 500);
    }
  })
  // Soft delete organization
  .delete("/:id", async (c) => {
    try {
    const { id } = c.req.param();

    const [existing] = await db
      .select()
      .from(schema.organizations)
      .where(
        sql`${eq(schema.organizations.id, id)} AND ${isNull(
          schema.organizations.deletedAt
        )}`
      )
      .limit(1);

    if (!existing) {
      return c.json({ error: "Organization not found" }, 404);
    }

    await db
      .update(schema.organizations)
      .set({ deletedAt: new Date() })
      .where(eq(schema.organizations.id, id));

    await invalidateCache(cacheKeys.allOrganizations());

    return c.json({ success: true });
    } catch (error) {
      return c.json({ error: "Failed to delete organization", details: String(error) }, 500);
    }
  });

export default app;
