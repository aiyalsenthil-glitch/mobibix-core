import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { SalesService } from './sales.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('mobileshop/sales/public')
export class SalesPublicController {
  constructor(private readonly service: SalesService) {}

  @Public()
  @Get('invoice/:invoiceId')
  async getInvoice(@Param('invoiceId') invoiceId: string) {
    const invoice = await this.service.getPublicInvoiceDetails(invoiceId);
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    return invoice;
  }
}
