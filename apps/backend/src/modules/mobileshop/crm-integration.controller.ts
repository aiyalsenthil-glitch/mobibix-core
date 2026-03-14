import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { GranularPermissionGuard } from '../../core/permissions/guards/granular-permission.guard';
import {
  RequirePermission,
  ModulePermission,
} from '../../core/permissions/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../security/permission-registry';
import { Public } from '../../core/auth/decorators/public.decorator';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { CrmIntegrationService } from './services/crm-integration.service';
import { FollowUpsService } from '../../core/follow-ups/follow-ups.service';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { UserRole, ModuleType, FollowUpStatus } from '@prisma/client';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { TenantRequiredGuard } from '../../core/auth/guards/tenant.guard';
import { TenantScopedController } from '../../core/auth/tenant-scoped.controller';
import { ModuleScope } from '../../core/auth/decorators/module-scope.decorator';
import { CreateFollowUpDto } from '../../core/follow-ups/dto/create-follow-up.dto';

/**
 * MobileShop CRM Controller
 *
 * Follow-up routes call FollowUpsService directly (no HTTP hop).
 * Dashboard, timeline, and WhatsApp routes proxy via CrmIntegrationService.
 */
@Controller('mobileshop/crm')
@ModuleScope(ModuleType.MOBILE_SHOP)
@ModulePermission('crm')
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
  TenantRequiredGuard,
  GranularPermissionGuard,
)
@Roles(UserRole.USER)
export class MobileShopCrmController extends TenantScopedController {
  constructor(
    private readonly crmIntegration: CrmIntegrationService,
    private readonly followUpsService: FollowUpsService,
  ) {
    super();
  }

  private getAccessToken(req: any): string {
    return (
      req.cookies?.mobi_session_token ||
      req.headers.authorization?.replace('Bearer ', '') ||
      ''
    );
  }

  // ─────────────────────────────────────────────
  // FOLLOW-UPS — direct service calls (no HTTP hop)
  // ─────────────────────────────────────────────

  /**
   * GET /mobileshop/crm/follow-ups
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.CRM.MANAGE_FOLLOWUP)
  @Get('follow-ups')
  async getMyFollowUps(
    @Request() req,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId || req.user.sub;

    return this.followUpsService.listMyFollowUps(tenantId, userId, {}, false, {
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  /**
   * GET /mobileshop/crm/follow-ups/counts
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.CRM.VIEW)
  @Get('follow-ups/counts')
  async getFollowUpCounts(@Request() req) {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId || req.user.sub;

    return this.followUpsService.getMyFollowUpCounts(tenantId, userId);
  }

  /**
   * POST /mobileshop/crm/follow-ups
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.CRM.MANAGE_FOLLOWUP)
  @Post('follow-ups')
  async createFollowUp(@Request() req, @Body() dto: CreateFollowUpDto) {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId || req.user.sub;
    const role = req.user.role as UserRole;

    return this.followUpsService.createFollowUp(tenantId, userId, role, dto);
  }

  /**
   * PATCH /mobileshop/crm/follow-ups/:followUpId/status
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.CRM.MANAGE_FOLLOWUP)
  @Patch('follow-ups/:followUpId/status')
  async updateFollowUpStatus(
    @Request() req,
    @Param('followUpId') followUpId: string,
    @Body('status') status: FollowUpStatus,
  ) {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId || req.user.sub;
    const role = req.user.role as UserRole;

    return this.followUpsService.updateStatus(
      tenantId,
      userId,
      role,
      followUpId,
      status,
    );
  }

  // ─────────────────────────────────────────────
  // DASHBOARD — HTTP proxy (complex aggregation)
  // ─────────────────────────────────────────────

  /**
   * GET /mobileshop/crm/dashboard
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.CRM.VIEW)
  @Get('dashboard')
  async getDashboard(
    @Request() req,
    @Query('preset') preset: string = 'LAST_30_DAYS',
    @Query('shopId') shopId?: string,
  ) {
    const headers = this.crmIntegration.buildAuthHeaders(
      this.getAccessToken(req),
    );
    return this.crmIntegration.getDashboardMetrics(headers, preset, shopId);
  }

  // ─────────────────────────────────────────────
  // CUSTOMER TIMELINE — HTTP proxy
  // ─────────────────────────────────────────────

  /**
   * GET /mobileshop/crm/customer-timeline/:customerId
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.CRM.VIEW_TIMELINE)
  @Get('customer-timeline/:customerId')
  async getCustomerTimeline(
    @Request() req,
    @Param('customerId') customerId: string,
    @Query('sources') sources?: string,
  ) {
    const headers = this.crmIntegration.buildAuthHeaders(
      this.getAccessToken(req),
    );
    return this.crmIntegration.getCustomerTimeline(
      headers,
      customerId,
      sources,
    );
  }

  // ─────────────────────────────────────────────
  // WHATSAPP — direct sender
  // ─────────────────────────────────────────────

  /**
   * POST /mobileshop/crm/whatsapp/send
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.CRM.SEND_WHATSAPP)
  @Post('whatsapp/send')
  async sendWhatsApp(
    @Request() req,
    @Body()
    data: {
      customerId: string;
      phone: string;
      message: string;
      source?: string;
      sourceId?: string;
    },
  ) {
    const headers = this.crmIntegration.buildAuthHeaders(
      this.getAccessToken(req),
    );
    return this.crmIntegration.sendWhatsAppMessage(headers, data);
  }

  /**
   * GET /mobileshop/crm/health
   */
  @Public()
  @Get('health')
  async health(@Request() req) {
    const headers = this.crmIntegration.buildAuthHeaders(
      this.getAccessToken(req),
    );
    const isHealthy = await this.crmIntegration.healthCheck(headers);
    return { status: isHealthy ? 'OK' : 'DOWN', service: 'CRM' };
  }
}
