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
  Param,
  NotFoundException,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { UsageSnapshotService } from '../analytics/usage-snapshot.service';

import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dto/tenant.dto';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/permissions.enum';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { TenantStatusGuard } from './guards/tenant-status.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('tenant')
export class TenantController {
  constructor(
    private readonly tenantService: TenantService,
    private readonly usageSnapshotService: UsageSnapshotService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.STAFF)
  @Get('usage-history')
  async getUsageHistory(
    @Req() req: any,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.usageSnapshotService.getHistory(req.user.tenantId, days);
  }

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.STAFF)
  @Get('current')
  async getCurrentTenant(@Req() req: any) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      // 404 or { tenant: null } as per requirement
      throw new NotFoundException('No active tenant');
    }
    // Strict response: { tenantId, tenantCode, tenantType, tenantName }
    return this.tenantService.getCurrentTenantPublic(tenantId);
  }

  /**
   * PUBLIC TENANT LOOKUP (QR CHECK-IN)
   */
  @Get('public/:code')
  async getPublicTenant(@Param('code') code: string) {
    return this.tenantService.getPublicTenantByCode(code);
  }

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
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.USER) // Allow USER role for first-time tenant creation
  @Post()
  async createTenant(@Req() req: any, @Body() dto: CreateTenantDto) {
    const userId = req.user.sub;

    const { tenant, userTenant } = await this.tenantService.createTenant(
      userId,
      dto,
    );

    const token = this.tenantService.issueJwt({
      userId,
      tenantId: tenant.id,
      userTenantId: userTenant.id,
      role: UserRole.OWNER,
    });

    return {
      tenant,
      accessToken: token,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/search')
  async searchTenants(@Req() req: any, @Query('q') q: string) {
    // 🔒 Admin-only check (case-insensitive)
    const role = (req.user?.role || '') as string;
    if (role.toUpperCase() !== 'ADMIN') {
      throw new ForbiddenException('Admin access only');
    }

    if (!q || q.trim().length === 0) {
      return this.tenantService.searchTenants('');
    }

    if (q.trim().length < 2) {
      return [];
    }

    return this.tenantService.searchTenants(q);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.STAFF)
  @Permissions(Permission.TENANT_MANAGE)
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
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.STAFF)
  @Get('usage')
  getUsage(@Req() req: any) {
    return this.tenantService.getUsage(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.STAFF)
  @Permissions(Permission.TENANT_MANAGE)
  @Post('kiosk-token')
  generateKioskToken(@Req() req: any) {
    return this.tenantService.generateKioskToken(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.STAFF)
  @Permissions(Permission.TENANT_MANAGE)
  @Patch('me')
  updateMyGym(
    @Req() req: any,
    @Body()
    body: {
      name?: string;
      contactPhone?: string;
      contactEmail?: string;
      website?: string;
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      state?: string;
      pincode?: string;
    },
  ) {
    return this.tenantService.updateTenant(req.user.tenantId, body);
  }
}
