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
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesInvoiceDto } from './dto/sales-invoice.dto';

@Controller('mobileshop/sales')
export class SalesController {
  constructor(private readonly service: SalesService) {}

  @Post('invoice')
  async create(@Req() req, @Body() dto: SalesInvoiceDto) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new BadRequestException('Invalid tenant');

    return this.service.createInvoice(tenantId, dto);
  }
  @Patch('invoice/:invoiceId')
  async update(
    @Req() req,
    @Param('invoiceId') invoiceId: string,
    @Body() dto: SalesInvoiceDto,
  ) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Invalid tenant');
    }
    const role = req.user?.role;
    if (role !== 'OWNER') {
      throw new ForbiddenException('Only owner can update invoice');
    }
    return this.service.updateInvoice(tenantId, invoiceId, dto);
  }

  @Post('invoice/:invoiceId/cancel')
  async cancel(@Req() req, @Param('invoiceId') invoiceId: string) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Invalid tenant');
    }
    const role = req.user?.role;
    if (role !== 'OWNER') {
      throw new ForbiddenException('Only owner can cancel invoice');
    }
    return this.service.cancelInvoice(tenantId, invoiceId);
  }

  @Get('invoices')
  async list(@Req() req, @Query('shopId') shopId: string) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Invalid tenant');
    }

    if (!shopId) {
      throw new BadRequestException('shopId is required');
    }

    return this.service.listInvoices(tenantId, shopId);
  }
  @Get('invoice/:invoiceId')
  async getInvoice(@Req() req, @Param('invoiceId') invoiceId: string) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Invalid tenant');
    }

    return this.service.getInvoiceDetails(tenantId, invoiceId);
  }
}
