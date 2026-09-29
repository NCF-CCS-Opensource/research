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
import {
  ChangeAccountStatusUseCase,
} from "./application/change-account-status.use-case"
import {
  ChangeUserRoleUseCase,
} from "./application/change-user-role.use-case"
import { ListUsersUseCase } from "./application/list-users.use-case"
import { UpdateProfileUseCase } from "./application/update-profile.use-case"
import { USER_QUERY } from "./application/user-query.interface"
import { DrizzleUserQuery } from "./infrastructure/drizzle-user-query"
import {
  ChangeAccountStatusController,
} from "./presentation/change-account-status.controller"
import {
  ChangeUserRoleController,
} from "./presentation/change-user-role.controller"
import { ListUsersController } from "./presentation/list-users.controller"
import {
  UpdateProfileController,
} from "./presentation/update-profile.controller"

@Module({
  imports: [TaxonomyModule],
  controllers: [
    RegisterController,
    GetCurrentAccountController,
    UpdateProfileController,
    ListUsersController,
    ChangeUserRoleController,
    ChangeAccountStatusController,
  ],
  providers: [
    RegisterUseCase,
    UpdateProfileUseCase,
    ListUsersUseCase,
    ChangeUserRoleUseCase,
    ChangeAccountStatusUseCase,
    {
      provide: USER_QUERY,
      useClass: DrizzleUserQuery,
    },
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
