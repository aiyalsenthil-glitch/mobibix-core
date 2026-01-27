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
import { SalesInvoiceDto } from './dto/sales-invoice.dto';

@Controller('mobileshop/sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
  constructor(private readonly service: SalesService) {}

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
    return this.service.getInvoiceDetails(tenantId, invoiceId);
  }
}
