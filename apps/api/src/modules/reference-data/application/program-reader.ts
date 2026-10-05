import type { Program } from '../domain/program.js';

export const PROGRAM_READER = Symbol('PROGRAM_READER');

export interface ProgramReader {
  listActive(): Promise<Program[]>;
}
