import {
  ConflictException,
  ForbiddenException,
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, count, desc, eq, gt, gte, inArray, lt, sql } from 'drizzle-orm';
import { DATABASE } from '../../database/database.module.js';
import type { Database } from '../../database/database.js';
import {
  accessGrants,
  accessRequests,
  accounts,
  auditEvents,
  emailJobs,
  paperFiles,
  paperVersions,
  papers,
  programs,
  settings,
} from '../../database/schema/index.js';
import type { Actor } from '../../shared/domain/actor.js';

@Injectable()
export class AccessRequestUseCases {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async request(actor: Actor, publicId: string, purpose: string) {
    const account = this.active(actor);
    const now = new Date();
    const result = await this.db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext(${account.id}))`,
      );
      const [paper] = await tx
        .select({
          id: papers.id,
          ownerId: papers.ownerId,
          adviserId: papers.adviserId,
          publicId: papers.publicId,
          publicationStatus: papers.publicationStatus,
          title: paperVersions.title,
          fileId: paperVersions.pdfFileId,
          fileStatus: paperFiles.status,
        })
        .from(papers)
        .innerJoin(paperVersions, eq(paperVersions.id, papers.currentVersionId))
        .leftJoin(paperFiles, eq(paperFiles.id, paperVersions.pdfFileId))
        .where(eq(papers.publicId, publicId));
      if (
        !paper ||
        paper.ownerId === account.id ||
        paper.adviserId === account.id ||
        account.role === 'COORDINATOR'
      )
        throw new NotFoundException();
      if (paper.publicationStatus !== 'published')
        throw new ConflictException('This Paper is unavailable.');
      if (paperStatusNotAvailable(paper.fileId, paper.fileStatus))
        throw new ConflictException('This Paper is unavailable.');
      const [existingGrant] = await tx
        .select({ id: accessGrants.id })
        .from(accessGrants)
        .where(
          and(
            eq(accessGrants.accountId, account.id),
            eq(accessGrants.paperId, paper.id),
            gt(accessGrants.expiresAt, now),
          ),
        );
      if (existingGrant)
        throw new ConflictException('An active Access Grant already exists.');
      await tx
        .update(accessRequests)
        .set({ status: 'expired', decidedAt: now })
        .where(
          and(
            eq(accessRequests.accountId, account.id),
            eq(accessRequests.paperId, paper.id),
            eq(accessRequests.status, 'pending'),
            lt(accessRequests.expiresAt, now),
          ),
        );
      const [pending] = await tx
        .select()
        .from(accessRequests)
        .where(
          and(
            eq(accessRequests.accountId, account.id),
            eq(accessRequests.paperId, paper.id),
            eq(accessRequests.status, 'pending'),
          ),
        );
      if (pending) return pending;
      const [rate] = await tx
        .select({ value: count() })
        .from(accessRequests)
        .where(
          and(
            eq(accessRequests.accountId, account.id),
            gte(accessRequests.createdAt, new Date(now.getTime() - 3_600_000)),
          ),
        );
      const [open] = await tx
        .select({ value: count() })
        .from(accessRequests)
        .where(
          and(
            eq(accessRequests.accountId, account.id),
            eq(accessRequests.status, 'pending'),
            gt(accessRequests.expiresAt, now),
          ),
        );
      if (rate.value >= 10 || open.value >= 10)
        throw new HttpException('Access Request limit reached.', 429);
      const [config] = await tx
        .select({ pendingRequestDays: settings.pendingRequestDays })
        .from(settings)
        .where(eq(settings.id, 1));
      if (!config)
        throw new ConflictException('Repository settings are unavailable.');
      const [saved] = await tx
        .insert(accessRequests)
        .values({
          paperId: paper.id,
          accountId: account.id,
          purpose,
          expiresAt: new Date(
            now.getTime() + config.pendingRequestDays * 86_400_000,
          ),
        })
        .returning();
      const [adviser] = paper.adviserId
        ? await tx
            .select({
              email: accounts.email,
              name: accounts.name,
              status: accounts.status,
            })
            .from(accounts)
            .where(eq(accounts.id, paper.adviserId))
        : [];
      const recipients =
        adviser?.status === 'ACTIVE'
          ? [adviser]
          : await tx
              .select({ email: accounts.email, name: accounts.name })
              .from(accounts)
              .where(
                and(
                  eq(accounts.role, 'COORDINATOR'),
                  eq(accounts.status, 'ACTIVE'),
                ),
              );
      if (recipients.length)
        await tx.insert(emailJobs).values(
          recipients.map((to) => ({
            event: 'access_request_created',
            recipientEmail: to.email,
            recipientName: to.name,
            paperPublicId: paper.publicId,
            paperTitle: paper.title,
          })),
        );
      return saved;
    });
    return this.summary(result);
  }

  async cancel(actor: Actor, requestId: string) {
    const account = this.active(actor);
    const changed = await this.db.transaction(async (tx) => {
      const [request] = await tx
        .select()
        .from(accessRequests)
        .where(
          and(
            eq(accessRequests.id, requestId),
            eq(accessRequests.accountId, account.id),
          ),
        )
        .for('update');
      if (!request) throw new NotFoundException();
      const now = new Date();
      if (request.status !== 'pending' || request.expiresAt <= now)
        throw new ConflictException(
          'This Access Request is no longer pending.',
        );
      await tx
        .update(accessRequests)
        .set({ status: 'cancelled', decidedAt: now })
        .where(eq(accessRequests.id, request.id));
      await tx.insert(auditEvents).values({
        actorAccountId: account.id,
        action: 'ACCESS_REQUEST_CANCELLED',
        subjectType: 'ACCESS_REQUEST',
        subjectId: request.id,
        details: null,
      });
      await this.notifyRequester(
        tx,
        request.id,
        'access_request_cancelled',
        null,
      );
      return true;
    });
    return { cancelled: changed as true };
  }

  async decide(
    actor: Actor,
    requestId: string,
    decision: 'approve' | 'deny',
    value: { days?: number; reason?: string },
  ) {
    const account = this.active(actor);
    const saved = await this.db.transaction(async (tx) => {
      const [request] = await tx
        .select({
          request: accessRequests,
          adviserId: papers.adviserId,
          publicId: papers.publicId,
          title: paperVersions.title,
        })
        .from(accessRequests)
        .innerJoin(papers, eq(papers.id, accessRequests.paperId))
        .innerJoin(paperVersions, eq(paperVersions.id, papers.currentVersionId))
        .where(eq(accessRequests.id, requestId))
        .for('update');
      if (!request) throw new NotFoundException();
      if (account.role !== 'COORDINATOR' && account.id !== request.adviserId)
        throw new ForbiddenException();
      const now = new Date();
      if (request.request.status !== 'pending')
        throw new ConflictException(
          'This Access Request has already been decided.',
        );
      if (request.request.expiresAt <= now) {
        await tx
          .update(accessRequests)
          .set({ status: 'expired', decidedAt: now })
          .where(eq(accessRequests.id, request.request.id));
        return { expired: true as const };
      }
      const [config] = await tx
        .select()
        .from(settings)
        .where(eq(settings.id, 1));
      if (!config)
        throw new ConflictException('Repository settings are unavailable.');
      if (
        decision === 'approve' &&
        (!value.days ||
          value.days < 1 ||
          value.days > config.maximumAccessGrantDays)
      )
        throw new ConflictException(
          'Access Grant length is outside the allowed range.',
        );
      const grantExpiresAt =
        decision === 'approve'
          ? new Date(now.getTime() + value.days! * 86_400_000)
          : null;
      await tx
        .update(accessRequests)
        .set({
          status: decision === 'approve' ? 'approved' : 'denied',
          decidedBy: account.id,
          decidedAt: now,
          decisionReason: decision === 'deny' ? value.reason : null,
          grantExpiresAt,
        })
        .where(eq(accessRequests.id, request.request.id));
      if (grantExpiresAt)
        await tx.insert(accessGrants).values({
          requestId: request.request.id,
          paperId: request.request.paperId,
          accountId: request.request.accountId,
          expiresAt: grantExpiresAt,
        });
      await tx.insert(auditEvents).values({
        actorAccountId: account.id,
        action:
          decision === 'approve'
            ? 'ACCESS_REQUEST_APPROVED'
            : 'ACCESS_REQUEST_DENIED',
        subjectType: 'ACCESS_REQUEST',
        subjectId: request.request.id,
        details: { days: value.days, reason: value.reason },
      });
      await this.notifyRequester(
        tx,
        request.request.id,
        decision === 'approve'
          ? 'access_request_approved'
          : 'access_request_denied',
        value.reason ?? null,
      );
      return {
        ...request.request,
        status:
          decision === 'approve' ? ('approved' as const) : ('denied' as const),
        decidedBy: account.id,
        decidedAt: now,
        decisionReason: decision === 'deny' ? value.reason! : null,
        grantExpiresAt,
      };
    });
    if ('expired' in saved)
      throw new ConflictException('This Access Request has expired.');
    return this.summary(saved);
  }

  async mine(actor: Actor) {
    const account = this.active(actor);
    const rows = await this.db
      .select({
        request: accessRequests,
        publicId: papers.publicId,
        title: paperVersions.title,
      })
      .from(accessRequests)
      .innerJoin(papers, eq(papers.id, accessRequests.paperId))
      .innerJoin(paperVersions, eq(paperVersions.id, papers.currentVersionId))
      .where(eq(accessRequests.accountId, account.id))
      .orderBy(desc(accessRequests.createdAt));
    return rows.map(({ request, publicId, title }) =>
      this.shape(request, publicId, title),
    );
  }

  async queue(actor: Actor) {
    const account = this.active(actor);
    if (!['INSTRUCTOR', 'COORDINATOR'].includes(account.role))
      throw new ForbiddenException();
    const [config] = await this.db
      .select({
        defaultGrantDays: settings.defaultAccessGrantDays,
        maximumGrantDays: settings.maximumAccessGrantDays,
      })
      .from(settings)
      .where(eq(settings.id, 1));
    if (!config)
      throw new ConflictException('Repository settings are unavailable.');
    const rows = await this.db
      .select({
        request: accessRequests,
        publicId: papers.publicId,
        title: paperVersions.title,
        requesterName: accounts.name,
        requesterRole: accounts.role,
        program: programs.name,
      })
      .from(accessRequests)
      .innerJoin(papers, eq(papers.id, accessRequests.paperId))
      .innerJoin(paperVersions, eq(paperVersions.id, papers.currentVersionId))
      .innerJoin(accounts, eq(accounts.id, accessRequests.accountId))
      .leftJoin(programs, eq(programs.id, accounts.programId))
      .where(
        and(
          eq(accessRequests.status, 'pending'),
          gt(accessRequests.expiresAt, new Date()),
          account.role === 'COORDINATOR'
            ? sql`true`
            : eq(papers.adviserId, account.id),
        ),
      )
      .orderBy(desc(accessRequests.createdAt));
    return Promise.all(
      rows.map(
        async ({
          request,
          publicId,
          title,
          requesterName,
          requesterRole,
          program,
        }) => {
          const earlier = await this.db
            .select({
              decision: accessRequests.status,
              reason: accessRequests.decisionReason,
              decidedAt: accessRequests.decidedAt,
            })
            .from(accessRequests)
            .where(
              and(
                eq(accessRequests.paperId, request.paperId),
                lt(accessRequests.createdAt, request.createdAt),
                inArray(accessRequests.status, [
                  'approved',
                  'denied',
                  'cancelled',
                  'expired',
                ]),
              ),
            )
            .orderBy(desc(accessRequests.decidedAt));
          return {
            ...this.shape(request, publicId, title),
            requesterName,
            requesterRole,
            program,
            defaultGrantDays: config.defaultGrantDays,
            maximumGrantDays: config.maximumGrantDays,
            earlierDecisions: earlier.flatMap((item) =>
              item.decidedAt
                ? [
                    {
                      decision: item.decision as
                        'approved' | 'denied' | 'cancelled' | 'expired',
                      reason: item.reason,
                      decidedAt: item.decidedAt.toISOString(),
                    },
                  ]
                : [],
            ),
          };
        },
      ),
    );
  }

  async check(actor: Actor, publicId: string) {
    if (actor.kind !== 'active')
      return {
        state: 'guest' as const,
        expiresAt: null,
        reason: null,
        requestId: null,
      };
    const account = actor.account;
    const [paper] = await this.db
      .select({
        id: papers.id,
        ownerId: papers.ownerId,
        adviserId: papers.adviserId,
        publicationStatus: papers.publicationStatus,
        fileStatus: paperFiles.status,
        fileId: paperVersions.pdfFileId,
      })
      .from(papers)
      .leftJoin(paperVersions, eq(paperVersions.id, papers.currentVersionId))
      .leftJoin(paperFiles, eq(paperFiles.id, paperVersions.pdfFileId))
      .where(eq(papers.publicId, publicId));
    if (
      !paper ||
      paper.publicationStatus !== 'published' ||
      paper.fileId == null ||
      paper.fileStatus !== 'CLEAN'
    )
      return {
        state: 'unavailable' as const,
        expiresAt: null,
        reason: null,
        requestId: null,
      };
    if (
      paper.ownerId === account.id ||
      paper.adviserId === account.id ||
      account.role === 'COORDINATOR'
    )
      return {
        state: 'management' as const,
        expiresAt: null,
        reason: null,
        requestId: null,
      };
    const now = new Date();
    const [grant] = await this.db
      .select()
      .from(accessGrants)
      .where(
        and(
          eq(accessGrants.accountId, account.id),
          eq(accessGrants.paperId, paper.id),
          gt(accessGrants.expiresAt, now),
        ),
      )
      .orderBy(desc(accessGrants.expiresAt))
      .limit(1);
    if (grant)
      return {
        state: 'approved' as const,
        expiresAt: grant.expiresAt.toISOString(),
        reason: null,
        requestId: null,
      };
    const [request] = await this.db
      .select()
      .from(accessRequests)
      .where(
        and(
          eq(accessRequests.accountId, account.id),
          eq(accessRequests.paperId, paper.id),
        ),
      )
      .orderBy(desc(accessRequests.createdAt))
      .limit(1);
    if (!request)
      return {
        state: 'eligible' as const,
        expiresAt: null,
        reason: null,
        requestId: null,
      };
    if (request.status === 'pending' && request.expiresAt <= now) {
      await this.db
        .update(accessRequests)
        .set({ status: 'expired', decidedAt: now })
        .where(eq(accessRequests.id, request.id));
      return {
        state: 'expired' as const,
        expiresAt: null,
        reason: null,
        requestId: request.id,
      };
    }
    if (
      request.status === 'approved' &&
      request.grantExpiresAt &&
      request.grantExpiresAt <= now
    ) {
      return {
        state: 'expired' as const,
        expiresAt: request.grantExpiresAt.toISOString(),
        reason: null,
        requestId: request.id,
      };
    }
    return {
      state: request.status as 'pending' | 'denied' | 'cancelled' | 'expired',
      expiresAt:
        request.status === 'pending' ? request.expiresAt.toISOString() : null,
      reason: request.decisionReason,
      requestId: request.id,
    };
  }

  private async notifyRequester(
    tx: Parameters<Parameters<Database['transaction']>[0]>[0],
    requestId: string,
    event: string,
    reason: string | null,
  ) {
    const [to] = await tx
      .select({
        email: accounts.email,
        name: accounts.name,
        publicId: papers.publicId,
        title: paperVersions.title,
      })
      .from(accessRequests)
      .innerJoin(accounts, eq(accounts.id, accessRequests.accountId))
      .innerJoin(papers, eq(papers.id, accessRequests.paperId))
      .innerJoin(paperVersions, eq(paperVersions.id, papers.currentVersionId))
      .where(eq(accessRequests.id, requestId));
    if (to)
      await tx.insert(emailJobs).values({
        event,
        recipientEmail: to.email,
        recipientName: to.name,
        paperPublicId: to.publicId,
        paperTitle: to.title,
        details: reason ? { reason } : null,
      });
  }

  private active(actor: Actor) {
    if (actor.kind !== 'active') throw new NotFoundException();
    return actor.account;
  }
  private async summary(request: typeof accessRequests.$inferSelect) {
    const [paper] = await this.db
      .select({ publicId: papers.publicId, title: paperVersions.title })
      .from(papers)
      .innerJoin(paperVersions, eq(paperVersions.id, papers.currentVersionId))
      .where(eq(papers.id, request.paperId));
    if (!paper) throw new NotFoundException();
    return this.shape(request, paper.publicId, paper.title);
  }
  private shape(
    request: typeof accessRequests.$inferSelect,
    publicId: string,
    paperTitle: string,
  ) {
    const {
      id,
      purpose,
      status,
      expiresAt,
      decisionReason,
      grantExpiresAt,
      createdAt,
    } = request;
    return {
      id,
      publicId,
      paperTitle,
      purpose,
      status,
      expiresAt: expiresAt.toISOString(),
      decisionReason,
      grantExpiresAt: grantExpiresAt?.toISOString() ?? null,
      createdAt: createdAt.toISOString(),
    };
  }
}

function paperStatusNotAvailable(
  fileId: string | null,
  fileStatus: string | null,
) {
  return fileId === null || fileStatus !== 'CLEAN';
}
