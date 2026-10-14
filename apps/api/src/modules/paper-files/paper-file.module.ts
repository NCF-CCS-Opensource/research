import { Module } from '@nestjs/common';
import { validateEnv } from '../../config/env.js';
import { FakePaperFileStorage } from './fake-storage.js';
import { MALWARE_SCANNER, FakeMalwareScanner } from './malware-scanner.js';
import { PaperFileController } from './paper-file.controller.js';
import { PaperFileUseCases } from './paper-file.use-cases.js';
import { S3PaperFileStorage } from './s3-storage.js';
import { PAPER_FILE_STORAGE } from './storage.js';

@Module({
  controllers: [PaperFileController],
  providers: [
    PaperFileUseCases,
    {
      provide: PAPER_FILE_STORAGE,
      useFactory: () => {
        const env = validateEnv();
        const keys = [
          env.R2_ENDPOINT,
          env.R2_BUCKET,
          env.R2_ACCESS_KEY_ID,
          env.R2_SECRET_ACCESS_KEY,
        ];
        if (keys.some(Boolean) && !keys.every(Boolean))
          throw new Error('Configure all R2_* variables together.');
        return keys.every(Boolean)
          ? new S3PaperFileStorage()
          : new FakePaperFileStorage();
      },
    },
    { provide: MALWARE_SCANNER, useClass: FakeMalwareScanner },
  ],
  exports: [PAPER_FILE_STORAGE, MALWARE_SCANNER],
})
export class PaperFileModule {}
