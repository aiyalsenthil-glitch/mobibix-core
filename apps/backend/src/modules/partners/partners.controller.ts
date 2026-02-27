import { Controller, Post, Body, Get, UseGuards, Request, Param, Patch } from '@nestjs/common';
import { PartnersService } from './partners.service';
import { PartnerJwtGuard } from './auth/guards/partner-jwt.guard';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';

@Controller('partners')
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  // Module 3: Application - Public
  @Post('apply')
  async apply(@Body() body: any) {
    return this.partnersService.apply(body);
  }

  // Module 7: Partner Dashboard - Protected by PartnerJwt
  @UseGuards(PartnerJwtGuard)
  @Get('dashboard/stats')
  async getDashboard(@Request() req: any) {
    return this.partnersService.getPartnerStats(req.user.userId);
  }

  // Module 4: Admin Panel - Approval & Promo Management
  // Protected by normal Admin Auth
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post(':id/approve')
  async approve(@Param('id') id: string, @Body('commission') commission: number, @Request() req: any) {
    return this.partnersService.approvePartner(id, req.user.userId, commission);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('promo/generate')
  async generatePromo(@Body() body: any, @Request() req: any) {
    return this.partnersService.createPromoCode({
      ...body,
      adminId: req.user.userId
    });
  }

  // Module 1: Apply Promo (Used by Shops during signup/onboarding)
  @Post('promo/apply')
  async applyPromo(@Body() body: { code: string; tenantId: string }) {
    return this.partnersService.applyPromoToTenant(body.code, body.tenantId);
  }
}
