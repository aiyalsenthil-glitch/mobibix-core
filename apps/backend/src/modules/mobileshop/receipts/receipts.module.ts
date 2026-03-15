import { Module } from '@nestjs/common';
import { ReceiptsModule as CoreReceiptsModule } from '../../../core/receipts/receipts.module';
import { ReceiptsController } from './receipts.controller';

@Module({
  imports: [CoreReceiptsModule],
  controllers: [ReceiptsController],
  exports: [CoreReceiptsModule],
})
export class ReceiptsModule {}
