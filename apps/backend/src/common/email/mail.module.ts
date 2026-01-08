// mail.module.ts
import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';

@Global()
@Module({
  providers: [EmailService],
  exports: [EmailService], // 🔑 IMPORTANT
})
export class MailModule {}
