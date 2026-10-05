import { Controller, Get, Inject } from '@nestjs/common';
import { Public } from '../../../common/public.decorator.js';
import { GUEST } from '../../../shared/domain/actor.js';
import { GetReadinessUseCase } from '../application/get-readiness.use-case.js';

@Controller()
export class GetReadinessController {
  constructor(
    @Inject(GetReadinessUseCase) private readonly useCase: GetReadinessUseCase,
  ) {}

  @Public()
  @Get('/health/get-ready')
  handle() {
    return this.useCase.execute({}, GUEST);
  }
}
