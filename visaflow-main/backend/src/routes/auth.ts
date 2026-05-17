import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { supabaseAdmin } from "../lib/supabase.js";
import { db, schema } from "../db/index.js";
import { eq, and, isNull } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";

// Validation schemas
const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

const forgotPasswordSchema = z.object({
  email: z.email(),
});

const resetPasswordSchema = z.object({
  accessToken: z.string(),
  password: z.string().min(6),
});

// Create app with chained routes for type inference
const app = new Hono()
  // Login
  .post("/login", zValidator("json", loginSchema), async (c) => {
    try {
    const { email, password } = c.req.valid("json");

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return c.json({ error: error.message }, 401);
    }

    // Get user from our database
    const [dbUser] = await db
      .select()
      .from(schema.users)
      .where(
        and(eq(schema.users.id, data.user.id), isNull(schema.users.deletedAt))
      )
      .limit(1);

    if (!dbUser) {
      return c.json({ error: "User not found in system" }, 401);
    }

    return c.json({
      data: {
        user: {
          id: dbUser.id,
          email: dbUser.email,
          role: dbUser.role,
          organizationId: dbUser.organizationId,
          firstName: dbUser.firstName,
          lastName: dbUser.lastName,
        },
        session: {
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          expiresAt: data.session.expires_at,
        },
      },
    });
    } catch (error) {
      return c.json({ error: "Login failed", details: String(error) }, 500);
    }
  })
  // Logout
  .post("/logout", authMiddleware, async (c) => {
    try {
    const authHeader = c.req.header("Authorization");
    const token = authHeader?.substring(7);

    if (token) {
      await supabaseAdmin.auth.admin.signOut(token);
    }

    return c.json({ success: true });
    } catch (error) {
      return c.json({ error: "Logout failed", details: String(error) }, 500);
    }
  })
  // Refresh token
  .post("/refresh", zValidator("json", refreshSchema), async (c) => {
    try {
    const { refreshToken } = c.req.valid("json");

    const { data, error } = await supabaseAdmin.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      return c.json({ error: error.message }, 401);
    }

    return c.json({
      data: {
        accessToken: data.session?.access_token,
        refreshToken: data.session?.refresh_token,
        expiresAt: data.session?.expires_at,
      },
    });
    } catch (error) {
      return c.json({ error: "Token refresh failed", details: String(error) }, 500);
    }
  })
  // Forgot password
  .post(
    "/forgot-password",
    zValidator("json", forgotPasswordSchema),
    async (c) => {
      try {
      const { email } = c.req.valid("json");

      const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
        redirectTo: `${
          process.env.FRONTEND_URL || "http://localhost:5173"
        }/reset-password`,
      });

      if (error) {
        // Don't reveal if email exists
        console.error("Password reset error:", error);
      }

      return c.json({
        success: true,
        message: "If an account exists, a reset email will be sent",
      });
      } catch (error) {
        return c.json({ error: "Password reset request failed", details: String(error) }, 500);
      }
    }
  )
  // Reset password
  .post(
    "/reset-password",
    zValidator("json", resetPasswordSchema),
    async (c) => {
      try {
      const { accessToken, password } = c.req.valid("json");

      const { error } = await supabaseAdmin.auth.admin.updateUserById(
        accessToken,
        { password }
      );

      if (error) {
        return c.json({ error: error.message }, 400);
      }

      return c.json({ success: true });
      } catch (error) {
        return c.json({ error: "Password reset failed", details: String(error) }, 500);
      }
    }
  );

export default app;
