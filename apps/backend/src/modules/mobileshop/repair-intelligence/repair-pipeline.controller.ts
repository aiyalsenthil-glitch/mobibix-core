import { Controller, Get, Post, Body, Param, Req, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { GranularPermissionGuard } from '../../../core/permissions/guards/granular-permission.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { RequirePermission } from '../../../core/permissions/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../../security/permission-registry';
import { UserRole } from '@prisma/client';
import { RepairPipelineMonitorService } from './repair-pipeline-monitor.service';
import { JobCardQCService } from './job-card-qc.service';
import { RepairIntelligenceService } from './repair-intelligence.service';
import { JobCardsService } from '../jobcard/job-cards.service';
import { TenantScopedController } from '../../../core/auth/tenant-scoped.controller';

@Controller('mobileshop/pipeline')
@UseGuards(JwtAuthGuard, RolesGuard, GranularPermissionGuard)
export class RepairPipelineController extends TenantScopedController {
  constructor(
    private readonly monitorService: RepairPipelineMonitorService,
    private readonly qcService: JobCardQCService,
    private readonly intelligenceService: RepairIntelligenceService,
    private readonly jobCardsService: JobCardsService,
  ) {
    super();
  }

  /**
   * 🚨 Feature 5: Bottleneck Detection
   */
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.PIPELINE.VIEW_MONITOR)
  @Get('bottlenecks')
  async getBottlenecks(@Req() req: any, @Query('shopId') shopId?: string) {
    const tenantId = this.getTenantId(req);
    return this.monitorService.getBottlenecks(tenantId, shopId);
  }

  /**
   * 🔔 Feature 6: Smart Reminder Alerts
   */
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.PIPELINE.VIEW_MONITOR)
  @Get('delays')
  async getDelays(@Req() req: any, @Query('shopId') shopId?: string) {
    const tenantId = this.getTenantId(req);
    return this.monitorService.getCustomerDelayAlerts(tenantId, shopId);
  }

  /**
   * 👷 Feature 4: Technician Work Queue
   */
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF) // STAFF includes Technician role in UserRole enum usually, or mapped
  @Get('my-queue')
  async getMyQueue(@Req() req: any) {
    const tenantId = this.getTenantId(req);
    const userId = req.user.sub || req.user.id;
    return this.jobCardsService.getMyQueue(userId, tenantId);
  }

  /**
   * 📋 Feature 7: QC Checklist
   */
  @Get('qc/:jobId')
  async getQC(@Param('jobId') jobId: string) {
    return this.qcService.getQC(jobId);
  }

  @Post('qc/:jobId')
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.PIPELINE.MANAGE_QC)
  async saveQC(
    @Req() req: any,
    @Param('jobId') jobId: string,
    @Body() data: any,
  ) {
    return this.qcService.saveQC(req.user, jobId, data);
  }

  /**
   * 🛠️ Feature 3: Smart Parts Suggestion
   */
  @Get('suggest-parts/:faultTypeId')
  async suggestParts(
    @Req() req: any,
    @Query('shopId') shopId: string,
    @Param('faultTypeId') faultTypeId: string,
  ) {
    const tenantId = this.getTenantId(req);
    return this.intelligenceService.suggestParts(tenantId, shopId, faultTypeId);
  }

  /**
   * 🤖 Feature 2: Auto Fault Detection (Live Suggestion)
   */
  @Get('suggest-fault')
  async suggestFault(
    @Req() req: any,
    @Query('complaint') complaint: string,
  ) {
    const tenantId = this.getTenantId(req);
    return this.intelligenceService.suggestFaultType(tenantId, complaint);
  }
}
