import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { fillRoute } from "./routes/fill.js";
import { inspectRoute } from "./routes/inspect.js";
import { detectRoute } from "./routes/detect.js";
import { healthRoute } from "./routes/health.js";

const app = new Hono();

// Configuration
const API_KEY = process.env.PDF_SERVICE_API_KEY;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(",") || [];
const BIND_HOST = process.env.BIND_HOST || "127.0.0.1"; // Default to localhost only

// Validate API key is set in production
if (process.env.NODE_ENV === "production" && !API_KEY) {
  console.error("FATAL: PDF_SERVICE_API_KEY environment variable is required in production");
  process.exit(1);
}

// Middleware
app.use("*", logger());

// CORS - only allow specified origins (or none if not configured)
app.use(
  "*",
  cors({
    origin: ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : [],
  })
);

// API Key authentication - protect all routes except health check
if (API_KEY) {
  app.use("*", async (c, next) => {
    // Allow health check without authentication
    if (c.req.path === "/health") {
      return next();
    }

    // Verify bearer token
    const authHeader = c.req.header("Authorization");
    if (!authHeader || authHeader !== `Bearer ${API_KEY}`) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    return next();
  });
  console.log("API key authentication enabled");
} else {
  console.warn("WARNING: PDF_SERVICE_API_KEY not set - running without authentication (dev mode only)");
}

// Routes
app.route("/fill", fillRoute);
app.route("/inspect", inspectRoute);
app.route("/detect", detectRoute);
app.route("/health", healthRoute);

// Root endpoint
app.get("/", (c) => {
  return c.json({
    service: "pdf-service",
    version: "1.0.0",
    endpoints: [
      "POST /fill - Fill a PDF with form data",
      "POST /inspect - List all field names in a PDF",
      "POST /detect - Detect form type (AcroForm/XFA)",
      "GET /health - Check service status",
    ],
  });
});

// Start server
const port = parseInt(process.env.PORT || "3001", 10);

console.log(`Starting PDF service on ${BIND_HOST}:${port}...`);
if (BIND_HOST === "127.0.0.1") {
  console.log("Service bound to localhost only - not accessible from external networks");
}

serve({
  fetch: app.fetch,
  port,
  hostname: BIND_HOST,
});

console.log(`PDF service running at http://${BIND_HOST}:${port}`);
