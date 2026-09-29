import { Module } from "@nestjs/common"
import { TaxonomyModule } from "../taxonomy/taxonomy.module"
import {
  GetCurrentAccountUseCase,
} from "./application/get-current-account.use-case"
import { PROFILE_REPOSITORY } from "./application/profile-repository.interface"
import { RegisterUseCase } from "./application/register.use-case"
import {
  ResolveRequestIdentityUseCase,
} from "./application/resolve-request-identity.use-case"
import { TOKEN_VERIFIER } from "./application/token-verifier.interface"
import { ClerkTokenVerifier } from "./infrastructure/clerk-token-verifier"
import {
  DrizzleProfileRepository,
} from "./infrastructure/drizzle-profile-repository"
import {
  GetCurrentAccountController,
} from "./presentation/get-current-account.controller"
import { RegisterController } from "./presentation/register.controller"

@Module({
  imports: [TaxonomyModule],
  controllers: [RegisterController, GetCurrentAccountController],
  providers: [
    RegisterUseCase,
    GetCurrentAccountUseCase,
    ResolveRequestIdentityUseCase,
    {
      provide: PROFILE_REPOSITORY,
      useClass: DrizzleProfileRepository,
    },
    {
      provide: TOKEN_VERIFIER,
      useClass: ClerkTokenVerifier,
    },
  ],
  exports: [ResolveRequestIdentityUseCase],
})
export class AccountModule {}
