import {
  HttpException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  UnsupportedMediaTypeException,
  PayloadTooLargeException,
} from '@nestjs/common';
import Busboy from 'busboy';
import { PDFDocument } from 'pdf-lib';
import { and, eq, gt, sql } from 'drizzle-orm';
import { createHash, randomUUID } from 'node:crypto';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { Request } from 'express';
import type { Response } from 'express';
import type { Actor } from '../../shared/domain/actor.js';
import { DATABASE } from '../../database/database.module.js';
import type { Database } from '../../database/database.js';
import {
  auditEvents,
  paperFileJobs,
  paperFiles,
  paperFileUploadAttempts,
  paperVersions,
  papers,
} from '../../database/schema/index.js';
import { PAPER_FILE_STORAGE, type PaperFileStorage } from './storage.js';
import { MALWARE_SCANNER, type MalwareScanner } from './malware-scanner.js';

const MAX_BYTES = 25 * 1024 * 1024;
const MAX_ATTEMPTS = 5;
const now = () => new Date();
const MAX_CONTENT_STREAMS = 8;

class InvalidByteRange extends Error {}

@Injectable()
export class PaperFileUseCases implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaperFileUseCases.name);
  private worker?: NodeJS.Timeout;
  private ticks = 0;
  private contentStreams = 0;
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(PAPER_FILE_STORAGE) private readonly storage: PaperFileStorage,
    @Inject(MALWARE_SCANNER) private readonly scanner: MalwareScanner,
  ) {}

  onModuleInit() {
    this.worker = setInterval(
      () =>
        void this.tick().catch((e: unknown) => this.logger.error(String(e))),
      1500,
    );
  }
  onModuleDestroy() {
    if (this.worker) clearInterval(this.worker);
  }

  async upload(actor: Actor, publicId: string, req: Request) {
    if (actor.kind !== 'active') throw new NotFoundException();
    const ownerId = actor.account.id;
    const [paper] = await this.db
      .select({
        id: papers.id,
        ownerId: papers.ownerId,
        versionId: papers.currentVersionId,
        status: papers.status,
        legacyDeposit: papers.legacyDeposit,
      })
      .from(papers)
      .where(eq(papers.publicId, publicId));
    if (
      !paper ||
      (paper.ownerId !== ownerId &&
        !(actor.account.role === 'COORDINATOR' && paper.legacyDeposit)) ||
      !['draft', 'revision_requested'].includes(paper.status) ||
      !paper.versionId
    )
      throw new NotFoundException();
    await this.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${ownerId}))`);
      const recent = await tx
        .select({ id: paperFileUploadAttempts.id })
        .from(paperFileUploadAttempts)
        .where(
          and(
            eq(paperFileUploadAttempts.ownerId, ownerId),
            gt(
              paperFileUploadAttempts.createdAt,
              new Date(Date.now() - 60 * 60 * 1000),
            ),
          ),
        );
      if (recent.length >= 10)
        throw new HttpException('Upload limit reached.', 429);
      await tx.insert(paperFileUploadAttempts).values({ ownerId });
    });

    const id = randomUUID();
    const key = `papers/${randomUUID()}`;
    let filename = '';
    let bytes = 0;
    let digest = '';
    try {
      await new Promise<void>((resolve, reject) => {
        const parser = Busboy({
          headers: req.headers,
          limits: { files: 1, fileSize: MAX_BYTES, fields: 0 },
        });
        let received = false;
        let put: Promise<void> | undefined;
        parser.on('file', (_field, stream, info) => {
          received = true;
          filename =
            (info.filename ?? '').split(/[\\/]/).pop()?.slice(0, 255) ||
            'paper.pdf';
          if (
            !filename.toLowerCase().endsWith('.pdf') ||
            info.mimeType.toLowerCase() !== 'application/pdf'
          ) {
            stream.resume();
            reject(new UnsupportedMediaTypeException());
            return;
          }
          let prefix = Buffer.alloc(0);
          const hash = createHash('sha256');
          const meter = new Transform({
            transform(chunk: Buffer, _encoding, callback) {
              bytes += chunk.length;
              if (bytes > MAX_BYTES)
                return callback(new PayloadTooLargeException());
              if (prefix.length < 5)
                prefix = Buffer.concat([prefix, chunk]).subarray(0, 5);
              hash.update(chunk);
              callback(null, chunk);
            },
          });
          stream.on('limit', () =>
            meter.destroy(new PayloadTooLargeException()),
          );
          stream.on('error', (error) => meter.destroy(error));
          put = this.storage.put(key, stream.pipe(meter)).then(() => {
            if (!prefix.equals(Buffer.from('%PDF-')))
              throw new UnsupportedMediaTypeException();
            digest = hash.digest('hex');
          });
          void put.then(resolve, reject);
        });
        parser.on('filesLimit', () =>
          reject(new UnsupportedMediaTypeException()),
        );
        parser.on('error', reject);
        req.on('aborted', () => reject(new Error('Upload interrupted')));
        req.on('error', reject);
        parser.on('close', () => {
          if (!received) reject(new UnsupportedMediaTypeException());
        });
        req.pipe(parser);
      });
      const [saved] = await this.db.transaction(async (tx) => {
        const [locked] = await tx
          .select({
            id: papers.id,
            versionId: papers.currentVersionId,
            status: papers.status,
          })
          .from(papers)
          .where(
            and(eq(papers.id, paper.id), eq(papers.ownerId, paper.ownerId)),
          )
          .for('update');
        if (
          !locked ||
          !['draft', 'revision_requested'].includes(locked.status) ||
          locked.versionId !== paper.versionId
        )
          throw new NotFoundException();
        const [file] = await tx
          .insert(paperFiles)
          .values({
            id,
            paperId: paper.id,
            versionId: paper.versionId!,
            ownerId,
            objectKey: key,
            filename,
            byteCount: bytes,
            sha256: digest,
          })
          .returning();
        await tx.insert(paperFileJobs).values({ fileId: id });
        await tx.insert(auditEvents).values({
          actorAccountId: ownerId,
          action: 'PAPER_FILE_UPLOADED',
          subjectType: 'PAPER_FILE',
          subjectId: id,
          details: { status: 'PENDING', sha256: digest, byteCount: bytes },
        });
        await tx
          .update(paperVersions)
          .set({ pdfFileId: id })
          .where(eq(paperVersions.id, paper.versionId!));
        return [file];
      });
      return { fileId: saved.id, status: saved.status };
    } catch (error) {
      await this.storage.delete(key).catch(() => undefined);
      throw error;
    }
  }

  async status(actor: Actor, fileId: string) {
    if (actor.kind !== 'active') throw new NotFoundException();
    const [file] = await this.db
      .select({
        id: paperFiles.id,
        status: paperFiles.status,
        reason: paperFiles.reason,
        ownerId: paperFiles.ownerId,
        legacyDeposit: papers.legacyDeposit,
      })
      .from(paperFiles)
      .innerJoin(papers, eq(paperFiles.paperId, papers.id))
      .where(eq(paperFiles.id, fileId));
    if (
      !file ||
      (file.ownerId !== actor.account.id &&
        !(actor.account.role === 'COORDINATOR' && file.legacyDeposit))
    )
      throw new NotFoundException();
    return { id: file.id, status: file.status, reason: file.reason };
  }

  async streamContent(
    actor: Actor,
    publicId: string,
    req: Request,
    res: Response,
  ) {
    if (actor.kind !== 'active') throw new NotFoundException();
    const [row] = await this.db
      .select({
        paperId: papers.id,
        ownerId: papers.ownerId,
        adviserId: papers.adviserId,
        publicationStatus: papers.publicationStatus,
        objectKey: paperFiles.objectKey,
        filename: paperFiles.filename,
        byteCount: paperFiles.byteCount,
        sha256: paperFiles.sha256,
        fileId: paperFiles.id,
      })
      .from(papers)
      .innerJoin(paperVersions, eq(paperVersions.id, papers.currentVersionId))
      .innerJoin(paperFiles, eq(paperFiles.id, paperVersions.pdfFileId))
      .where(
        and(eq(papers.publicId, publicId), eq(paperFiles.status, 'CLEAN')),
      );
    if (
      !row ||
      (actor.account.id !== row.ownerId &&
        actor.account.id !== row.adviserId &&
        actor.account.role !== 'COORDINATOR')
    )
      throw new NotFoundException();

    const basis =
      actor.account.role === 'COORDINATOR'
        ? 'COORDINATOR'
        : actor.account.id === row.ownerId
          ? 'OWNER'
          : 'ADVISER';
    const etag = `"${row.sha256}"`;
    const headers = {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="paper.pdf"; filename*=UTF-8''${encodeURIComponent(row.filename)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
      'Accept-Ranges': 'bytes',
      ETag: etag,
    };
    const rawRange = req.headers.range;
    let range: { start: number; end: number } | undefined;
    try {
      range = rawRange ? parseByteRange(rawRange, row.byteCount) : undefined;
    } catch (error) {
      if (!(error instanceof InvalidByteRange)) throw error;
      return res
        .status(416)
        .set({
          ...headers,
          'Content-Range': `bytes */${row.byteCount}`,
        })
        .end();
    }
    if (
      range &&
      req.headers['if-range'] &&
      req.headers['if-range'] !== `"${row.sha256}"`
    )
      range = undefined;

    await this.db.insert(auditEvents).values({
      actorAccountId: actor.account.id,
      action: 'PAPER_CONTENT_OPENED',
      subjectType: 'PAPER',
      subjectId: row.paperId,
      details: { basis, fileId: row.fileId },
    });
    res.set(headers);
    const ifMatch = req.headers['if-match'];
    if (ifMatch && ifMatch !== '*' && !ifMatch.split(',').includes(etag))
      return res.status(412).end();
    const ifNoneMatch = req.headers['if-none-match'];
    if (
      ifNoneMatch &&
      (ifNoneMatch === '*' ||
        ifNoneMatch
          .split(',')
          .some((candidate) => candidate.trim().replace(/^W\//, '') === etag))
    )
      return res.status(304).end();
    if (this.contentStreams >= MAX_CONTENT_STREAMS)
      return res.status(503).end();

    // shortcut: per-process stream cap, move to shared admission control if the API runs multiple instances.
    this.contentStreams++;
    res.status(range ? 206 : 200);
    res.set(
      'Content-Length',
      String(range ? range.end - range.start + 1 : row.byteCount),
    );
    if (range)
      res.set(
        'Content-Range',
        `bytes ${range.start}-${range.end}/${row.byteCount}`,
      );
    let cancel: (() => void) | undefined;
    try {
      const stream = await this.storage.get(
        row.objectKey,
        range?.start,
        range?.end,
      );
      cancel = () => {
        if (!res.writableEnded) stream.destroy();
      };
      res.once('close', cancel);
      await pipeline(stream, res);
    } catch (error) {
      if (!res.destroyed) throw error;
    } finally {
      if (cancel) res.off('close', cancel);
      this.contentStreams--;
    }
  }

  private owner(actor: Actor) {
    if (actor.kind !== 'active' || actor.account.role !== 'STUDENT')
      throw new NotFoundException();
    return actor.account.id;
  }

  private async tick() {
    await this.runOne();
    if (++this.ticks % 20 === 0) {
      await this.db
        .delete(paperFileUploadAttempts)
        .where(
          sql`${paperFileUploadAttempts.createdAt} < ${new Date(Date.now() - 24 * 60 * 60 * 1000)}`,
        );
      const orphaned = await this.db
        .execute(sql`SELECT f.id, f.object_key AS "objectKey" FROM paper_files f
        LEFT JOIN paper_versions v ON v.pdf_file_id = f.id WHERE v.id IS NULL LIMIT 50`);
      for (const row of orphaned as unknown as {
        id: string;
        objectKey: string;
      }[]) {
        try {
          await this.storage.delete(row.objectKey);
        } catch (error) {
          this.logger.warn(
            `Could not remove orphaned object: ${String(error)}`,
          );
          continue;
        }
        await this.db.delete(paperFiles).where(eq(paperFiles.id, row.id));
      }
    }
  }

  private async runOne() {
    const job = await this.db.transaction(async (tx) => {
      const [row] =
        await tx.execute(sql`UPDATE paper_file_jobs SET lease_until = ${new Date(Date.now() + 60_000)}, attempts = attempts + 1
        WHERE id = (SELECT id FROM paper_file_jobs WHERE available_at <= ${now()} AND (lease_until IS NULL OR lease_until < ${now()}) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1)
        RETURNING id, file_id AS "fileId", attempts`);
      return row as
        { id: string; fileId: string; attempts: number } | undefined;
    });
    if (!job) return;
    const [file] = await this.db
      .select()
      .from(paperFiles)
      .where(eq(paperFiles.id, job.fileId));
    if (!file) {
      await this.db.delete(paperFileJobs).where(eq(paperFileJobs.id, job.id));
      return;
    }
    if (!file.versionId) {
      await this.storage.delete(file.objectKey);
      await this.db.delete(paperFiles).where(eq(paperFiles.id, file.id));
      return;
    }
    const [current] = await this.db
      .select({ fileId: paperVersions.pdfFileId })
      .from(paperVersions)
      .where(eq(paperVersions.id, file.versionId));
    if (!current || current.fileId !== file.id) {
      await this.storage.delete(file.objectKey);
      await this.db.delete(paperFiles).where(eq(paperFiles.id, file.id));
      return;
    }
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of await this.storage.get(file.objectKey))
        chunks.push(Buffer.from(chunk));
      const bytes = Buffer.concat(chunks);
      let pdf: PDFDocument;
      try {
        pdf = await PDFDocument.load(bytes, { updateMetadata: false });
      } catch (error) {
        const reason = /encrypt/i.test(String(error))
          ? 'ENCRYPTED_PDF'
          : 'CORRUPT_PDF';
        return await this.finish(file, job.id, 'REJECTED', reason);
      }
      const hasActiveContent = pdf.context
        .enumerateIndirectObjects()
        .some(([, object]) => {
          const value = object as unknown as {
            keys?: () => { toString(): string }[];
            dict?: { keys: () => { toString(): string }[]; toString(): string };
            toString(): string;
          };
          const dictionary = value.dict ?? value;
          const entries =
            dictionary.keys?.().map((name) => name.toString()) ?? [];
          return (
            entries.some((name) =>
              /^\/(?:JavaScript|JS|Launch|EmbeddedFiles|EmbeddedFile|OpenAction|AA|XFA|RichMedia)$/.test(
                name,
              ),
            ) || /\/(?:JavaScript|Launch)\b/.test(dictionary.toString())
          );
        });
      if (hasActiveContent)
        return await this.finish(file, job.id, 'REJECTED', 'ACTIVE_CONTENT');
      if ((await this.scanner.scan(bytes)) === 'infected')
        return await this.finish(file, job.id, 'REJECTED', 'MALWARE');
      await this.finish(file, job.id, 'CLEAN', null);
    } catch (error) {
      if (job.attempts >= MAX_ATTEMPTS)
        await this.finish(file, job.id, 'FAILED', null);
      else
        await this.db
          .update(paperFileJobs)
          .set({
            availableAt: new Date(
              Date.now() + Math.min(job.attempts * 30_000, 300_000),
            ),
            leaseUntil: null,
          })
          .where(eq(paperFileJobs.id, job.id));
      this.logger.warn(
        `PDF validation job ${job.id} will retry: ${String(error)}`,
      );
    }
  }

  private async finish(
    file: typeof paperFiles.$inferSelect,
    jobId: string,
    status: 'CLEAN' | 'REJECTED' | 'FAILED',
    reason: string | null,
  ) {
    if (!file.versionId) return;
    await this.db.transaction(async (tx) => {
      await tx
        .update(paperFiles)
        .set({ status, reason })
        .where(eq(paperFiles.id, file.id));
      await tx.delete(paperFileJobs).where(eq(paperFileJobs.id, jobId));
      await tx.insert(auditEvents).values({
        actorAccountId: file.ownerId,
        action: `PAPER_FILE_${status}`,
        subjectType: 'PAPER_FILE',
        subjectId: file.id,
        details: { status, reason },
      });
    });
  }
}

function parseByteRange(value: string, total: number) {
  const match = /^bytes=(\d*)-(\d*)$/i.exec(value);
  if (!match || value.includes(',')) throw new InvalidByteRange();
  const [, first, last] = match;
  if (!first && !last) throw new InvalidByteRange();
  if (total < 1) throw new InvalidByteRange();
  if (!first) {
    const suffixLength = Number(last);
    if (!suffixLength) throw new InvalidByteRange();
    return { start: Math.max(0, total - suffixLength), end: total - 1 };
  }
  const start = Number(first);
  const end = last ? Math.min(Number(last), total - 1) : total - 1;
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start >= total ||
    start > end
  )
    throw new InvalidByteRange();
  return { start, end };
}
