import {
  Body,
  Controller,
  Post,
  Req,
  BadRequestException,
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
}
