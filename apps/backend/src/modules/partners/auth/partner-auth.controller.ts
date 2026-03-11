import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  UseGuards,
  Get,
  Request,
} from '@nestjs/common';
import { PartnerAuthService } from './partner-auth.service';
import { PartnerJwtGuard } from './guards/partner-jwt.guard';
import { Public } from '../../../core/auth/decorators/public.decorator';
import { SkipSubscriptionCheck } from '../../../core/auth/decorators/skip-subscription-check.decorator';

@Controller('partner/auth')
export class PartnerAuthController {
  constructor(private authService: PartnerAuthService) {}

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

  @UseGuards(PartnerJwtGuard)
  @Get('profile')
  getProfile(@Request() req: any) {
    return req.user;
  }

  // ─── Change Password (requires valid partner JWT) ────────────────────────────
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
}
