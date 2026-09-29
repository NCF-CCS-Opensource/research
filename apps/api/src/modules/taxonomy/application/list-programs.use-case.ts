import { Inject, Injectable } from "@nestjs/common"
import type { Program } from "@repo/contracts"
import { PROGRAM_QUERY, type ProgramQuery } from "./program-query.interface"

@Injectable()
export class ListProgramsUseCase {
  constructor(
    @Inject(PROGRAM_QUERY) private readonly programQuery: ProgramQuery
  ) {}

  async execute(): Promise<Program[]> {
    return this.programQuery.list()
  }
}
