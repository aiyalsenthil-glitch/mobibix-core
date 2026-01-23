import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';

@Injectable()
export class StaffDashboardService {
  constructor(private prisma: PrismaService) {}

  async getStaffDashboard(tenantId: string, userId: string) {
    // 1️⃣ Resolve staff → shop (single shop only)
    const staff = await this.prisma.shopStaff.findFirst({
      where: {
        tenantId,
        userId,
        isActive: true,
      },
      select: { shopId: true },
    });

    if (!staff) {
      throw new ForbiddenException('STAFF_SHOP_NOT_ASSIGNED');
    }

    const shopId = staff.shopId;

    // 2️⃣ Jobs KPIs
    const [inProgress, waitingForParts, ready, deliveredToday] =
      await Promise.all([
        this.prisma.jobCard.count({
          where: { tenantId, shopId, status: 'IN_PROGRESS' },
        }),
        this.prisma.jobCard.count({
          where: { tenantId, shopId, status: 'WAITING_FOR_PARTS' },
        }),
        this.prisma.jobCard.count({
          where: { tenantId, shopId, status: 'READY' },
        }),
        this.prisma.jobCard.count({
          where: {
            tenantId,
            shopId,
            status: 'DELIVERED',
            updatedAt: { gte: this.startOfToday() },
          },
        }),
      ]);

    // 3️⃣ Stock alerts (negative & zero)
    const products = await this.prisma.shopProduct.findMany({
      where: { tenantId, shopId, isActive: true },
      select: {
        id: true,
        name: true,
        stockEntries: {
          select: { type: true, quantity: true },
        },
      },
    });

    let negativeStockCount = 0;
    let zeroStockCount = 0;

    for (const p of products) {
      const qty = p.stockEntries.reduce(
        (sum, e) => (e.type === 'IN' ? sum + e.quantity : sum - e.quantity),
        0,
      );
      if (qty < 0) negativeStockCount++;
      else if (qty === 0) zeroStockCount++;
    }

    return {
      shopId,
      jobs: {
        inProgress,
        waitingForParts,
        ready,
        deliveredToday,
      },
      stockAlerts: {
        negativeStockCount,
        zeroStockCount,
      },
    };
  }

  private startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
}
