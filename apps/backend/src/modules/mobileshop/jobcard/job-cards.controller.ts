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
import { GranularPermissionGuard } from '../../../core/permissions/guards/granular-permission.guard';
import { RequirePermission } from '../../../core/permissions/decorators/require-permission.decorator';
import { PaymentMode, UserRole, ModuleType, JobStatus } from '@prisma/client';
import { UpdateJobStatusDto } from './dto/update-job-status.dto';

import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { JobCardsService } from '../jobcard/job-cards.service';
import { CreateJobCardDto } from '../jobcard/dto/create-job-card.dto';
import { UpdateJobCardDto } from './dto/update-job-card.dto';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { TenantRequiredGuard } from '../../../core/auth/guards/tenant.guard';
import { TenantStatusGuard } from '../../../core/tenant/guards/tenant-status.guard';
import { TenantScopedController } from '../../../core/auth/tenant-scoped.controller';
import { ModuleScope } from '../../../core/auth/decorators/module-scope.decorator';

@Controller('mobileshop/shops/:shopId/job-cards')
@ModuleScope(ModuleType.MOBILE_SHOP)
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard, GranularPermissionGuard, TenantStatusGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class JobCardsController extends TenantScopedController {
  constructor(private readonly service: JobCardsService) {
    super();
  }

  @Post()
  @RequirePermission(ModuleType.MOBILE_SHOP, 'jobcard', 'create')
  create(
    @Param('shopId') shopId: string,
    @Req() req: any,
    @Body() dto: CreateJobCardDto,
  ) {
    return this.service.create(req.user, shopId, dto);
  }

  @Get()
  @RequirePermission(ModuleType.MOBILE_SHOP, 'jobcard', 'view')
  list(
    @Param('shopId') shopId: string,
    @Req() req: any,
    @Query('status') status?: JobStatus,
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.service.list(req.user, shopId, { 
      status, 
      search, 
      skip: skip ? parseInt(skip) : undefined, 
      take: take ? parseInt(take) : undefined 
    });
  }
  @Get(':id')
  getOne(
    @Param('shopId') shopId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.service.getOne(req.user, shopId, id);
  }
  @Patch(':id')
  update(
    @Param('shopId') shopId: string,
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: UpdateJobCardDto,
  ) {
    return this.service.update(req.user, shopId, id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('shopId') shopId: string,
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: UpdateJobStatusDto,
  ) {
    return this.service.updateStatus(
      req.user,
      shopId,
      id,
      dto.status,
      dto.refundDetails,
    );
  }

  @Delete(':id')
  delete(
    @Param('shopId') shopId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.service.delete(req.user, shopId, id);
  }

  // ===== PARTS MANAGEMENT =====

  @Post(':id/parts')
  addPart(
    @Param('shopId') shopId: string,
    @Param('id') jobId: string,
    @Req() req: any,
    @Body() dto: { productId: string; quantity: number },
  ) {
    return this.service.addPart(req.user, shopId, jobId, dto);
  }

  @Delete(':id/parts/:partId')
  removePart(
    @Param('shopId') shopId: string,
    @Param('id') jobId: string,
    @Param('partId') partId: string,
    @Req() req: any,
  ) {
    return this.service.removePart(req.user, shopId, jobId, partId);
  }

  @Post(':id/cancel')
  cancelJob(
    @Param('shopId') shopId: string,
    @Param('id') jobId: string,
    @Req() req: any,
    @Body() dto: { reason?: string },
  ) {
    return this.service.cancelJob(req.user, shopId, jobId, dto.reason);
  }

  // ===== SERVICE CHARGE MANAGEMENT =====

  @Patch(':id/service-charge')
  updateServiceCharge(
    @Param('shopId') shopId: string,
    @Param('id') jobId: string,
    @Req() req: any,
    @Body() dto: { serviceChargePaisa: number },
  ) {
    return this.service.updateServiceCharge(
      req.user,
      shopId,
      jobId,
      dto.serviceChargePaisa,
    );
  }

  // ===== ADVANCE MANAGEMENT =====

  @Post(':id/advance')
  addAdvance(
    @Param('shopId') shopId: string,
    @Param('id') jobId: string,
    @Req() req: any,
    @Body() dto: { amount: number; mode: string },
  ) {
    return this.service.addAdvance(
      req.user,
      shopId,
      jobId,
      dto.amount,
      dto.mode as PaymentMode,
    );
  }

  @Post(':id/advance/refund')
  refundAdvance(
    @Param('shopId') shopId: string,
    @Param('id') jobId: string,
    @Req() req: any,
    @Body() dto: { amount: number; mode: string },
  ) {
    return this.service.refundAdvance(
      req.user,
      shopId,
      jobId,
      dto.amount,
      dto.mode as PaymentMode,
    );
  }

  // ===== REOPEN CANCELLED JOB =====

  @Patch(':id/reopen')
  reopen(
    @Param('shopId') shopId: string,
    @Param('id') jobId: string,
    @Req() req: any,
  ) {
    return this.service.reopen(req.user, shopId, jobId);
  }
  @Post(':id/warranty')
  createWarranty(
    @Param('shopId') shopId: string,
    @Param('id') originalJobId: string,
    @Req() req: any,
  ) {
    return this.service.createWarrantyJob(req.user, shopId, originalJobId);
  }

  // ===== CONSENT MANAGEMENT =====

  @Post(':id/consent')
  recordConsent(
    @Param('shopId') shopId: string,
    @Param('id') jobId: string,
    @Req() req: any,
    @Body()
    dto: { consentNonRefundable: boolean; consentSignatureUrl?: string },
  ) {
    return this.service.recordConsent(
      req.user,
      shopId,
      jobId,
      dto.consentNonRefundable,
      dto.consentSignatureUrl,
    );
  }
}
