import { Hono } from "hono";
import { detectFormType } from "../lib/detectFormType.js";
import type { DetectRequest, DetectResponse } from "../types.js";

const detectRoute = new Hono();

detectRoute.post("/", async (c) => {
  try {
    const body = await c.req.json<DetectRequest>();

    if (!body.pdf) {
      return c.json({ error: "Missing required field: pdf" }, 400);
    }

    // Decode base64 PDF
    const pdfBuffer = Buffer.from(body.pdf, "base64");

    // Detect form type
    const formType = await detectFormType(pdfBuffer);

    const response: DetectResponse = formType;

    return c.json(response);
  } catch (error) {
    console.error("[detect] Error:", error);
    return c.json(
      {
        error: "Failed to detect form type",
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});

export { detectRoute };
