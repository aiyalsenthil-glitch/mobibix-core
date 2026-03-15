import { Module } from '@nestjs/common';
import { ExpenseIntelligenceController } from './expense-intelligence.controller';
import { ExpenseIntelligenceService } from './expense-intelligence.service';
import { PrismaModule } from '../../../../core/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ExpenseIntelligenceController],
  providers: [ExpenseIntelligenceService],
  exports: [ExpenseIntelligenceService],
})
export class ExpenseIntelligenceModule {}
