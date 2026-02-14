import {
  BadRequestException,
  Controller,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { StockReportService } from './stock-report.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

type ReqWithUser = { user: { tenantId: string } };

@UseGuards(JwtAuthGuard, TenantRequiredGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
@Controller('reports')
export class StockReportController {
  constructor(private readonly service: StockReportService) {}

  @Get('negative-stock')
  async negativeStock(@Req() req: ReqWithUser) {
    const items = await this.service.getNegativeStockReport(req.user.tenantId);
    return { items };
  }
}
