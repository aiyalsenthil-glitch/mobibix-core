import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { startOfMonth, subMonths, format } from 'date-fns';

@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminAnalyticsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('global')
  async getGlobalStats() {
    // 1. Total Tenants
    const totalTenants = await this.prisma.tenant.count();

    // 2. Total Users
    const totalUsers = await this.prisma.user.count();

    // 3. Active MRR (Monthly Recurring Revenue)
    // Sum of all active subscriptions plan price
    const activeSubs = await this.prisma.tenantSubscription.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: {
        plan: true,
      },
    });

    const mrr = activeSubs.reduce((sum, sub) => {
      // Very basic MRR calc: Price / Billing Cycle duration
      // For now, assuming monthly price is stored or derived
      // Schema doesn't have direct price on Plan, assuming it's in Plan or we use a static map for now
      // TODO: Fetch actual price from PriceSnapshot or Plan
      // Fallback to 0 if no price found (Plan model might need price field update or check schema)
      return sum + (sub.priceSnapshot ? (sub.priceSnapshot as any).price || 0 : 0);
    }, 0);

    // 4. Churn Rate (Tenants cancelled this month / Total Tenants at start of month)
    const now = new Date();
    const firstDayOfMonth = startOfMonth(now);
    
    const cancelledThisMonth = await this.prisma.tenantSubscription.count({
        where: {
            status: 'CANCELLED',
            updatedAt: {
                gte: firstDayOfMonth
            }
        }
    });

    const churnRate = totalTenants > 0 ? (cancelledThisMonth / totalTenants) * 100 : 0;

    return {
      totalTenants,
      totalUsers,
      mrr,
      churnRate: parseFloat(churnRate.toFixed(2)),
    };
  }

  @Get('growth')
  async getGrowthStats() {
    // Get new tenants per month for last 6 months
    const growth: { month: string; tenants: number }[] = [];
    for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const start = startOfMonth(date);
        const nextMonth = startOfMonth(subMonths(new Date(), i - 1));

        const count = await this.prisma.tenant.count({
            where: {
                createdAt: {
                    gte: start,
                    lt: nextMonth
                }
            }
        });

        growth.push({
            month: format(start, 'MMM yyyy'),
            tenants: count
        });
    }
    return growth;
  }
}
