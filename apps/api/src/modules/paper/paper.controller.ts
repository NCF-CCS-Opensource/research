import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common"
import {
  createPaperContract,
  deletePaperContract,
  getPaperContract,
  listAdvisersContract,
  listMyPapersContract,
  updatePaperContract,
  type CreatePaperRequest,
  type Paper,
  type UpdatePaperRequest,
} from "@repo/contracts"
import {
  CurrentIdentity,
  type RequestIdentity,
} from "../../common/decorators/current-identity.decorator"
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe"
import { PaperUseCases } from "./paper.use-cases"

@Controller()
export class PaperController {
  constructor(private readonly papers: PaperUseCases) {}

  @Get(listAdvisersContract.path)
  listAdvisers() {
    return this.papers.listAdvisers()
  }

  @Post(createPaperContract.path)
  create(
    @CurrentIdentity() identity: RequestIdentity,
    @Body(new ZodValidationPipe(createPaperContract.request))
    input: CreatePaperRequest
  ): Promise<Paper> {
    return this.papers.create(identity, input)
  }

  @Get(listMyPapersContract.path)
  listMine(@CurrentIdentity() identity: RequestIdentity) {
    return this.papers.listMine(identity)
  }

  @Get(getPaperContract.path)
  get(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("publicId") publicId: string
  ): Promise<Paper> {
    return this.papers.get(identity, publicId)
  }

  @Patch(updatePaperContract.path)
  update(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("publicId") publicId: string,
    @Body(new ZodValidationPipe(updatePaperContract.request))
    input: UpdatePaperRequest
  ): Promise<Paper> {
    return this.papers.update(identity, publicId, input)
  }

  @Delete(deletePaperContract.path)
  delete(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("publicId") publicId: string
  ) {
    return this.papers.delete(identity, publicId)
  }
}
