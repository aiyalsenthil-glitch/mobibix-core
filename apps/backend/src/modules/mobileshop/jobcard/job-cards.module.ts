import { Module } from '@nestjs/common';
import { JobCardsController } from './job-cards.controller';
import { PublicJobController } from './public-job.controller';
import { JobCardsService } from './job-cards.service';
import { JobStatusValidator } from './job-status-validator.service';
import { PrismaModule } from '../../../core/prisma/prisma.module';
import { StockModule } from '../../../core/stock/stock.module';
import { CommonModule } from '../../../common/common.module';

@Module({
  imports: [PrismaModule, StockModule, CommonModule],
  controllers: [JobCardsController, PublicJobController],
  providers: [JobCardsService, JobStatusValidator],
})
export class JobCardsModule {}
