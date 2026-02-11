import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { WhatsAppOnboardingService } from './whatsapp-onboarding.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { PlanFeatureGuard, RequirePlanFeature } from '../../../core/billing/guards/plan-feature.guard';
import type { Response } from 'express';

@Controller('integrations/whatsapp')
export class WhatsAppOnboardingController {
  constructor(
    private readonly onboardingService: WhatsAppOnboardingService,
  ) {}

  @Get('connect')
  @UseGuards(JwtAuthGuard, RolesGuard, PlanFeatureGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @RequirePlanFeature('WHATSAPP_CRM') // Only for paid add-on
  async connect(@Req() req, @Res() res: Response, @Query('returnUrl') returnUrl?: string) {
    const tenantId = req.user.tenantId;
    const url = await this.onboardingService.generateConnectUrl(tenantId, returnUrl);
    return res.json({ url });
  }

  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const defaultErrorRedirect = '/whatsapp-crm?status=error';
    const defaultSuccessRedirect = '/whatsapp-crm?status=success';

    if (error) {
      return res.redirect(defaultErrorRedirect + '&message=' + encodeURIComponent(error));
    }

    try {
      const result = await this.onboardingService.handleCallback(code, state);
      const redirectUrl = result.returnUrl || defaultSuccessRedirect;
      
      // Ensure the redirect URL has the success status
      const finalUrl = redirectUrl.includes('?') 
        ? `${redirectUrl}&status=success` 
        : `${redirectUrl}?status=success`;

      return res.redirect(finalUrl);
    } catch (err) {
      return res.redirect(defaultErrorRedirect + '&message=' + encodeURIComponent(err.message));
    }
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async disconnect(@Req() req) {
    const tenantId = req.user.tenantId;
    await this.onboardingService.disconnect(tenantId);
    return { success: true, message: 'Disconnected successfully' };
  }
}
