import { Module } from '@nestjs/common';
import { ACCOUNT_REPOSITORY } from './application/account-repository.js';
import { GetCurrentAccountUseCase } from './application/get-current-account.use-case.js';
import { IdentityResolver } from './application/identity-resolver.js';
import { RegisterAccountUseCase } from './application/register-account.use-case.js';
import { TOKEN_VERIFIER } from './application/token-verifier.js';
import { UpdateOwnProfileUseCase } from './application/update-own-profile.use-case.js';
import { ClerkTokenVerifier } from './infrastructure/clerk-token-verifier.js';
import { DrizzleAccountRepository } from './infrastructure/drizzle-account-repository.js';
import { GetCurrentAccountController } from './presentation/get-current-account.controller.js';
import { RegisterAccountController } from './presentation/register-account.controller.js';
import { UpdateOwnProfileController } from './presentation/update-own-profile.controller.js';

@Module({
  controllers: [
    GetCurrentAccountController,
    RegisterAccountController,
    UpdateOwnProfileController,
  ],
  providers: [
    IdentityResolver,
    GetCurrentAccountUseCase,
    RegisterAccountUseCase,
    UpdateOwnProfileUseCase,
    { provide: ACCOUNT_REPOSITORY, useClass: DrizzleAccountRepository },
    { provide: TOKEN_VERIFIER, useClass: ClerkTokenVerifier },
  ],
  exports: [IdentityResolver],
})
export class AccountsModule {}
