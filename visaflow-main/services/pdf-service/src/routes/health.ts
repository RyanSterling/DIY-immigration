import { Hono } from "hono";
import { isPdftkAvailable } from "../lib/pdftkFiller.js";
import type { HealthResponse } from "../types.js";

const healthRoute = new Hono();

healthRoute.get("/", async (c) => {
  try {
    const pdftkAvailable = await isPdftkAvailable();

    const response: HealthResponse = {
      status: "ok",
      pdftk: pdftkAvailable ? "available" : "not installed",
      pdfLib: "available",
    };

    return c.json(response);
  } catch (error) {
    const response: HealthResponse = {
      status: "error",
      pdftk: "not installed",
      pdfLib: "available",
      error: error instanceof Error ? error.message : String(error),
    };

    return c.json(response, 500);
  }
});

export { healthRoute };
