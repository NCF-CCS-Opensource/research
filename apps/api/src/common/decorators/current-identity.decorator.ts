import { createParamDecorator, type ExecutionContext } from "@nestjs/common"
import type {
  RequestIdentity,
} from "../../modules/account/application/request-identity"

export interface RequestWithIdentity {
  identity?: RequestIdentity
}

export const CurrentIdentity = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): RequestIdentity => {
    const request = ctx.switchToHttp().getRequest<RequestWithIdentity>()
    return request.identity ?? { state: "guest" }
  }
)
