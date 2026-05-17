import { qb, getJobUrl } from '../lib/queuebear.js';

// Re-export types from job modules
export type { WelcomeEmailJobData, PasswordResetEmailJobData, EmailJobData } from './email/types.js';
export type { TextractJobData } from './textract/types.js';
export type { OrphanCleanupJobData } from './cleanup/types.js';

// Import types for internal use
import type { TextractJobData } from './textract/types.js';

// Email enqueue helpers
export async function enqueueWelcomeEmail(userId: string, email: string) {
  await qb.messages.publish(
    getJobUrl('email'),
    { type: 'welcome', data: { userId, email } },
    { retries: 3 }
  );
}

export async function enqueuePasswordResetEmail(email: string, resetUrl: string) {
  await qb.messages.publish(
    getJobUrl('email'),
    { type: 'password-reset', data: { email, resetUrl } },
    { retries: 3 }
  );
}

// Textract enqueue helper - returns QueueBear messageId for status tracking
export async function enqueueTextractJob(
  documentId: string,
  s3Key: string,
  organizationId: string
): Promise<string> {
  const { messageId } = await qb.messages.publish(
    getJobUrl('textract'),
    {
      documentId,
      s3Key,
      organizationId,
    } as TextractJobData,
    { retries: 3 }
  );
  return messageId;
}

// Cleanup enqueue helper (for manual triggers)
export async function enqueueOrphanCleanup(triggeredBy?: string) {
  await qb.messages.publish(getJobUrl('cleanup'), { triggeredBy }, { retries: 2 });
}
