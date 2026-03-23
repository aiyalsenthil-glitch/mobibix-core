import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { PartnersService } from './partners.service';
import { PartnerJwtGuard } from './auth/guards/partner-jwt.guard';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { SkipSubscriptionCheck } from '../../core/auth/decorators/skip-subscription-check.decorator';
import { Public } from '../../core/auth/decorators/public.decorator';
import {
  CreatePartnerDto,
  ApplyPromoDto,
  GeneratePromoDto,
} from './dto/create-partner.dto';
import { UserRole, ModuleType } from '@prisma/client';
import { ModuleScope } from '../../core/auth/decorators/module-scope.decorator';
import { GranularPermissionGuard } from '../../core/permissions/guards/granular-permission.guard';
import { RequirePermission, ModulePermission } from '../../core/permissions/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../security/permission-registry';

@Controller('partners')
@ModuleScope(ModuleType.CORE)
@ModulePermission('partner')
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
  // MODULE 10: Promo Code Preview (Public — onboarding, no auth needed)
  // Returns benefit info without applying the code.
  // ─────────────────────────────────────────────
  @Public()
  @SkipSubscriptionCheck()
  @Get('promo/preview')
  async previewPromo(@Query('code') code: string) {
    return this.partnersService.previewPromoCode(code);
  }

  // ─────────────────────────────────────────────
  // MODULE 7: Partner Dashboard (Protected by PartnerJwt)
  // ─────────────────────────────────────────────
  @Public()
  @SkipSubscriptionCheck()
  @UseGuards(PartnerJwtGuard)
  @Get('dashboard/stats')
  async getDashboard(@Request() req: any) {
    return this.partnersService.getPartnerStats(req.user.userId);
  }

  // ─────────────────────────────────────────────
  // MODULE 4: Admin Panel — Approval & Promo Management
  // Protected by normal tenant Admin JWT
  // ─────────────────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard, GranularPermissionGuard)
  @Roles(UserRole.ADMIN)
  @RequirePermission(PERMISSIONS.CORE.PARTNER.VIEW)
  @Get()
  async listPartners() {
    return this.partnersService.listPartners();
  }

  @UseGuards(JwtAuthGuard, RolesGuard, GranularPermissionGuard)
  @Roles(UserRole.ADMIN)
  @RequirePermission(PERMISSIONS.CORE.PARTNER.MANAGE)
  @Patch(':id/approve')
  async approve(
    @Param('id') id: string,
    @Body('firstCommissionPct') firstCommissionPct: number = 30,
    @Body('renewalCommissionPct') renewalCommissionPct: number = 10,
    @Request() req: any,
  ) {
    const { partner } = await this.partnersService.approvePartner(
      id,
      req.user.userId,
      firstCommissionPct,
      renewalCommissionPct,
    );
    return { partner };
  }

  @UseGuards(JwtAuthGuard, RolesGuard, GranularPermissionGuard)
  @Roles(UserRole.ADMIN)
  @RequirePermission(PERMISSIONS.CORE.PARTNER.MANAGE)
  @Patch(':id/suspend')
  async suspend(@Param('id') id: string, @Request() req: any) {
    return this.partnersService.suspendPartner(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, GranularPermissionGuard)
  @Roles(UserRole.ADMIN)
  @RequirePermission(PERMISSIONS.CORE.PARTNER.MANAGE)
  @Post('promo/generate')
  async generatePromo(@Body() dto: GeneratePromoDto, @Request() req: any) {
    return this.partnersService.createPromoCode({
      ...dto,
      adminId: req.user.userId,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard, GranularPermissionGuard)
  @Roles(UserRole.ADMIN)
  @RequirePermission(PERMISSIONS.CORE.PARTNER.VIEW)
  @Get('promo')
  async listPromos() {
    return this.partnersService.listPromoCodes();
  }

  // ─────────────────────────────────────────────
  // MODULE 1: Apply Promo to Tenant (🔒 AUTHENTICATED — tenantId from JWT)
  // ─────────────────────────────────────────────
  @UseGuards(JwtAuthGuard, GranularPermissionGuard)
  @RequirePermission(PERMISSIONS.CORE.PARTNER.APPLY)
  @SkipSubscriptionCheck()
  @Post('promo/apply')
  async applyPromo(@Body() dto: ApplyPromoDto, @Request() req: any) {
    const { tenantId, userId } = req.user;
    return this.partnersService.applyPromoToTenant(dto.code, tenantId, userId);
  }

  // ─────────────────────────────────────────────
  // MODULE 8: Admin Payout — mark all CONFIRMED referrals as PAID
  // ─────────────────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard, GranularPermissionGuard)
  @Roles(UserRole.ADMIN)
  @RequirePermission(PERMISSIONS.CORE.PARTNER.MANAGE)
  @Patch(':id/payout')
  async markPayout(@Param('id') id: string) {
    return this.partnersService.markPartnerPayout(id);
  }

  // ─────────────────────────────────────────────
  // MODULE 9: Partner self-service promo creation
  // ─────────────────────────────────────────────
  @Public()
  @SkipSubscriptionCheck()
  @UseGuards(PartnerJwtGuard)
  @Post('promo/my')
  async createMyPromo(@Body() body: any, @Request() req: any) {
    return this.partnersService.createPartnerPromoCode(req.user.userId, body);
  }
}
