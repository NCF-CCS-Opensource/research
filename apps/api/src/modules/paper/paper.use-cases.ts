import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  paperDetailsSchema,
  type Paper,
  type PaperDetails,
  type PublicPaper,
} from '@repo/contracts';
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  or,
  sql,
} from 'drizzle-orm';
import { DomainError } from '../../shared/domain/domain-error.js';
import type { Actor } from '../../shared/domain/actor.js';
import { DATABASE } from '../../database/database.module.js';
import type { Database } from '../../database/database.js';
import {
  accounts,
  auditEvents,
  accessGrants,
  accessRequests,
  depositAcknowledgements,
  depositNotices,
  emailJobs,
  paperDecisions,
  paperFiles,
  paperVersions,
  papers,
  programs,
  settings,
} from '../../database/schema/index.js';

export class StalePaperEditError extends DomainError {
  constructor() {
    super(
      'STALE_PAPER_EDIT',
      'This Paper changed since you opened it. Reload it before saving.',
      'conflict',
    );
  }
}
export class PaperNotEditableError extends DomainError {
  constructor() {
    super(
      'PAPER_NOT_EDITABLE',
      'Only a draft Paper can be changed or deleted.',
      'conflict',
    );
  }
}
export class InvalidAdviserError extends DomainError {
  constructor() {
    super(
      'INVALID_ADVISER',
      'Choose an active Instructor or Coordinator as Adviser.',
      'invalid',
    );
  }
}
export class InvalidPaperProgramError extends DomainError {
  constructor() {
    super('INVALID_PROGRAM', 'Choose an active Program.', 'invalid');
  }
}
export class InvalidPaperTransitionError extends DomainError {
  constructor() {
    super(
      'PAPER_STATE_CONFLICT',
      'This Paper cannot make that transition.',
      'conflict',
    );
  }
}
export class SubmissionIncompleteError extends DomainError {
  constructor(field: string) {
    super(
      'SUBMISSION_INCOMPLETE',
      `${field} is required before submission.`,
      'invalid',
    );
  }
}
export class PaperDecisionForbiddenError extends DomainError {
  constructor() {
    super(
      'PAPER_DECISION_FORBIDDEN',
      'Only the current Adviser or a Coordinator may decide this Paper.',
      'forbidden',
    );
  }
}

export function paperReferencesMatch(
  paperId: string,
  version: { id: string; paperId: string; pdfFileId: string | null },
  file?: { id: string; paperId: string | null; versionId: string | null },
) {
  return (
    version.paperId === paperId &&
    !!file &&
    file.id === version.pdfFileId &&
    file.paperId === paperId &&
    file.versionId === version.id
  );
}

@Injectable()
export class PaperUseCases {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async listAdvisers() {
    return this.db
      .select({ id: accounts.id, fullName: accounts.name })
      .from(accounts)
      .where(
        and(
          eq(accounts.status, 'ACTIVE'),
          inArray(accounts.role, ['INSTRUCTOR', 'COORDINATOR']),
        ),
      )
      .orderBy(asc(accounts.name), asc(accounts.id));
  }

  async create(
    identity: Actor,
    input: PaperDetails & { adviserId: string },
  ): Promise<Paper> {
    const ownerId = this.requireStudent(identity);
    return this.createDraft(ownerId, input, input.adviserId, false);
  }

  async createLegacyDeposit(
    identity: Actor,
    input: PaperDetails & { adviserId?: string | null },
  ): Promise<Paper> {
    if (identity.kind !== 'active' || identity.account.role !== 'COORDINATOR')
      throw new NotFoundException();
    return this.createDraft(
      identity.account.id,
      input,
      input.adviserId ?? null,
      true,
    );
  }

  private async createDraft(
    ownerId: string,
    input: PaperDetails,
    adviserId: string | null,
    legacyDeposit: boolean,
  ): Promise<Paper> {
    if (adviserId) await this.validateAdviser(adviserId);
    const [program] = await this.db
      .select({ id: programs.id })
      .from(programs)
      .where(and(eq(programs.id, input.programId), eq(programs.active, true)));
    if (!program) throw new InvalidPaperProgramError();
    const paperId = randomUUID();
    const publicId = randomUUID().replaceAll('-', '');
    return this.db.transaction(async (tx) => {
      await tx.insert(papers).values({
        id: paperId,
        publicId,
        ownerId,
        adviserId,
        legacyDeposit,
        programId: input.programId,
      });
      const [version] = await tx
        .insert(paperVersions)
        .values({
          paperId,
          versionNumber: 1,
          title: input.title,
          abstract: input.abstract,
          year: input.year,
          researchType: input.researchType,
          keywords: input.keywords,
          authors: input.authors,
        })
        .returning();
      await tx
        .update(papers)
        .set({ currentVersionId: version.id })
        .where(eq(papers.id, paperId));
      if (legacyDeposit)
        await tx.insert(auditEvents).values({
          actorAccountId: ownerId,
          action: 'PAPER_LEGACY_DEPOSIT_CREATED',
          subjectType: 'PAPER',
          subjectId: paperId,
          details: { versionId: version.id },
        });
      return this.getForOwner(tx, publicId, ownerId);
    });
  }

  async listMine(identity: Actor): Promise<Paper[]> {
    const ownerId = this.requireStudent(identity);
    const ids = await this.db
      .select({ publicId: papers.publicId })
      .from(papers)
      .where(eq(papers.ownerId, ownerId))
      .orderBy(asc(papers.createdAt));
    return Promise.all(
      ids.map(({ publicId }) => this.getForOwner(this.db, publicId, ownerId)),
    );
  }

  async get(identity: Actor, publicId: string): Promise<Paper> {
    if (identity.kind !== 'active') throw new NotFoundException();
    const [row] = await this.db
      .select({ ownerId: papers.ownerId, adviserId: papers.adviserId })
      .from(papers)
      .where(eq(papers.publicId, publicId));
    if (
      !row ||
      (identity.account.id !== row.ownerId &&
        identity.account.id !== row.adviserId &&
        identity.account.role !== 'COORDINATOR')
    )
      throw new NotFoundException();
    return this.getForOwner(this.db, publicId, row.ownerId);
  }

  async update(
    identity: Actor,
    publicId: string,
    input: PaperDetails & { adviserId: string; expectedLockVersion: number },
  ): Promise<Paper> {
    const ownerId = this.requireStudent(identity);
    const paper = await this.getForOwner(this.db, publicId, ownerId);
    if (!['draft', 'revision_requested'].includes(paper.status))
      throw new PaperNotEditableError();
    await this.validateAdviser(input.adviserId);
    const [program] = await this.db
      .select({ id: programs.id })
      .from(programs)
      .where(and(eq(programs.id, input.programId), eq(programs.active, true)));
    if (!program) throw new InvalidPaperProgramError();
    return this.db.transaction(async (tx) => {
      const [saved] = await tx
        .update(paperVersions)
        .set({
          title: input.title,
          abstract: input.abstract,
          authors: input.authors,
          year: input.year,
          researchType: input.researchType,
          keywords: input.keywords,
          lockVersion: input.expectedLockVersion + 1,
        })
        .where(
          and(
            eq(paperVersions.id, paper.versionId),
            eq(paperVersions.lockVersion, input.expectedLockVersion),
          ),
        )
        .returning();
      if (!saved) throw new StalePaperEditError();
      await tx
        .update(papers)
        .set({ adviserId: input.adviserId, programId: input.programId })
        .where(eq(papers.id, paper.id));
      return this.getForOwner(tx, publicId, ownerId);
    });
  }

  async delete(identity: Actor, publicId: string) {
    const ownerId = this.requireStudent(identity);
    const paper = await this.getForOwner(this.db, publicId, ownerId);
    if (paper.status !== 'draft') throw new PaperNotEditableError();
    await this.db
      .delete(papers)
      .where(and(eq(papers.id, paper.id), eq(papers.ownerId, ownerId)));
    return { deleted: true as const };
  }

  submit(
    identity: Actor,
    publicId: string,
    noticeVersion: number,
  ): Promise<Paper> {
    const ownerId = this.requireStudent(identity);
    return this.db.transaction(async (tx) => {
      const [paper] = await tx
        .select()
        .from(papers)
        .where(eq(papers.publicId, publicId))
        .for('update');
      if (paper?.ownerId !== ownerId) throw new NotFoundException();
      if (!['draft', 'revision_requested'].includes(paper.status))
        throw new InvalidPaperTransitionError();
      const [currentNotice] = await tx
        .select()
        .from(depositNotices)
        .orderBy(desc(depositNotices.version))
        .limit(1);
      if (!currentNotice) throw new SubmissionIncompleteError('Deposit Notice');
      if (noticeVersion !== currentNotice.version)
        throw new SubmissionIncompleteError(
          'Current Deposit Notice acknowledgement',
        );
      if (!paper.currentVersionId)
        throw new SubmissionIncompleteError('Paper details');
      const [version] = await tx
        .select()
        .from(paperVersions)
        .where(eq(paperVersions.id, paper.currentVersionId));
      if (!version) throw new SubmissionIncompleteError('Paper details');
      const [file] = version.pdfFileId
        ? await tx
            .select({ status: paperFiles.status })
            .from(paperFiles)
            .where(eq(paperFiles.id, version.pdfFileId))
        : [];
      if (file?.status !== 'CLEAN')
        throw new SubmissionIncompleteError('CLEAN PDF');
      if (!paper.adviserId) throw new SubmissionIncompleteError('Adviser');
      await this.validateAdviser(paper.adviserId);
      await tx
        .insert(depositAcknowledgements)
        .values({ paperId: paper.id, accountId: ownerId, noticeVersion });
      await tx
        .update(papers)
        .set({ status: 'submitted' })
        .where(eq(papers.id, paper.id));
      await tx
        .insert(paperDecisions)
        .values({ paperId: paper.id, actorId: ownerId, decision: 'SUBMITTED' });
      await tx.insert(auditEvents).values({
        actorAccountId: ownerId,
        action: 'PAPER_SUBMITTED',
        subjectType: 'PAPER',
        subjectId: paper.id,
        details: { noticeVersion },
      });
      const [adviser] = paper.adviserId
        ? await tx
            .select({ email: accounts.email, name: accounts.name })
            .from(accounts)
            .where(eq(accounts.id, paper.adviserId))
        : [];
      if (adviser)
        await tx.insert(emailJobs).values({
          event: 'submitted',
          recipientEmail: adviser.email,
          recipientName: adviser.name,
          paperPublicId: paper.publicId,
          paperTitle: version.title,
        });
      return this.getForOwner(tx, publicId, ownerId);
    });
  }

  async listAdviserQueue(identity: Actor): Promise<Paper[]> {
    if (
      identity.kind !== 'active' ||
      !['INSTRUCTOR', 'COORDINATOR'].includes(identity.account.role)
    )
      throw new NotFoundException();
    const ids = await this.db
      .select({ publicId: papers.publicId, ownerId: papers.ownerId })
      .from(papers)
      .where(
        and(
          eq(papers.adviserId, identity.account.id),
          eq(papers.status, 'submitted'),
        ),
      )
      .orderBy(asc(papers.createdAt));
    return Promise.all(
      ids.map(({ publicId, ownerId }) =>
        this.getForOwner(this.db, publicId, ownerId),
      ),
    );
  }

  async listPublicationQueue(identity: Actor): Promise<Paper[]> {
    if (identity.kind !== 'active' || identity.account.role !== 'COORDINATOR')
      throw new NotFoundException();
    const ids = await this.db
      .select({ publicId: papers.publicId, ownerId: papers.ownerId })
      .from(papers)
      .where(
        and(
          eq(papers.status, 'endorsed'),
          eq(papers.publicationStatus, 'unpublished'),
        ),
      )
      .orderBy(asc(papers.createdAt));
    const queue = await Promise.all(
      ids.map(({ publicId, ownerId }) =>
        this.getForOwner(this.db, publicId, ownerId),
      ),
    );
    return queue;
  }

  publish(identity: Actor, publicId: string): Promise<Paper> {
    if (identity.kind !== 'active' || identity.account.role !== 'COORDINATOR')
      throw new NotFoundException();
    return this.publishWithMode(identity, publicId, false);
  }

  publishLegacyDeposit(identity: Actor, publicId: string): Promise<Paper> {
    if (identity.kind !== 'active' || identity.account.role !== 'COORDINATOR')
      throw new NotFoundException();
    return this.publishWithMode(identity, publicId, true);
  }

  withdraw(
    identity: Actor,
    publicId: string,
    reason: string,
    publicNotice: string,
  ): Promise<Paper> {
    if (identity.kind !== 'active' || identity.account.role !== 'COORDINATOR')
      throw new NotFoundException();
    return this.db.transaction(async (tx) => {
      const [initial] = await tx
        .select()
        .from(papers)
        .where(eq(papers.publicId, publicId));
      if (!initial) throw new NotFoundException();
      const requesters = await tx
        .selectDistinct({ accountId: accessRequests.accountId })
        .from(accessRequests)
        .where(
          and(
            eq(accessRequests.paperId, initial.id),
            eq(accessRequests.status, 'pending'),
          ),
        )
        .orderBy(asc(accessRequests.accountId));
      if (requesters.length)
        await tx
          .select({ id: accounts.id })
          .from(accounts)
          .where(
            inArray(
              accounts.id,
              requesters.map(({ accountId }) => accountId),
            ),
          )
          .orderBy(asc(accounts.id))
          .for('update');
      const [paper] = await tx
        .select()
        .from(papers)
        .where(eq(papers.id, initial.id))
        .for('update');
      if (!paper || paper.publicationStatus !== 'published')
        throw new NotFoundException();
      const now = new Date();
      await tx
        .update(papers)
        .set({
          publicationStatus: 'withdrawn',
          withdrawalReason: reason,
          publicWithdrawalNotice: publicNotice,
        })
        .where(eq(papers.id, paper.id));
      await tx
        .update(accessRequests)
        .set({ status: 'cancelled', decidedAt: now })
        .where(
          and(
            eq(accessRequests.paperId, paper.id),
            eq(accessRequests.status, 'pending'),
          ),
        );
      await tx
        .update(accessGrants)
        .set({ revokedAt: now, revocationReason: 'Paper withdrawn.' })
        .where(
          and(
            eq(accessGrants.paperId, paper.id),
            isNull(accessGrants.revokedAt),
          ),
        );
      await tx.insert(auditEvents).values({
        actorAccountId: identity.account.id,
        action: 'PAPER_WITHDRAWN',
        subjectType: 'PAPER',
        subjectId: paper.id,
        details: { reason, publicNotice },
      });
      const [version] = paper.currentVersionId
        ? await tx
            .select()
            .from(paperVersions)
            .where(eq(paperVersions.id, paper.currentVersionId))
        : [];
      for (const accountId of new Set(
        [paper.ownerId, paper.adviserId].filter(Boolean),
      )) {
        const [recipient] = await tx
          .select({ email: accounts.email, name: accounts.name })
          .from(accounts)
          .where(eq(accounts.id, accountId!));
        if (recipient)
          await tx.insert(emailJobs).values({
            event: 'paper_withdrawn',
            recipientEmail: recipient.email,
            recipientName: recipient.name,
            paperPublicId: paper.publicId,
            paperTitle: version?.title ?? 'Paper',
            details: { reason: publicNotice },
          });
      }
      return this.getForOwner(tx, publicId, paper.ownerId);
    });
  }

  restore(identity: Actor, publicId: string): Promise<Paper> {
    if (identity.kind !== 'active' || identity.account.role !== 'COORDINATOR')
      throw new NotFoundException();
    return this.db.transaction(async (tx) => {
      const [paper] = await tx
        .select()
        .from(papers)
        .where(eq(papers.publicId, publicId))
        .for('update');
      if (
        !paper ||
        paper.publicationStatus !== 'withdrawn' ||
        paper.status !== (paper.legacyDeposit ? 'draft' : 'endorsed') ||
        !paper.currentVersionId
      )
        throw new NotFoundException();
      const version = await this.publicationEligibleVersion(tx, paper);
      if (!version?.publishedAt)
        throw new SubmissionIncompleteError('Publication eligibility');
      await tx
        .update(papers)
        .set({ publicationStatus: 'published' })
        .where(eq(papers.id, paper.id));
      await tx.insert(auditEvents).values({
        actorAccountId: identity.account.id,
        action: 'PAPER_RESTORED',
        subjectType: 'PAPER',
        subjectId: paper.id,
        details: null,
      });
      return this.getForOwner(tx, publicId, paper.ownerId);
    });
  }

  private async publishWithMode(
    identity: Extract<Actor, { kind: 'active' }>,
    publicId: string,
    legacyDeposit: boolean,
  ): Promise<Paper> {
    return this.db.transaction(async (tx) => {
      const [paper] = await tx
        .select()
        .from(papers)
        .where(eq(papers.publicId, publicId))
        .for('update');
      if (
        !paper ||
        paper.legacyDeposit !== legacyDeposit ||
        paper.status !== (legacyDeposit ? 'draft' : 'endorsed') ||
        paper.publicationStatus !== 'unpublished' ||
        !paper.currentVersionId
      )
        throw new NotFoundException();
      const version = await this.publicationEligibleVersion(tx, paper);
      if (!version)
        throw new SubmissionIncompleteError(
          'Clean PDF and complete Paper details',
        );
      const publishedAt = new Date();
      await tx
        .update(paperVersions)
        .set({ publishedAt })
        .where(eq(paperVersions.id, version.id));
      await tx
        .update(papers)
        .set({ publicationStatus: 'published', currentVersionId: version.id })
        .where(eq(papers.id, paper.id));
      await tx.insert(auditEvents).values({
        actorAccountId: identity.account.id,
        action: legacyDeposit
          ? 'PAPER_LEGACY_DEPOSIT_PUBLISHED'
          : 'PAPER_PUBLISHED',
        subjectType: 'PAPER',
        subjectId: paper.id,
        details: { versionId: version.id },
      });
      const [owner] = await tx
        .select({ email: accounts.email, name: accounts.name })
        .from(accounts)
        .where(eq(accounts.id, paper.ownerId));
      const [adviser] = paper.adviserId
        ? await tx
            .select({ email: accounts.email, name: accounts.name })
            .from(accounts)
            .where(eq(accounts.id, paper.adviserId))
        : [];
      for (const recipient of [owner, adviser])
        if (recipient)
          await tx.insert(emailJobs).values({
            event: 'published',
            recipientEmail: recipient.email,
            recipientName: recipient.name,
            paperPublicId: paper.publicId,
            paperTitle: version.title,
          });
      return this.getForOwner(tx, publicId, paper.ownerId);
    });
  }

  private async publicationEligibleVersion(
    tx: Parameters<Parameters<Database['transaction']>[0]>[0],
    paper: typeof papers.$inferSelect,
  ) {
    const [version] = paper.currentVersionId
      ? await tx
          .select()
          .from(paperVersions)
          .where(eq(paperVersions.id, paper.currentVersionId))
      : [];
    const [file] = version?.pdfFileId
      ? await tx
          .select()
          .from(paperFiles)
          .where(eq(paperFiles.id, version.pdfFileId))
      : [];
    const [program] = await tx
      .select({ name: programs.name })
      .from(programs)
      .where(and(eq(programs.id, paper.programId), eq(programs.active, true)));
    if (
      !version ||
      !paperReferencesMatch(paper.id, version, file) ||
      file.status !== 'CLEAN' ||
      !program ||
      !paperDetailsSchema.safeParse({
        ...version,
        programId: paper.programId,
      }).success
    )
      return;
    return version;
  }

  async getPublic(publicId: string): Promise<PublicPaper> {
    const [row] = await this.db
      .select({
        paper: papers,
        version: paperVersions,
        program: programs.name,
        programActive: programs.active,
        institutionName: settings.institutionName,
      })
      .from(papers)
      .innerJoin(
        paperVersions,
        and(
          eq(paperVersions.id, papers.currentVersionId),
          eq(paperVersions.paperId, papers.id),
        ),
      )
      .innerJoin(programs, eq(programs.id, papers.programId))
      .crossJoin(settings)
      .where(
        and(
          eq(papers.publicId, publicId),
          inArray(papers.publicationStatus, ['published', 'withdrawn']),
          or(
            eq(papers.status, 'endorsed'),
            and(eq(papers.legacyDeposit, true), eq(papers.status, 'draft')),
          ),
        ),
      );
    if (!row) throw new NotFoundException();
    if (row.paper.publicationStatus === 'withdrawn') {
      if (!row.paper.publicWithdrawalNotice) throw new NotFoundException();
      return {
        withdrawn: true,
        publicId,
        title: row.version.title,
        authors: row.version.authors as PublicPaper['authors'],
        year: row.version.year,
        withdrawalNotice: row.paper.publicWithdrawalNotice,
      };
    }
    if (!row.version.publishedAt || !row.programActive)
      throw new NotFoundException();
    return {
      withdrawn: false,
      publicId,
      title: row.version.title,
      authors: row.version.authors as PublicPaper['authors'],
      abstract: row.version.abstract,
      keywords: row.version.keywords,
      program: row.program,
      year: row.version.year,
      researchType: row.version.researchType,
      publishedAt: row.version.publishedAt.toISOString(),
      institutionName: row.institutionName,
    };
  }

  async listPublished(query: {
    q?: string;
    program?: string;
    year?: number;
    researchType?: 'THESIS' | 'CAPSTONE' | 'RESEARCH_PAPER' | 'PROJECT_REPORT';
    sort?: 'relevance' | 'date' | 'title';
    page: number;
    pageSize: number;
  }) {
    const textVector = paperVersions.searchDocument;
    const search = query.q?.trim();
    const conditions = [
      eq(papers.publicationStatus, 'published'),
      eq(papers.status, 'endorsed'),
      isNotNull(paperVersions.publishedAt),
      eq(programs.active, true),
      ...(query.program ? [eq(papers.programId, query.program)] : []),
      ...(query.year ? [eq(paperVersions.year, query.year)] : []),
      ...(query.researchType
        ? [eq(paperVersions.researchType, query.researchType)]
        : []),
      ...(search
        ? [
            sql`(${textVector} @@ websearch_to_tsquery('english', ${search}) OR ${textVector} @@ websearch_to_tsquery('simple', ${search}))`,
          ]
        : []),
    ];
    const where = and(...conditions);
    const [count] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(papers)
      .innerJoin(
        paperVersions,
        and(
          eq(paperVersions.id, papers.currentVersionId),
          eq(paperVersions.paperId, papers.id),
        ),
      )
      .innerJoin(programs, eq(programs.id, papers.programId))
      .where(where);
    const ids = await this.db
      .select({ publicId: papers.publicId })
      .from(papers)
      .innerJoin(
        paperVersions,
        and(
          eq(paperVersions.id, papers.currentVersionId),
          eq(paperVersions.paperId, papers.id),
        ),
      )
      .innerJoin(programs, eq(programs.id, papers.programId))
      .where(where)
      .orderBy(
        ...(search && (query.sort ?? 'relevance') === 'relevance'
          ? [
              desc(
                sql`greatest(ts_rank(${textVector}, websearch_to_tsquery('english', ${search})), ts_rank(${textVector}, websearch_to_tsquery('simple', ${search})))`,
              ),
            ]
          : query.sort === 'title'
            ? [asc(paperVersions.title)]
            : [desc(paperVersions.publishedAt)]),
        asc(papers.id),
      )
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize);
    const programsList = await this.db
      .selectDistinct({ id: programs.id, name: programs.name })
      .from(papers)
      .innerJoin(
        paperVersions,
        and(
          eq(paperVersions.id, papers.currentVersionId),
          eq(paperVersions.paperId, papers.id),
        ),
      )
      .innerJoin(programs, eq(programs.id, papers.programId))
      .where(
        and(
          eq(papers.publicationStatus, 'published'),
          eq(papers.status, 'endorsed'),
          eq(programs.active, true),
          isNotNull(paperVersions.publishedAt),
        ),
      )
      .orderBy(asc(programs.name));
    const years = await this.db
      .selectDistinct({ year: paperVersions.year })
      .from(papers)
      .innerJoin(
        paperVersions,
        and(
          eq(paperVersions.id, papers.currentVersionId),
          eq(paperVersions.paperId, papers.id),
        ),
      )
      .innerJoin(programs, eq(programs.id, papers.programId))
      .where(
        and(
          eq(papers.publicationStatus, 'published'),
          eq(papers.status, 'endorsed'),
          eq(programs.active, true),
          isNotNull(paperVersions.publishedAt),
        ),
      )
      .orderBy(desc(paperVersions.year));
    const items = await Promise.all(
      ids.map(({ publicId }) => this.getPublic(publicId)),
    );
    return {
      items: items.filter((paper) => !paper.withdrawn),
      total: count.total,
      page: query.page,
      pageSize: query.pageSize,
      programs: programsList,
      years: years.map(({ year }) => year),
    };
  }

  decide(
    identity: Actor,
    publicId: string,
    decision: 'endorse' | 'revision_request' | 'reject',
    reason?: string,
  ): Promise<Paper> {
    if (identity.kind !== 'active') throw new NotFoundException();
    const coordinator = identity.account.role === 'COORDINATOR';
    if (!coordinator && identity.account.role !== 'INSTRUCTOR')
      throw new PaperDecisionForbiddenError();
    if (decision !== 'endorse' && !reason?.trim())
      throw new SubmissionIncompleteError('Reason');
    return this.db.transaction(async (tx) => {
      const [paper] = await tx
        .select()
        .from(papers)
        .where(eq(papers.publicId, publicId))
        .for('update');
      if (!paper) throw new NotFoundException();
      if (decision === 'endorse' && paper.adviserId !== identity.account.id)
        throw new PaperDecisionForbiddenError();
      if (
        decision !== 'endorse' &&
        !coordinator &&
        paper.adviserId !== identity.account.id
      )
        throw new PaperDecisionForbiddenError();
      const allowedStatuses =
        coordinator && decision !== 'endorse'
          ? ['submitted', 'endorsed']
          : ['submitted'];
      if (!allowedStatuses.includes(paper.status))
        throw new InvalidPaperTransitionError();
      let status: 'endorsed' | 'revision_requested' | 'rejected';
      if (decision === 'endorse') status = 'endorsed';
      else if (decision === 'revision_request') status = 'revision_requested';
      else status = 'rejected';
      await tx.update(papers).set({ status }).where(eq(papers.id, paper.id));
      await tx.insert(paperDecisions).values({
        paperId: paper.id,
        actorId: identity.account.id,
        decision: decision.toUpperCase(),
        reason: reason?.trim() ?? null,
      });
      await tx.insert(auditEvents).values({
        actorAccountId: identity.account.id,
        action: `PAPER_${decision.toUpperCase()}`,
        subjectType: 'PAPER',
        subjectId: paper.id,
        details: { reason: reason?.trim() ?? null },
      });
      const [version] = paper.currentVersionId
        ? await tx
            .select({ title: paperVersions.title })
            .from(paperVersions)
            .where(eq(paperVersions.id, paper.currentVersionId))
        : [];
      if (decision === 'endorse') {
        const coordinators = await tx
          .select({ email: accounts.email, name: accounts.name })
          .from(accounts)
          .where(
            and(
              eq(accounts.role, 'COORDINATOR'),
              eq(accounts.status, 'ACTIVE'),
            ),
          );
        if (version && coordinators.length)
          await tx.insert(emailJobs).values(
            coordinators.map((coordinator) => ({
              event: 'endorsement',
              recipientEmail: coordinator.email,
              recipientName: coordinator.name,
              paperPublicId: paper.publicId,
              paperTitle: version.title,
            })),
          );
      } else {
        const [owner] = await tx
          .select({ email: accounts.email, name: accounts.name })
          .from(accounts)
          .where(eq(accounts.id, paper.ownerId));
        if (owner && version)
          await tx.insert(emailJobs).values({
            event:
              decision === 'revision_request'
                ? 'revision_request'
                : 'rejection',
            recipientEmail: owner.email,
            recipientName: owner.name,
            paperPublicId: paper.publicId,
            paperTitle: version.title,
            details: { reason: reason?.trim() ?? '' },
          });
      }
      return this.getForOwner(tx, publicId, paper.ownerId);
    });
  }

  changeAdviser(
    identity: Actor,
    publicId: string,
    adviserId: string,
  ): Promise<Paper> {
    if (identity.kind !== 'active') throw new NotFoundException();
    return this.db.transaction(async (tx) => {
      const [paper] = await tx
        .select()
        .from(papers)
        .where(eq(papers.publicId, publicId))
        .for('update');
      if (!paper) throw new NotFoundException();
      const coordinator = identity.account.role === 'COORDINATOR';
      if (
        !coordinator &&
        (identity.account.role !== 'STUDENT' ||
          identity.account.id !== paper.ownerId ||
          !['draft', 'revision_requested'].includes(paper.status))
      )
        throw new InvalidPaperTransitionError();
      await this.validateAdviser(adviserId);
      const status = paper.status === 'endorsed' ? 'submitted' : paper.status;
      await tx
        .update(papers)
        .set({ adviserId, status })
        .where(eq(papers.id, paper.id));
      await tx.insert(paperDecisions).values({
        paperId: paper.id,
        actorId: identity.account.id,
        decision: 'ADVISER_CHANGED',
        reason: `${paper.adviserId} -> ${adviserId}`,
      });
      await tx.insert(auditEvents).values({
        actorAccountId: identity.account.id,
        action: 'PAPER_ADVISER_CHANGED',
        subjectType: 'PAPER',
        subjectId: paper.id,
        details: { previousAdviserId: paper.adviserId, adviserId, status },
      });
      return this.getForOwner(tx, publicId, paper.ownerId);
    });
  }

  private requireStudent(identity: Actor): string {
    if (identity.kind !== 'active' || identity.account.role !== 'STUDENT')
      throw new NotFoundException();
    return identity.account.id;
  }

  private async validateAdviser(id: string) {
    const [profile] = await this.db
      .select({ id: accounts.id })
      .from(accounts)
      .where(
        and(
          eq(accounts.id, id),
          eq(accounts.status, 'ACTIVE'),
          inArray(accounts.role, ['INSTRUCTOR', 'COORDINATOR']),
        ),
      );
    if (!profile) throw new InvalidAdviserError();
  }

  private async getForOwner(
    db: Database,
    publicId: string,
    ownerId: string,
  ): Promise<Paper> {
    const [row] = await db
      .select({ paper: papers, version: paperVersions })
      .from(papers)
      .innerJoin(paperVersions, eq(papers.currentVersionId, paperVersions.id))
      .where(and(eq(papers.publicId, publicId), eq(papers.ownerId, ownerId)));
    if (!row) throw new NotFoundException();
    const history = await db
      .select({
        decision: paperDecisions.decision,
        reason: paperDecisions.reason,
        createdAt: paperDecisions.createdAt,
      })
      .from(paperDecisions)
      .where(eq(paperDecisions.paperId, row.paper.id))
      .orderBy(asc(paperDecisions.createdAt));
    return {
      ...row.version,
      id: row.paper.id,
      versionId: row.version.id,
      publicId: row.paper.publicId,
      ownerId: row.paper.ownerId,
      adviserId: row.paper.adviserId,
      legacyDeposit: row.paper.legacyDeposit,
      programId: row.paper.programId,
      status: row.paper.status,
      decisionHistory: history.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
      publicationStatus: row.paper.publicationStatus,
      authors: row.version.authors as Paper['authors'],
    };
  }
}
