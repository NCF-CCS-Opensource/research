import { Module } from "@nestjs/common"
import { CATEGORY_QUERY } from "./application/category-query.interface"
import { ListCategoriesUseCase } from "./application/list-categories.use-case"
import { ListProgramsUseCase } from "./application/list-programs.use-case"
import { PROGRAM_QUERY } from "./application/program-query.interface"
import { DrizzleCategoryQuery } from "./infrastructure/drizzle-category-query"
import { DrizzleProgramQuery } from "./infrastructure/drizzle-program-query"
import { ListCategoriesController } from "./presentation/list-categories.controller"
import { ListProgramsController } from "./presentation/list-programs.controller"

@Module({
  controllers: [ListCategoriesController, ListProgramsController],
  providers: [
    ListCategoriesUseCase,
    ListProgramsUseCase,
    {
      provide: CATEGORY_QUERY,
      useClass: DrizzleCategoryQuery,
    },
    {
      provide: PROGRAM_QUERY,
      useClass: DrizzleProgramQuery,
    },
  ],
  exports: [ListCategoriesUseCase, ListProgramsUseCase],
})
export class TaxonomyModule {}
