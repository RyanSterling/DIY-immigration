import { QueueBear } from "queuebear";
import { env } from "./env.js";

// Singleton QueueBear client
export const qb = new QueueBear({
  apiKey: env.QB_API_KEY,
  projectId: env.QB_PROJECT_ID,
});

// Mutable base URL - can be updated at runtime (e.g., by tunnel script)
let qbBaseUrl = env.QB_BASE_URL;

// Update the base URL at runtime (called by tunnel integration)
export function setQbBaseUrl(url: string): void {
  qbBaseUrl = url;
  console.log(`[queuebear] Base URL updated to: ${url}`);
}

// Get the current base URL
export function getQbBaseUrl(): string | undefined {
  return qbBaseUrl;
}

// Helper to build job endpoint URLs
export function getJobUrl(jobType: string): string {
  if (!qbBaseUrl) {
    throw new Error(
      'QB_BASE_URL is not set. Either set it in .env or run with npm run dev:tunnel'
    );
  }
  return `${qbBaseUrl}/api/jobs/${jobType}`;
}
