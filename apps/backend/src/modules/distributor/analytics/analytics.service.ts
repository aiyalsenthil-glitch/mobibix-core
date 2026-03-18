import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CreateCreditEntryDto, DistCreditEntryType } from './dto/credit.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * High-level overview for a distributor's dashboard.
   * Shows total retailers, top products, monthly revenue, recent attribution logs.
   */
  async getOverview(distributorId: string) {
    const currentMonth = this.currentMonthBucket();

    const [
      totalRetailers,
      totalOrders,
      monthlyRevenue,
      topProducts,
      recentLogs,
    ] = await Promise.all([
      // Total active linked retailers
      this.prisma.distDistributorRetailer.count({
        where: { distributorId, status: 'ACTIVE' },
      }),

      // Total purchase orders received
      this.prisma.distPurchaseOrder.count({
        where: { distributorId },
      }),

      // Revenue this month (from attribution logs)
      this.prisma.distSaleAttributionLog.aggregate({
        where: { distributorId, monthBucket: currentMonth },
        _sum: { revenueAmount: true, quantitySold: true },
      }),

      // Top 5 products by quantity sold this month
      this.prisma.distSaleAttributionLog.groupBy({
        by: ['catalogItemId'],
        where: { distributorId, monthBucket: currentMonth },
        _sum: { quantitySold: true, revenueAmount: true },
        orderBy: { _sum: { quantitySold: 'desc' } },
        take: 5,
      }),

      // Last 10 attribution log entries
      this.prisma.distSaleAttributionLog.findMany({
        where: { distributorId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          retailerId: true,
          catalogItemId: true,
          quantitySold: true,
          revenueAmount: true,
          saleDate: true,
          monthBucket: true,
        },
      }),
    ]);

    // Enrich top products with catalog item names
    const enrichedTopProducts = await Promise.all(
      topProducts.map(async (p) => {
        const item = await this.prisma.distCatalogItem.findUnique({
          where: { id: p.catalogItemId ?? '' },
          select: { name: true, brand: true, category: true },
        });
        return {
          ...p,
          catalogItem: item,
        };
      }),
    );

    return {
      currentMonth,
      totalRetailers,
      totalOrders,
      monthlyRevenue: {
        amount: Number(monthlyRevenue._sum.revenueAmount ?? 0),
        unitsSold: monthlyRevenue._sum.quantitySold ?? 0,
      },
      topProducts: enrichedTopProducts,
      recentAttributions: recentLogs,
    };
  }

  /**
   * Per-retailer breakdown for a distributor.
   */
  async getRetailerBreakdown(distributorId: string, retailerId: string) {
    const logs = await this.prisma.distSaleAttributionLog.findMany({
      where: { distributorId, retailerId },
      orderBy: { saleDate: 'desc' },
      take: 100,
    });

    const orders = await this.prisma.distPurchaseOrder.findMany({
      where: { distributorId, retailerId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const credit = await this.prisma.distCreditLedger.findMany({
      where: { distributorId, retailerId },
      orderBy: { entryDate: 'desc' },
      take: 20,
    });

    return { logs, orders, credit };
  }

  /**
   * Per-product performance across all retailers.
   */
  async getProductPerformance(distributorId: string, catalogItemId: string) {
    const logs = await this.prisma.distSaleAttributionLog.groupBy({
      by: ['monthBucket'],
      where: { distributorId, catalogItemId },
      _sum: { quantitySold: true, revenueAmount: true },
      orderBy: { monthBucket: 'desc' },
      take: 12, // Last 12 months
    });

    return { catalogItemId, monthlyBreakdown: logs };
  }

  /**
   * Distributor's connected retailers list with basic stats.
   */
  async getRetailers(distributorId: string) {
    const links = await this.prisma.distDistributorRetailer.findMany({
      where: { distributorId, status: 'ACTIVE' },
      orderBy: { linkedAt: 'desc' },
    });

    // Enrich each retailer with order count + attribution totals
    const enriched = await Promise.all(
      links.map(async (link) => {
        const [orderCount, attrTotal] = await Promise.all([
          this.prisma.distPurchaseOrder.count({
            where: { distributorId, retailerId: link.retailerId },
          }),
          this.prisma.distSaleAttributionLog.aggregate({
            where: { distributorId, retailerId: link.retailerId },
            _sum: { revenueAmount: true },
          }),
        ]);

        return {
          retailerId: link.retailerId,
          linkedSince: link.linkedAt,
          linkedVia: link.linkedVia,
          totalOrders: orderCount,
          totalAttributedRevenue: Number(attrTotal._sum.revenueAmount ?? 0),
        };
      }),
    );

    return enriched;
  }

  // ─── Credit Ledger Management ──────────────────────────────────────────

  async getRetailerBalance(distributorId: string, retailerId: string) {
    const lastEntry = await this.prisma.distCreditLedger.findFirst({
      where: { distributorId, retailerId },
      orderBy: { createdAt: 'desc' },
      select: { runningBalance: true },
    });
    return Number(lastEntry?.runningBalance ?? 0);
  }

  async recordCreditEntry(distributorId: string, dto: CreateCreditEntryDto) {
    const { retailerId, entryType, amount, description, referenceType, referenceId, entryDate } = dto;
    
    // Verify retailer link
    const link = await this.prisma.distDistributorRetailer.findUnique({
      where: { distributorId_retailerId: { distributorId, retailerId } },
    });
    if (!link) throw new NotFoundException('Retailer is not linked to this distributor');

    return this.prisma.$transaction(async (tx) => {
      // Get current balance
      const lastEntry = await tx.distCreditLedger.findFirst({
        where: { distributorId, retailerId },
        orderBy: { createdAt: 'desc' },
      });
      const currentBalance = lastEntry ? Number(lastEntry.runningBalance) : 0;

      // Type-safe calculation: CREDIT increases what retailer owes (balance), PAYMENT decreases it
      const numericAmount = Number(amount);
      const newBalance = entryType === DistCreditEntryType.CREDIT
        ? currentBalance + numericAmount
        : entryType === DistCreditEntryType.PAYMENT
          ? currentBalance - numericAmount
          : currentBalance + numericAmount; // Adjustment can be negative

      return tx.distCreditLedger.create({
        data: {
          distributorId,
          retailerId,
          entryType: entryType as string,
          amount: numericAmount,
          runningBalance: newBalance,
          description,
          referenceType,
          referenceId,
          entryDate: entryDate ? new Date(entryDate) : new Date(),
        },
      });
    });
  }

  async getCreditHistory(distributorId: string, retailerId: string) {
    return this.prisma.distCreditLedger.findMany({
      where: { distributorId, retailerId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  private currentMonthBucket(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${now.getFullYear()}-${month}`;
  }
}
