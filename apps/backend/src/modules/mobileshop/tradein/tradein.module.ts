import { Module } from '@nestjs/common';
import { TradeInService } from './tradein.service';
import { TradeInController } from './tradein.controller';
import { TradeInIntelligenceService } from './tradein-intelligence.service';
import { PrismaModule } from '../../../core/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [TradeInService, TradeInIntelligenceService],
  controllers: [TradeInController],
  exports: [TradeInService, TradeInIntelligenceService],
})
export class TradeInModule {}
