import { Injectable, UnauthorizedException } from "@nestjs/common"
import type { CurrentAccountResponse } from "@repo/contracts"
import type { RequestIdentity } from "./request-identity"

@Injectable()
export class GetCurrentAccountUseCase {
  execute(identity: RequestIdentity): CurrentAccountResponse {
    if (identity.state === "guest") {
      throw new UnauthorizedException("Authentication required")
    }
    if (identity.state === "registering") {
      return { status: "registering" }
    }
    return { status: identity.state, role: identity.role }
  }
}
