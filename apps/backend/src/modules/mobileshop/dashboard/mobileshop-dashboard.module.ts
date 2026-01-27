import { Module } from '@nestjs/common';
import { MobileShopDashboardController } from './mobileshop-dashboard.controller';
import { MobileShopDashboardService } from './mobileshop-dashboard.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { StaffDashboardController } from './staff-dashboard.controller';
import { StaffDashboardService } from './staff-dashboard.service';
import { StockKpiService } from '../../../core/stock/stock-kpi.service';

@Module({
  controllers: [MobileShopDashboardController, StaffDashboardController],
  providers: [
    MobileShopDashboardService,
    StaffDashboardService,
    PrismaService,
    StockKpiService,
  ],
})
export class MobileShopDashboardModule {}
