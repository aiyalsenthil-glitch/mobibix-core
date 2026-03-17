import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { EWayBillController } from './ewaybill.controller';
import { EWayBillService } from './ewaybill.service';
import { NicApiService } from './nic-api.service';

@Module({
  imports: [
    HttpModule.register({ timeout: 15000 }),
    ConfigModule,
    // CacheService is @Global — no need to import CacheModule here
  ],
  controllers: [EWayBillController],
  providers: [EWayBillService, NicApiService],
  exports: [EWayBillService],
})
export class EWayBillModule {}
