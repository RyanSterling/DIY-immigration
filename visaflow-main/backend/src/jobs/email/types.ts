export interface WelcomeEmailJobData {
  userId: string;
  email: string;
}

export interface PasswordResetEmailJobData {
  email: string;
  resetUrl: string;
}

export type EmailJobData = WelcomeEmailJobData | PasswordResetEmailJobData;
