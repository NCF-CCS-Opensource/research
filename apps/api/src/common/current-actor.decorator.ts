import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { ActorRequest } from './auth.guard.js';

export const CurrentActor = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<ActorRequest>().actor,
);
