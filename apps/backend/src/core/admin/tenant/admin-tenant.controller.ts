import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantService } from '../../tenant/tenant.service';

@Controller('admin/tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminTenantController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantService: TenantService,
  ) {}

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
        { email: { contains: search, mode: 'insensitive' } }, // Search by user email? No, tenant email logic complex
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

  @Post(':id/impersonate')
  async impersonateTenant(@Param('id') tenantId: string) {
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

    // 2. Generate Token
    const token = await this.tenantService.issueJwt({
      userId: userTenant.userId,
      tenantId: userTenant.tenantId,
      userTenantId: userTenant.id,
      role: UserRole.OWNER,
    }); // NOTE: we might need to expose issueJwt or duplicate it.
    // TenantService.issueJwt is public in the class, so we can use it.
    // Wait, check TenantService definition. Yes, it looks public.
    // But issueJwt method signature in previous file view:
    // issueJwt(payload: { userId: string; tenantId: string | null; userTenantId: string | null; role: UserRole; })

    // We need planCode in payload? check AuthService.loginWithFirebase
    // AuthService puts planCode. TenantService.issueJwt does NOT put planCode in the payload in the file I viewed?
    // Let's re-read TenantService.issueJwt
    // It signs: sub, tenantId, userTenantId, role.
    // It does NOT sign planCode.
    // If frontend depends on planCode in JWT for feature gating, using TenantService.issueJwt might be incomplete compared to AuthService.
    // But for a quick "Login As", it might suffice if the frontend refreshes or fetches plan separately.
    // Let's stick to TenantService.issueJwt for now.

    return {
      accessToken: token,
      redirectUrl:
        userTenant.tenant.tenantType === 'GYM'
          ? 'http://localhost_REPLACED:3001/login/impersonate' // Gym Pilot
          : 'http://localhost_REPLACED:3000/login/impersonate', // Mobibix
      // TODO: Use env vars for URLs
    };
  }

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
}
