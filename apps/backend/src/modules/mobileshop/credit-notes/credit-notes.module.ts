import { Module } from '@nestjs/common';
import { CreditNotesController } from './credit-notes.controller';
import { CreditNotesService } from './credit-notes.service';
import { PrismaModule } from '../../../core/prisma/prisma.module';
import { CommonModule } from '../../../common/common.module';
import { StockModule } from '../../../core/stock/stock.module';

@Module({
  imports: [PrismaModule, CommonModule, StockModule],
  controllers: [CreditNotesController],
  providers: [CreditNotesService],
  exports: [CreditNotesService],
})
export class CreditNotesModule {}
