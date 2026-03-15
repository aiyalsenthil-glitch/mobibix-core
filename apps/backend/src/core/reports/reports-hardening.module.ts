import { Module } from '@nestjs/common';
import { ReportsHardeningController } from './reports-hardening.controller';
import { GSTR1Service } from './gstr1.service';
import { GSTR2Service } from './gstr2.service';
import { AgingReportsService } from './aging-reports.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ReportsHardeningController],
  providers: [GSTR1Service, GSTR2Service, AgingReportsService],
  exports: [GSTR1Service, GSTR2Service, AgingReportsService],
})
export class ReportsHardeningModule {}
