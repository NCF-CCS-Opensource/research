import { createParamDecorator, type ExecutionContext } from "@nestjs/common"
import type { AccountRole } from "../../modules/account/domain/profile.entity"

interface SignedInIdentity {
  profileId: string
  clerkUserId: string
  email: string
  role: AccountRole
}

export type RequestIdentity =
  | { state: "guest" }
  | { state: "registering"; clerkUserId: string; email: string }
  | ({ state: "active" } & SignedInIdentity)
  | ({ state: "suspended" } & SignedInIdentity)

export interface RequestWithIdentity {
  identity?: RequestIdentity
}

export const CurrentIdentity = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): RequestIdentity => {
    const request = ctx.switchToHttp().getRequest<RequestWithIdentity>()
    return request.identity ?? { state: "guest" }
  }
)
