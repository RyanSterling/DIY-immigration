import { createMiddleware } from 'hono/factory';
import { getCache, setCache } from '../lib/redis.js';

const CACHE_DISABLED = process.env.DISABLE_CACHE === 'true';

export const cacheMiddleware = (ttlSeconds = 86400) => {
  return createMiddleware(async (c, next) => {
    // Bypass cache if disabled via env var
    if (CACHE_DISABLED) {
      return next();
    }

    // Only cache GET requests
    if (c.req.method !== 'GET') {
      return next();
    }

    // Get org ID for multi-tenant cache isolation
    const user = c.get('user');
    const orgId = user?.organizationId || 'anonymous';

    const cacheKey = `cache:org:${orgId}:${c.req.url}`;
    const cached = await getCache(cacheKey);

    if (cached) {
      return c.json(cached);
    }

    await next();

    // Cache successful responses
    if (c.res.status === 200) {
      try {
        const clonedResponse = c.res.clone();
        const body = await clonedResponse.json();
        await setCache(cacheKey, body, ttlSeconds);
      } catch {
        // Ignore cache errors
      }
    }
  });
};
