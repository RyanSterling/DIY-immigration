import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db, schema, userRoleEnum } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { cacheMiddleware } from "../middleware/cache.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { eq, isNull, sql, ilike, and } from "drizzle-orm";
import { invalidateCache, cacheKeys } from "../lib/redis.js";

// Role schema - derived from Drizzle enum (single source of truth)
const roleSchema = z.enum(userRoleEnum.enumValues);

// Validation schemas
const createUserSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  role: roleSchema,
  organizationId: z.uuid().optional().nullable(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const updateUserSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  organizationId: z.uuid().optional().nullable(),
  role: roleSchema.optional(),
});

// Create app with chained routes for type inference
const app = new Hono()
  // Apply auth to all routes
  .use("*", authMiddleware)
  // Cache GET responses (24h TTL, invalidated on mutations)
  .use("*", cacheMiddleware())
  // Get current user
  .get("/me", async (c) => {
    try {
    const user = c.get("user");
    return c.json({ data: user });
    } catch (error) {
      return c.json({ error: "Failed to get current user", details: String(error) }, 500);
    }
  })
  // List users
  .get("/", async (c) => {
    try {
    const currentUser = c.get("user");
    const page = parseInt(c.req.query("page") || "1");
    const pageSize = parseInt(c.req.query("pageSize") || "20");
    const search = c.req.query("search");
    const offset = (page - 1) * pageSize;

    // Build where clause based on user role
    let baseCondition = isNull(schema.users.deletedAt);

    // Org admins can only see users in their organization
    if (currentUser.role === "org_admin" && currentUser.organizationId) {
      baseCondition = and(
        baseCondition,
        eq(schema.users.organizationId, currentUser.organizationId)
      )!;
    }

    let whereClause = baseCondition;

    if (search) {
      whereClause = sql`${baseCondition} AND (${ilike(
        schema.users.email,
        `%${search}%`
      )} OR ${ilike(schema.users.firstName, `%${search}%`)} OR ${ilike(
        schema.users.lastName,
        `%${search}%`
      )})`;
    }

    const [users, countResult] = await Promise.all([
      db
        .select({
          id: schema.users.id,
          email: schema.users.email,
          role: schema.users.role,
          organizationId: schema.users.organizationId,
          firstName: schema.users.firstName,
          lastName: schema.users.lastName,
          createdAt: schema.users.createdAt,
        })
        .from(schema.users)
        .where(whereClause)
        .limit(pageSize)
        .offset(offset)
        .orderBy(schema.users.createdAt),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.users)
        .where(whereClause),
    ]);

    const total = countResult[0]?.count ?? 0;

    return c.json({
      data: users,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
    } catch (error) {
      return c.json({ error: "Failed to list users", details: String(error) }, 500);
    }
  })
  // Get single user
  .get("/:id", async (c) => {
    try {
    const { id } = c.req.param();
    const currentUser = c.get("user");

    const [user] = await db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        role: schema.users.role,
        organizationId: schema.users.organizationId,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
      .where(and(eq(schema.users.id, id), isNull(schema.users.deletedAt)))
      .limit(1);

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // Org admins can only view users in their organization
    if (
      currentUser.role === "org_admin" &&
      user.organizationId !== currentUser.organizationId
    ) {
      return c.json({ error: "Forbidden" }, 403);
    }

    return c.json({ data: user });
    } catch (error) {
      return c.json({ error: "Failed to get user", details: String(error) }, 500);
    }
  })
  // Create user (super admin only for super_admin role, org admin for org_admin in their org)
  .post("/", zValidator("json", createUserSchema), async (c) => {
    try {
    const currentUser = c.get("user");
    const { email, password, role, organizationId, firstName, lastName } =
      c.req.valid("json");

    // Only super admins can create super admins
    if (role === "super_admin" && currentUser.role !== "super_admin") {
      return c.json(
        { error: "Forbidden: Only super admins can create super admin users" },
        403
      );
    }

    // Org admins can only create users in their organization
    if (currentUser.role === "org_admin") {
      if (organizationId !== currentUser.organizationId) {
        return c.json(
          { error: "Forbidden: Cannot create users outside your organization" },
          403
        );
      }
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError) {
      return c.json({ error: authError.message }, 400);
    }

    // Create user in our database
    const [user] = await db
      .insert(schema.users)
      .values({
        id: authData.user.id,
        email,
        role,
        organizationId: organizationId || null,
        firstName,
        lastName,
        createdBy: currentUser.id,
      })
      .returning();

    await invalidateCache(cacheKeys.allUsers());

    return c.json(
      {
        data: {
          id: user.id,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      },
      201
    );
    } catch (error) {
      return c.json({ error: "Failed to create user", details: String(error) }, 500);
    }
  })
  // Update user
  .patch("/:id", zValidator("json", updateUserSchema), async (c) => {
    try {
    const { id } = c.req.param();
    const currentUser = c.get("user");
    const data = c.req.valid("json");

    // Get existing user
    const [existingUser] = await db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.id, id), isNull(schema.users.deletedAt)))
      .limit(1);

    if (!existingUser) {
      return c.json({ error: "User not found" }, 404);
    }

    // Permission checks
    const isSelf = id === currentUser.id;
    const isSuperAdmin = currentUser.role === "super_admin";
    const isSameOrg =
      existingUser.organizationId === currentUser.organizationId;

    // Users can update their own firstName/lastName
    // Super admins can update anyone
    // Org admins can update users in their org (except role)
    if (!isSelf && !isSuperAdmin && !isSameOrg) {
      return c.json({ error: "Forbidden" }, 403);
    }

    // Only super admins can change roles
    if (data.role && currentUser.role !== "super_admin") {
      return c.json(
        { error: "Forbidden: Only super admins can change user roles" },
        403
      );
    }

    // Only super admins can change organizationId
    if (
      data.organizationId !== undefined &&
      currentUser.role !== "super_admin"
    ) {
      return c.json(
        { error: "Forbidden: Only super admins can change user organization" },
        403
      );
    }

    const [user] = await db
      .update(schema.users)
      .set({
        ...data,
        updatedAt: new Date(),
        updatedBy: currentUser.id,
      })
      .where(eq(schema.users.id, id))
      .returning();

    await invalidateCache(cacheKeys.allUsers());

    return c.json({
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
    } catch (error) {
      return c.json({ error: "Failed to update user", details: String(error) }, 500);
    }
  })
  // Soft delete user (super admin or org admin for their org)
  .delete("/:id", async (c) => {
    try {
    const { id } = c.req.param();
    const currentUser = c.get("user");

    // Prevent self-deletion
    if (id === currentUser.id) {
      return c.json({ error: "Cannot delete yourself" }, 400);
    }

    const [existingUser] = await db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.id, id), isNull(schema.users.deletedAt)))
      .limit(1);

    if (!existingUser) {
      return c.json({ error: "User not found" }, 404);
    }

    // Permission checks
    if (currentUser.role === "org_admin") {
      if (existingUser.organizationId !== currentUser.organizationId) {
        return c.json({ error: "Forbidden" }, 403);
      }
      if (existingUser.role === "super_admin") {
        return c.json({ error: "Forbidden: Cannot delete super admin" }, 403);
      }
    }

    await db
      .update(schema.users)
      .set({
        deletedAt: new Date(),
        updatedBy: currentUser.id,
      })
      .where(eq(schema.users.id, id));

    await invalidateCache(cacheKeys.allUsers());

    return c.json({ success: true });
    } catch (error) {
      return c.json({ error: "Failed to delete user", details: String(error) }, 500);
    }
  });

export default app;
