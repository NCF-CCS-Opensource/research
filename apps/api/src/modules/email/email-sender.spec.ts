import { afterEach, describe, expect, it, vi } from 'vitest';
import { emailMessage, ResendEmailSender } from './email-sender.js';

describe('email delivery', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('links only to the application and carries no file or token address', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://localhost/test');
    vi.stubEnv('WEB_ORIGIN', 'https://research.example');
    const message = emailMessage({
      event: 'revision_request',
      recipientEmail: 'owner@ncf.edu.ph',
      recipientName: 'Paper Owner',
      paperTitle: 'A Study',
      paperPublicId: 'public-paper-id',
      details: { reason: 'Add a clearer method.' },
    });
    expect(message.text).toContain(
      'https://research.example/papers/public-paper-id',
    );
    expect(message.text).not.toMatch(/\.pdf|token|file address/i);
    expect(message.html).toContain('Add a clearer method.');
    const fakeSender = { send: vi.fn() };
    await fakeSender.send(message, 'job-id');
    expect(fakeSender.send).toHaveBeenCalledWith(message, 'job-id');
  });

  it('describes publication without exposing the full text address', () => {
    vi.stubEnv('DATABASE_URL', 'postgres://localhost/test');
    vi.stubEnv('WEB_ORIGIN', 'https://research.example');
    const message = emailMessage({
      event: 'published',
      recipientEmail: 'owner@ncf.edu.ph',
      recipientName: 'Owner',
      paperTitle: 'A Study',
      paperPublicId: 'paper-id',
      details: null,
    });
    expect(message.subject).toBe('A Paper was published');
    expect(message.text).toContain('https://research.example/papers/paper-id');
  });

  it('sends through Resend with the job id as its idempotency key', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://localhost/test');
    vi.stubEnv('RESEND_API_KEY', 'test-key');
    const fetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetch);
    await new ResendEmailSender().send(
      {
        to: 'owner@ncf.edu.ph',
        name: 'Owner',
        subject: 'Update',
        text: 'Text',
        html: '<p>Text</p>',
      },
      'job-id',
    );
    expect(fetch).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
          'Idempotency-Key': 'job-id',
        }),
      }),
    );
  });

  it('marks Resend client errors permanent but retries temporary failures', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://localhost/test');
    vi.stubEnv('RESEND_API_KEY', 'test-key');
    const sender = new ResendEmailSender();
    for (const [status, permanent] of [
      [422, true],
      [503, false],
    ] as const) {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status }));
      await expect(
        sender.send(
          {
            to: 'owner@ncf.edu.ph',
            name: 'Owner',
            subject: 'Update',
            text: 'Text',
            html: '<p>Text</p>',
          },
          'job-id',
        ),
      ).rejects.toMatchObject({ permanent });
    }
  });
});
