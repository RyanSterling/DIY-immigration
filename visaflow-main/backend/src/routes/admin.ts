import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db, schema } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireSuperAdmin } from "../middleware/role.js";
import { cacheMiddleware } from "../middleware/cache.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { eq, isNull, sql } from "drizzle-orm";

// Validation schema for onboarding organization with initial admin user
const onboardOrgSchema = z.object({
  organization: z.object({
    name: z.string().min(1, "Organization name is required"),
    slug: z
      .string()
      .min(1, "Slug is required")
      .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens only"),
  }),
  user: z.object({
    email: z.string().email("Valid email is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
  }),
});
import { invalidateCache, cacheKeys } from "../lib/redis.js";

// Create app with chained routes for type inference
const app = new Hono()
  // Apply auth to all routes
  .use("*", authMiddleware)
  .use("*", requireSuperAdmin)
  .use("*", cacheMiddleware())

  // Get aggregate stats
  .get("/stats", async (c) => {
    try {
      const [orgCount, userCount, clientCount, documentCount] =
        await Promise.all([
          db
            .select({ count: sql<number>`count(*)::int` })
            .from(schema.organizations)
            .where(isNull(schema.organizations.deletedAt)),
          db
            .select({ count: sql<number>`count(*)::int` })
            .from(schema.users)
            .where(isNull(schema.users.deletedAt)),
          db
            .select({ count: sql<number>`count(*)::int` })
            .from(schema.clients)
            .where(isNull(schema.clients.deletedAt)),
          db
            .select({ count: sql<number>`count(*)::int` })
            .from(schema.documents)
            .where(isNull(schema.documents.deletedAt)),
        ]);

      return c.json({
        data: {
          organizations: orgCount[0]?.count ?? 0,
          users: userCount[0]?.count ?? 0,
          clients: clientCount[0]?.count ?? 0,
          documents: documentCount[0]?.count ?? 0,
        },
      });
    } catch (error) {
      return c.json(
        { error: "Failed to get stats", details: String(error) },
        500
      );
    }
  })

  // Onboard a new organization with its initial admin user (atomic operation)
  .post(
    "/onboard-organization",
    zValidator("json", onboardOrgSchema),
    async (c) => {
      const currentUser = c.get("user");
      const { organization, user } = c.req.valid("json");

      // Check if slug is already taken
      const [existingOrg] = await db
        .select()
        .from(schema.organizations)
        .where(eq(schema.organizations.slug, organization.slug))
        .limit(1);

      if (existingOrg) {
        return c.json({ error: "Organization slug is already taken" }, 400);
      }

      // Check if email is already taken
      const [existingUser] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, user.email))
        .limit(1);

      if (existingUser) {
        return c.json({ error: "Email is already registered" }, 400);
      }

      let createdOrg: typeof schema.organizations.$inferSelect | null = null;
      let createdAuthUserId: string | null = null;

      try {
        // Step 1: Create organization
        const [org] = await db
          .insert(schema.organizations)
          .values({
            name: organization.name,
            slug: organization.slug,
          })
          .returning();
        createdOrg = org;

        // Step 2: Create user in Supabase Auth
        const { data: authData, error: authError } =
          await supabaseAdmin.auth.admin.createUser({
            email: user.email,
            password: user.password,
            email_confirm: true,
          });

        if (authError) {
          throw new Error(`Supabase Auth error: ${authError.message}`);
        }

        if (!authData?.user) {
          throw new Error("No user returned from Supabase Auth");
        }

        createdAuthUserId = authData.user.id;

        // Step 3: Create user in database linked to organization
        const [dbUser] = await db
          .insert(schema.users)
          .values({
            id: authData.user.id,
            email: user.email,
            role: "org_admin",
            organizationId: org.id,
            createdBy: currentUser.id,
          })
          .returning();

        await invalidateCache(cacheKeys.allOrganizations());
        await invalidateCache(cacheKeys.allUsers());

        return c.json(
          {
            data: {
              organization: {
                id: org.id,
                name: org.name,
                slug: org.slug,
                createdAt: org.createdAt,
              },
              user: {
                id: dbUser.id,
                email: dbUser.email,
                role: dbUser.role,
                organizationId: dbUser.organizationId,
              },
            },
          },
          201
        );
      } catch (error) {
        // Rollback: delete Supabase Auth user if created
        if (createdAuthUserId) {
          try {
            await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
          } catch (rollbackError) {
            console.error(
              "Failed to rollback Supabase Auth user:",
              rollbackError
            );
          }
        }

        // Rollback: delete organization if created
        if (createdOrg) {
          try {
            await db
              .delete(schema.organizations)
              .where(eq(schema.organizations.id, createdOrg.id));
          } catch (rollbackError) {
            console.error("Failed to rollback organization:", rollbackError);
          }
        }

        return c.json(
          {
            error: "Failed to onboard organization",
            details: String(error),
          },
          500
        );
      }
    }
  )

  // List all clients across organizations
  .get("/clients", async (c) => {
    try {
      const page = parseInt(c.req.query("page") || "1");
      const pageSize = parseInt(c.req.query("pageSize") || "20");
      const organizationId = c.req.query("organizationId");
      // const _search = c.req.query("search"); // TODO: Implement client search in admin panel
      const offset = (page - 1) * pageSize;

      let whereClause = isNull(schema.clients.deletedAt);

      if (organizationId) {
        whereClause = sql`${whereClause} AND ${eq(
          schema.clients.organizationId,
          organizationId
        )}`;
      }

      // Get clients with organization info
      const [clients, countResult] = await Promise.all([
        db
          .select({
            id: schema.clients.id,
            organizationId: schema.clients.organizationId,
            createdAt: schema.clients.createdAt,
            updatedAt: schema.clients.updatedAt,
            organizationName: schema.organizations.name,
            organizationSlug: schema.organizations.slug,
          })
          .from(schema.clients)
          .leftJoin(
            schema.organizations,
            eq(schema.clients.organizationId, schema.organizations.id)
          )
          .where(whereClause)
          .limit(pageSize)
          .offset(offset)
          .orderBy(schema.clients.createdAt),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(schema.clients)
          .where(whereClause),
      ]);

      // Get active field values for each client to show names
      const clientIds = clients.map((c) => c.id);
      const fieldValues =
        clientIds.length > 0
          ? await db
              .select({
                clientId: schema.clientFieldValues.clientId,
                canonicalField: schema.clientFieldValues.canonicalField,
                rawValue: schema.clientFieldValues.rawValue,
              })
              .from(schema.clientFieldValues)
              .where(
                sql`${schema.clientFieldValues.clientId} IN (${sql.join(
                  clientIds.map((id) => sql`${id}`),
                  sql`, `
                )}) AND ${schema.clientFieldValues.isActive} = true AND ${schema.clientFieldValues.canonicalField} IN ('firstName', 'lastName', 'nationality')`
              )
          : [];

      // Map field values to clients
      const clientsWithFields = clients.map((client) => {
        const clientFields = fieldValues.filter(
          (fv) => fv.clientId === client.id
        );
        const firstName =
          clientFields.find((f) => f.canonicalField === "firstName")
            ?.rawValue || "";
        const lastName =
          clientFields.find((f) => f.canonicalField === "lastName")?.rawValue ||
          "";
        const nationality =
          clientFields.find((f) => f.canonicalField === "nationality")
            ?.rawValue || "";

        return {
          ...client,
          firstName,
          lastName,
          nationality,
        };
      });

      const total = countResult[0]?.count ?? 0;

      return c.json({
        data: clientsWithFields,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      });
    } catch (error) {
      return c.json(
        { error: "Failed to list clients", details: String(error) },
        500
      );
    }
  })

  // List all documents across organizations
  .get("/documents", async (c) => {
    try {
      const page = parseInt(c.req.query("page") || "1");
      const pageSize = parseInt(c.req.query("pageSize") || "20");
      const organizationId = c.req.query("organizationId");
      const offset = (page - 1) * pageSize;

      let whereClause = isNull(schema.documents.deletedAt);

      if (organizationId) {
        whereClause = sql`${whereClause} AND ${eq(
          schema.documents.organizationId,
          organizationId
        )}`;
      }

      const [documents, countResult] = await Promise.all([
        db
          .select({
            id: schema.documents.id,
            organizationId: schema.documents.organizationId,
            clientId: schema.documents.clientId,
            documentType: schema.documents.documentType,
            originalFilename: schema.documents.originalFilename,
            fileSize: schema.documents.fileSize,
            createdAt: schema.documents.createdAt,
            organizationName: schema.organizations.name,
            organizationSlug: schema.organizations.slug,
          })
          .from(schema.documents)
          .leftJoin(
            schema.organizations,
            eq(schema.documents.organizationId, schema.organizations.id)
          )
          .where(whereClause)
          .limit(pageSize)
          .offset(offset)
          .orderBy(schema.documents.createdAt),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(schema.documents)
          .where(whereClause),
      ]);

      // Get costs for each document
      const documentIds = documents.map((d) => d.id);
      const documentCosts =
        documentIds.length > 0
          ? await db
              .select({
                resourceId: schema.thirdPartyServiceCosts.resourceId,
                totalCostUsd: sql<string>`SUM(${schema.thirdPartyServiceCosts.estimatedCostUsd}::numeric)::text`,
              })
              .from(schema.thirdPartyServiceCosts)
              .where(
                sql`${schema.thirdPartyServiceCosts.resourceId} IN (${sql.join(
                  documentIds.map((id) => sql`${id}`),
                  sql`, `
                )}) AND ${schema.thirdPartyServiceCosts.resourceType} = 'document'`
              )
              .groupBy(schema.thirdPartyServiceCosts.resourceId)
          : [];

      // Map costs to documents
      const documentsWithCosts = documents.map((doc) => {
        const cost = documentCosts.find((c) => c.resourceId === doc.id);
        return {
          ...doc,
          costUsd: cost?.totalCostUsd ?? "0",
        };
      });

      const total = countResult[0]?.count ?? 0;

      return c.json({
        data: documentsWithCosts,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      });
    } catch (error) {
      return c.json(
        { error: "Failed to list documents", details: String(error) },
        500
      );
    }
  })

  // Disable organization
  .patch("/organizations/:id/disable", async (c) => {
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

      if (existing.disabledAt) {
        return c.json({ error: "Organization is already disabled" }, 400);
      }

      const [organization] = await db
        .update(schema.organizations)
        .set({
          disabledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.organizations.id, id))
        .returning();

      await invalidateCache(cacheKeys.allOrganizations());

      return c.json({ data: organization });
    } catch (error) {
      return c.json(
        { error: "Failed to disable organization", details: String(error) },
        500
      );
    }
  })

  // Enable organization
  .patch("/organizations/:id/enable", async (c) => {
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

      if (!existing.disabledAt) {
        return c.json({ error: "Organization is not disabled" }, 400);
      }

      const [organization] = await db
        .update(schema.organizations)
        .set({
          disabledAt: null,
          updatedAt: new Date(),
        })
        .where(eq(schema.organizations.id, id))
        .returning();

      await invalidateCache(cacheKeys.allOrganizations());

      return c.json({ data: organization });
    } catch (error) {
      return c.json(
        { error: "Failed to enable organization", details: String(error) },
        500
      );
    }
  })

  // Disable user
  .patch("/users/:id/disable", async (c) => {
    try {
      const { id } = c.req.param();

      const [existing] = await db
        .select()
        .from(schema.users)
        .where(
          sql`${eq(schema.users.id, id)} AND ${isNull(schema.users.deletedAt)}`
        )
        .limit(1);

      if (!existing) {
        return c.json({ error: "User not found" }, 404);
      }

      if (existing.disabledAt) {
        return c.json({ error: "User is already disabled" }, 400);
      }

      // Prevent disabling self
      const currentUser = c.get("user");
      if (currentUser.id === id) {
        return c.json({ error: "Cannot disable yourself" }, 400);
      }

      const [user] = await db
        .update(schema.users)
        .set({
          disabledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, id))
        .returning();

      return c.json({ data: user });
    } catch (error) {
      return c.json(
        { error: "Failed to disable user", details: String(error) },
        500
      );
    }
  })

  // Enable user
  .patch("/users/:id/enable", async (c) => {
    try {
      const { id } = c.req.param();

      const [existing] = await db
        .select()
        .from(schema.users)
        .where(
          sql`${eq(schema.users.id, id)} AND ${isNull(schema.users.deletedAt)}`
        )
        .limit(1);

      if (!existing) {
        return c.json({ error: "User not found" }, 404);
      }

      if (!existing.disabledAt) {
        return c.json({ error: "User is not disabled" }, 400);
      }

      const [user] = await db
        .update(schema.users)
        .set({
          disabledAt: null,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, id))
        .returning();

      return c.json({ data: user });
    } catch (error) {
      return c.json(
        { error: "Failed to enable user", details: String(error) },
        500
      );
    }
  })

  // Get organization costs
  .get("/organizations/:id/costs", async (c) => {
    try {
      const { id } = c.req.param();

      // Verify organization exists
      const [org] = await db
        .select()
        .from(schema.organizations)
        .where(
          sql`${eq(schema.organizations.id, id)} AND ${isNull(
            schema.organizations.deletedAt
          )}`
        )
        .limit(1);

      if (!org) {
        return c.json({ error: "Organization not found" }, 404);
      }

      // Get total cost
      const [totalResult] = await db
        .select({
          totalCostUsd: sql<string>`COALESCE(SUM(${schema.thirdPartyServiceCosts.estimatedCostUsd}::numeric), 0)::text`,
          operationCount: sql<number>`COUNT(*)::int`,
        })
        .from(schema.thirdPartyServiceCosts)
        .where(eq(schema.thirdPartyServiceCosts.organizationId, id));

      // Get monthly breakdown
      const monthlyCosts = await db
        .select({
          billingPeriod: schema.thirdPartyServiceCosts.billingPeriod,
          totalCostUsd: sql<string>`SUM(${schema.thirdPartyServiceCosts.estimatedCostUsd}::numeric)::text`,
          operationCount: sql<number>`COUNT(*)::int`,
        })
        .from(schema.thirdPartyServiceCosts)
        .where(eq(schema.thirdPartyServiceCosts.organizationId, id))
        .groupBy(schema.thirdPartyServiceCosts.billingPeriod)
        .orderBy(schema.thirdPartyServiceCosts.billingPeriod);

      return c.json({
        data: {
          organizationId: id,
          totalCostUsd: totalResult?.totalCostUsd ?? "0",
          totalOperations: totalResult?.operationCount ?? 0,
          monthlyCosts: monthlyCosts.map((mc) => ({
            billingPeriod: mc.billingPeriod ?? "unknown",
            totalCostUsd: mc.totalCostUsd ?? "0",
            operationCount: mc.operationCount ?? 0,
          })),
        },
      });
    } catch (error) {
      return c.json(
        { error: "Failed to get organization costs", details: String(error) },
        500
      );
    }
  });

export default app;
