import { Controller, Get, Inject } from '@nestjs/common';
import { referenceDataContract } from '@repo/contracts';
import { Public } from '../../../common/public.decorator.js';
import { GUEST } from '../../../shared/domain/actor.js';
import { GetReferenceDataUseCase } from '../application/get-reference-data.use-case.js';

@Controller()
export class GetReferenceDataController {
  constructor(
    @Inject(GetReferenceDataUseCase)
    private readonly useCase: GetReferenceDataUseCase,
  ) {}

  @Public()
  @Get(referenceDataContract.path)
  handle() {
    return this.useCase.execute({}, GUEST);
  }
}
