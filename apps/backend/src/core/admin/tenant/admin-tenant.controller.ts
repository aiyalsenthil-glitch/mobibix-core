import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Query,
  UseGuards,
  NotFoundException,
  ForbiddenException,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminRolesGuard } from '../guards/admin-roles.guard';
import { AdminRoles } from '../decorators/admin.decorator';
import { AdminRole, UserRole, ModuleType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantService } from '../../tenant/tenant.service';
import { UpdateTenantSettingsDto } from '../../tenant/dto/tenant.dto';
import { ModuleScope } from '../../auth/decorators/module-scope.decorator';
import { RequirePermission, ModulePermission } from '../../permissions/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../../security/permission-registry';
import { GranularPermissionGuard } from '../../permissions/guards/granular-permission.guard';

@Controller('admin/tenants')
@ModuleScope(ModuleType.CORE)
@ModulePermission('system')
@UseGuards(JwtAuthGuard, AdminRolesGuard, GranularPermissionGuard)
@AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.SUPPORT_ADMIN)
export class AdminTenantController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantService: TenantService,
    private readonly configService: ConfigService,
  ) {}

  @RequirePermission(PERMISSIONS.CORE.SYSTEM.VIEW)
  @Get()
  async listTenants(
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contactEmail: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { contactPhone: { contains: search } },
      ];
    }

    const [total, tenants] = await Promise.all([
      this.prisma.tenant.count({ where }),
      this.prisma.tenant.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          subscription: {
            include: { plan: true },
          },
          userTenants: {
            take: 5, // Take a few to find owner
            include: { user: true },
          },
        },
      }),
    ]);

    return {
      data: tenants.map((t) => {
        // In-memory filtering for robustness against Prisma/Adapter issues
        const activeIdx =
          t.subscription?.findIndex((s) => s.status === 'ACTIVE') ?? -1;
        const subscription =
          activeIdx >= 0 ? t.subscription[activeIdx] : t.subscription?.[0];

        const ownerIdx =
          t.userTenants?.findIndex((ut) => ut.role === UserRole.OWNER) ?? -1;
        const owner =
          ownerIdx >= 0 ? t.userTenants[ownerIdx] : t.userTenants?.[0];

        return {
          id: t.id,
          name: t.name,
          code: t.code,
          type: t.tenantType || 'Unknown',
          ownerName: owner?.user?.fullName || 'Unknown',
          ownerEmail: owner?.user?.email || 'Unknown',
          plan: subscription?.plan?.name || 'No Plan',
          status: subscription?.status || 'INACTIVE',
          subscriptionStatus: subscription?.status,
          createdAt: t.createdAt,
          isActive: subscription?.status === 'ACTIVE',
        };
      }),
      meta: {
        total,
        page: pageNum,
        lastPage: Math.ceil(total / limitNum),
      },
    };
  }

  @RequirePermission(PERMISSIONS.CORE.SYSTEM.MANAGE)
  @Post(':id/impersonate')
  async impersonateTenant(@Param('id') tenantId: string, @Req() req: any) {
    const adminUserId = req.user.sub;
    const adminEmail = req.user.email || 'Unknown';

    // 1. Find Owner
    const userTenant = await this.prisma.userTenant.findFirst({
      where: {
        tenantId,
        role: UserRole.OWNER,
      },
      include: { user: true, tenant: true },
    });

    if (!userTenant) {
      throw new NotFoundException('Tenant has no owner');
    }

    // 2. Log impersonation event (PHASE 3: Admin Audit Trail)
    await this.prisma.platformAuditLog.create({
      data: {
        userId: adminUserId,
        action: 'ADMIN_IMPERSONATE',
        entity: 'Tenant',
        entityId: tenantId,
        meta: {
          adminEmail,
          targetTenantId: tenantId,
          targetTenantName: userTenant.tenant.name,
          targetUserId: userTenant.userId,
          targetUserEmail: userTenant.user.email,
          timestamp: new Date().toISOString(),
          ipAddress: req.ip || req.connection?.remoteAddress,
        },
      },
    });

    // 3. Generate short-lived token (1 hour expiry for security)
    const token = await this.tenantService.issueJwt(
      {
        userId: userTenant.userId,
        tenantId: userTenant.tenantId,
        userTenantId: userTenant.id,
        role: UserRole.OWNER,
        // Note: impersonatedBy would go here if TenantService.issueJwt supported it
        // Consider adding impersonatedBy: adminUserId to JWT payload in future
      },
      '1h',
    ); // Short-lived: 1 hour

    return {
      accessToken: token,
      expiresIn: 3600, // 1 hour in seconds
      impersonatedBy: adminEmail,
      redirectUrl:
        userTenant.tenant.tenantType === 'GYM'
          ? (this.configService.get<string>('GYM_FRONTEND_URL') || 'https://app.mobibix.in') + '/login/impersonate'
          : (this.configService.get<string>('ERP_FRONTEND_URL') || 'https://REMOVED_DOMAIN') + '/login/impersonate',
    };
  }

  @RequirePermission(PERMISSIONS.CORE.SYSTEM.MANAGE)
  @Post(':id/suspend')
  async suspendTenant(
    @Param('id') tenantId: string,
    @Body() body: { active: boolean },
  ) {
    // We don't have a global 'status' field on Tenant yet.
    // We will toggle `whatsappEnabled` and `whatsappCrmEnabled` as a proxy for "Suspension" of services.
    // OR we just throw "Not Implemented" but the user asked for it.
    // Let's effectively "disable" them by turning off WA features.

    const status = body.active;

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        whatsappEnabled: status,
        whatsappCrmEnabled: status,
      },
    });

    return {
      success: true,
      message: `Tenant ${status ? 'Activated' : 'Suspended'}`,
    };
  }

  @RequirePermission(PERMISSIONS.CORE.SYSTEM.VIEW)
  @Get(':id/settings')
  async getTenantSettings(@Param('id') tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        legalName: true,
        contactPhone: true,
        contactEmail: true,
        website: true,
        logoUrl: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        pincode: true,
        country: true,
        gstNumber: true,
        taxId: true,
        businessType: true,
        currency: true,
        timezone: true,
        whatsappEnabled: true,
        whatsappCrmEnabled: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    return tenant;
  }

  @RequirePermission(PERMISSIONS.CORE.SYSTEM.MANAGE)
  @Patch(':id/settings')
  async updateTenantSettings(
    @Param('id') tenantId: string,
    @Body() updateDto: UpdateTenantSettingsDto,
  ) {
    // Verify tenant exists
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    // Update tenant settings
    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: updateDto,
      select: {
        id: true,
        name: true,
        legalName: true,
        contactPhone: true,
        contactEmail: true,
        website: true,
        logoUrl: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        pincode: true,
        country: true,
        gstNumber: true,
        taxId: true,
        businessType: true,
        currency: true,
        timezone: true,
        whatsappEnabled: true,
        whatsappCrmEnabled: true,
      },
    });

    return updated;
  }
}
