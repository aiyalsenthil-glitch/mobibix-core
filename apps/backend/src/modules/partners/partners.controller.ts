import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  Param,
  Patch,
} from '@nestjs/common';
import { PartnersService } from './partners.service';
import { PartnerJwtGuard } from './auth/guards/partner-jwt.guard';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { SkipSubscriptionCheck } from '../../core/auth/decorators/skip-subscription-check.decorator';
import { Public } from '../../core/auth/decorators/public.decorator';
import { CreatePartnerDto, ApplyPromoDto, GeneratePromoDto } from './dto/create-partner.dto';
import { UserRole } from '@prisma/client';

@Controller('partners')
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  // ─────────────────────────────────────────────
  // MODULE 3: Partner Application (Public — unauthenticated sign-up flow)
  // ─────────────────────────────────────────────
  @Public()
  @SkipSubscriptionCheck()
  @Post('apply')
  async apply(@Body() dto: CreatePartnerDto) {
    return this.partnersService.apply(dto);
  }

  // ─────────────────────────────────────────────
  // MODULE 7: Partner Dashboard (Protected by PartnerJwt)
  // ─────────────────────────────────────────────
  @UseGuards(PartnerJwtGuard)
  @Get('dashboard/stats')
  async getDashboard(@Request() req: any) {
    return this.partnersService.getPartnerStats(req.user.sub);
  }

  // ─────────────────────────────────────────────
  // MODULE 4: Admin Panel — Approval & Promo Management
  // Protected by normal tenant Admin JWT
  // ─────────────────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  async listPartners() {
    return this.partnersService.listPartners();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/approve')
  async approve(
    @Param('id') id: string,
    @Body('commission') commission: number,
    @Request() req: any,
  ) {
    // tempPassword is emailed by the service — NOT returned here
    const { partner } = await this.partnersService.approvePartner(
      id,
      req.user.userId,
      commission,
    );
    return { partner };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/suspend')
  async suspend(@Param('id') id: string, @Request() req: any) {
    return this.partnersService.suspendPartner(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('promo/generate')
  async generatePromo(@Body() dto: GeneratePromoDto, @Request() req: any) {
    return this.partnersService.createPromoCode({
      ...dto,
      adminId: req.user.userId,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('promo')
  async listPromos() {
    return this.partnersService.listPromoCodes();
  }

  // ─────────────────────────────────────────────
  // MODULE 1: Apply Promo to Tenant (🔒 AUTHENTICATED — tenantId from JWT)
  // Previously unguarded — SECURITY FIX
  // ─────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @SkipSubscriptionCheck()
  @Post('promo/apply')
  async applyPromo(@Body() dto: ApplyPromoDto, @Request() req: any) {
    // tenantId AND userId MUST come from authenticated JWT — not from request body
    const { tenantId, userId } = req.user;
    return this.partnersService.applyPromoToTenant(dto.code, tenantId, userId);
  }
}
