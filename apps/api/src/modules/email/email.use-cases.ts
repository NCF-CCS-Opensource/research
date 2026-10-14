import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import { and, asc, eq, gte, lte, or } from 'drizzle-orm';
import { DATABASE } from '../../database/database.module.js';
import type { Database } from '../../database/database.js';
import { auditEvents, emailJobs } from '../../database/schema/index.js';
import { requireCoordinator, type Actor } from '../../shared/domain/actor.js';
import {
  EMAIL_SENDER,
  EmailSendError,
  emailMessage,
  type EmailSender,
} from './email-sender.js';

const MAX_ATTEMPTS = 5;

@Injectable()
export class EmailUseCases implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(EmailUseCases.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(EMAIL_SENDER) private readonly sender: EmailSender,
  ) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(
      () => void this.run().catch((error: unknown) => this.logger.error(error)),
      3_000,
    );
    this.timer.unref();
    void this.run().catch((error: unknown) => this.logger.error(error));
  }

  onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer);
  }

  async listFailures(actor: Actor) {
    requireCoordinator(actor);
    const jobs = await this.db
      .select()
      .from(emailJobs)
      .where(eq(emailJobs.status, 'failed'))
      .orderBy(asc(emailJobs.createdAt));
    return jobs.map((job) => ({
      ...job,
      createdAt: job.createdAt.toISOString(),
    }));
  }

  async retry(actor: Actor, jobId: string) {
    const coordinator = requireCoordinator(actor);
    await this.db.transaction(async (tx) => {
      const [job] = await tx
        .update(emailJobs)
        .set({
          status: 'pending',
          attempts: 0,
          availableAt: new Date(),
          leaseUntil: null,
          lastError: null,
        })
        .where(and(eq(emailJobs.id, jobId), eq(emailJobs.status, 'failed')))
        .returning({ id: emailJobs.id });
      if (!job) throw new NotFoundException();
      await tx.insert(auditEvents).values({
        actorAccountId: coordinator.id,
        action: 'EMAIL_JOB_RETRIED',
        subjectType: 'EMAIL_JOB',
        subjectId: job.id,
        details: null,
      });
    });
    return { retried: true as const };
  }

  async run() {
    if (this.running) return;
    this.running = true;
    try {
      for (const job of await this.claim(10)) await this.deliver(job);
    } finally {
      this.running = false;
    }
  }

  private async claim(limit: number) {
    const now = new Date();
    return this.db.transaction(async (tx) => {
      await tx
        .update(emailJobs)
        .set({
          status: 'failed',
          leaseUntil: null,
          lastError: 'Delivery lease expired after the final attempt',
        })
        .where(
          and(
            eq(emailJobs.status, 'processing'),
            lte(emailJobs.leaseUntil, now),
            gte(emailJobs.attempts, MAX_ATTEMPTS),
          ),
        );
      const jobs = await tx
        .select()
        .from(emailJobs)
        .where(
          and(
            lte(emailJobs.availableAt, now),
            lte(emailJobs.attempts, MAX_ATTEMPTS - 1),
            or(
              eq(emailJobs.status, 'pending'),
              and(
                eq(emailJobs.status, 'processing'),
                lte(emailJobs.leaseUntil, now),
              ),
            ),
          ),
        )
        .orderBy(asc(emailJobs.createdAt))
        .limit(limit)
        .for('update', { skipLocked: true });
      for (const job of jobs) {
        await tx
          .update(emailJobs)
          .set({
            status: 'processing',
            attempts: job.attempts + 1,
            leaseUntil: new Date(now.getTime() + 60_000),
          })
          .where(eq(emailJobs.id, job.id));
      }
      return jobs.map((job) => ({ ...job, attempts: job.attempts + 1 }));
    });
  }

  private async deliver(
    job: Awaited<ReturnType<EmailUseCases['claim']>>[number],
  ) {
    try {
      await this.sender.send(emailMessage(job), job.id);
      await this.db
        .update(emailJobs)
        .set({
          status: 'sent',
          sentAt: new Date(),
          leaseUntil: null,
          lastError: null,
        })
        .where(eq(emailJobs.id, job.id));
    } catch (error) {
      const permanent = error instanceof EmailSendError && error.permanent;
      const failed = permanent || job.attempts >= MAX_ATTEMPTS;
      const delaySeconds = Math.min(3600, 30 * 2 ** (job.attempts - 1));
      await this.db
        .update(emailJobs)
        .set({
          status: failed ? 'failed' : 'pending',
          availableAt: new Date(Date.now() + delaySeconds * 1000),
          leaseUntil: null,
          lastError: (error instanceof Error
            ? error.message
            : 'Email delivery failed'
          ).slice(0, 500),
        })
        .where(eq(emailJobs.id, job.id));
    }
  }
}
