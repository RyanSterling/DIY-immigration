import { createMiddleware } from 'hono/factory';
import { supabaseAdmin } from '../lib/supabase.js';
import { db, schema, type UserRole } from '../db/index.js';
import { eq, isNull, and } from 'drizzle-orm';

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  organizationId: string | null;
  firstName: string | null;
  lastName: string | null;
};

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser;
  }
}

export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing authorization header' }, 401);
  }

  const token = authHeader.substring(7);

  const { data: { user: supabaseUser }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !supabaseUser) {
    return c.json({ error: 'Invalid token' }, 401);
  }

  // Fetch user details from our users table
  const [dbUser] = await db
    .select()
    .from(schema.users)
    .where(and(
      eq(schema.users.id, supabaseUser.id),
      isNull(schema.users.deletedAt)
    ))
    .limit(1);

  if (!dbUser) {
    return c.json({ error: 'User not found' }, 401);
  }

  // Check if user is disabled
  if (dbUser.disabledAt) {
    return c.json({ error: 'Account disabled' }, 403);
  }

  // For org_admin users, check if their organization is disabled
  if (dbUser.role === 'org_admin' && dbUser.organizationId) {
    const [org] = await db
      .select({ disabledAt: schema.organizations.disabledAt })
      .from(schema.organizations)
      .where(eq(schema.organizations.id, dbUser.organizationId))
      .limit(1);

    if (org?.disabledAt) {
      return c.json({ error: 'Organization disabled' }, 403);
    }
  }

  c.set('user', {
    id: dbUser.id,
    email: dbUser.email,
    role: dbUser.role,
    organizationId: dbUser.organizationId,
    firstName: dbUser.firstName,
    lastName: dbUser.lastName,
  });

  await next();
});
