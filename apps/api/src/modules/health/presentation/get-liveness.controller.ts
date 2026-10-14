import { Controller, Get, Inject } from '@nestjs/common';
import { Public } from '../../../common/public.decorator.js';
import { GUEST } from '../../../shared/domain/actor.js';
import { GetLivenessUseCase } from '../application/get-liveness.use-case.js';

@Controller()
export class GetLivenessController {
  constructor(
    @Inject(GetLivenessUseCase) private readonly useCase: GetLivenessUseCase,
  ) {}

  @Public()
  @Get('/health/get-live')
  handle() {
    return this.useCase.execute({}, GUEST);
  }
}
