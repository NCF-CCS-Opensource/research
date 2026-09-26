import { Injectable } from "@nestjs/common"
import type { CurrentAccountResponse } from "@repo/contracts"
import type {
  RequestIdentity,
} from "../../../common/decorators/current-identity.decorator"

type SignedInIdentity = Exclude<RequestIdentity, { state: "guest" }>

@Injectable()
export class GetCurrentAccountUseCase {
  execute(identity: SignedInIdentity): CurrentAccountResponse {
    if (identity.state === "registering") {
      return { status: "registering" }
    }
    return { status: identity.state, role: identity.role }
  }
}
