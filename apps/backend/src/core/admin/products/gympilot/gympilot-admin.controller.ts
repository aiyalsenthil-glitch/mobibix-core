import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AdminRolesGuard } from '../../guards/admin-roles.guard';
import { AdminRoles, AdminProduct } from '../../decorators/admin.decorator';
import { AdminRole, ModuleType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Controller('admin/mobibix')
@UseGuards(JwtAuthGuard, AdminRolesGuard)
@AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.PRODUCT_ADMIN, AdminRole.SUPPORT_ADMIN)
@AdminProduct(ModuleType.GYM)
export class GympilotAdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('stats')
  async getStats() {
    const [tenants, subscriptions] = await Promise.all([
      this.prisma.tenant.count({ where: { tenantType: 'GYM' } }),
      this.prisma.tenantSubscription.findMany({
        where: { module: 'GYM' },
        select: { status: true, priceSnapshot: true, billingCycle: true }
      })
    ]);

    const activeCount = subscriptions.filter(s => s.status === 'ACTIVE').length;
    const trialCount = subscriptions.filter(s => s.status === 'TRIAL').length;
    
    const mrr = subscriptions.reduce((acc, s) => {
      if (s.status !== 'ACTIVE') return acc;
      const price = Number(s.priceSnapshot) || 0;
      if (s.billingCycle === 'MONTHLY') return acc + price;
      if (s.billingCycle === 'QUARTERLY') return acc + (price / 3);
      if (s.billingCycle === 'YEARLY') return acc + (price / 12);
      return acc;
    }, 0);

    return {
      totalTenants: tenants,
      activeTenants: activeCount,
      trialTenants: trialCount,
      mrrpaise: Math.round(mrr)
    };
  }

  @Get('tenants')
  async getTenants() {
    return this.prisma.tenant.findMany({
      where: {
        tenantType: 'GYM',
      },
      include: {
        subscription: {
            where: { module: 'GYM' },
            orderBy: { createdAt: 'desc' },
            take: 1
        }
      },
      take: 50,
      orderBy: { createdAt: 'desc' }
    });
  }
}
