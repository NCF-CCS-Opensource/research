import { Injectable } from '@nestjs/common';
import type { CurrentIdentity } from '@repo/contracts';
import type { Actor } from '../../../shared/domain/actor.js';
import { toDetails } from '../domain/account.js';

@Injectable()
export class GetCurrentAccountUseCase {
  execute(_input: Record<string, never>, actor: Actor): CurrentIdentity {
    switch (actor.kind) {
      case 'guest':
        return { state: 'guest' };
      case 'registering':
        return { state: 'registering', email: actor.email };
      case 'deactivated':
        return { state: 'deactivated' };
      case 'active':
        return { state: 'active', account: toDetails(actor.account) };
    }
  }
}
