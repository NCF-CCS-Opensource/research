import { Module } from "@nestjs/common"
import { CATEGORY_QUERY } from "./application/category-query.interface"
import { ListCategoriesUseCase } from "./application/list-categories.use-case"
import { DrizzleCategoryQuery } from "./infrastructure/drizzle-category-query"
import { ListCategoriesController } from "./presentation/list-categories.controller"

@Module({
  controllers: [ListCategoriesController],
  providers: [
    ListCategoriesUseCase,
    {
      provide: CATEGORY_QUERY,
      useClass: DrizzleCategoryQuery,
    },
  ],
  exports: [ListCategoriesUseCase],
})
export class TaxonomyModule {}
