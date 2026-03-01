import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
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
import type { Response } from 'express';
import { UsageSnapshotService } from '../analytics/usage-snapshot.service';

import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantService } from './tenant.service';
import { CreateTenantDto, UpdateTenantSettingsDto } from './dto/tenant.dto';
import { RequestDeletionDto } from './dto/deletion-request.dto';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/permissions.enum';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { TenantStatusGuard } from './guards/tenant-status.guard';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SkipSubscriptionCheck } from '../auth/decorators/skip-subscription-check.decorator';

@Controller('tenant')
export class TenantController {
  constructor(
    private readonly tenantService: TenantService,
    private readonly usageSnapshotService: UsageSnapshotService,
  ) {}

  @UseGuards(JwtAuthGuard, TenantRequiredGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.STAFF)
  @Get('usage-history')
  async getUsageHistory(
    @Req() req: any,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.usageSnapshotService.getHistory(req.user.tenantId, days);
  }

  @UseGuards(JwtAuthGuard, TenantRequiredGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.STAFF)
  @Get('current')
  async getCurrentTenant(@Req() req: any) {
    const tenantId = req.user.tenantId;
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
  @SkipSubscriptionCheck()
  @Post()
  async createTenant(
    @Req() req: any,
    @Body() dto: CreateTenantDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userId = req.user.sub;

    const { tenant, userTenant } = await this.tenantService.createTenant(
      userId,
      dto,
      {
        ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
      },
    );

    const token = this.tenantService.issueJwt({
      userId,
      tenantId: tenant.id,
      userTenantId: userTenant.id,
      role: UserRole.OWNER,
    });

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('accessToken', token, {
      httpOnly: true,
      sameSite: isProd ? 'none' : 'lax',
      secure: isProd,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
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
    @Body() body: UpdateTenantSettingsDto,
  ) {
    return this.tenantService.updateTenant(req.user.tenantId, body);
  }

  @UseGuards(JwtAuthGuard, TenantRequiredGuard)
  @Roles(UserRole.OWNER)
  @Post('request-deletion')
  requestDeletion(@Req() req: any, @Body() body: RequestDeletionDto) {
    return this.tenantService.requestDeletion(
      req.user.tenantId,
      req.user.id,
      body,
    );
  }
}
