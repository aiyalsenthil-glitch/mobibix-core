import { Module } from '@nestjs/common';
import { CashAnalysisService } from './cash-analysis.service';
import { CashAnalysisController } from './cash-analysis.controller';
import { PrismaModule } from '../../../../core/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CashAnalysisController],
  providers: [CashAnalysisService],
  exports: [CashAnalysisService],
})
export class CashAnalysisModule {}
