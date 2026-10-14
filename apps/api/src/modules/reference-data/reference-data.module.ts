import { Module } from '@nestjs/common';
import { GetReferenceDataUseCase } from './application/get-reference-data.use-case.js';
import { PROGRAM_READER } from './application/program-reader.js';
import { DrizzleProgramReader } from './infrastructure/drizzle-program-reader.js';
import { GetReferenceDataController } from './presentation/get-reference-data.controller.js';

@Module({
  controllers: [GetReferenceDataController],
  providers: [
    GetReferenceDataUseCase,
    { provide: PROGRAM_READER, useClass: DrizzleProgramReader },
  ],
})
export class ReferenceDataModule {}
