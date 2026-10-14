import { Injectable } from '@nestjs/common';
import type { Actor } from '../../../shared/domain/actor.js';

@Injectable()
export class GetLivenessUseCase {
  async execute(_input: Record<string, never>, _actor: Actor) {
    return { status: 'ok' as const };
  }
}
