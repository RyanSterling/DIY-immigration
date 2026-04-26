/**
 * Rate limiting logic
 *
 * Dual protection:
 * 1. Email-based: Max 2 submissions per email per 24 hours
 * 2. IP-based: Max 3 submissions per IP per hour
 */

const EMAIL_LIMIT = 2;
const EMAIL_WINDOW = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

const IP_LIMIT = 3;
const IP_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Check if request is within rate limits
 */
export async function checkRateLimit(env, email, ip) {
  try {
    // Check email rate limit using Supabase
    const emailCheck = await checkEmailLimit(env, email);
    if (!emailCheck.allowed) {
      return {
        allowed: false,
        reason: `You've already taken this assessment twice. If you need help, please contact support.`,
        type: 'email'
      };
    }

    // Check IP rate limit
    const ipCheck = await checkIPLimit(env, ip);
    if (!ipCheck.allowed) {
      return {
        allowed: false,
        reason: `Too many assessment submissions from your network. Please try again in an hour.`,
        type: 'ip'
      };
    }

    return { allowed: true, reason: null, type: null };

  } catch (error) {
    console.error('Rate limit check error:', error);
    // On error, allow the request (fail open to not block legitimate users)
    return { allowed: true, reason: null, type: null };
  }
}

/**
 * Check email-based rate limit using Supabase
 */
async function checkEmailLimit(env, email) {
  try {
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase credentials not configured');
      return { allowed: true }; // Fail open
    }

    const windowStart = new Date(Date.now() - EMAIL_WINDOW).toISOString();

    // Query Supabase for recent submissions from this email
    const response = await fetch(
      `${supabaseUrl}/rest/v1/assessments?email=eq.${encodeURIComponent(email)}&created_at=gte.${windowStart}&select=id`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase query failed: ${response.status}`);
    }

    const data = await response.json();
    const count = data.length;

    return { allowed: count < EMAIL_LIMIT, count };

  } catch (error) {
    console.error('Email rate limit check error:', error);
    return { allowed: true }; // Fail open
  }
}

/**
 * Check IP-based rate limit
 */
async function checkIPLimit(env, ip) {
  try {
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase credentials not configured');
      return { allowed: true }; // Fail open
    }

    const windowStart = new Date(Date.now() - IP_WINDOW).toISOString();

    // Query recent submissions from this IP
    const response = await fetch(
      `${supabaseUrl}/rest/v1/ip_rate_limits?ip_address=eq.${encodeURIComponent(ip)}&created_at=gte.${windowStart}&select=id`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      // If table doesn't exist, fail open
      if (response.status === 404) {
        console.warn('ip_rate_limits table not found - skipping IP rate limit');
        return { allowed: true };
      }
      throw new Error(`Supabase query failed: ${response.status}`);
    }

    const data = await response.json();
    const count = data.length;

    // Record this attempt
    if (count < IP_LIMIT) {
      await recordIPAttempt(env, ip);
    }

    return { allowed: count < IP_LIMIT, count };

  } catch (error) {
    console.error('IP rate limit check error:', error);
    return { allowed: true }; // Fail open
  }
}

/**
 * Record an IP attempt for rate limiting
 */
async function recordIPAttempt(env, ip) {
  try {
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_SERVICE_KEY;

    await fetch(
      `${supabaseUrl}/rest/v1/ip_rate_limits`,
      {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          ip_address: ip,
          created_at: new Date().toISOString()
        })
      }
    );
  } catch (error) {
    console.error('Error recording IP attempt:', error);
    // Don't throw - this is best effort
  }
}
