import { Module } from '@nestjs/common';
import { EmiApplicationService } from './emi-application.service';
import { InstallmentPlanService } from './installment-plan.service';
import { FinanceController } from './finance.controller';
import { PrismaModule } from '../../../core/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FinanceController],
  providers: [EmiApplicationService, InstallmentPlanService],
  exports: [EmiApplicationService, InstallmentPlanService],
})
export class FinanceModule {}
