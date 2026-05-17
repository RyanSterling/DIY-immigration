import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Main Redis client for caching
export const redis = new Redis(redisUrl);

// Cache key prefix constant
const CACHE_PREFIX = 'cache:org';

// Generate cache key patterns for invalidation
export const cacheKeys = {
  // Clear all cache for a specific org
  forOrg: (orgId: string) => `${CACHE_PREFIX}:${orgId}:*`,

  // Clear specific resource cache for an org
  forOrgClients: (orgId: string) => `${CACHE_PREFIX}:${orgId}:*/api/clients*`,
  forOrgDocuments: (orgId: string) => `${CACHE_PREFIX}:${orgId}:*/api/documents*`,
  forOrgUsers: (orgId: string) => `${CACHE_PREFIX}:${orgId}:*/api/users*`,

  // Clear specific resource cache across all orgs
  allClients: () => `${CACHE_PREFIX}:*:*/api/clients*`,
  allDocuments: () => `${CACHE_PREFIX}:*:*/api/documents*`,
  allUsers: () => `${CACHE_PREFIX}:*:*/api/users*`,
  allOrganizations: () => `${CACHE_PREFIX}:*:*/api/organizations*`,
  allFormTemplates: () => `${CACHE_PREFIX}:*:*/api/form-templates*`,
  allFormInstances: () => `${CACHE_PREFIX}:*:*/api/form-instances*`,

  // Clear everything
  all: () => `${CACHE_PREFIX}:*`,
};

// Cache helpers
export async function getCache<T>(key: string): Promise<T | null> {
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

export async function setCache(key: string, data: unknown, ttlSeconds = 300): Promise<void> {
  await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
}

export async function invalidateCache(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

export async function deleteCache(key: string): Promise<void> {
  await redis.del(key);
}

// Convenience function to clear all cache for an org
export async function invalidateOrgCache(orgId: string): Promise<void> {
  await invalidateCache(cacheKeys.forOrg(orgId));
}
