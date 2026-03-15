import { Module } from '@nestjs/common';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { EmailModule } from '../../../common/email/email.module';
import { makeCounterProvider } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [InvoiceController],
  providers: [
    InvoiceService,
    makeCounterProvider({
      name: 'invoices_generated_total',
      help: 'Total number of invoices generated',
    }),
  ],
  exports: [InvoiceService],
})
export class InvoiceModule {}
