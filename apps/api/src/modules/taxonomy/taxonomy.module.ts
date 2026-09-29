import { Module } from "@nestjs/common"
import type { Database } from "../../database/database"
import { DATABASE_CONNECTION } from "../../database/database.module"
import { categories, keywords, programs } from "../../database/schema"
import { CATEGORY_QUERY } from "./application/category-query.interface"
import { CreateCategoryUseCase } from "./application/create-category.use-case"
import { CreateKeywordUseCase } from "./application/create-keyword.use-case"
import { CreateProgramUseCase } from "./application/create-program.use-case"
import { DeleteCategoryUseCase } from "./application/delete-category.use-case"
import { DeleteKeywordUseCase } from "./application/delete-keyword.use-case"
import { DeleteProgramUseCase } from "./application/delete-program.use-case"
import { KEYWORD_QUERY } from "./application/keyword-query.interface"
import { ListCategoriesUseCase } from "./application/list-categories.use-case"
import { ListKeywordsUseCase } from "./application/list-keywords.use-case"
import { ListProgramsUseCase } from "./application/list-programs.use-case"
import { PROGRAM_QUERY } from "./application/program-query.interface"
import { RenameCategoryUseCase } from "./application/rename-category.use-case"
import { RenameKeywordUseCase } from "./application/rename-keyword.use-case"
import { RenameProgramUseCase } from "./application/rename-program.use-case"
import {
  CATEGORY_REPOSITORY,
  KEYWORD_REPOSITORY,
  PROGRAM_REPOSITORY,
} from "./application/taxonomy-repository.interface"
import { DrizzleCategoryQuery } from "./infrastructure/drizzle-category-query"
import { DrizzleKeywordQuery } from "./infrastructure/drizzle-keyword-query"
import { DrizzleProgramQuery } from "./infrastructure/drizzle-program-query"
import { DrizzleTaxonomyRepository } from "./infrastructure/drizzle-taxonomy-repository"
import { CreateCategoryController } from "./presentation/create-category.controller"
import { CreateKeywordController } from "./presentation/create-keyword.controller"
import { CreateProgramController } from "./presentation/create-program.controller"
import { DeleteCategoryController } from "./presentation/delete-category.controller"
import { DeleteKeywordController } from "./presentation/delete-keyword.controller"
import { DeleteProgramController } from "./presentation/delete-program.controller"
import { ListCategoriesController } from "./presentation/list-categories.controller"
import { ListKeywordsController } from "./presentation/list-keywords.controller"
import { ListProgramsController } from "./presentation/list-programs.controller"
import { RenameCategoryController } from "./presentation/rename-category.controller"
import { RenameKeywordController } from "./presentation/rename-keyword.controller"
import { RenameProgramController } from "./presentation/rename-program.controller"

@Module({
  controllers: [
    ListCategoriesController,
    ListKeywordsController,
    ListProgramsController,
    CreateCategoryController,
    RenameCategoryController,
    DeleteCategoryController,
    CreateKeywordController,
    RenameKeywordController,
    DeleteKeywordController,
    CreateProgramController,
    RenameProgramController,
    DeleteProgramController,
  ],
  providers: [
    ListCategoriesUseCase,
    ListKeywordsUseCase,
    ListProgramsUseCase,
    CreateCategoryUseCase,
    RenameCategoryUseCase,
    DeleteCategoryUseCase,
    CreateKeywordUseCase,
    RenameKeywordUseCase,
    DeleteKeywordUseCase,
    CreateProgramUseCase,
    RenameProgramUseCase,
    DeleteProgramUseCase,
    { provide: CATEGORY_QUERY, useClass: DrizzleCategoryQuery },
    { provide: KEYWORD_QUERY, useClass: DrizzleKeywordQuery },
    { provide: PROGRAM_QUERY, useClass: DrizzleProgramQuery },
    {
      provide: CATEGORY_REPOSITORY,
      inject: [DATABASE_CONNECTION],
      useFactory: (db: Database) =>
        new DrizzleTaxonomyRepository(db, categories, "Category"),
    },
    {
      provide: KEYWORD_REPOSITORY,
      inject: [DATABASE_CONNECTION],
      useFactory: (db: Database) =>
        new DrizzleTaxonomyRepository(db, keywords, "Keyword"),
    },
    {
      provide: PROGRAM_REPOSITORY,
      inject: [DATABASE_CONNECTION],
      useFactory: (db: Database) =>
        new DrizzleTaxonomyRepository(db, programs, "Program"),
    },
  ],
  exports: [ListCategoriesUseCase, ListProgramsUseCase],
})
export class TaxonomyModule {}
