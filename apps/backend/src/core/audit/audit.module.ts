import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PlatformAuditService } from './platform-audit.service';

@Module({
  imports: [PrismaModule],
  providers: [AuditService, PlatformAuditService],
  exports: [AuditService, PlatformAuditService],
})
export class AuditModule {}
