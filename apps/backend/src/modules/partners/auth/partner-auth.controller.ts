import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  UseGuards,
  Get,
  Patch,
  Request,
} from '@nestjs/common';
import { PartnerAuthService } from './partner-auth.service';
import { PartnersService } from '../partners.service';
import { PartnerJwtGuard } from './guards/partner-jwt.guard';
import { Public } from '../../../core/auth/decorators/public.decorator';
import { SkipSubscriptionCheck } from '../../../core/auth/decorators/skip-subscription-check.decorator';

@Controller('partner/auth')
export class PartnerAuthController {
  constructor(
    private authService: PartnerAuthService,
    private partnersService: PartnersService,
  ) {}

  @Public()
  @SkipSubscriptionCheck()
  @Post('login')
  async login(@Body() body: { email: string; pass: string }) {
    const partner = await this.authService.validatePartner(
      body.email,
      body.pass,
    );
    if (!partner) {
      throw new UnauthorizedException(
        'Invalid email, password or application not approved',
      );
    }
    return this.authService.login(partner);
  }

  @Public()
  @SkipSubscriptionCheck()
  @UseGuards(PartnerJwtGuard)
  @Get('profile')
  async getProfile(@Request() req: any) {
    return this.partnersService.getPartnerProfile(req.user.userId);
  }

  // ─── Update Profile (requires valid partner JWT) ─────────────────────────────
  @Public()
  @SkipSubscriptionCheck()
  @UseGuards(PartnerJwtGuard)
  @Patch('profile')
  async updateProfile(
    @Body()
    body: {
      businessName?: string;
      contactPerson?: string;
      phone?: string;
      region?: string;
    },
    @Request() req: any,
  ) {
    return this.partnersService.updateProfile(req.user.userId, body);
  }

  // ─── Change Password (requires valid partner JWT) ────────────────────────────
  @Public()
  @SkipSubscriptionCheck()
  @UseGuards(PartnerJwtGuard)
  @Post('change-password')
  async changePassword(
    @Body() body: { currentPassword: string; newPassword: string },
    @Request() req: any,
  ) {
    return this.authService.changePassword(
      req.user.userId,
      body.currentPassword,
      body.newPassword,
    );
  }

  // ─── Forgot Password (public — no auth) ─────────────────────────────────────
  @Public()
  @SkipSubscriptionCheck()
  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  // ─── Reset Password (public — token from email link) ────────────────────────
  @Public()
  @SkipSubscriptionCheck()
  @Post('reset-password')
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    return this.authService.resetPassword(body.token, body.newPassword);
  }

  // ─── Request Payout ─────────────────────────────────────────────────────────
  @Public()
  @SkipSubscriptionCheck()
  @UseGuards(PartnerJwtGuard)
  @Post('request-payout')
  async requestPayout(@Request() req: any) {
    return this.partnersService.requestPayout(req.user.userId);
  }

  // ─── Notifications ───────────────────────────────────────────────────────────
  @Public()
  @SkipSubscriptionCheck()
  @UseGuards(PartnerJwtGuard)
  @Get('notifications')
  getNotifications(@Request() req: any) {
    return this.partnersService.getNotifications(req.user.userId);
  }

  @Public()
  @SkipSubscriptionCheck()
  @UseGuards(PartnerJwtGuard)
  @Patch('notifications/read')
  markRead(@Request() req: any) {
    return this.partnersService.markNotificationsRead(req.user.userId);
  }
}
