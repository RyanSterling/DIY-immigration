import { createMiddleware } from 'hono/factory';

export const requireOrg = createMiddleware(async (c, next) => {
  const user = c.get('user');

  if (!user?.organizationId) {
    return c.json({ error: 'Organization required' }, 403);
  }

  await next();
});
