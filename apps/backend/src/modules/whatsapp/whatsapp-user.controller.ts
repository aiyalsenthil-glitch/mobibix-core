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
import { GranularPermissionGuard } from '../../core/permissions/guards/granular-permission.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { RequirePermission, ModulePermission } from '../../core/permissions/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../security/permission-registry';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../../core/auth/guards/tenant.guard';
import {
  PlanFeatureGuard,
  RequirePlanFeature,
} from '../../core/billing/guards/plan-feature.guard';
import { WhatsAppUserService } from './whatsapp-user.service';
import {
  CreateWhatsAppCampaignDto,
  ScheduleWhatsAppCampaignDto,
  SendWhatsAppMessageDto,
  WhatsAppLogsQueryDto,
} from './dto/whatsapp-user.dto';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { ModuleScope } from '../../core/auth/decorators/module-scope.decorator';
import { ModuleType, UserRole } from '@prisma/client';

@Controller('user/whatsapp')
@ModuleScope(ModuleType.WHATSAPP_CRM)
@ModulePermission('whatsapp')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard, GranularPermissionGuard, PlanFeatureGuard)
@Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.STAFF)
export class WhatsAppUserController {
  constructor(private readonly whatsappUserService: WhatsAppUserService) {}

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.WHATSAPP.VIEW_DASHBOARD)
  @Get('dashboard')
  async getDashboard(@Req() req: any) {
    return this.whatsappUserService.getDashboard(req.user.tenantId);
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.WHATSAPP.VIEW_NUMBERS)
  @Get('numbers')
  async getNumbers(@Req() req: any) {
    return this.whatsappUserService.getNumbers(req.user.tenantId);
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.WHATSAPP.SEND)
  @RequirePlanFeature('WHATSAPP_UTILITY')
  @Post('send')
  async sendMessage(@Req() req: any, @Body() dto: SendWhatsAppMessageDto) {
    return this.whatsappUserService.sendMessage(req.user.tenantId, dto);
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.WHATSAPP.VIEW_LOGS)
  @Get('logs')
  async getLogs(@Req() req: any, @Query() query: WhatsAppLogsQueryDto) {
    return this.whatsappUserService.getLogs(req.user.tenantId, query);
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.WHATSAPP.MANAGE_CAMPAIGNS)
  @RequirePlanFeature('WHATSAPP_MARKETING')
  @Post('campaigns')
  async createCampaign(
    @Req() req: any,
    @Body() dto: CreateWhatsAppCampaignDto,
  ) {
    return this.whatsappUserService.createCampaign(req.user.tenantId, dto);
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.WHATSAPP.MANAGE_CAMPAIGNS)
  @RequirePlanFeature('WHATSAPP_MARKETING')
  @Patch('campaigns/:id/schedule')
  async scheduleCampaign(
    @Req() req: any,
    @Param('id') campaignId: string,
    @Body() dto: ScheduleWhatsAppCampaignDto,
  ) {
    return this.whatsappUserService.scheduleCampaign(
      req.user.tenantId,
      campaignId,
      dto,
    );
  }
}
