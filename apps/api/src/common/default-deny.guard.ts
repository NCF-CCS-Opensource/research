import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DomainError } from '../shared/domain/domain-error.js';
import { IS_PUBLIC } from './public.decorator.js';

@Injectable()
export class DefaultDenyGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    throw new DomainError(
      'UNAUTHENTICATED',
      'Sign in to continue.',
      'unauthenticated',
    );
  }
}
