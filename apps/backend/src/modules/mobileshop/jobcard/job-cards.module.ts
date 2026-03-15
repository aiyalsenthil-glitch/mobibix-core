import { Module, forwardRef } from '@nestjs/common';
import { JobCardsController } from './job-cards.controller';
import { PublicJobController } from './public-job.controller';
import { JobCardsService } from './job-cards.service';
import { JobStatusValidator } from './job-status-validator.service';
import { PrismaModule } from '../../../core/prisma/prisma.module';
import { StockModule } from '../../../core/stock/stock.module';
import { CommonModule } from '../../../common/common.module';
import { SalesModule } from '../../../core/sales/sales.module';
import { FollowUpsModule } from '../../../core/follow-ups/follow-ups.module';
import { RepairIntelligenceModule } from '../repair-intelligence/repair-intelligence.module';

@Module({
  imports: [
    PrismaModule,
    StockModule,
    CommonModule,
    SalesModule,
    FollowUpsModule,
    forwardRef(() => RepairIntelligenceModule),
  ],
  controllers: [JobCardsController, PublicJobController],
  providers: [JobCardsService, JobStatusValidator],
  exports: [JobCardsService],
})
export class JobCardsModule {}
