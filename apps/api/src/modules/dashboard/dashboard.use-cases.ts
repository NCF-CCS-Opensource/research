import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { DATABASE } from '../../database/database.module.js';
import type { Database } from '../../database/database.js';
import {
  accessGrants,
  accessRequests,
  accounts,
  books,
  emailJobs,
  paperVersions,
  papers,
} from '../../database/schema/index.js';
import type { Actor } from '../../shared/domain/actor.js';

@Injectable()
export class DashboardUseCases {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async get(actor: Actor) {
    if (actor.kind !== 'active') throw new NotFoundException();
    const { id, role } = actor.account;
    const now = new Date();
    if (role === 'STUDENT') {
      const [ownedPapers, ownedBooks, requests, grants] = await Promise.all([
        this.db
          .select({
            publicId: papers.publicId,
            title: paperVersions.title,
            status: papers.status,
            publicationStatus: papers.publicationStatus,
          })
          .from(papers)
          .innerJoin(
            paperVersions,
            eq(paperVersions.id, papers.currentVersionId),
          )
          .where(eq(papers.ownerId, id)),
        this.db
          .select({
            publicId: books.publicId,
            title: books.title,
            status: books.status,
          })
          .from(books)
          .where(eq(books.ownerId, id)),
        this.db
          .select({
            id: accessRequests.id,
            publicId: papers.publicId,
            paperTitle: paperVersions.title,
            status: accessRequests.status,
            createdAt: accessRequests.createdAt,
          })
          .from(accessRequests)
          .innerJoin(papers, eq(papers.id, accessRequests.paperId))
          .innerJoin(
            paperVersions,
            eq(paperVersions.id, papers.currentVersionId),
          )
          .where(eq(accessRequests.accountId, id)),
        this.db
          .select({
            id: accessGrants.id,
            publicId: papers.publicId,
            paperTitle: paperVersions.title,
            expiresAt: accessGrants.expiresAt,
          })
          .from(accessGrants)
          .innerJoin(papers, eq(papers.id, accessGrants.paperId))
          .innerJoin(
            paperVersions,
            eq(paperVersions.id, accessGrants.versionId),
          )
          .where(
            and(
              eq(accessGrants.accountId, id),
              eq(accessGrants.versionId, papers.currentVersionId),
              isNull(accessGrants.revokedAt),
              gt(accessGrants.expiresAt, now),
            ),
          ),
      ]);
      return {
        role,
        papers: ownedPapers,
        books: ownedBooks,
        requests: requests.map((row) => ({
          ...row,
          createdAt: row.createdAt.toISOString(),
        })),
        grants: grants.map((row) => ({
          ...row,
          expiresAt: row.expiresAt.toISOString(),
        })),
      };
    }
    if (role === 'INSTRUCTOR') {
      const [advisedPapers, requests, grants] = await Promise.all([
        this.db
          .select({
            publicId: papers.publicId,
            title: paperVersions.title,
            status: papers.status,
            publicationStatus: papers.publicationStatus,
          })
          .from(papers)
          .innerJoin(
            paperVersions,
            eq(paperVersions.id, papers.currentVersionId),
          )
          .where(and(eq(papers.adviserId, id), eq(papers.status, 'submitted'))),
        this.db
          .select({
            id: accessRequests.id,
            publicId: papers.publicId,
            paperTitle: paperVersions.title,
            status: accessRequests.status,
            createdAt: accessRequests.createdAt,
            requesterName: accounts.name,
          })
          .from(accessRequests)
          .innerJoin(papers, eq(papers.id, accessRequests.paperId))
          .innerJoin(
            paperVersions,
            eq(paperVersions.id, papers.currentVersionId),
          )
          .innerJoin(accounts, eq(accounts.id, accessRequests.accountId))
          .where(eq(papers.adviserId, id)),
        this.db
          .select({
            id: accessGrants.id,
            publicId: papers.publicId,
            paperTitle: paperVersions.title,
            expiresAt: accessGrants.expiresAt,
            accountName: accounts.name,
          })
          .from(accessGrants)
          .innerJoin(papers, eq(papers.id, accessGrants.paperId))
          .innerJoin(
            paperVersions,
            eq(paperVersions.id, accessGrants.versionId),
          )
          .innerJoin(accounts, eq(accounts.id, accessGrants.accountId))
          .where(
            and(
              eq(papers.adviserId, id),
              eq(accessGrants.versionId, papers.currentVersionId),
              isNull(accessGrants.revokedAt),
              gt(accessGrants.expiresAt, now),
            ),
          ),
      ]);
      return {
        role,
        papers: advisedPapers,
        requests: requests.map((row) => ({
          ...row,
          createdAt: row.createdAt.toISOString(),
        })),
        grants: grants.map((row) => ({
          ...row,
          expiresAt: row.expiresAt.toISOString(),
        })),
      };
    }
    if (role !== 'COORDINATOR') throw new ForbiddenException();
    const [publicationQueue, bookQueue, requests, failedEmails] =
      await Promise.all([
        this.db
          .select({
            publicId: papers.publicId,
            title: paperVersions.title,
            status: papers.status,
            publicationStatus: papers.publicationStatus,
          })
          .from(papers)
          .innerJoin(
            paperVersions,
            eq(paperVersions.id, papers.currentVersionId),
          )
          .where(
            and(
              eq(papers.status, 'endorsed'),
              eq(papers.publicationStatus, 'unpublished'),
            ),
          ),
        this.db
          .select({
            publicId: books.publicId,
            title: books.title,
            status: books.status,
          })
          .from(books)
          .where(eq(books.status, 'submitted')),
        this.db
          .select({
            id: accessRequests.id,
            publicId: papers.publicId,
            paperTitle: paperVersions.title,
            status: accessRequests.status,
            createdAt: accessRequests.createdAt,
          })
          .from(accessRequests)
          .innerJoin(papers, eq(papers.id, accessRequests.paperId))
          .innerJoin(
            paperVersions,
            eq(paperVersions.id, papers.currentVersionId),
          )
          .where(eq(accessRequests.status, 'pending')),
        this.db
          .select({
            id: emailJobs.id,
            event: emailJobs.event,
            recipientName: emailJobs.recipientName,
            paperPublicId: emailJobs.paperPublicId,
            bookPublicId: emailJobs.bookPublicId,
            paperTitle: emailJobs.paperTitle,
            createdAt: emailJobs.createdAt,
          })
          .from(emailJobs)
          .where(eq(emailJobs.status, 'failed')),
      ]);
    return {
      role,
      papers: publicationQueue,
      books: bookQueue,
      requests: requests.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
        ageDays: Math.floor(
          (now.getTime() - row.createdAt.getTime()) / 86_400_000,
        ),
      })),
      failedEmails: failedEmails.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }
}
