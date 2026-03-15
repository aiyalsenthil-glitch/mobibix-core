import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../../core/prisma/prisma.module';
import { InventoryIntelligenceController } from './inventory-intelligence.controller';
import { InventoryIntelligenceService } from './inventory-intelligence.service';

@Module({
  imports: [PrismaModule],
  controllers: [InventoryIntelligenceController],
  providers: [InventoryIntelligenceService],
  exports: [InventoryIntelligenceService],
})
export class InventoryIntelligenceModule {}
