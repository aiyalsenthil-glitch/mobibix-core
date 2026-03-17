import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { EWayBillStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { Permissions } from '../../../core/auth/decorators/permissions.decorator';
import { Permission } from '../../../core/auth/permissions.enum';
import { EWayBillService } from './ewaybill.service';
import { GenerateEWayBillDto } from './dto/generate-ewb.dto';
import { CancelEWayBillDto } from './dto/cancel-ewb.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class EWayBillController {
  constructor(private readonly service: EWayBillService) {}

  /** POST /invoices/:invoiceId/ewaybill */
  @Post('invoices/:invoiceId/ewaybill')
  @Permissions(Permission.SALES_CREATE)
  generate(
    @Req() req: any,
    @Param('invoiceId') invoiceId: string,
    @Body() dto: GenerateEWayBillDto,
  ) {
    return this.service.generateEWayBill(
      req.user.tenantId,
      req.user.userId,
      invoiceId,
      dto,
    );
  }

  /** GET /invoices/:invoiceId/ewaybill */
  @Get('invoices/:invoiceId/ewaybill')
  @Permissions(Permission.SALES_VIEW)
  getByInvoice(@Req() req: any, @Param('invoiceId') invoiceId: string) {
    return this.service.getByInvoice(req.user.tenantId, invoiceId);
  }

  /** POST /ewaybill/:id/cancel */
  @Post('ewaybill/:id/cancel')
  @Permissions(Permission.SALES_CANCEL)
  cancel(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: CancelEWayBillDto,
  ) {
    return this.service.cancelEWayBill(req.user.tenantId, id, dto);
  }

  /** GET /ewaybill?shopId=&page=&status=&limit= */
  @Get('ewaybill')
  @Permissions(Permission.SALES_VIEW)
  list(
    @Req() req: any,
    @Query('shopId') shopId: string,
    @Query('page') page?: string,
    @Query('status') status?: EWayBillStatus,
    @Query('limit') limit?: string,
  ) {
    return this.service.list(
      req.user.tenantId,
      shopId,
      page ? parseInt(page, 10) : 1,
      status,
      limit ? parseInt(limit, 10) : 20,
    );
  }
}
