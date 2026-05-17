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

// Get auth headers from localStorage
function getAuthHeaders(): Record<string, string> {
  const storedSession = localStorage.getItem("session");
  if (storedSession) {
    try {
      const session = JSON.parse(storedSession);
      return {
        Authorization: `Bearer ${session.accessToken}`,
      };
    } catch {
      return {};
    }
  }
  return {};
}

// Create typed Hono client
export const client = hc<AppType>(API_BASE, {
  headers: getAuthHeaders,
});

// Helper to extract JSON and handle errors
export async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
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
export type InferResponse<T> = T extends { json: () => Promise<infer R> }
  ? R
  : never;


type ExcludeIfErrorOnly<T> = T extends { error: string }
  ? keyof T extends 'error' | 'details'
    ? never  // Has only error/details keys -> filter out
    : T      // Has other keys -> keep
  : T;       // No error key -> keep

export type InferSuccessResponse<T> = ExcludeIfErrorOnly<T>;

// Re-export AppType for convenience
export type { AppType };
