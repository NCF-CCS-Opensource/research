import { Injectable } from "@nestjs/common"
import { verifyToken } from "@clerk/backend"
import { validateEnv } from "../../../config/env"
import type {
  TokenVerifier,
  VerifiedIdentity,
} from "../application/token-verifier.interface"

@Injectable()
export class ClerkTokenVerifier implements TokenVerifier {
  async verify(token: string): Promise<VerifiedIdentity | null> {
    const env = validateEnv()

    try {
      const payload = await verifyToken(token, {
        secretKey: env.CLERK_SECRET_KEY,
        authorizedParties: [env.WEB_ORIGIN],
      })

      if (!payload.email) {
        return null
      }

      return { clerkUserId: payload.sub, email: payload.email }
    } catch {
      return null
    }
  }
}
