import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import type { Request } from "express"
import {
  AccountSuspendedError,
  AdminOnlyError,
  RegistrationRequiredError,
} from "../../modules/account/domain/access.errors"
import {
  ResolveRequestIdentityUseCase,
} from "../../modules/account/application/resolve-request-identity.use-case"
import { IS_ADMIN_ONLY_KEY } from "../decorators/admin-only.decorator"
import { IS_PUBLIC_KEY } from "../decorators/public.decorator"
import { IS_REGISTERING_KEY } from "../decorators/registering.decorator"
import type {
  RequestWithIdentity,
} from "../decorators/current-identity.decorator"

@Injectable()
export class GlobalAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly resolveRequestIdentity: ResolveRequestIdentityUseCase
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    const isRegistering = this.reflector.getAllAndOverride<boolean>(
      IS_REGISTERING_KEY,
      [context.getHandler(), context.getClass()]
    )
    const isAdminOnly = this.reflector.getAllAndOverride<boolean>(
      IS_ADMIN_ONLY_KEY,
      [context.getHandler(), context.getClass()]
    )

    const request = context
      .switchToHttp()
      .getRequest<Request & RequestWithIdentity>()
    const identity = await this.resolveRequestIdentity.execute(
      extractBearerToken(request.headers.authorization)
    )
    request.identity = identity

    if (isPublic) {
      return true
    }

    if (identity.state === "guest") {
      throw new UnauthorizedException("Authentication required")
    }

    if (identity.state === "suspended") {
      throw new AccountSuspendedError()
    }

    if (identity.state === "registering") {
      if (isRegistering) {
        return true
      }
      throw new RegistrationRequiredError()
    }

    if (isAdminOnly && identity.role !== "admin") {
      throw new AdminOnlyError()
    }

    return true
  }
}

function extractBearerToken(header: string | undefined): string | null {
  if (!header?.startsWith("Bearer ")) {
    return null
  }
  return header.slice("Bearer ".length).trim() || null
}
