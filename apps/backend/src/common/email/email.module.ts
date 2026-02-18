
import { Module, Global } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailListener } from './email.listener';
import { PrismaService } from '../../core/prisma/prisma.service';

@Global()
@Module({
  providers: [EmailService, EmailListener, PrismaService],
  exports: [EmailService],
})
export class EmailModule {}
