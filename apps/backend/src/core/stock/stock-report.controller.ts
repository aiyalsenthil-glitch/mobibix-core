import {
  BadRequestException,
  Controller,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StockReportService } from './stock-report.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

type ReqWithUser = { user?: { tenantId?: string } };

@UseGuards(JwtAuthGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
@Controller('reports')
export class StockReportController {
  constructor(private readonly service: StockReportService) {}

  @Get('negative-stock')
  async negativeStock(@Req() req: ReqWithUser) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Invalid tenant');
    }

    const items = await this.service.getNegativeStockReport(tenantId);
    return { items };
  }
}
