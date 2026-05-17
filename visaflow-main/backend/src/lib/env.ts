import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().default("3000"),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  SUPABASE_URL: z.string(),
  SUPABASE_SECRET_KEY: z.string(),
  SUPABASE_PUBLISHABLE_KEY: z.string(),
  // AWS Configuration
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  AWS_REGION: z.string().default("us-east-1"),
  AWS_S3_BUCKET: z.string(),
  // QueueBear Configuration
  QB_API_KEY: z.string(),
  QB_PROJECT_ID: z.string(),
  QB_BASE_URL: z.string().optional(), // Optional in dev - tunnel script provides this
  QB_SIGNING_SECRET: z.string(),
  // PDF Service Configuration
  PDF_SERVICE_URL: z.string().url().optional().default("http://127.0.0.1:3001"),
  PDF_SERVICE_API_KEY: z.string().optional(), // Required in production
});

export const env = envSchema.parse(process.env);
