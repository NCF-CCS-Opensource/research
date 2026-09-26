import {
  Body,
  Controller,
  Post,
  UnauthorizedException,
} from "@nestjs/common"
import {
  registerContract,
  type RegisterRequest,
  type RegisterResponse,
} from "@repo/contracts"
import {
  CurrentIdentity,
} from "../../../common/decorators/current-identity.decorator"
import { Registering } from "../../../common/decorators/registering.decorator"
import { ZodValidationPipe } from "../../../common/pipes/zod-validation.pipe"
import { RegisterUseCase } from "../application/register.use-case"
import type { RequestIdentity } from "../application/request-identity"

@Controller()
export class RegisterController {
  constructor(private readonly useCase: RegisterUseCase) {}

  @Registering()
  @Post(registerContract.path)
  async handle(
    @CurrentIdentity() identity: RequestIdentity,
    @Body(new ZodValidationPipe(registerContract.request))
    body: RegisterRequest
  ): Promise<RegisterResponse> {
    const { clerkUserId, email } = signedInIdentity(identity)
    return this.useCase.execute({
      clerkUserId,
      email,
      fullName: body.fullName,
      programId: body.programId,
    })
  }
}

type SignedInIdentity = Pick<
  Extract<RequestIdentity, { state: "registering" }>,
  "clerkUserId" | "email"
>

function signedInIdentity(identity: RequestIdentity): SignedInIdentity {
  if (identity.state === "registering" || identity.state === "active") {
    return { clerkUserId: identity.clerkUserId, email: identity.email }
  }
  throw new UnauthorizedException("Authentication required")
}
