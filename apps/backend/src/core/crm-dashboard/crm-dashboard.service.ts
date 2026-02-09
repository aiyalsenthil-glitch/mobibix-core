import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardQueryDto, DateRangePreset } from './dto/dashboard-query.dto';
import {
  CrmDashboardResponse,
  CustomerMetrics,
  FollowUpMetrics,
  FinancialMetrics,
  HighValueCustomer,
  LoyaltyMetrics,
  WhatsAppMetrics,
} from './dto/dashboard-response.dto';

@Injectable()
export class CrmDashboardService {
  private readonly logger = new Logger(CrmDashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get comprehensive CRM dashboard metrics
   * Aggregates data from: Customer, Invoice, JobCard, FollowUp, Loyalty, WhatsAppLog
   */
  async getDashboardMetrics(
    tenantId: string,
    query: DashboardQueryDto,
    role?: string,
  ): Promise<CrmDashboardResponse> {
    const { startDate, endDate } = this.resolveDateRange(query);

    // Fetch all KPIs in parallel for performance
    const [customers, followUps, financials, loyalty, whatsapp] =
      await Promise.all([
        this.getCustomerMetrics(tenantId, startDate, endDate, query.shopId),
        this.getFollowUpMetrics(tenantId, query.shopId),
        this.getFinancialMetrics(tenantId, startDate, endDate, query.shopId),
        this.getLoyaltyMetrics(tenantId, startDate, endDate),
        this.getWhatsAppMetrics(tenantId, startDate, endDate),
      ]);
    // 🔒 Role-based filtering for sensitive metrics
    const isStaff = role === 'STAFF';
    const filteredFinancials = isStaff
      ? { totalOutstanding: 0, highValueCustomers: [] }
      : financials;

    return {
      customers,
      followUps,
      financials: filteredFinancials,
      loyalty,
      whatsapp,
      dateRange: {
        startDate,
        endDate,
        preset: query.preset,
      },
      generatedAt: new Date(),
    };
  }

  /**
   * Customer KPIs
   * - Total customers
   * - Active vs inactive (has invoice in last 90 days)
   * - New customers (7/30 days)
   * - Repeat customers (>1 invoice)
   */
  private async getCustomerMetrics(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    shopId?: string,
  ): Promise<CustomerMetrics> {
    const where: any = {
      tenantId,
      ...(shopId && { shopId }),
      partyType: { in: ['CUSTOMER', 'BOTH'] },
    };

    // 1️⃣ Total customers
    const total = await this.prisma.party.count({ where });

    // 2️⃣ Active customers (has invoice in last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const activeCustomerIds = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        invoiceDate: { gte: ninetyDaysAgo },
        ...(shopId && { shopId }),
      },
      select: { customerId: true },
      distinct: ['customerId'],
    });

    const active = activeCustomerIds.length;
    const inactive = total - active;

    // 3️⃣ New customers (7 and 30 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [newLast7Days, newLast30Days] = await Promise.all([
      this.prisma.party.count({
        where: {
          ...where,
          createdAt: { gte: sevenDaysAgo },
        },
      }),
      this.prisma.party.count({
        where: {
          ...where,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
    ]);

    // 4️⃣ Repeat customers (customers with >1 invoice)
    const customerInvoiceCounts = await this.prisma.invoice.groupBy({
      by: ['customerId'],
      where: {
        tenantId,
        ...(shopId && { shopId }),
      },
      _count: {
        id: true,
      },
      having: {
        id: {
          _count: {
            gt: 1,
          },
        },
      },
    });

    const repeatCustomers = customerInvoiceCounts.length;
    const repeatRate = total > 0 ? (repeatCustomers / total) * 100 : 0;

    return {
      total,
      active,
      inactive,
      newCustomers: {
        last7Days: newLast7Days,
        last30Days: newLast30Days,
      },
      repeatCustomers,
      repeatRate: Math.round(repeatRate * 100) / 100, // 2 decimals
    };
  }

  /**
   * Follow-Up KPIs
   * - Due today
   * - Overdue
   * - Pending (future)
   * - Completed this week
   */
  private async getFollowUpMetrics(
    tenantId: string,
    shopId?: string,
  ): Promise<FollowUpMetrics> {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const where = {
      tenantId,
      ...(shopId && { shopId }),
    };

    // Run queries in parallel
    const [dueToday, overdue, pending, completedThisWeek] = await Promise.all([
      // Due today (PENDING status, followUpAt within today)
      this.prisma.customerFollowUp.count({
        where: {
          ...where,
          status: 'PENDING',
          followUpAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      }),

      // Overdue (PENDING status, followUpAt < now)
      this.prisma.customerFollowUp.count({
        where: {
          ...where,
          status: 'PENDING',
          followUpAt: { lt: now },
        },
      }),

      // Pending (PENDING status, followUpAt > today)
      this.prisma.customerFollowUp.count({
        where: {
          ...where,
          status: 'PENDING',
          followUpAt: { gt: endOfDay },
        },
      }),

      // Completed this week (DONE status, updated in last 7 days)
      this.prisma.customerFollowUp.count({
        where: {
          ...where,
          status: 'DONE',
          updatedAt: { gte: sevenDaysAgo },
        },
      }),
    ]);

    return {
      dueToday,
      overdue,
      pending,
      completedThisWeek,
    };
  }

  /**
   * Financial KPIs
   * - Total outstanding (CREDIT status invoices)
   * - High-value customers (top 10 by total spend)
   */
  private async getFinancialMetrics(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    shopId?: string,
  ): Promise<FinancialMetrics> {
    const where = {
      tenantId,
      ...(shopId && { shopId }),
    };

    // 1️⃣ Total outstanding (sum of CREDIT status invoices)
    const unpaidInvoices = await this.prisma.invoice.aggregate({
      where: {
        ...where,
        status: 'PARTIALLY_PAID',
      },
      _sum: {
        totalAmount: true, // ✅ Correct field
      },
    });

    const totalOutstanding = unpaidInvoices._sum?.totalAmount || 0;

    // 2️⃣ High-value customers (top 10 by total spend)
    const topSpenders = await this.prisma.invoice.groupBy({
      by: ['customerId'],
      where: {
        tenantId,
        customerId: { not: null }, // ✅ Filter out null customers
        ...(shopId && { shopId }),
      },
      _sum: {
        totalAmount: true, // ✅ Correct field
      },
      _count: {
        id: true,
      },
      _max: {
        invoiceDate: true,
      },
      orderBy: {
        _sum: {
          totalAmount: 'desc', // ✅ Correct field
        },
      },
      take: 10,
    });

    // Load customer details (filter null IDs)
    const customerIds = topSpenders
      .map((s) => s.customerId)
      .filter((id): id is string => id !== null);

    const customers = await this.prisma.party.findMany({
      where: {
        id: { in: customerIds },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const customerMap = new Map<string, string>(
      customers.map((c) => [c.id, c.name]),
    );

    const highValueCustomers: HighValueCustomer[] = topSpenders
      .filter((s) => s.customerId !== null)
      .map((s) => ({
        customerId: s.customerId as string,
        customerName: customerMap.get(s.customerId as string) || 'Unknown',
        totalSpent: s._sum?.totalAmount || 0,
        invoiceCount: s._count?.id || 0,
        lastInvoiceDate: s._max?.invoiceDate || new Date(),
      }));

    return {
      totalOutstanding,
      highValueCustomers,
    };
  }

  /**
   * Loyalty KPIs
   * - Total points issued
   * - Total points redeemed
   * - Net balance
   * - Active customers with points
   */
  private async getLoyaltyMetrics(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<LoyaltyMetrics> {
    // Points issued (positive transactions)
    const issued = await this.prisma.loyaltyTransaction.aggregate({
      where: {
        tenantId,
        points: { gt: 0 },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        points: true,
      },
    });

    // Points redeemed (negative transactions)
    const redeemed = await this.prisma.loyaltyTransaction.aggregate({
      where: {
        tenantId,
        points: { lt: 0 },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        points: true,
      },
    });

    const totalPointsIssued = issued._sum?.points || 0;
    const totalPointsRedeemed = Math.abs(redeemed._sum?.points || 0);
    const netPointsBalance = totalPointsIssued - totalPointsRedeemed;

    // Active customers with points (current balance > 0)
    const activeCustomersWithPoints = await this.prisma.party.count({
      where: {
        tenantId,
        partyType: { in: ['CUSTOMER', 'BOTH'] },
        loyaltyPoints: { gt: 0 },
      },
    });

    return {
      totalPointsIssued,
      totalPointsRedeemed,
      netPointsBalance,
      activeCustomersWithPoints,
    };
  }

  /**
   * WhatsApp Delivery KPIs
   * - Total sent
   * - Successful
   * - Failed
   * - Success rate
   * - Last 7 days trend
   */
  private async getWhatsAppMetrics(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<WhatsAppMetrics> {
    // Overall stats
    const totalSent = await this.prisma.whatsAppLog.count({
      where: {
        tenantId,
        sentAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const successful = await this.prisma.whatsAppLog.count({
      where: {
        tenantId,
        status: 'SUCCESS',
        sentAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const failed = await this.prisma.whatsAppLog.count({
      where: {
        tenantId,
        status: 'FAILED',
        sentAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const successRate = totalSent > 0 ? (successful / totalSent) * 100 : 0;

    // Last 7 days trend (daily breakdown)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const logs = await this.prisma.whatsAppLog.findMany({
      where: {
        tenantId,
        sentAt: { gte: sevenDaysAgo },
      },
      select: {
        sentAt: true,
        status: true,
      },
    });

    // Group by date
    const dailyStats = new Map<string, { sent: number; successful: number }>();

    logs.forEach((log) => {
      // ✅ Handle both Date and string types
      const dateObj =
        typeof log.sentAt === 'string' ? new Date(log.sentAt) : log.sentAt;
      const dateKey = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD

      if (!dailyStats.has(dateKey)) {
        dailyStats.set(dateKey, { sent: 0, successful: 0 });
      }
      const stats = dailyStats.get(dateKey)!;
      stats.sent += 1;
      if (log.status === 'SUCCESS') {
        stats.successful += 1;
      }
    });

    const last7Days = Array.from(dailyStats.entries())
      .map(([date, stats]) => ({
        date,
        sent: stats.sent,
        successful: stats.successful,
      }))
      .sort((a, b) => a.date.localeCompare(b.date)); // Sort chronologically

    return {
      totalSent,
      successful,
      failed,
      successRate: Math.round(successRate * 100) / 100,
      last7Days,
    };
  }

  /**
   * Helper: Resolve date range from preset or custom dates
   */
  private resolveDateRange(query: DashboardQueryDto): {
    startDate: Date;
    endDate: Date;
  } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now); // Default: today

    if (query.preset) {
      switch (query.preset) {
        case DateRangePreset.TODAY:
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);
          break;

        case DateRangePreset.LAST_7_DAYS:
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          break;

        case DateRangePreset.LAST_30_DAYS:
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 30);
          break;

        case DateRangePreset.LAST_90_DAYS:
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 90);
          break;

        case DateRangePreset.THIS_MONTH:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0,
            23,
            59,
            59,
            999,
          );
          break;

        case DateRangePreset.LAST_MONTH:
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            0,
            23,
            59,
            59,
            999,
          );
          break;

        case DateRangePreset.CUSTOM:
          // Use provided dates
          startDate = query.startDate
            ? new Date(query.startDate)
            : new Date(now);
          endDate = query.endDate ? new Date(query.endDate) : new Date(now);
          break;

        default:
          // Default: last 30 days
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 30);
      }
    } else {
      // No preset: use custom dates or default to last 30 days
      startDate = query.startDate ? new Date(query.startDate) : new Date(now);
      if (!query.startDate) {
        startDate.setDate(now.getDate() - 30);
      }
      endDate = query.endDate ? new Date(query.endDate) : new Date(now);
    }

    return { startDate, endDate };
  }
}
