import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommissionService } from './commission.service';
import { CreateCommissionRuleDto, MarkPaidDto } from './dto/commission.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/permissions.enum';
import { EarningStatus } from '@prisma/client';

@Controller('commission')
@UseGuards(JwtAuthGuard)
export class CommissionController {
  constructor(private readonly service: CommissionService) {}

  // ─── Rules ────────────────────────────────────────────────────────────────

  @Post('rules')
  @Permissions(Permission.STAFF_MANAGE)
  createRule(@Req() req, @Body() dto: CreateCommissionRuleDto) {
    return this.service.createRule(req.user.tenantId, dto);
  }

  @Get('rules')
  @Permissions(Permission.STAFF_MANAGE)
  listRules(@Req() req, @Query('shopId') shopId: string) {
    return this.service.listRules(req.user.tenantId, shopId);
  }

  @Patch('rules/:ruleId/toggle')
  @Permissions(Permission.STAFF_MANAGE)
  toggleRule(
    @Req() req,
    @Param('ruleId') ruleId: string,
    @Query('active') active: string,
  ) {
    return this.service.toggleRule(req.user.tenantId, ruleId, active !== 'false');
  }

  @Delete('rules/:ruleId')
  @Permissions(Permission.STAFF_MANAGE)
  deleteRule(@Req() req, @Param('ruleId') ruleId: string) {
    return this.service.deleteRule(req.user.tenantId, ruleId);
  }

  // ─── Earnings ─────────────────────────────────────────────────────────────

  @Get('earnings')
  @Permissions(Permission.STAFF_VIEW)
  listEarnings(
    @Req() req,
    @Query('shopId') shopId: string,
    @Query('staffId') staffId?: string,
    @Query('status') status?: EarningStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listEarnings(req.user.tenantId, shopId, {
      staffId,
      status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }

  @Post('earnings/mark-paid')
  @Permissions(Permission.STAFF_MANAGE)
  markPaid(@Req() req, @Body() dto: MarkPaidDto) {
    return this.service.markPaid(req.user.tenantId, dto);
  }
}
