import { Injectable, Logger } from '@nestjs/common';
import { validateEnv } from '../../config/env.js';

export const EMAIL_SENDER = Symbol('EMAIL_SENDER');

export type EmailMessage = {
  to: string;
  name: string;
  subject: string;
  text: string;
  html: string;
};

export interface EmailSender {
  send(message: EmailMessage, idempotencyKey: string): Promise<void>;
}

export class EmailSendError extends Error {
  constructor(
    message: string,
    readonly permanent: boolean,
  ) {
    super(message);
  }
}

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

@Injectable()
export class ResendEmailSender implements EmailSender {
  private readonly logger = new Logger(ResendEmailSender.name);

  async send(message: EmailMessage, idempotencyKey: string): Promise<void> {
    const env = validateEnv();
    if (!env.RESEND_API_KEY) {
      this.logger.log(
        `Email to ${message.to}: ${message.subject}\n${message.text}`,
      );
      return;
    }
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM ?? 'Research Repository <onboarding@resend.dev>',
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });
    if (!response.ok) {
      throw new EmailSendError(
        `Resend returned HTTP ${response.status}`,
        response.status >= 400 &&
          response.status < 500 &&
          response.status !== 429,
      );
    }
  }
}

export function emailMessage(job: {
  event: string;
  recipientEmail: string;
  recipientName: string;
  paperTitle: string;
  paperPublicId: string;
  details: unknown;
}): EmailMessage {
  const env = validateEnv();
  const title = job.paperTitle;
  const reason =
    job.details && typeof job.details === 'object' && 'reason' in job.details
      ? job.details.reason
      : undefined;
  const detail = typeof reason === 'string' ? reason : '';
  const labels: Record<string, string> = {
    submitted: 'A Paper was submitted for your endorsement',
    revision_request: 'A Paper needs revision',
    rejection: 'A Paper was rejected',
    endorsement: 'A Paper was endorsed',
    published: 'A Paper was published',
    access_request_created: 'A new Access Request needs your decision',
    access_request_approved: 'Your Access Request was approved',
    access_request_denied: 'Your Access Request was denied',
    access_request_cancelled: 'Your Access Request was cancelled',
  };
  const subject = labels[job.event] ?? 'Paper workflow update';
  const url = new URL(
    `/papers/${encodeURIComponent(job.paperPublicId)}`,
    env.WEB_ORIGIN,
  ).toString();
  const text = `${job.recipientName},\n\n${subject}: ${title}.${detail ? `\n\nReason: ${detail}` : ''}\n\nOpen the application: ${url}`;
  return {
    to: job.recipientEmail,
    name: job.recipientName,
    subject,
    text,
    html: `<p>${escapeHtml(job.recipientName)},</p><p>${escapeHtml(subject)}: ${escapeHtml(title)}.${detail ? `</p><p>Reason: ${escapeHtml(detail)}` : ''}</p><p><a href="${escapeHtml(url)}">Open the application</a></p>`,
  };
}
