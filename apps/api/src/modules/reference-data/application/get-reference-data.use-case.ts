import { Inject, Injectable } from '@nestjs/common';
import { LICENCES, RESEARCH_TYPES, type ReferenceData } from '@repo/contracts';
import type { Actor } from '../../../shared/domain/actor.js';
import { PROGRAM_READER, type ProgramReader } from './program-reader.js';

@Injectable()
export class GetReferenceDataUseCase {
  constructor(
    @Inject(PROGRAM_READER) private readonly programs: ProgramReader,
  ) {}

  async execute(
    _input: Record<string, never>,
    _actor: Actor,
  ): Promise<ReferenceData> {
    return {
      programs: await this.programs.listActive(),
      researchTypes: [...RESEARCH_TYPES],
      licences: [...LICENCES],
    };
  }
}
