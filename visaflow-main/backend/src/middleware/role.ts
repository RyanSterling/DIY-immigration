import { createMiddleware } from 'hono/factory';
import type { AuthUser } from './auth.js';

export const requireRole = (...roles: AuthUser['role'][]) => {
  return createMiddleware(async (c, next) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    if (!roles.includes(user.role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    await next();
  });
};

export const requireSuperAdmin = requireRole('super_admin');
export const requireOrgAdmin = requireRole('org_admin', 'super_admin');
