import { Controller, Get } from "@nestjs/common"
import { listKeywordsContract, type ListKeywordsResponse } from "@repo/contracts"
import { Public } from "../../../common/decorators/public.decorator"
import { ListKeywordsUseCase } from "../application/list-keywords.use-case"

@Controller()
export class ListKeywordsController {
  constructor(private readonly useCase: ListKeywordsUseCase) {}

  @Public()
  @Get(listKeywordsContract.path)
  async handle(): Promise<ListKeywordsResponse> {
    return this.useCase.execute()
  }
}
