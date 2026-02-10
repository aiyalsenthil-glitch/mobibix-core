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
import { Request } from 'express';
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
import { UserRole } from '@prisma/client';

@Controller('user/whatsapp')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, PlanFeatureGuard)
@Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.STAFF)
export class WhatsAppUserController {
  constructor(private readonly whatsappUserService: WhatsAppUserService) {}

  private getTenantId(req: Request & { user?: { tenantId?: string } }) {
    return req.user?.tenantId ?? '';
  }

  @Get('dashboard')
  async getDashboard(@Req() req: Request & { user?: { tenantId?: string } }) {
    const tenantId = this.getTenantId(req);
    return this.whatsappUserService.getDashboard(tenantId);
  }

  @Post('send')
  @RequirePlanFeature('WHATSAPP_UTILITY') // Block STANDARD users
  async sendMessage(
    @Req() req: Request & { user?: { tenantId?: string } },
    @Body() dto: SendWhatsAppMessageDto,
  ) {
    const tenantId = this.getTenantId(req);
    return this.whatsappUserService.sendMessage(tenantId, dto);
  }

  @Get('logs')
  async getLogs(
    @Req() req: Request & { user?: { tenantId?: string } },
    @Query() query: WhatsAppLogsQueryDto,
  ) {
    const tenantId = this.getTenantId(req);
    return this.whatsappUserService.getLogs(tenantId, query);
  }

  @Post('campaigns')
  @RequirePlanFeature('WHATSAPP_MARKETING') // Block STANDARD users
  async createCampaign(
    @Req() req: Request & { user?: { tenantId?: string } },
    @Body() dto: CreateWhatsAppCampaignDto,
  ) {
    const tenantId = this.getTenantId(req);
    return this.whatsappUserService.createCampaign(tenantId, dto);
  }

  @Patch('campaigns/:id/schedule')
  @RequirePlanFeature('WHATSAPP_MARKETING') // Block STANDARD users
  async scheduleCampaign(
    @Req() req: Request & { user?: { tenantId?: string } },
    @Param('id') campaignId: string,
    @Body() dto: ScheduleWhatsAppCampaignDto,
  ) {
    const tenantId = this.getTenantId(req);
    return this.whatsappUserService.scheduleCampaign(tenantId, campaignId, dto);
  }
}
