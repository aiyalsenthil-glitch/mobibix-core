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
import { RequirePermission, ModulePermission } from '../../../core/permissions/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../../security/permission-registry';
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
@ModulePermission('jobcard')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard, GranularPermissionGuard, TenantStatusGuard)
@Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF, UserRole.ACCOUNTANT, UserRole.TECHNICIAN)
export class JobCardsController extends TenantScopedController {
  constructor(private readonly service: JobCardsService) {
    super();
  }

  @Post()
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.JOBCARD.CREATE)
  create(
    @Param('shopId') shopId: string,
    @Req() req: any,
    @Body() dto: CreateJobCardDto,
  ) {
    return this.service.create(req.user, shopId, dto);
  }

  @Get()
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.JOBCARD.VIEW)
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
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.JOBCARD.VIEW)
  getOne(
    @Param('shopId') shopId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.service.getOne(req.user, shopId, id);
  }
  @Patch(':id')
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.JOBCARD.UPDATE)
  update(
    @Param('shopId') shopId: string,
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: UpdateJobCardDto,
  ) {
    return this.service.update(req.user, shopId, id, dto);
  }

  @Patch(':id/status')
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.JOBCARD.UPDATE_STATUS)
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
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.JOBCARD.DELETE)
  delete(
    @Param('shopId') shopId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.service.delete(req.user, shopId, id);
  }

  // ===== PARTS MANAGEMENT =====

  @Post(':id/parts')
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.JOBCARD.ADD_PART)
  addPart(
    @Param('shopId') shopId: string,
    @Param('id') jobId: string,
    @Req() req: any,
    @Body() dto: { productId: string; quantity: number },
  ) {
    return this.service.addPart(req.user, shopId, jobId, dto);
  }

  @Delete(':id/parts/:partId')
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.JOBCARD.REMOVE_PART)
  removePart(
    @Param('shopId') shopId: string,
    @Param('id') jobId: string,
    @Param('partId') partId: string,
    @Req() req: any,
  ) {
    return this.service.removePart(req.user, shopId, jobId, partId);
  }

  @Post(':id/cancel')
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.JOBCARD.CANCEL)
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
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.JOBCARD.UPDATE_CHARGE)
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
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.JOBCARD.MANAGE_ADVANCE)
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
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.JOBCARD.MANAGE_ADVANCE)
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
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.JOBCARD.REOPEN)
  reopen(
    @Param('shopId') shopId: string,
    @Param('id') jobId: string,
    @Req() req: any,
  ) {
    return this.service.reopen(req.user, shopId, jobId);
  }
  @Post(':id/warranty')
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.JOBCARD.CREATE_WARRANTY)
  createWarranty(
    @Param('shopId') shopId: string,
    @Param('id') originalJobId: string,
    @Req() req: any,
  ) {
    return this.service.createWarrantyJob(req.user, shopId, originalJobId);
  }

  // ===== CONSENT MANAGEMENT =====

  @Post(':id/consent')
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.JOBCARD.RECORD_CONSENT)
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
