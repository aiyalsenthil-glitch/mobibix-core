import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { InvoiceService } from './invoice.service';
// import { FirebaseAuthGuard } from '../../auth/guards/REMOVED_AUTH_PROVIDER-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { User } from '@prisma/client';

@Controller('billing/invoices')
// @UseGuards(FirebaseAuthGuard) // TODO: Add auth guard when path is fixed
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  /**
   * Download invoice PDF
   * GET /billing/invoices/:invoiceId/pdf
   */
  @Get(':invoiceId/pdf')
  async downloadInvoicePdf(
    @Param('invoiceId') invoiceId: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const invoice = await this.invoiceService.getInvoice(invoiceId);

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Security: Ensure user belongs to the same tenant
    if (invoice.tenantId !== user.tenantId) {
      throw new NotFoundException('Invoice not found');
    }

    // Set response headers before streaming
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
    );

    // Generate and stream PDF directly to response
    await this.invoiceService.generatePDF(invoiceId, res);
  }

  /**
   * Get invoice details
   * GET /billing/invoices/:invoiceId
   */
  @Get(':invoiceId')
  async getInvoice(
    @Param('invoiceId') invoiceId: string,
    @CurrentUser() user: User,
  ) {
    const invoice = await this.invoiceService.getInvoice(invoiceId);

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Security: Ensure user belongs to the same tenant
    if (invoice.tenantId !== user.tenantId) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  /**
   * List invoices for tenant
   * GET /billing/invoices
   */
  @Get()
  async listInvoices(
    @CurrentUser() user: User,
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    if (!user.tenantId) {
      throw new NotFoundException('User not associated with any tenant');
    }

    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;

    return this.invoiceService.getInvoicesForTenant(user.tenantId, page, limit);
  }
}
