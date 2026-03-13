import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';

/**
 * Shrinkage Intelligence — analyzes stock adjustment patterns to surface:
 * 1. Which product categories lose the most stock
 * 2. Which staff member recorded the most loss events
 * 3. Which supplier's products cause the most damage
 *
 * Queries existing StockVerificationItem + StockLedger (ADJUSTMENT) data.
 * No new table required.
 */
@Injectable()
export class ShrinkageService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── 1. LOSS BY CATEGORY ──────────────────────────────────────────────────

  async lossByCategory(
    tenantId: string,
    shopId: string,
    startDate: string,
    endDate: string,
  ) {
    // Aggregate verification items where difference < 0, grouped by product category
    const items = await this.prisma.stockVerificationItem.findMany({
      where: {
        tenantId,
        shopId,
        difference:   { lt: 0 },
        verification: {
          status:      'CONFIRMED',
          sessionDate: { gte: new Date(startDate), lte: new Date(endDate) },
        },
      },
      include: {
        shopProduct: { select: { name: true, category: true, avgCost: true } },
      },
    });

    const categoryMap: Record<
      string,
      { lostUnits: number; lostValue: number; products: Set<string> }
    > = {};

    for (const item of items) {
      const cat   = item.shopProduct?.category ?? 'Uncategorized';
      const units = Math.abs(item.difference);
      const value = units * (item.shopProduct?.avgCost ?? 0);

      if (!categoryMap[cat]) {
        categoryMap[cat] = { lostUnits: 0, lostValue: 0, products: new Set() };
      }
      categoryMap[cat].lostUnits += units;
      categoryMap[cat].lostValue += value;
      categoryMap[cat].products.add(item.shopProductId);
    }

    return Object.entries(categoryMap)
      .map(([category, data]) => ({
        category,
        lostUnits:        data.lostUnits,
        lostValue:        data.lostValue / 100, // Paisa → Rupees
        affectedProducts: data.products.size,
      }))
      .sort((a, b) => b.lostValue - a.lostValue);
  }

  // ─── 2. LOSS BY STAFF ─────────────────────────────────────────────────────

  async lossByStaff(
    tenantId: string,
    shopId: string,
    startDate: string,
    endDate: string,
  ) {
    const sessions = await this.prisma.stockVerification.findMany({
      where: {
        tenantId,
        shopId,
        status:      'CONFIRMED',
        sessionDate: { gte: new Date(startDate), lte: new Date(endDate) },
      },
      select: {
        id: true,
        createdBy: true,
        confirmedBy: true,
        items: {
          where:  { difference: { lt: 0 } },
          select: { difference: true, shopProduct: { select: { avgCost: true } } },
        },
      },
    });

    // Group by the staff who created (initiated) the session — they did the count
    const staffMap: Record<
      string,
      { sessions: number; lostUnits: number; lostValue: number }
    > = {};

    for (const session of sessions) {
      const staffId = session.createdBy;
      if (!staffMap[staffId]) {
        staffMap[staffId] = { sessions: 0, lostUnits: 0, lostValue: 0 };
      }
      staffMap[staffId].sessions += 1;
      for (const item of session.items) {
        const units = Math.abs(item.difference);
        staffMap[staffId].lostUnits += units;
        staffMap[staffId].lostValue += units * (item.shopProduct?.avgCost ?? 0);
      }
    }

    // Enrich with staff names
    const userIds = Object.keys(staffMap);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, fullName: true, email: true },
    });
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    return Object.entries(staffMap)
      .map(([staffId, data]) => ({
        staffId,
        staffName:  userMap[staffId]?.fullName ?? 'Unknown',
        staffEmail: userMap[staffId]?.email    ?? '',
        sessions:   data.sessions,
        lostUnits:  data.lostUnits,
        lostValue:  data.lostValue / 100,
      }))
      .sort((a, b) => b.lostValue - a.lostValue);
  }

  // ─── 3. LOSS BY SUPPLIER ──────────────────────────────────────────────────

  /**
   * Determines supplier contribution to damage by joining:
   * StockVerificationItem (with reason = DAMAGE | BREAKAGE | SPARE_DAMAGE)
   *  → ShopProduct → PurchaseItem (most recent purchase) → Purchase → Party (supplier)
   */
  async lossBySupplier(
    tenantId: string,
    shopId: string,
    startDate: string,
    endDate: string,
  ) {
    const items = await this.prisma.stockVerificationItem.findMany({
      where: {
        tenantId,
        shopId,
        difference: { lt: 0 },
        reason:     { in: ['DAMAGE', 'BREAKAGE', 'SPARE_DAMAGE'] },
        verification: {
          status:      'CONFIRMED',
          sessionDate: { gte: new Date(startDate), lte: new Date(endDate) },
        },
      },
      include: {
        shopProduct: {
          select: {
            name:     true,
            avgCost:  true,
            purchaseItems: {
              orderBy: { createdAt: 'desc' },
              take:    1,
              include: {
                purchase: {
                  select: {
                    globalSupplierId: true,
                    supplierName:     true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const supplierMap: Record<
      string,
      { supplierName: string; lostUnits: number; lostValue: number; affectedProducts: Set<string> }
    > = {};

    for (const item of items) {
      const pi          = item.shopProduct?.purchaseItems?.[0];
      const supplierKey = pi?.purchase?.globalSupplierId ?? 'UNKNOWN';
      const supplierName = pi?.purchase?.supplierName    ?? 'Unknown Supplier';
      const units        = Math.abs(item.difference);
      const value        = units * (item.shopProduct?.avgCost ?? 0);

      if (!supplierMap[supplierKey]) {
        supplierMap[supplierKey] = {
          supplierName,
          lostUnits:        0,
          lostValue:        0,
          affectedProducts: new Set(),
        };
      }
      supplierMap[supplierKey].lostUnits += units;
      supplierMap[supplierKey].lostValue += value;
      supplierMap[supplierKey].affectedProducts.add(item.shopProductId);
    }

    return Object.entries(supplierMap)
      .map(([supplierId, data]) => ({
        supplierId,
        supplierName:     data.supplierName,
        lostUnits:        data.lostUnits,
        lostValue:        data.lostValue / 100,
        affectedProducts: data.affectedProducts.size,
      }))
      .sort((a, b) => b.lostValue - a.lostValue);
  }

  // ─── 4. REASON BREAKDOWN ──────────────────────────────────────────────────

  async lossReasonBreakdown(
    tenantId: string,
    shopId: string,
    startDate: string,
    endDate: string,
  ) {
    const items = await this.prisma.stockVerificationItem.findMany({
      where: {
        tenantId,
        shopId,
        difference:   { lt: 0 },
        verification: {
          status:      'CONFIRMED',
          sessionDate: { gte: new Date(startDate), lte: new Date(endDate) },
        },
      },
      select: { difference: true, reason: true, shopProduct: { select: { avgCost: true } } },
    });

    const reasonMap: Record<string, { count: number; lostUnits: number; lostValue: number }> = {};

    for (const item of items) {
      const reason = item.reason ?? 'CORRECTION';
      const units  = Math.abs(item.difference);
      const value  = units * (item.shopProduct?.avgCost ?? 0);

      if (!reasonMap[reason]) {
        reasonMap[reason] = { count: 0, lostUnits: 0, lostValue: 0 };
      }
      reasonMap[reason].count++;
      reasonMap[reason].lostUnits += units;
      reasonMap[reason].lostValue += value;
    }

    return Object.entries(reasonMap)
      .map(([reason, data]) => ({
        reason,
        count:     data.count,
        lostUnits: data.lostUnits,
        lostValue: data.lostValue / 100,
      }))
      .sort((a, b) => b.lostValue - a.lostValue);
  }

  // ─── 5. TOP LOSS PRODUCTS ─────────────────────────────────────────────────

  async topLossProducts(
    tenantId: string,
    shopId: string,
    startDate: string,
    endDate: string,
    limit = 10,
  ) {
    const items = await this.prisma.stockVerificationItem.findMany({
      where: {
        tenantId,
        shopId,
        difference:   { lt: 0 },
        verification: {
          status:      'CONFIRMED',
          sessionDate: { gte: new Date(startDate), lte: new Date(endDate) },
        },
      },
      select: {
        shopProductId: true,
        difference:    true,
        shopProduct:   { select: { name: true, avgCost: true, category: true } },
      },
    });

    const productMap: Record<
      string,
      { name: string; category: string; lossQty: number; lossValue: number }
    > = {};

    for (const item of items) {
      const pid = item.shopProductId;
      const qty = Math.abs(item.difference);
      const val = qty * (item.shopProduct?.avgCost ?? 0);

      if (!productMap[pid]) {
        productMap[pid] = {
          name:      item.shopProduct?.name     ?? 'Unknown',
          category:  item.shopProduct?.category ?? 'Uncategorized',
          lossQty:   0,
          lossValue: 0,
        };
      }
      productMap[pid].lossQty   += qty;
      productMap[pid].lossValue += val;
    }

    return Object.entries(productMap)
      .map(([productId, data]) => ({
        productId,
        productName: data.name,
        category:    data.category,
        lossQty:     data.lossQty,
        lossValue:   data.lossValue / 100,
      }))
      .sort((a, b) => b.lossValue - a.lossValue)
      .slice(0, limit);
  }

  // ─── 6. MONTHLY TREND ─────────────────────────────────────────────────────

  async monthlyTrend(
    tenantId: string,
    shopId: string,
    months = 12,
  ) {
    const endDate   = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const items = await this.prisma.stockVerificationItem.findMany({
      where: {
        tenantId,
        shopId,
        difference:   { lt: 0 },
        verification: {
          status:      'CONFIRMED',
          sessionDate: { gte: startDate, lte: endDate },
        },
      },
      select: {
        difference:   true,
        shopProduct:  { select: { avgCost: true } },
        verification: { select: { sessionDate: true } },
      },
    });

    const monthMap: Record<string, { lossValue: number; lossQty: number }> = {};

    for (const item of items) {
      const d     = item.verification.sessionDate;
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const qty   = Math.abs(item.difference);
      const val   = qty * (item.shopProduct?.avgCost ?? 0);

      if (!monthMap[month]) monthMap[month] = { lossValue: 0, lossQty: 0 };
      monthMap[month].lossValue += val;
      monthMap[month].lossQty  += qty;
    }

    return Object.entries(monthMap)
      .map(([month, data]) => ({
        month,
        lossValue: data.lossValue / 100,
        lossQty:   data.lossQty,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  // ─── 7. FULL INTELLIGENCE SUMMARY ────────────────────────────────────────

  async getIntelligenceSummary(
    tenantId: string,
    shopId: string,
    startDate: string,
    endDate: string,
  ) {
    const [byCategory, byStaff, bySupplier, byReason, topProducts] = await Promise.all([
      this.lossByCategory(tenantId, shopId, startDate, endDate),
      this.lossByStaff(tenantId, shopId, startDate, endDate),
      this.lossBySupplier(tenantId, shopId, startDate, endDate),
      this.lossReasonBreakdown(tenantId, shopId, startDate, endDate),
      this.topLossProducts(tenantId, shopId, startDate, endDate),
    ]);

    const totalLostValue = byCategory.reduce((sum, c) => sum + c.lostValue, 0);
    const totalLostUnits = byCategory.reduce((sum, c) => sum + c.lostUnits, 0);

    return {
      period:          { startDate, endDate },
      totalLostValue,
      totalLostUnits,
      topLossCategory: byCategory[0]?.category        ?? null,
      topLossStaff:    byStaff[0]?.staffName          ?? null,
      topLossSupplier: bySupplier[0]?.supplierName    ?? null,
      byCategory,
      byStaff,
      bySupplier,
      byReason,
      topProducts,
    };
  }
}
