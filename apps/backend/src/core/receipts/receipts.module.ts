import { Module } from '@nestjs/common';
import { ReceiptsService } from './receipts.service';
import { ItemTaxService } from './item-tax.service';
import { ReceiptsIntegrityService } from './receipts-integrity.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [PrismaModule, CommonModule],
  providers: [ReceiptsService, ItemTaxService, ReceiptsIntegrityService],
  exports: [ReceiptsService, ItemTaxService, ReceiptsIntegrityService],
})
export class ReceiptsModule {}
