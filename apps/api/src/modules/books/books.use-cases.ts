import {
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import Busboy from 'busboy';
import { PDFDocument } from 'pdf-lib';
import { asc, eq } from 'drizzle-orm';
import { createHash, randomUUID } from 'node:crypto';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { Request, Response } from 'express';
import { bookUploadMetadataSchema, type BookDetails } from '@repo/contracts';
import { DATABASE } from '../../database/database.module.js';
import type { Database } from '../../database/database.js';
import { books } from '../../database/schema/index.js';
import type { Actor } from '../../shared/domain/actor.js';
import {
  PAPER_FILE_STORAGE,
  type PaperFileStorage,
} from '../paper-files/storage.js';
import {
  MALWARE_SCANNER,
  type MalwareScanner,
} from '../paper-files/malware-scanner.js';

const MAX_BYTES = 100 * 1024 * 1024;
const RATE_WINDOW_MS = 60_000;
const MAX_IP_COUNTERS = 10_000;
const counters = new Map<string, { start: number; count: number }>();
let rateLimitCalls = 0;

@Injectable()
export class BooksUseCases {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(PAPER_FILE_STORAGE) private readonly storage: PaperFileStorage,
    @Inject(MALWARE_SCANNER) private readonly scanner: MalwareScanner,
  ) {}

  async create(actor: Actor, req: Request) {
    if (actor.kind !== 'active' || actor.account.role !== 'COORDINATOR')
      throw new NotFoundException();
    const id = randomUUID();
    const publicId = randomUUID().replaceAll('-', '');
    const key = `books/${randomUUID()}`;
    let details: BookDetails | undefined;
    let filename = '';
    let bytes = 0;
    let digest = '';
    try {
      await new Promise<void>((resolve, reject) => {
        const parser = Busboy({
          headers: req.headers,
          limits: {
            files: 1,
            fileSize: MAX_BYTES,
            fields: 1,
            fieldSize: 16_384,
          },
        });
        let seenFile = false;
        let seenMetadata = false;
        let put: Promise<void> | undefined;
        let parserClosed = false;
        let objectSaved = false;
        const finish = () => {
          if (parserClosed && objectSaved) resolve();
        };
        parser.on('field', (name, value) => {
          if (name !== 'metadata' || seenMetadata)
            return reject(new UnsupportedMediaTypeException());
          seenMetadata = true;
          try {
            const parsed = bookUploadMetadataSchema.safeParse(
              JSON.parse(value),
            );
            if (!parsed.success)
              return reject(
                new HttpException(
                  {
                    message: 'Invalid Book details',
                    errors: parsed.error.flatten(),
                  },
                  400,
                ),
              );
            details = parsed.data;
          } catch {
            reject(new HttpException('Invalid Book details.', 400));
          }
        });
        parser.on('file', (field, stream, info) => {
          seenFile = true;
          if (field !== 'file') {
            stream.resume();
            return reject(new UnsupportedMediaTypeException());
          }
          filename =
            (info.filename ?? '').split(/[\\/]/).pop()?.slice(0, 255) ||
            'book.pdf';
          if (
            !filename.toLowerCase().endsWith('.pdf') ||
            info.mimeType.toLowerCase() !== 'application/pdf'
          ) {
            stream.resume();
            return reject(new UnsupportedMediaTypeException());
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
          void put.then(() => {
            objectSaved = true;
            finish();
          }, reject);
        });
        parser.on('filesLimit', () =>
          reject(new UnsupportedMediaTypeException()),
        );
        parser.on('error', reject);
        req.on('aborted', () => reject(new Error('Upload interrupted')));
        req.on('error', reject);
        parser.on('close', () => {
          if (!seenFile || !seenMetadata)
            reject(new UnsupportedMediaTypeException());
          else if (!put) reject(new UnsupportedMediaTypeException());
          else {
            parserClosed = true;
            finish();
          }
        });
        req.pipe(parser);
      });
      const chunks: Buffer[] = [];
      for await (const chunk of await this.storage.get(key))
        chunks.push(Buffer.from(chunk));
      const pdfBytes = Buffer.concat(chunks);
      let pdf: PDFDocument;
      try {
        pdf = await PDFDocument.load(pdfBytes, { updateMetadata: false });
      } catch (error) {
        throw new HttpException(
          /encrypt/i.test(String(error))
            ? 'Encrypted PDFs are not accepted.'
            : 'Invalid PDF.',
          415,
        );
      }
      const active = pdf.context
        .enumerateIndirectObjects()
        .some(([, object]) => {
          const value = object as unknown as {
            keys?: () => { toString(): string }[];
            dict?: { keys: () => { toString(): string }[]; toString(): string };
            toString(): string;
          };
          const dictionary = value.dict ?? value;
          const keys = dictionary.keys?.().map((name) => name.toString()) ?? [];
          return (
            keys.some((name) =>
              /^\/(?:JavaScript|JS|Launch|EmbeddedFiles|EmbeddedFile|OpenAction|AA|XFA|RichMedia)$/.test(
                name,
              ),
            ) || /\/(?:JavaScript|Launch)\b/.test(dictionary.toString())
          );
        });
      if (active)
        throw new HttpException('PDF active content is not accepted.', 415);
      if ((await this.scanner.scan(pdfBytes)) !== 'clean')
        throw new HttpException('PDF failed malware scanning.', 415);
      const [saved] = await this.db
        .insert(books)
        .values({
          id,
          publicId,
          ownerId: actor.account.id,
          ...details!,
          objectKey: key,
          filename,
          byteCount: bytes,
          sha256: digest,
        })
        .returning();
      return this.toPublic(saved);
    } catch (error) {
      await this.storage.delete(key).catch(() => undefined);
      throw error;
    }
  }

  async list(query: string) {
    const rows = await this.db.select().from(books).orderBy(asc(books.title));
    const needle = query.trim().toLocaleLowerCase();
    return rows
      .filter(
        (book) =>
          !needle ||
          `${book.title} ${(book.authors as string[]).join(' ')} ${book.keywords.join(' ')}`
            .toLocaleLowerCase()
            .includes(needle),
      )
      .map((row) => this.toPublic(row));
  }

  async get(publicId: string) {
    const [row] = await this.db
      .select()
      .from(books)
      .where(eq(books.publicId, publicId));
    if (!row) throw new NotFoundException();
    return this.toPublic(row);
  }

  async content(
    publicId: string,
    ip: string,
    download: boolean,
    req: Request,
    res: Response,
  ) {
    this.rateLimit(ip);
    const [book] = await this.db
      .select()
      .from(books)
      .where(eq(books.publicId, publicId));
    if (!book) throw new NotFoundException();
    const headers = {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="book.pdf"; filename*=UTF-8''${encodeURIComponent(book.filename)}`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Accept-Ranges': 'bytes',
    };
    const range = parseBookRange(req.headers.range, book.byteCount);
    res.set(headers);
    if (req.headers.range && !range)
      return res
        .status(416)
        .set('Content-Range', `bytes */${book.byteCount}`)
        .end();
    res
      .status(range ? 206 : 200)
      .set(
        'Content-Length',
        String(range ? range.end - range.start + 1 : book.byteCount),
      );
    if (range)
      res.set(
        'Content-Range',
        `bytes ${range.start}-${range.end}/${book.byteCount}`,
      );
    const stream = await this.storage.get(
      book.objectKey,
      range?.start,
      range?.end,
    );
    await pipeline(stream, res);
  }

  private rateLimit(ip: string) {
    // shortcut: process-local IP limit; use shared admission control when the API has multiple instances.
    const now = Date.now();
    if (++rateLimitCalls % 256 === 0) {
      for (const [address, counter] of counters)
        if (now - counter.start >= RATE_WINDOW_MS) counters.delete(address);
    }
    const entry = counters.get(ip);
    if (entry && now - entry.start < RATE_WINDOW_MS && entry.count >= 60)
      throw new HttpException('Too many Book reads.', 429);
    if (!entry || now - entry.start >= RATE_WINDOW_MS) {
      if (counters.size >= MAX_IP_COUNTERS) {
        for (const [address, counter] of counters)
          if (now - counter.start >= RATE_WINDOW_MS) counters.delete(address);
        if (counters.size >= MAX_IP_COUNTERS)
          throw new HttpException('Rate limit capacity reached.', 503);
      }
      counters.set(ip, { start: now, count: 1 });
    } else entry.count++;
  }

  private toPublic(row: typeof books.$inferSelect) {
    return {
      publicId: row.publicId,
      title: row.title,
      authors: row.authors as string[],
      year: row.year,
      licence: row.licence,
      sourceUrl: row.sourceUrl || undefined,
      publisher: row.publisher || undefined,
      edition: row.edition || undefined,
      isbn: row.isbn || undefined,
      description: row.description || undefined,
      keywords: row.keywords,
    };
  }
}

export function parseBookRange(value: string | undefined, total: number) {
  if (!value) return undefined;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match || value.includes(',')) return null;
  if (!match[1] && !match[2]) return null;
  if (!match[1]) {
    const suffix = Number(match[2]);
    return suffix > 0
      ? { start: Math.max(0, total - suffix), end: total - 1 }
      : null;
  }
  const start = Number(match[1]);
  const end = match[2] ? Math.min(Number(match[2]), total - 1) : total - 1;
  return Number.isSafeInteger(start) &&
    start >= 0 &&
    start < total &&
    end >= start
    ? { start, end }
    : null;
}
