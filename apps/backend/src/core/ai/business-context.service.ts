import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface BusinessSnapshot {
  date: string;
  todaySales: { count: number; total: number; paid: number };
  pendingJobs: { count: number; overdueCount: number };
  lowStock: { count: number; items: string[] };
  recentCustomers: { count: number };
  currency: string;
}

/**
 * Fetches a lightweight business snapshot to inject as context into every AI request.
 * Avoids the LLM needing to run DB queries for common questions.
 */
@Injectable()
export class BusinessContextService {
  private readonly logger = new Logger(BusinessContextService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getSnapshot(tenantId: string): Promise<BusinessSnapshot> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const [salesAgg, pendingJobs, overdueJobs, lowStockItems, newCustomers] =
        await Promise.all([
          // Today's invoices
          this.prisma.invoice.aggregate({
            where: { tenantId, createdAt: { gte: today } },
            _count: { id: true },
            _sum: { totalAmount: true, paidAmount: true },
          }),

          // Pending/in-progress job cards
          this.prisma.jobCard.count({
            where: { tenantId, status: { in: ['PENDING', 'IN_PROGRESS', 'DIAGNOSED'] } },
          }),

          // Overdue job cards (older than 3 days, still open)
          this.prisma.jobCard.count({
            where: {
              tenantId,
              status: { in: ['PENDING', 'IN_PROGRESS'] },
              createdAt: { lte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
            },
          }),

          // Low stock products (quantity <= 5)
          this.prisma.product.findMany({
            where: { tenantId, quantity: { lte: 5 }, isActive: true },
            select: { name: true, quantity: true },
            take: 5,
          }),

          // New customers this week
          this.prisma.customer.count({
            where: {
              tenantId,
              createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            },
          }),
        ]);

      return {
        date: today.toISOString().split('T')[0],
        todaySales: {
          count: salesAgg._count.id ?? 0,
          total: Number(salesAgg._sum.totalAmount ?? 0),
          paid: Number(salesAgg._sum.paidAmount ?? 0),
        },
        pendingJobs: {
          count: pendingJobs,
          overdueCount: overdueJobs,
        },
        lowStock: {
          count: lowStockItems.length,
          items: lowStockItems.map((p) => `${p.name} (qty: ${p.quantity})`),
        },
        recentCustomers: { count: newCustomers },
        currency: 'INR',
      };
    } catch (err) {
      this.logger.warn(`Business snapshot failed for ${tenantId}: ${err.message}`);
      // Return empty snapshot — AI still works, just without pre-loaded context
      return {
        date: today.toISOString().split('T')[0],
        todaySales: { count: 0, total: 0, paid: 0 },
        pendingJobs: { count: 0, overdueCount: 0 },
        lowStock: { count: 0, items: [] },
        recentCustomers: { count: 0 },
        currency: 'INR',
      };
    }
  }
}
