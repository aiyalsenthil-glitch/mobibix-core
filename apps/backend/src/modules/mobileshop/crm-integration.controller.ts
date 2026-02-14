import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { CrmIntegrationService } from './services/crm-integration.service';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { TenantRequiredGuard } from '../../core/auth/guards/tenant.guard';
import { TenantScopedController } from '../../core/auth/tenant-scoped.controller';
import { ModuleScope } from '../../core/auth/decorators/module-scope.decorator';

/**
 * Example Controller: MobileShop CRM Dashboard Integration
 *
 * Shows how MobileShop screens call CORE CRM APIs through CrmIntegrationService
 * This is NOT a CORE CRM controller - it's a MobileShop consumer
 */
@Controller('mobileshop/crm')
@ModuleScope(ModuleType.MOBILE_SHOP)
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class MobileShopCrmController extends TenantScopedController {
  constructor(private readonly crmIntegration: CrmIntegrationService) {
    super();
  }

  /**
   * Extract JWT from cookies (httpOnly) or Authorization header (fallback)
   * Supports both cookie-based and bearer token auth
   */
  private getAccessToken(req: any): string {
    return (
      req.cookies?.accessToken ||
      req.headers.authorization?.replace('Bearer ', '') ||
      ''
    );
  }

  /**
   * GET /mobileshop/crm/dashboard
   * Get CRM metrics for MobileShop home screen
   * Proxy to CORE: GET /api/core/crm-dashboard
   */
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

  /**
   * GET /mobileshop/crm/follow-ups
   * Get follow-ups assigned to current user
   * Proxy to CORE: GET /api/core/follow-ups/my
   */
  @Get('follow-ups')
  async getMyFollowUps(@Request() req) {
    const headers = this.crmIntegration.buildAuthHeaders(
      this.getAccessToken(req),
    );

    return this.crmIntegration.getMyFollowUps(headers);
  }

  /**
   * GET /mobileshop/crm/follow-ups/counts
   * Get counts of pending and overdue follow-ups
   * Proxy to CORE: GET /api/core/follow-ups/counts
   */
  @Get('follow-ups/counts')
  async getFollowUpCounts(@Request() req) {
    const headers = this.crmIntegration.buildAuthHeaders(
      this.getAccessToken(req),
    );

    return this.crmIntegration.getFollowUpCounts(headers);
  }

  /**
   * POST /mobileshop/crm/follow-ups
   * Create a follow-up from Job Card or Customer screen
   * Proxy to CORE: POST /api/core/follow-ups
   */
  @Post('follow-ups')
  async createFollowUp(
    @Request() req,
    @Body()
    data: {
      customerId: string;
      type: string;
      purpose: string;
      followUpAt: string;
      assignedToUserId?: string;
      shopId?: string;
    },
  ) {
    const headers = this.crmIntegration.buildAuthHeaders(
      this.getAccessToken(req),
    );

    return this.crmIntegration.createFollowUp(headers, data);
  }

  /**
   * GET /mobileshop/crm/customer-timeline/:customerId
   * Get timeline for a customer
   * Proxy to CORE: GET /api/core/customer-timeline/{customerId}
   */
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

  /**
   * POST /mobileshop/crm/whatsapp/send
   * Send WhatsApp message from MobileShop event
   * Proxy to CORE: POST /api/modules/whatsapp/send
   */
  @Post('whatsapp/send')
  async sendWhatsApp(
    @Request() req,
    @Body()
    data: {
      customerId: string;
      phone: string;
      message: string;
      source?: string; // e.g., 'JOB_READY', 'INVOICE_CREATED'
      sourceId?: string;
    },
  ) {
    const headers = this.crmIntegration.buildAuthHeaders(
      this.getAccessToken(req),
    );

    return this.crmIntegration.sendWhatsAppMessage(headers, data);
  }

  /**
   * HEALTH CHECK
   * Optional: Verify CRM is reachable
   */
  @Get('health')
  async health(@Request() req) {
    const headers = this.crmIntegration.buildAuthHeaders(
      this.getAccessToken(req),
    );

    const isHealthy = await this.crmIntegration.healthCheck(headers);
    return { status: isHealthy ? 'OK' : 'DOWN', service: 'CRM' };
  }
}
