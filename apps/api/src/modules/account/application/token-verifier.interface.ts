export const TOKEN_VERIFIER = Symbol("TOKEN_VERIFIER")

export interface VerifiedIdentity {
  clerkUserId: string
  email: string
}

export interface TokenVerifier {
  verify(token: string): Promise<VerifiedIdentity | null>
}
