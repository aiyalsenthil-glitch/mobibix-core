import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PlatformAuditService } from './platform-audit.service';
import { AuditController } from './audit.controller';

@Module({
  imports: [PrismaModule],
  providers: [AuditService, PlatformAuditService],
  exports: [AuditService, PlatformAuditService],
  controllers: [AuditController],
})
export class AuditModule {}
