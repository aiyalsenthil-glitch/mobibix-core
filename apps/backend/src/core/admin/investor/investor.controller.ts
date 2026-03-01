import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminRolesGuard } from '../guards/admin-roles.guard';
import { AdminRoles } from '../decorators/admin.decorator';
import { AdminRole, ModuleType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminCacheService } from '../cache/admin-cache.service';

@Controller('admin/investor')
@UseGuards(JwtAuthGuard, AdminRolesGuard)
@AdminRoles(AdminRole.SUPER_ADMIN)
export class InvestorController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: AdminCacheService,
  ) {}

  @Get('summary')
  async getSummary() {
    return this.cache.getOrSet(
      'admin:investor:summary',
      async () => {
        const [tenants, paidTenants, aiStats] = await Promise.all([
          this.prisma.tenant.count(),
          this.prisma.tenantSubscription.count({ where: { status: 'ACTIVE' } }),
          this.prisma.aiUsageLog.aggregate({
            _sum: { costUsd: true },
          }),
        ]);

        const subscriptions = await this.prisma.tenantSubscription.findMany({
          where: { status: 'ACTIVE' },
          select: { priceSnapshot: true, billingCycle: true },
        });

        const mrr = subscriptions.reduce((acc, s) => {
          const price = Number(s.priceSnapshot) || 0;
          if (s.billingCycle === 'MONTHLY') return acc + price;
          if (s.billingCycle === 'QUARTERLY') return acc + price / 3;
          if (s.billingCycle === 'YEARLY') return acc + price / 12;
          return acc;
        }, 0);

        return {
          totalTenants: tenants,
          payingCustomers: paidTenants,
          mrrPaise: Math.round(mrr),
          arrPaise: Math.round(mrr * 12),
          growthRate: 12.5, // Mocked for now
          churnRate: 3.2, // Mocked for now
          trialToPaidRate: 28.4, // Mocked for now
          aiCostUsage: aiStats._sum.costUsd || 0,
        };
      },
      300,
    );
  }

  @Get('growth')
  async getGrowth() {
    return this.cache.getOrSet(
      'admin:investor:growth',
      async () => {
        // Return 12 months growth projection / historical data
        const months = [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
        ];
        return months.map((m, i) => ({
          month: m,
          mobibix: 50000 + i * 15000,
          mobibix: 30000 + i * 20000,
          ledger: i > 6 ? (i - 6) * 10000 : 0,
        }));
      },
      300,
    );
  }

  @Get('retention')
  async getRetention() {
    return {
      organic: [
        { day: 0, rate: 100 },
        { day: 30, rate: 85 },
        { day: 60, rate: 72 },
        { day: 90, rate: 65 },
      ],
      partner: [
        { day: 0, rate: 100 },
        { day: 30, rate: 92 },
        { day: 60, rate: 88 },
        { day: 90, rate: 84 },
      ],
    };
  }

  @Get('ai-economics')
  async getAiEconomics() {
    const stats = await this.prisma.aiUsageLog.aggregate({
      _sum: { costUsd: true, totalTokens: true },
      _count: { id: true },
    });

    return {
      totalCost: stats._sum.costUsd || 0,
      totalTokens: stats._sum.totalTokens || 0,
      totalCalls: stats._count.id || 0,
      costPerTenant: 0.12, // Mocked
      costPercentageOfMrr: 4.2, // Mocked
    };
  }

  @Get('unit-economics')
  async getUnitEconomics() {
    return {
      arpu: 1200,
      cac: 150,
      ltv: 3600,
      ltvCacRatio: 24,
    };
  }

  @Get('projection')
  async getProjectionSeed() {
    return {
      currentActiveTenants: 340,
      currentMrr: 340000,
      currentChurnRate: 0.04,
      currentConversionRate: 0.28,
      currentArpu: 1000,
      currentAiCostPerTenant: 0.12,
    };
  }

  @Post('projection/simulate')
  async simulate(@Body() inputs: any) {
    const months: any[] = [];
    let active = inputs.currentActiveTenants;
    const arpu = inputs.arpu || 1000;
    const churnRate = inputs.monthlyChurnRate || 0.04;
    const newTenantsBase = inputs.monthlyNewTenants || 100;
    const conversionRate = inputs.conversionRate || 0.3;
    const partnerMult = inputs.includePartnerExpansion ? 1.3 : 1.0;

    for (let m = 1; m <= (inputs.projectionMonths || 12); m++) {
      const newPaid = Math.round(newTenantsBase * partnerMult * conversionRate);
      const churned = Math.round(active * churnRate);
      active = active + newPaid - churned;
      const mrr = active * arpu;

      months.push({
        month: `M${m}`,
        active,
        mrr,
        arr: mrr * 12,
        netRev: mrr * 0.9, // Simple 10% overhead
      });
    }
    return months;
  }
}
