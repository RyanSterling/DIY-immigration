import "dotenv/config";
import { QueueBear } from "queuebear";

async function setupSchedules() {
  const apiKey = process.env.QB_API_KEY;
  const projectId = process.env.QB_PROJECT_ID;
  const baseUrl = process.env.QB_BASE_URL;

  if (!apiKey || !projectId || !baseUrl) {
    console.error(
      "Missing required environment variables: QB_API_KEY, QB_PROJECT_ID, QB_BASE_URL"
    );
    process.exit(1);
  }

  const qb = new QueueBear({
    apiKey,
    projectId,
  });

  console.log("[QueueBear] Checking existing schedules...");

  // List existing schedules to avoid duplicates
  const { schedules } = await qb.schedules.list();
  const existingCleanup = schedules.find((s) =>
    s.destination.includes("/api/jobs/cleanup")
  );

  if (existingCleanup) {
    console.log(
      "[QueueBear] Cleanup schedule already exists:",
      existingCleanup.scheduleId
    );
    return;
  }

  // Create daily cleanup schedule at 3 AM UTC
  const schedule = await qb.schedules.create({
    destination: `${baseUrl}/api/jobs/cleanup`,
    cron: "0 3 * * *", // 3 AM every day
    timezone: "UTC",
    method: "POST",
    body: JSON.stringify({ triggeredBy: "scheduler" }),
    retries: 2,
    metadata: { purpose: "orphan-document-cleanup" },
  });

  console.log("[QueueBear] Created cleanup schedule:", schedule.scheduleId);
}

setupSchedules().catch((error) => {
  console.error("[QueueBear] Failed to setup schedules:", error);
  process.exit(1);
});
