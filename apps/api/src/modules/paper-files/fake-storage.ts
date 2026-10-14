import { Injectable, Logger } from '@nestjs/common';
import { Readable } from 'node:stream';
import type { PaperFileStorage } from './storage.js';

/** FAKE paper file storage for local development and tests only. */
@Injectable()
export class FakePaperFileStorage implements PaperFileStorage {
  private readonly logger = new Logger(FakePaperFileStorage.name);
  private readonly objects = new Map<string, Buffer>();
  async put(key: string, body: Readable) {
    const chunks: Buffer[] = [];
    for await (const chunk of body) chunks.push(Buffer.from(chunk));
    this.objects.set(key, Buffer.concat(chunks));
    this.logger.warn(
      'FAKE storage adapter is active; files are held in process memory.',
    );
  }
  async get(key: string, start?: number, end?: number) {
    const value = this.objects.get(key);
    if (!value) throw new Error('Stored PDF not found');
    return Readable.from(
      start === undefined
        ? value
        : value.subarray(start, (end ?? value.length - 1) + 1),
    );
  }
  async delete(key: string) {
    this.objects.delete(key);
  }
}
