import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IdentityResolver } from '../modules/accounts/application/identity-resolver.js';
import { GUEST, type Actor } from '../shared/domain/actor.js';
import { DomainError } from '../shared/domain/domain-error.js';
import { validateEnv } from '../config/env.js';
import {
  ACCESS,
  SESSION_COOKIE_ACCESS,
  type Access,
} from './public.decorator.js';

export type ActorRequest = Request & { actor: Actor };

const UNAUTHENTICATED = () =>
  new DomainError('UNAUTHENTICATED', 'Sign in to continue.', 'unauthenticated');

/** Resolves the identity on every request and denies by default. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(IdentityResolver) private readonly identities: IdentityResolver,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<ActorRequest>();
    const access = this.reflector.getAllAndOverride<Access | undefined>(
      ACCESS,
      [context.getHandler(), context.getClass()],
    );
    if (access === 'public') {
      req.actor = GUEST;
      return true;
    }

    const match = /^Bearer (.+)$/.exec(req.headers.authorization ?? '');
    const acceptsCookie = this.reflector.getAllAndOverride<boolean>(
      SESSION_COOKIE_ACCESS,
      [context.getHandler(), context.getClass()],
    );
    const token =
      match?.[1] ??
      (acceptsCookie &&
      req.method === 'GET' &&
      req.headers.origin === validateEnv().WEB_ORIGIN
        ? sessionCookie(req.headers.cookie)
        : undefined);
    const actor = (req.actor = await this.identities.resolve(token));
    if (access === 'any-identity') return true;

    switch (actor.kind) {
      case 'guest':
        throw UNAUTHENTICATED();
      case 'deactivated':
        throw new DomainError(
          'ACCOUNT_DEACTIVATED',
          'Your account is deactivated. Contact a Coordinator.',
          'forbidden',
        );
      case 'registering':
        if (access === 'registration') return true;
        throw new DomainError(
          'REGISTRATION_REQUIRED',
          'Complete registration to continue.',
          'forbidden',
        );
      case 'active':
        if (access !== 'registration') return true;
        throw new DomainError(
          'ALREADY_REGISTERED',
          'You are already registered.',
          'conflict',
        );
    }
  }
}

function sessionCookie(header: string | undefined): string | undefined {
  const values = (header ?? '').split(';').flatMap((part) => {
    const [name, ...rest] = part.trim().split('=');
    return name === '__session' ? [rest.join('=')] : [];
  });
  if (values.length !== 1 || !values[0]) return undefined;
  try {
    return decodeURIComponent(values[0]);
  } catch {
    return undefined;
  }
}
