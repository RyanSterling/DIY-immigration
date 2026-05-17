# Skill: create-api-route

Scaffold a complete CRUD API route for the Hono backend with all boilerplate, middleware, validation, and security patterns.

## When to Use

Use this skill when you need to create a new API endpoint with standard CRUD operations (list, get, create, update, delete).

## Required Information

Before generating, gather from the user:

1. **Resource name** (singular): e.g., "note", "comment", "attachment"
2. **Resource name** (plural): e.g., "notes", "comments", "attachments"
3. **Database table name**: e.g., "notes" (from `schema.{tableName}`)
4. **Create fields**: Fields required for POST with types and requirements
5. **Update fields**: Fields allowed for PATCH (usually same as create, all optional)
6. **Search fields** (optional): Which fields to search in GET list
7. **Enum usage** (optional): If any field uses a Drizzle enum
8. **Role requirement** (optional): If route requires specific role

## Field Types

| Type | Zod Schema | Example |
|------|------------|---------|
| `string` | `z.string()` | `title: z.string().min(1)` |
| `email` | `z.string().email()` | `email: z.string().email()` |
| `uuid` | `z.string().uuid()` | `clientId: z.string().uuid()` |
| `number` | `z.number()` | `amount: z.number()` |
| `boolean` | `z.boolean()` | `isActive: z.boolean()` |
| `enum` | `z.enum(enumName.enumValues)` | `type: z.enum(noteTypeEnum.enumValues)` |
| `date` | `z.string().datetime()` | `dueDate: z.string().datetime()` |

## Generated Files

### 1. Create Route File

**Path:** `backend/src/routes/{resourceNamePlural}.ts`

```typescript
import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db, schema } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { cacheMiddleware } from "../middleware/cache.js";
import { requireOrg } from "../middleware/requireOrg.js";
import { eq, isNull, sql, and, ilike } from "drizzle-orm";
import { invalidateCache, cacheKeys } from "../lib/redis.js";

// === Validation Schemas ===
const createSchema = z.object({
  // ADD FIELDS HERE based on user input
  // Example:
  // title: z.string().min(1),
  // content: z.string().optional(),
  // clientId: z.string().uuid(),
});

const updateSchema = z.object({
  // Same fields as create, but all optional
  // Example:
  // title: z.string().min(1).optional(),
  // content: z.string().optional(),
});

// === Route Handlers ===
const app = new Hono()
  .use("*", authMiddleware)
  .use("*", requireOrg)
  .use("*", cacheMiddleware())

  // GET / - List with pagination and search
  .get("/", async (c) => {
    try {
      const user = c.get("user");
      const page = parseInt(c.req.query("page") || "1");
      const pageSize = parseInt(c.req.query("pageSize") || "20");
      const search = c.req.query("search");
      const offset = (page - 1) * pageSize;

      let whereClause = and(
        eq(schema.{TABLE_NAME}.organizationId, user.organizationId!),
        isNull(schema.{TABLE_NAME}.deletedAt)
      );

      // ADD SEARCH LOGIC if searchFields provided:
      // if (search) {
      //   whereClause = sql`${whereClause} AND (
      //     ${ilike(schema.{TABLE_NAME}.title, `%${search}%`)} OR
      //     ${ilike(schema.{TABLE_NAME}.content, `%${search}%`)}
      //   )`;
      // }

      const [items, countResult] = await Promise.all([
        db
          .select()
          .from(schema.{TABLE_NAME})
          .where(whereClause)
          .limit(pageSize)
          .offset(offset)
          .orderBy(schema.{TABLE_NAME}.createdAt),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(schema.{TABLE_NAME})
          .where(whereClause),
      ]);

      const total = countResult[0]?.count ?? 0;

      return c.json({
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      });
    } catch (error) {
      console.error("Error listing {RESOURCE_PLURAL}:", error);
      return c.json(
        { error: "Failed to list {RESOURCE_PLURAL}", details: String(error) },
        500
      );
    }
  })

  // GET /:id - Get single by ID
  .get("/:id", async (c) => {
    try {
      const user = c.get("user");
      const { id } = c.req.param();

      const [item] = await db
        .select()
        .from(schema.{TABLE_NAME})
        .where(
          and(
            eq(schema.{TABLE_NAME}.id, id),
            eq(schema.{TABLE_NAME}.organizationId, user.organizationId!),
            isNull(schema.{TABLE_NAME}.deletedAt)
          )
        )
        .limit(1);

      if (!item) {
        return c.json({ error: "{RESOURCE_SINGULAR} not found" }, 404);
      }

      return c.json(item);
    } catch (error) {
      console.error("Error getting {RESOURCE_SINGULAR}:", error);
      return c.json(
        { error: "Failed to get {RESOURCE_SINGULAR}", details: String(error) },
        500
      );
    }
  })

  // POST / - Create new
  .post("/", zValidator("json", createSchema), async (c) => {
    try {
      const user = c.get("user");
      const data = c.req.valid("json");

      const [item] = await db
        .insert(schema.{TABLE_NAME})
        .values({
          ...data,
          organizationId: user.organizationId!,
          createdBy: user.id,
          updatedBy: user.id,
        })
        .returning();

      await invalidateCache(cacheKeys.all{RESOURCE_PASCAL}());

      return c.json(item, 201);
    } catch (error) {
      console.error("Error creating {RESOURCE_SINGULAR}:", error);
      return c.json(
        { error: "Failed to create {RESOURCE_SINGULAR}", details: String(error) },
        500
      );
    }
  })

  // PATCH /:id - Update existing
  .patch("/:id", zValidator("json", updateSchema), async (c) => {
    try {
      const user = c.get("user");
      const { id } = c.req.param();
      const data = c.req.valid("json");

      const [existing] = await db
        .select()
        .from(schema.{TABLE_NAME})
        .where(
          and(
            eq(schema.{TABLE_NAME}.id, id),
            eq(schema.{TABLE_NAME}.organizationId, user.organizationId!),
            isNull(schema.{TABLE_NAME}.deletedAt)
          )
        )
        .limit(1);

      if (!existing) {
        return c.json({ error: "{RESOURCE_SINGULAR} not found" }, 404);
      }

      const [item] = await db
        .update(schema.{TABLE_NAME})
        .set({
          ...data,
          updatedAt: new Date(),
          updatedBy: user.id,
        })
        .where(eq(schema.{TABLE_NAME}.id, id))
        .returning();

      await invalidateCache(cacheKeys.all{RESOURCE_PASCAL}());

      return c.json(item);
    } catch (error) {
      console.error("Error updating {RESOURCE_SINGULAR}:", error);
      return c.json(
        { error: "Failed to update {RESOURCE_SINGULAR}", details: String(error) },
        500
      );
    }
  })

  // DELETE /:id - Soft delete
  .delete("/:id", async (c) => {
    try {
      const user = c.get("user");
      const { id } = c.req.param();

      const [existing] = await db
        .select()
        .from(schema.{TABLE_NAME})
        .where(
          and(
            eq(schema.{TABLE_NAME}.id, id),
            eq(schema.{TABLE_NAME}.organizationId, user.organizationId!),
            isNull(schema.{TABLE_NAME}.deletedAt)
          )
        )
        .limit(1);

      if (!existing) {
        return c.json({ error: "{RESOURCE_SINGULAR} not found" }, 404);
      }

      await db
        .update(schema.{TABLE_NAME})
        .set({
          deletedAt: new Date(),
          updatedBy: user.id,
        })
        .where(eq(schema.{TABLE_NAME}.id, id));

      await invalidateCache(cacheKeys.all{RESOURCE_PASCAL}());

      return c.json({ success: true });
    } catch (error) {
      console.error("Error deleting {RESOURCE_SINGULAR}:", error);
      return c.json(
        { error: "Failed to delete {RESOURCE_SINGULAR}", details: String(error) },
        500
      );
    }
  });

export default app;
```

### 2. Update index.ts

**Path:** `backend/src/index.ts`

Add import at top with other route imports:
```typescript
import {resourceNamePlural}Routes from "./routes/{resourceNamePlural}.js";
```

Add route registration (before the final export):
```typescript
.route("/api/{resourceNamePlural}", {resourceNamePlural}Routes)
```

### 3. Update redis.ts (Cache Keys)

**Path:** `backend/src/lib/redis.ts`

Add to the `cacheKeys` object:
```typescript
all{ResourcePascal}: () => "{resourceNamePlural}:all",
```

## Placeholders to Replace

When generating, replace these placeholders:

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{TABLE_NAME}` | Drizzle schema table | `notes` |
| `{RESOURCE_SINGULAR}` | Singular name for messages | `note` |
| `{RESOURCE_PLURAL}` | Plural name for routes/keys | `notes` |
| `{RESOURCE_PASCAL}` | PascalCase plural for cache | `Notes` |

## Security Checklist

EVERY generated route MUST include:

- [ ] `eq(schema.{table}.organizationId, user.organizationId!)` - Tenant isolation
- [ ] `isNull(schema.{table}.deletedAt)` - Soft delete filter
- [ ] `createdBy: user.id` on INSERT
- [ ] `updatedBy: user.id` on UPDATE/DELETE
- [ ] `await invalidateCache(...)` after mutations
- [ ] Try-catch with proper error responses

## Optional Additions

### If using enum fields:
```typescript
// Add to imports
import { db, schema, {enumName} } from "../db/index.js";

// In schema
type: z.enum({enumName}.enumValues),
```

### If requiring specific role:
```typescript
// Add to imports
import { requireRole } from "../middleware/role.js";

// Add to middleware chain (after requireOrg)
.use("*", requireRole("org_admin"))
```

### If filtering by clientId:
```typescript
// Add to GET list whereClause
const clientId = c.req.query("clientId");
if (clientId) {
  whereClause = and(whereClause, eq(schema.{TABLE_NAME}.clientId, clientId));
}
```

## Example Invocation

User: "Create a notes API route with title (required string), content (optional string), and clientId (required uuid). Search by title and content."

Generated:
- `backend/src/routes/notes.ts` with full CRUD
- Updated `backend/src/index.ts` with import and registration
- Updated `backend/src/lib/redis.ts` with cache key
