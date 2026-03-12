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
import { ModuleType } from '@prisma/client';
import type { User } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GranularPermissionGuard } from '../../permissions/guards/granular-permission.guard';
import { PERMISSIONS } from '../../../security/permission-registry';
import { ModulePermission, RequirePermission } from '../../permissions/decorators/require-permission.decorator';
import { ModuleScope } from '../../auth/decorators/module-scope.decorator';

@Controller('billing/invoices')
@ModuleScope(ModuleType.CORE)
@ModulePermission('core')
@UseGuards(JwtAuthGuard, GranularPermissionGuard)
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  /**
   * Download invoice PDF
   * GET /billing/invoices/:invoiceId/pdf
   */
  @RequirePermission(PERMISSIONS.CORE.BILLING.VIEW)
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
  @RequirePermission(PERMISSIONS.CORE.BILLING.VIEW)
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
  @RequirePermission(PERMISSIONS.CORE.BILLING.VIEW)
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
