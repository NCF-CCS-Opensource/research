import { Controller, Get } from "@nestjs/common"
import {
  listProgramsContract,
  type ListProgramsResponse,
} from "@repo/contracts"
import { Public } from "../../../common/decorators/public.decorator"
import { ListProgramsUseCase } from "../application/list-programs.use-case"

@Controller()
export class ListProgramsController {
  constructor(private readonly useCase: ListProgramsUseCase) {}

  @Public()
  @Get(listProgramsContract.path)
  async handle(): Promise<ListProgramsResponse> {
    return this.useCase.execute()
  }
}
