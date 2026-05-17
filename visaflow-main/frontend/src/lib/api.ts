import { hc } from "hono/client";
import type { AppType } from "../../../backend/src/index.js";

const API_BASE =
  import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:3000";

// Error class for API errors
export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

// Session type for type safety
interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// Get auth headers from localStorage
function getAuthHeaders(): Record<string, string> {
  const storedSession = localStorage.getItem("session");
  if (storedSession) {
    try {
      const session = JSON.parse(storedSession) as Session;
      return {
        Authorization: `Bearer ${session.accessToken}`,
      };
    } catch {
      return {};
    }
  }
  return {};
}

// Track if a refresh is already in progress to prevent concurrent refreshes
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * Attempt to refresh the access token using the stored refresh token.
 * Returns true if successful, false otherwise.
 */
async function attemptTokenRefresh(): Promise<boolean> {
  // If already refreshing, wait for the existing refresh to complete
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const storedSession = localStorage.getItem("session");
      if (!storedSession) {
        return false;
      }

      const session = JSON.parse(storedSession) as Session;

      // Make refresh request directly (not through handleResponse to avoid recursion)
      const response = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      });

      if (!response.ok) {
        // Refresh failed - clear auth state
        localStorage.removeItem("session");
        localStorage.removeItem("user");
        return false;
      }

      const data = await response.json();

      // Update stored session with new tokens
      const newSession: Session = {
        accessToken: data.data.accessToken,
        refreshToken: data.data.refreshToken,
        expiresAt: data.data.expiresAt,
      };
      localStorage.setItem("session", JSON.stringify(newSession));

      return true;
    } catch {
      // Refresh failed - clear auth state
      localStorage.removeItem("session");
      localStorage.removeItem("user");
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Clear auth state and redirect to login page
 */
function clearAuthAndRedirect(): void {
  localStorage.removeItem("session");
  localStorage.removeItem("user");
  // Only redirect if not already on auth pages
  if (!window.location.pathname.startsWith("/login") &&
      !window.location.pathname.startsWith("/forgot-password") &&
      !window.location.pathname.startsWith("/reset-password")) {
    window.location.href = "/login";
  }
}

// Create typed Hono client
export const client = hc<AppType>(API_BASE, {
  headers: getAuthHeaders,
});

// Helper to extract JSON and handle errors with automatic token refresh
export async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    // Handle 401 Unauthorized - attempt token refresh
    if (response.status === 401) {
      const refreshed = await attemptTokenRefresh();
      if (!refreshed) {
        // Refresh failed - redirect to login
        clearAuthAndRedirect();
        throw new ApiError("Session expired", 401);
      }
      // Token was refreshed - caller should retry the request
      // We throw a special error to signal retry is needed
      throw new ApiError("Token refreshed, please retry", 401, { retryable: true });
    }

    const error = await response
      .json()
      .catch(() => ({ error: "Request failed" }));
    throw new ApiError(
      error.error || "Request failed",
      response.status,
      error.details
    );
  }
  return response.json();
}

// Type helper for inferring response types from Hono client
// Note: The Hono client returns union types including error variants.
// Since handleResponse() throws on errors, callers should use Exclude
// to filter out error types when defining their response types.
export type InferResponse<T> = T extends { json: () => Promise<infer R> }
  ? R
  : never;

// Helper to exclude error-only response types from a union
// Error responses only have 'error' and optionally 'details' keys
// This uses a distributive conditional type pattern
type ExcludeIfErrorOnly<T> = T extends { error: string }
  ? keyof T extends 'error' | 'details'
    ? never  // Has only error/details keys -> filter out
    : T      // Has other keys -> keep
  : T;       // No error key -> keep

export type InferSuccessResponse<T> = ExcludeIfErrorOnly<T>;

// Re-export AppType for convenience
export type { AppType };
