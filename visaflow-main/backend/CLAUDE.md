# Backend Quick Reference

## Commands

```bash
npm run dev          # Start dev server (watch mode)
npm run build        # Build for production
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Apply migrations
npm run db:push      # Push schema directly (dev only)
npm run db:studio    # Open Drizzle Studio GUI
```

## Database Migrations Best Practices

### CRITICAL: Never manually create migration files

Always use `npm run db:generate` to create migrations. Drizzle requires:
1. A SQL migration file (e.g., `0008_migration_name.sql`)
2. A corresponding snapshot file (e.g., `0008_snapshot.json`)
3. A journal entry in `_journal.json`

If you manually create a SQL file without the snapshot, Drizzle thinks the migration is applied (it's in the journal) but the SQL never runs on fresh databases.

### Creating migrations

1. Make schema changes in `src/db/schema.ts`
2. Run `npm run db:generate`
3. If prompted about renames vs. new columns, choose carefully:
   - Choose "create column" if adding a new column
   - Choose "rename" only if actually renaming an existing column
4. Review the generated SQL before applying
5. Run `npm run db:migrate` to apply

### Making migrations idempotent

For production safety, wrap ALTER statements in DO blocks with IF NOT EXISTS checks:

```sql
-- Add column only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'my_table' AND column_name = 'my_column'
  ) THEN
    ALTER TABLE "my_table" ADD COLUMN "my_column" text;
  END IF;
END $$;
```

This ensures migrations are safe for any database state (fresh, partial, or fully migrated).

## Project Structure

```
src/
  index.ts           # Entry point, route registration
  db/schema.ts       # Drizzle schema (tables, enums, types)
  routes/*.ts        # API endpoints (one file per resource)
  middleware/*.ts    # Auth, role checks, caching
  lib/*.ts           # Utilities (S3, Redis, env, normalizers)
  jobs/              # QueueBear job handlers (textract, email, cleanup)
```

## Adding a New Route

1. Create `src/routes/{resource}.ts`
2. Register in `src/index.ts`: `.route('/api/{resource}', resourceRoutes)`
3. Follow this pattern:

```typescript
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, schema } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireOrg } from "../middleware/requireOrg.js";
import { cacheMiddleware } from "../middleware/cache.js";
import { eq, isNull, and } from "drizzle-orm";
import { invalidateCache, cacheKeys } from "../lib/redis.js";

const createSchema = z.object({
  name: z.string().min(1),
});

const app = new Hono()
  .use("*", authMiddleware)
  .use("*", requireOrg)
  .use("*", cacheMiddleware())
  .get("/", async (c) => {
    const user = c.get("user");
    // ... implementation
  })
  .post("/", zValidator("json", createSchema), async (c) => {
    const data = c.req.valid("json");
    // ... implementation
    await invalidateCache(cacheKeys.all{Resource}());  // CRITICAL: Invalidate cache!
    return c.json(result, 201);
  });

export default app;
```

## Database Patterns (Drizzle)

### CRITICAL RULES

```typescript
// ALWAYS include soft-delete check
isNull(schema.{table}.deletedAt)

// ALWAYS scope by organization for tenant isolation
eq(schema.{table}.organizationId, user.organizationId!)
```

### SELECT (with required checks)

```typescript
const [item] = await db
  .select()
  .from(schema.clients)
  .where(
    and(
      eq(schema.clients.id, id),
      eq(schema.clients.organizationId, user.organizationId!),  // Tenant isolation
      isNull(schema.clients.deletedAt)                          // Soft delete check
    )
  )
  .limit(1);
```

### INSERT

```typescript
const [item] = await db
  .insert(schema.clients)
  .values({
    organizationId: user.organizationId!,
    createdBy: user.id,
    updatedBy: user.id,
  })
  .returning();
```

### SOFT DELETE (not hard delete)

```typescript
await db
  .update(schema.clients)
  .set({
    deletedAt: new Date(),
    updatedBy: user.id,
  })
  .where(eq(schema.clients.id, id));
```

### Transaction

```typescript
await db.transaction(async (tx) => {
  await tx.insert(schema.documents).values({...});
  await tx.insert(schema.documentExtractions).values({...});
});
```

### Raw SQL (for complex queries)

```typescript
import { sql } from "drizzle-orm";

const result = await db.execute(sql`
  SELECT c.id, c.created_at as "createdAt"
  FROM clients c
  WHERE c.organization_id = ${user.organizationId}
    AND c.deleted_at IS NULL
`);
```

## Authentication & Authorization

### Middleware Chain (order matters)

```typescript
.use("*", authMiddleware)  // 1. Validate JWT, set user context
.use("*", requireOrg)      // 2. Ensure user has organizationId
.use("*", requireRole("org_admin"))  // 3. Optional: role check
.use("*", cacheMiddleware())         // 4. Cache GET responses
```

### Access User Context

```typescript
const user = c.get("user");
// user.id, user.email, user.role, user.organizationId
```

### Role Helpers

```typescript
import { requireSuperAdmin, requireOrgAdmin, requireRole } from "../middleware/role.js";

// Super admin only
.use("*", requireSuperAdmin)

// Org admin or super admin
.use("*", requireOrgAdmin)

// Custom roles
.use("*", requireRole("super_admin", "org_admin"))
```

## Cache Patterns

### CRITICAL: Invalidate After Mutations

```typescript
import { invalidateCache, cacheKeys } from "../lib/redis.js";

// After POST/PATCH/DELETE, ALWAYS invalidate:
await invalidateCache(cacheKeys.allClients());
await invalidateCache(cacheKeys.allDocuments());
```

### Available Cache Keys

```typescript
cacheKeys.forOrg(orgId)           // All cache for one org
cacheKeys.forOrgClients(orgId)    // Clients for one org
cacheKeys.allClients()            // Clients across all orgs
cacheKeys.allDocuments()          // Documents across all orgs
cacheKeys.all()                   // Everything
```

### Disable Cache (debugging)

Set `DISABLE_CACHE=true` in `.env`

## External Services

### S3 (File Storage)

```typescript
import { generateUploadUrl, generateDownloadUrl, generateDocumentKey } from "../lib/s3/index.js";

const key = generateDocumentKey(orgId, clientId, documentId, filename);
const uploadUrl = await generateUploadUrl(key, contentType);  // 15min expiry
const downloadUrl = await generateDownloadUrl(key);           // 1hr expiry
```

### QueueBear (Job Queue)

```typescript
import { enqueueTextractJob, enqueueWelcomeEmail } from "../jobs/queues.js";

await enqueueTextractJob(documentId, s3Key, organizationId);
await enqueueWelcomeEmail(userId, email);
```

Job handlers: `src/jobs/{jobType}/handler.ts`

### Textract Flow

1. Document uploaded to S3
2. `enqueueTextractJob()` queues processing
3. Handler polls AWS Textract
4. Results stored in `documentExtractions` table
5. Field values created in `clientFieldValues`

## Error Handling

```typescript
.get("/:id", async (c) => {
  try {
    // ... implementation
    return c.json(data);
  } catch (error) {
    console.error("Error getting item:", error);
    return c.json(
      { error: "Failed to get item", details: String(error) },
      500
    );
  }
})
```

### Status Codes

- `200` - Success (GET, PATCH, DELETE)
- `201` - Created (POST)
- `400` - Bad request (validation error)
- `403` - Forbidden (role/permission)
- `404` - Not found
- `500` - Server error

## Zod Validation

```typescript
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  type: z.enum(["passport", "visa", "resume"]),
  count: z.number().optional().default(10),
});

.post("/", zValidator("json", schema), async (c) => {
  const data = c.req.valid("json");  // Typed & validated
})
```

## Environment

Required vars defined in `src/lib/env.ts` with Zod validation.
See `.env.example` for all variables.

Key vars: `DATABASE_URL`, `REDIS_URL`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `AWS_*`, `QB_*`
