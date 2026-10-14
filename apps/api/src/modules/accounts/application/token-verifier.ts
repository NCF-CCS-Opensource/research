export const TOKEN_VERIFIER = Symbol('TOKEN_VERIFIER');

export interface VerifiedIdentity {
  clerkUserId: string;
  email: string;
}

export interface TokenVerifier {
  /** Null when the token is invalid, expired, or lacks an email claim. */
  verify(token: string): Promise<VerifiedIdentity | null>;
}
