import { Module } from "@nestjs/common"
import { APP_FILTER, APP_GUARD, APP_PIPE } from "@nestjs/core"
import { ApiExceptionFilter } from "./common/filters/api-exception.filter"
import { GlobalAuthGuard } from "./common/guards/auth.guard"
import { ZodValidationPipe } from "./common/pipes/zod-validation.pipe"
import { DatabaseModule } from "./database/database.module"
import { AccountModule } from "./modules/account/account.module"
import { TaxonomyModule } from "./modules/taxonomy/taxonomy.module"

@Module({
  imports: [DatabaseModule, TaxonomyModule, AccountModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: GlobalAuthGuard,
    },
    {
      provide: APP_FILTER,
      useClass: ApiExceptionFilter,
    },
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
  ],
})
export class AppModule {}
