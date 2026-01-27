import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { SalesService } from './sales.service';

/**
 * Public sales endpoints (no authentication required)
 */
@Controller('public/sales')
export class PublicSalesController {
  constructor(private readonly service: SalesService) {}

  /**
   * Public invoice verification endpoint
   * Returns limited invoice details for QR code verification
   */
  @Get('invoice/:invoiceId/verify')
  async verifyInvoice(@Param('invoiceId') invoiceId: string) {
    try {
      return await this.service.getPublicInvoiceVerification(invoiceId);
    } catch (error) {
      throw new NotFoundException('Invoice not found or invalid');
    }
  }
}
