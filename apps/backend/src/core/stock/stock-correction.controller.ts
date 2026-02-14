import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { StockCorrectionService } from './stock-correction.service';
import { StockCorrectionDto } from './dto/stock-correction.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

type ReqWithUser = { user: { tenantId: string; sub?: string } };

@UseGuards(JwtAuthGuard, TenantRequiredGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
@Controller('mobileshop/stock')
export class StockCorrectionController {
  constructor(private readonly service: StockCorrectionService) {}

  @Post('correct')
  async correct(@Req() req: ReqWithUser, @Body() dto: StockCorrectionDto) {
    return this.service.correctStock(req.user.tenantId, req.user?.sub, dto);
  }
}
