import { Controller, Post, Body, UnauthorizedException, UseGuards, Get, Request } from '@nestjs/common';
import { PartnerAuthService } from './partner-auth.service';
import { PartnerJwtGuard } from './guards/partner-jwt.guard';

@Controller('partner/auth')
export class PartnerAuthController {
  constructor(private authService: PartnerAuthService) {}

  @Post('login')
  async login(@Body() body: { email: string; pass: string }) {
    const partner = await this.authService.validatePartner(body.email, body.pass);
    if (!partner) {
      throw new UnauthorizedException('Invalid email, password or application not approved');
    }
    return this.authService.login(partner);
  }

  @UseGuards(PartnerJwtGuard)
  @Get('profile')
  getProfile(@Request() req: any) {
    return req.user;
  }
}
