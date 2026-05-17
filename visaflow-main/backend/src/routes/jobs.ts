import { Hono } from 'hono';
import { serveMessage } from 'queuebear';
import { handleTextractJob } from '../jobs/textract/handler.js';
import { handleWelcomeEmail, handlePasswordResetEmail } from '../jobs/email/handler.js';
import { handleOrphanCleanup } from '../jobs/cleanup/handler.js';
import { env } from '../lib/env.js';
import type { TextractJobData } from '../jobs/textract/types.js';
import type { WelcomeEmailJobData, PasswordResetEmailJobData } from '../jobs/email/types.js';
import type { OrphanCleanupJobData } from '../jobs/cleanup/types.js';

// Create type-safe handlers with signature verification
// Using serveMessage for simple message webhooks (not workflows)
const textractHandler = serveMessage<TextractJobData>(
  async (context) => {
    console.log(`[Jobs] Received textract job for document ${context.body.documentId} (messageId: ${context.messageId})`);
    await handleTextractJob(context.body);
    return { success: true };
  },
  { signingSecret: env.QB_SIGNING_SECRET }
);

const emailHandler = serveMessage<{ type: string; data: unknown }>(
  async (context) => {
    const { type, data } = context.body;
    console.log(`[Jobs] Received email job: ${type} (messageId: ${context.messageId})`);
    switch (type) {
      case 'welcome':
        await handleWelcomeEmail(data as WelcomeEmailJobData);
        break;
      case 'password-reset':
        await handlePasswordResetEmail(data as PasswordResetEmailJobData);
        break;
      default:
        console.log(`[Jobs] Unknown email type: ${type}`);
    }
    return { success: true };
  },
  { signingSecret: env.QB_SIGNING_SECRET }
);

const cleanupHandler = serveMessage<OrphanCleanupJobData>(
  async (context) => {
    console.log(`[Jobs] Received cleanup job (messageId: ${context.messageId})`);
    await handleOrphanCleanup(context.body);
    return { success: true };
  },
  { signingSecret: env.QB_SIGNING_SECRET }
);

const app = new Hono()
  // Textract document processing
  .post('/textract', (c) => textractHandler(c.req.raw))

  // Email jobs
  .post('/email', (c) => emailHandler(c.req.raw))

  // Cleanup jobs (called by QueueBear cron schedule)
  .post('/cleanup', (c) => cleanupHandler(c.req.raw));

export default app;
