import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { WhatsAppOnboardingService } from './whatsapp-onboarding.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { WhatsAppCrmSubscriptionGuard } from '../guards/whatsapp-crm-subscription.guard';
import { GranularPermissionGuard } from '../../../core/permissions/guards/granular-permission.guard';
import { RequirePermission, ModulePermission } from '../../../core/permissions/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../../security/permission-registry';
import { Public } from '../../../core/auth/decorators/public.decorator';
import { ModuleScope } from '../../../core/auth/decorators/module-scope.decorator';
import type { Response } from 'express';

@Controller('integrations/whatsapp')
@ModuleScope(ModuleType.MOBILE_SHOP)
@ModulePermission('whatsapp')
export class WhatsAppOnboardingController {
  constructor(private readonly onboardingService: WhatsAppOnboardingService) {}

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.WHATSAPP.ONBOARD_SYNC)
  @Post('manual-sync')
  @UseGuards(JwtAuthGuard, RolesGuard, GranularPermissionGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async manualSync(
    @Req() req,
    @Body()
    body: {
      wabaId: string;
      phoneNumberId: string;
      accessToken: string;
      phoneNumber: string;
    },
  ) {
    const tenantId = req.user.tenantId;
    await this.onboardingService.manualSync(
      tenantId,
      body.wabaId,
      body.phoneNumberId,
      body.accessToken,
      body.phoneNumber,
    );
    return { success: true, message: 'WhatsApp configuration synced manually' };
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.WHATSAPP.VIEW_DASHBOARD)
  @Get('status')
  @UseGuards(JwtAuthGuard, RolesGuard, GranularPermissionGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async getStatus(@Req() req) {
    const tenantId = req.user.tenantId;
    return this.onboardingService.getStatus(tenantId);
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.WHATSAPP.ONBOARD_CONNECT)
  @Get('connect')
  @UseGuards(JwtAuthGuard, RolesGuard, GranularPermissionGuard, WhatsAppCrmSubscriptionGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async connect(
    @Req() req,
    @Res() res: Response,
    @Query('returnUrl') returnUrl?: string,
  ) {
    const tenantId = req.user.tenantId;
    const url = await this.onboardingService.generateConnectUrl(
      tenantId,
      returnUrl,
    );
    return res.json({ url });
  }

  @Public()
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('waba_id') wabaId: string,
    @Query('phone_number_id') phoneNumberId: string,
    @Res() res: Response,
  ) {
    const defaultErrorRedirect = '/whatsapp?status=error';
    const defaultSuccessRedirect = '/whatsapp?status=success';

    if (error) {
      return res.redirect(
        defaultErrorRedirect + '&message=' + encodeURIComponent(error),
      );
    }

    try {
      const result = await this.onboardingService.handleCallback(
        code,
        state,
        wabaId,
        phoneNumberId,
      );
      const redirectUrl = result.returnUrl || defaultSuccessRedirect;

      // Ensure the redirect URL has the success status
      const finalUrl = redirectUrl.includes('?')
        ? `${redirectUrl}&status=success`
        : `${redirectUrl}?status=success`;

      return res.redirect(finalUrl);
    } catch (err) {
      return res.redirect(
        defaultErrorRedirect + '&message=' + encodeURIComponent(err.message),
      );
    }
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.WHATSAPP.ONBOARD_CONNECT)
  @Post('switch-provider')
  @UseGuards(JwtAuthGuard, RolesGuard, GranularPermissionGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async switchProvider(
    @Req() req,
    @Body() body: { provider: 'META_CLOUD' | 'WEB_SOCKET' | 'AUTHKEY' },
  ) {
    const tenantId = req.user.tenantId;
    return this.onboardingService.switchProvider(tenantId, body.provider);
  }

  /**
   * Configure Authkey credentials for Official WhatsApp mode.
   * POST /integrations/whatsapp/configure-REMOVED_TOKEN
   * Body: { apiKey, senderId, phoneNumber }
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.WHATSAPP.ONBOARD_CONNECT)
  @Post('configure-REMOVED_TOKEN')
  @UseGuards(JwtAuthGuard, RolesGuard, GranularPermissionGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async configureAuthkey(
    @Req() req,
    @Body() body: { apiKey: string; senderId: string; phoneNumber: string },
  ) {
    const tenantId = req.user.tenantId;
    return this.onboardingService.configureAuthkey(
      tenantId,
      body.apiKey,
      body.senderId,
      body.phoneNumber,
    );
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.WHATSAPP.DISCONNECT)
  @Post('disconnect')
  @UseGuards(JwtAuthGuard, RolesGuard, GranularPermissionGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async disconnect(@Req() req) {
    const tenantId = req.user.tenantId;
    await this.onboardingService.disconnect(tenantId);
    return { success: true, message: 'Disconnected successfully' };
  }
}
