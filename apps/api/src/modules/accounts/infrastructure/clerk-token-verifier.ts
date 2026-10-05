import { Injectable } from '@nestjs/common';
import { verifyToken } from '@clerk/backend';
import { validateEnv } from '../../../config/env.js';
import type {
  TokenVerifier,
  VerifiedIdentity,
} from '../application/token-verifier.js';

/** Verifies Clerk session tokens against Clerk's keys, for the web origin only. */
@Injectable()
export class ClerkTokenVerifier implements TokenVerifier {
  async verify(token: string): Promise<VerifiedIdentity | null> {
    const env = validateEnv();
    if (!env.CLERK_SECRET_KEY && !env.CLERK_JWT_KEY) {
      throw new Error(
        'Set CLERK_SECRET_KEY or CLERK_JWT_KEY to verify sign-in.',
      );
    }
    try {
      const claims = await verifyToken(token, {
        secretKey: env.CLERK_SECRET_KEY,
        jwtKey: env.CLERK_JWT_KEY,
        authorizedParties: [env.WEB_ORIGIN],
      });
      const email = (claims as Record<string, unknown>).email;
      if (typeof email !== 'string' || !email) return null;
      return { clerkUserId: claims.sub, email };
    } catch {
      return null;
    }
  }
}
