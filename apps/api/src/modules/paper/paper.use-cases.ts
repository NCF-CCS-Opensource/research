import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Paper, PaperDetails } from '@repo/contracts';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { DomainError } from '../../shared/domain/domain-error.js';
import type { Actor } from '../../shared/domain/actor.js';
import { DATABASE } from '../../database/database.module.js';
import type { Database } from '../../database/database.js';
import {
  accounts,
  paperVersions,
  papers,
  programs,
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
    await this.validateAdviser(input.adviserId);
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
        adviserId: input.adviserId,
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
    if (paper.status !== 'draft') throw new PaperNotEditableError();
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
    return {
      ...row.version,
      id: row.paper.id,
      versionId: row.version.id,
      publicId: row.paper.publicId,
      ownerId: row.paper.ownerId,
      adviserId: row.paper.adviserId,
      programId: row.paper.programId,
      status: row.paper.status,
      publicationStatus: row.paper.publicationStatus,
      authors: row.version.authors as Paper['authors'],
    };
  }
}
