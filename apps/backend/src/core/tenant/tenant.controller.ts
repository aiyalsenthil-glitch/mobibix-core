import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  ForbiddenException,
  Param,
} from '@nestjs/common';

import { TenantService } from './tenant.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../billing/guards/subscription.guard';
import { CreateTenantDto } from './dto/tenant.dto';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/permissions.enum';

@Controller('tenant')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  /**
   * ============================
   * TENANT ONBOARDING (PRODUCTION)
   * ============================
   *
   * - Used ONLY when owner has no tenant
   * - NO SubscriptionGuard here
   * - Requires full tenant details
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  async createTenant(@Req() req: any, @Body() dto: CreateTenantDto) {
    const userId = req.user.sub;

    const tenant = await this.tenantService.createTenant(userId, dto);

    // 🔥 Fetch updated user (now has tenantId)
    const updatedUser = await this.tenantService.getUserForAuth(userId);

    if (!updatedUser) {
      throw new Error('User not found after tenant creation');
    }

    const token = this.tenantService.issueJwt(updatedUser);

    return {
      tenant,
      token,
    };
  }
  /**
   * ============================
   * GET MY TENANT (OWNER / STAFF)
   * ============================
   *
   * - Requires tenantId
   * - No subscription check
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMyTenant(@Req() req: any) {
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      throw new ForbiddenException('Tenant not created yet');
    }

    return this.tenantService.findById(tenantId);
  }

  /**
   * ============================
   * TENANT USAGE / BILLING
   * ============================
   *
   * - Requires active subscription
   * - Used after onboarding
   */
  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @Get('usage')
  async getUsage(@Req() req: any) {
    return this.tenantService.getUsage(req.user.tenantId);
  }
  @UseGuards(JwtAuthGuard)
  @Permissions(Permission.TENANT_MANAGE)
  @Post('kiosk-token')
  generateKioskToken(@Req() req: any) {
    return this.tenantService.generateKioskToken(req.user.tenantId);
  }
  @Get('public/by-code/:code')
  getByCode(@Param('code') code: string) {
    return this.tenantService.getPublicByCode(code);
  }
}
