import { Module } from '@nestjs/common';
import { EMAIL_SENDER, ResendEmailSender } from './email-sender.js';
import { EmailController } from './email.controller.js';
import { EmailUseCases } from './email.use-cases.js';

@Module({
  controllers: [EmailController],
  providers: [
    EmailUseCases,
    { provide: EMAIL_SENDER, useClass: ResendEmailSender },
  ],
})
export class EmailModule {}
