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
@UseGuards(JwtAuthGuard, TenantRequiredGuard, PlanFeatureGuard)
@Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.STAFF)
export class WhatsAppUserController {
  constructor(private readonly whatsappUserService: WhatsAppUserService) {}

  @Get('dashboard')
  async getDashboard(@Req() req: any) {
    return this.whatsappUserService.getDashboard(req.user.tenantId);
  }

  @Get('numbers')
  async getNumbers(@Req() req: any) {
    return this.whatsappUserService.getNumbers(req.user.tenantId);
  }

  @Post('send')
  @RequirePlanFeature('WHATSAPP_UTILITY')
  async sendMessage(@Req() req: any, @Body() dto: SendWhatsAppMessageDto) {
    return this.whatsappUserService.sendMessage(req.user.tenantId, dto);
  }

  @Get('logs')
  async getLogs(@Req() req: any, @Query() query: WhatsAppLogsQueryDto) {
    return this.whatsappUserService.getLogs(req.user.tenantId, query);
  }

  @Post('campaigns')
  @RequirePlanFeature('WHATSAPP_MARKETING')
  async createCampaign(
    @Req() req: any,
    @Body() dto: CreateWhatsAppCampaignDto,
  ) {
    return this.whatsappUserService.createCampaign(req.user.tenantId, dto);
  }

  @Patch('campaigns/:id/schedule')
  @RequirePlanFeature('WHATSAPP_MARKETING')
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
