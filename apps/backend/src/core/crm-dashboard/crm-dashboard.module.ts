import { Module } from '@nestjs/common';
import { CrmDashboardService } from './crm-dashboard.service';
import { CrmDashboardController } from './crm-dashboard.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [CrmDashboardController],
  providers: [CrmDashboardService, PrismaService],
  exports: [CrmDashboardService],
})
export class CrmDashboardModule {}
