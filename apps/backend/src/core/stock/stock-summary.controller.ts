import {
  Controller,
  Get,
  Query,
  Req,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { StockSummaryService } from './stock-summary.service';

@Controller('mobileshop/stock')
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class StockSummaryController {
  constructor(private readonly service: StockSummaryService) {}

  @Get('summary')
  async summary(@Req() req, @Query('shopId') shopId: string) {
    if (!shopId) {
      throw new BadRequestException('shopId is required');
    }

    const tenantId = req.user.tenantId;

    return this.service.getSummary(tenantId, shopId);
  }
}
