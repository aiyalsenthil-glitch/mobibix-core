import { Module } from '@nestjs/common';
import { MobileShopReportsController } from './reports.controller';
import { MobileShopReportsService } from './reports.service';

@Module({
  controllers: [MobileShopReportsController],
  providers: [MobileShopReportsService],
  exports: [MobileShopReportsService],
})
export class MobileShopReportsModule {}
