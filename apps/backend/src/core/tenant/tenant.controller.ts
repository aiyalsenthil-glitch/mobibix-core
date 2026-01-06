import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  ForbiddenException,
  Patch,
  Put,
} from '@nestjs/common';

import { TenantService } from './tenant.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTenantDto } from './dto/tenant.dto';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/permissions.enum';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { TenantStatusGuard } from './guards/tenant-status.guard';
import { Query } from '@nestjs/common';

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
  @UseGuards(JwtAuthGuard, TenantStatusGuard)
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
  @Get('current')
  async getMyTenant(@Req() req: any) {
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      throw new ForbiddenException('Tenant not created yet');
    }

    return this.tenantService.findById(tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/search')
  async searchTenants(@Req() req: any, @Query('q') q: string) {
    // 🔒 Admin-only check
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Admin access only');
    }

    if (!q || q.trim().length < 2) {
      return [];
    }

    return this.tenantService.searchTenants(q);
  }
  @UseGuards(JwtAuthGuard)
  @Put('logo')
  updateLogo(@Req() req: any, @Body() body: { logoUrl: string }) {
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      throw new ForbiddenException('Tenant not found');
    }

    return this.tenantService.updateLogo(tenantId, body.logoUrl);
  }

  /**
   * ============================
   * TENANT USAGE / BILLING
   * ============================
   *
   * - Requires active subscription
   * - Used after onboarding
   */
  @UseGuards(JwtAuthGuard)
  @Get('usage')
  getUsage(@Req() req: any) {
    return this.tenantService.getUsage(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Permissions(Permission.TENANT_MANAGE)
  @Post('kiosk-token')
  generateKioskToken(@Req() req: any) {
    return this.tenantService.generateKioskToken(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.TENANT_MANAGE)
  @Patch('me')
  updateMyGym(@Req() req: any, @Body() body: { name: string }) {
    return this.tenantService.updateTenantName(req.user.tenantId, body.name);
  }
}
