import type { Readable } from 'node:stream';
export const PAPER_FILE_STORAGE = Symbol('PAPER_FILE_STORAGE');
export interface PaperFileStorage {
  put(key: string, body: Readable): Promise<void>;
  get(key: string, start?: number, end?: number): Promise<Readable>;
  delete(key: string): Promise<void>;
}
