import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { Permissions } from '../../../core/auth/decorators/permissions.decorator';
import { Permission } from '../../../core/auth/permissions.enum';
import { EmiApplicationService } from './emi-application.service';
import { InstallmentPlanService } from './installment-plan.service';
import {
  CreateEmiApplicationDto,
  CreateInstallmentPlanDto,
  RecordSlotPaymentDto,
  UpdateEmiStatusDto,
} from './dto/finance.dto';
import { EmiStatus, InstallmentStatus } from '@prisma/client';

@Controller('finance')
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(
    private readonly emiService: EmiApplicationService,
    private readonly planService: InstallmentPlanService,
  ) {}

  // ─── Dashboard Summary ─────────────────────────────────────────────────────

  @Get('summary')
  @Permissions(Permission.SALES_VIEW)
  async summary(@Req() req, @Query('shopId') shopId: string) {
    const [emi, installment] = await Promise.all([
      this.emiService.summary(req.user.tenantId, shopId),
      this.planService.summary(req.user.tenantId, shopId),
    ]);
    return { emi, installment };
  }

  // ─── EMI Applications ─────────────────────────────────────────────────────

  @Post('emi')
  @Permissions(Permission.SALES_CREATE)
  createEmi(@Req() req, @Body() dto: CreateEmiApplicationDto) {
    return this.emiService.create(req.user.tenantId, req.user.userId, dto);
  }

  @Get('emi')
  @Permissions(Permission.SALES_VIEW)
  listEmi(
    @Req() req,
    @Query('shopId') shopId: string,
    @Query('status') status?: EmiStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.emiService.list(req.user.tenantId, shopId, {
      status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }

  @Get('emi/:id')
  @Permissions(Permission.SALES_VIEW)
  getEmi(@Req() req, @Param('id') id: string) {
    return this.emiService.getOne(req.user.tenantId, id);
  }

  @Patch('emi/:id/status')
  @Permissions(Permission.SALES_CREATE)
  updateEmiStatus(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateEmiStatusDto,
  ) {
    return this.emiService.updateStatus(req.user.tenantId, id, dto);
  }

  // ─── Installment Plans ─────────────────────────────────────────────────────

  @Post('installment')
  @Permissions(Permission.SALES_CREATE)
  createPlan(@Req() req, @Body() dto: CreateInstallmentPlanDto) {
    return this.planService.create(req.user.tenantId, req.user.userId, dto);
  }

  @Get('installment')
  @Permissions(Permission.SALES_VIEW)
  listPlans(
    @Req() req,
    @Query('shopId') shopId: string,
    @Query('status') status?: InstallmentStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.planService.list(req.user.tenantId, shopId, {
      status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }

  @Get('installment/:id')
  @Permissions(Permission.SALES_VIEW)
  getPlan(@Req() req, @Param('id') id: string) {
    return this.planService.getOne(req.user.tenantId, id);
  }

  @Post('installment/slots/:slotId/pay')
  @Permissions(Permission.SALES_CREATE)
  recordPayment(
    @Req() req,
    @Param('slotId') slotId: string,
    @Body() dto: RecordSlotPaymentDto,
  ) {
    return this.planService.recordPayment(req.user.tenantId, slotId, dto);
  }
}
