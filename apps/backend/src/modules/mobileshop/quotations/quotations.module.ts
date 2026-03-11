import { Module } from '@nestjs/common';
import { QuotationsController } from './quotations.controller';
import { QuotationsService } from './quotations.service';
import { PrismaModule } from '../../../core/prisma/prisma.module';
import { CommonModule } from '../../../common/common.module';
import { SalesModule } from '../../../core/sales/sales.module';
import { JobCardsModule } from '../jobcard/job-cards.module';

@Module({
  imports: [PrismaModule, CommonModule, SalesModule, JobCardsModule],
  controllers: [QuotationsController],
  providers: [QuotationsService],
  exports: [QuotationsService],
})
export class QuotationsModule {}
