/**
 * Clerk JWT Verification for Cloudflare Workers
 * Uses Clerk's JWKS to verify JWTs
 */

// Cache for JWKS
let cachedJwks = null;
let jwksCacheTime = 0;
const JWKS_CACHE_DURATION = 3600000; // 1 hour

/**
 * Fetch and cache Clerk's JWKS
 */
async function getJwks(clerkSecretKey) {
  const now = Date.now();

  if (cachedJwks && (now - jwksCacheTime) < JWKS_CACHE_DURATION) {
    return cachedJwks;
  }

  const response = await fetch('https://api.clerk.com/v1/jwks', {
    headers: {
      'Authorization': `Bearer ${clerkSecretKey}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Clerk JWKS fetch failed: ${response.status} ${response.statusText}`, errorText);
    throw new Error(`Failed to fetch Clerk JWKS: ${response.status} - ${errorText}`);
  }

  cachedJwks = await response.json();
  jwksCacheTime = now;
  return cachedJwks;
}

/**
 * Import a JWK as a CryptoKey for verification
 */
async function importJwk(jwk) {
  return await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
}

/**
 * Base64URL decode
 */
function base64UrlDecode(str) {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  const binary = atob(base64 + padding);
  return new Uint8Array([...binary].map(c => c.charCodeAt(0)));
}

/**
 * Verify Clerk JWT token
 */
export async function verifyClerkToken(token, env) {
  try {
    if (!token) {
      return { valid: false, error: 'No token provided' };
    }

    if (!env.CLERK_SECRET_KEY) {
      return { valid: false, error: 'CLERK_SECRET_KEY not configured' };
    }

    // Parse JWT
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid token format' };
    }

    const [headerB64, payloadB64, signatureB64] = parts;
    const header = JSON.parse(new TextDecoder().decode(base64UrlDecode(headerB64)));
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)));

    // Check expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return { valid: false, error: 'Token expired' };
    }

    // Get JWKS and find matching key
    const jwks = await getJwks(env.CLERK_SECRET_KEY);
    const jwk = jwks.keys.find(k => k.kid === header.kid);

    if (!jwk) {
      return { valid: false, error: 'No matching key found' };
    }

    // Verify signature
    const key = await importJwk(jwk);
    const signature = base64UrlDecode(signatureB64);
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);

    const valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      signature,
      data
    );

    if (!valid) {
      return { valid: false, error: 'Invalid signature' };
    }

    return {
      valid: true,
      userId: payload.sub,
      email: payload.email || payload.primary_email,
      payload
    };
  } catch (error) {
    console.error('Token verification error:', error);
    return { valid: false, error: error.message };
  }
}

/**
 * Auth middleware for Hono
 * @param {Object} options
 * @param {boolean} options.required - Whether authentication is required (default: true)
 */
export function authMiddleware(options = {}) {
  const { required = true } = options;

  return async (c, next) => {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token && required) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    if (token) {
      const result = await verifyClerkToken(token, c.env);

      if (!result.valid && required) {
        return c.json({ error: result.error || 'Invalid token' }, 401);
      }

      // Attach user info to context
      c.set('user', result.valid ? {
        id: result.userId,
        email: result.email,
        clerkId: result.userId
      } : null);
    } else {
      c.set('user', null);
    }

    await next();
  };
}
