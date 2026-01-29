import {
  Body,
  Controller,
  Post,
  Req,
  BadRequestException,
  Get,
  Query,
  Param,
  ForbiddenException,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SalesService } from './sales.service';
import { PaymentService } from './payment.service';
import { SalesInvoiceDto } from './dto/sales-invoice.dto';
import { CollectPaymentDto } from './dto/collect-payment.dto';

@Controller('mobileshop/sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
  constructor(
    private readonly service: SalesService,
    private readonly paymentService: PaymentService,
  ) {}

  @Post('invoice')
  async create(@Req() req: any, @Body() dto: SalesInvoiceDto) {
    const tenantId = req.user?.tenantId;
    return this.service.createInvoice(tenantId, dto);
  }

  @Patch('invoice/:invoiceId')
  async update(
    @Req() req: any,
    @Param('invoiceId') invoiceId: string,
    @Body() dto: SalesInvoiceDto,
  ) {
    const tenantId = req.user?.tenantId;
    if (req.user?.role !== 'OWNER') {
      throw new ForbiddenException('Only owner can update invoice');
    }
    return this.service.updateInvoice(tenantId, invoiceId, dto);
  }

  @Post('invoice/:invoiceId/cancel')
  async cancel(@Req() req: any, @Param('invoiceId') invoiceId: string) {
    const tenantId = req.user?.tenantId;
    if (req.user?.role !== 'OWNER') {
      throw new ForbiddenException('Only owner can cancel invoice');
    }
    return this.service.cancelInvoice(tenantId, invoiceId);
  }

  @Get('invoices')
  async list(@Req() req: any, @Query('shopId') shopId: string) {
    const tenantId = req.user?.tenantId;
    if (!shopId) {
      throw new BadRequestException('shopId is required');
    }
    return this.service.listInvoices(tenantId, shopId);
  }

  @Get('invoice/:invoiceId')
  async getInvoice(@Req() req: any, @Param('invoiceId') invoiceId: string) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Invalid tenant');
    }
    return this.service.getInvoiceDetails(tenantId, invoiceId);
  }

  @Post('invoice/:invoiceId/payment')
  async recordPayment(
    @Req() req: any,
    @Param('invoiceId') invoiceId: string,
    @Body() dto: { amount: number; paymentMethod: 'CASH' | 'CARD' | 'UPI' | 'BANK'; transactionRef?: string; narration?: string },
  ) {
    const tenantId = req.user?.tenantId;
    return this.paymentService.recordPayment(tenantId, { invoiceId, ...dto });
  }

  @Post('invoice/:invoiceId/collect-payment')
  async collectPayment(
    @Req() req: any,
    @Param('invoiceId') invoiceId: string,
    @Body() dto: CollectPaymentDto,
  ) {
    const tenantId = req.user?.tenantId;
    return this.service.collectPayment(tenantId, invoiceId, dto);
  }

  @Get('invoice/:invoiceId/payments')
  async listPayments(@Req() req: any, @Param('invoiceId') invoiceId: string) {
    const tenantId = req.user?.tenantId;
    return this.paymentService.listPayments(tenantId, invoiceId);
  }

  @Get('summary')
  async getSalesSummary(
    @Req() req: any,
    @Query('shopId') shopId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const tenantId = req.user?.tenantId;
    if (!shopId) {
      throw new BadRequestException('shopId is required');
    }
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.service.getSalesSummary(tenantId, shopId, start, end);
  }
}
