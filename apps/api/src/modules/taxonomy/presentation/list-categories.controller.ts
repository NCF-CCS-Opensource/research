import { Controller, Get } from "@nestjs/common"
import {
  listCategoriesContract,
  type ListCategoriesResponse,
} from "@repo/contracts"
import { Public } from "../../../common/decorators/public.decorator"
import { ListCategoriesUseCase } from "../application/list-categories.use-case"

@Controller()
export class ListCategoriesController {
  constructor(private readonly useCase: ListCategoriesUseCase) {}

  @Public()
  @Get(listCategoriesContract.path)
  async handle(): Promise<ListCategoriesResponse> {
    return this.useCase.execute()
  }
}
