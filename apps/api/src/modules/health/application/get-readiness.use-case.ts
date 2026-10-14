import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/domain/domain-error.js';
import type { Actor } from '../../../shared/domain/actor.js';
import { DATABASE_PROBE, type DatabaseProbe } from './database-probe.js';

@Injectable()
export class GetReadinessUseCase {
  constructor(
    @Inject(DATABASE_PROBE) private readonly database: DatabaseProbe,
  ) {}

  async execute(_input: Record<string, never>, _actor: Actor) {
    try {
      await this.database.ping();
    } catch {
      throw new DomainError(
        'NOT_READY',
        'The service is not ready.',
        'unavailable',
      );
    }
    return { status: 'ok' as const };
  }
}
