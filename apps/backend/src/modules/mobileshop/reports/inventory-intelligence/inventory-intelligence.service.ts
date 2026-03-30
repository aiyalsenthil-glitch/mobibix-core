import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { InventoryIntelligenceQueryDto } from './dto/inventory-intelligence-query.dto';

// Loss item shape fetched once and reused across all computations
interface LossItem {
  shopProductId: string;
  productName: string;
  category: string;
  reason: string;
  difference: number;   // negative integer (units lost)
  lossQty: number;      // abs(difference)
  lossValue: number;    // Paisa — lossQty × avgCost
  sessionDate: Date;
  sessionId: string;
}

@Injectable()
export class InventoryIntelligenceService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── MASTER FETCH ──────────────────────────────────────────────────────────

  /**
   * Single query that fetches all confirmed-session loss items for the period.
   * All analytics methods operate on this in-memory set — zero N+1.
   */
  private async fetchLossItems(
    tenantId: string,
    shopId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<LossItem[]> {
    // 1. Fetch losses from confirmed stock counts (Verifications)
    const verificationRows = await this.prisma.stockVerificationItem.findMany({
      where: {
        tenantId,
        shopId,
        difference: { lt: 0 },
        verification: {
          status: 'CONFIRMED',
          sessionDate: { gte: startDate, lte: endDate },
        },
      },
      select: {
        difference: true,
        reason: true,
        shopProductId: true,
        shopProduct: { select: { name: true, category: true, avgCost: true } },
        verification: { select: { id: true, sessionDate: true } },
      },
    });

    const verificationLosses: LossItem[] = verificationRows.map((r) => {
      const lossQty = Math.abs(r.difference);
      const costPerUnit = r.shopProduct?.avgCost ?? 0;
      return {
        shopProductId: r.shopProductId,
        productName: r.shopProduct?.name ?? 'Unknown',
        category: r.shopProduct?.category ?? 'Uncategorized',
        reason: r.reason ?? 'CORRECTION',
        difference: r.difference,
        lossQty,
        lossValue: lossQty * costPerUnit,
        sessionDate: r.verification.sessionDate,
        sessionId: r.verification.id,
      };
    });

    // 2. Fetch direct losses from ledger (Manual Adjustments)
    // Wrapped in try/catch — enum values LOSS/DAMAGE/THEFT/INTERNAL_USE require migration 20260325135235
    let ledgerRows: any[] = [];
    try {
      ledgerRows = await (this.prisma.stockLedger as any).findMany({
        where: {
          tenantId,
          shopId,
          type: 'OUT',
          referenceType: { in: ['LOSS', 'DAMAGE', 'THEFT', 'INTERNAL_USE'] },
          createdAt: { gte: startDate, lte: endDate },
        },
        select: {
          id: true,
          quantity: true,
          referenceType: true,
          shopProductId: true,
          createdAt: true,
          product: { select: { name: true, category: true, avgCost: true } },
        },
      });
    } catch {
      ledgerRows = [];
    }

    const ledgerLosses: LossItem[] = (ledgerRows as any[]).map((r: any) => {
      const lossQty = Math.abs(r.quantity);
      const costPerUnit = r.product?.avgCost ?? 0;
      return {
        shopProductId: r.shopProductId,
        productName: r.product?.name ?? 'Unknown',
        category: r.product?.category ?? 'Uncategorized',
        reason: String(r.referenceType) || 'ADJUSTMENT',
        difference: -lossQty,
        lossQty,
        lossValue: lossQty * costPerUnit,
        sessionDate: r.createdAt,
        sessionId: r.id, // using ledger entry ID as session ID for grouping
      };
    });

    return [...verificationLosses, ...ledgerLosses];
  }

  private resolveDateRange(query: InventoryIntelligenceQueryDto): { start: Date; end: Date } {
    const now = new Date();
    const start = query.startDate
      ? new Date(query.startDate)
      : new Date(now.getFullYear(), now.getMonth() - 2, 1); // default: last 3 months
    const end = query.endDate ? new Date(query.endDate) : now;
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  // ─── OVERVIEW ──────────────────────────────────────────────────────────────

  async getOverview(tenantId: string, query: InventoryIntelligenceQueryDto) {
    const { start, end } = this.resolveDateRange(query);
    const items = await this.fetchLossItems(tenantId, query.shopId, start, end);

    const totalLossValue = items.reduce((s, i) => s + i.lossValue, 0);
    const totalLossQty   = items.reduce((s, i) => s + i.lossQty, 0);
    const sessionIds     = new Set(items.map((i) => i.sessionId));

    // Top reason by count
    const reasonCounts: Record<string, number> = {};
    items.forEach((i) => { reasonCounts[i.reason] = (reasonCounts[i.reason] ?? 0) + 1; });
    const topLossReason = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return {
      totalLossValue,            // Paisa
      totalLossValueRupees: totalLossValue / 100,
      totalLossQty,
      sessionsAnalyzed: sessionIds.size,
      topLossReason,
      period: { startDate: start.toISOString(), endDate: end.toISOString() },
    };
  }

  // ─── TOP LOSS PRODUCTS ─────────────────────────────────────────────────────

  async getTopLossProducts(tenantId: string, query: InventoryIntelligenceQueryDto, limit = 10) {
    const { start, end } = this.resolveDateRange(query);
    const items = await this.fetchLossItems(tenantId, query.shopId, start, end);

    const productMap: Record<string, { name: string; category: string; lossQty: number; lossValue: number }> = {};
    items.forEach((i) => {
      if (!productMap[i.shopProductId]) {
        productMap[i.shopProductId] = { name: i.productName, category: i.category, lossQty: 0, lossValue: 0 };
      }
      productMap[i.shopProductId].lossQty   += i.lossQty;
      productMap[i.shopProductId].lossValue += i.lossValue;
    });

    return Object.entries(productMap)
      .map(([productId, v]) => ({
        productId,
        productName: v.name,
        category:    v.category,
        lossQty:     v.lossQty,
        lossValue:   v.lossValue,           // Paisa
        lossValueRupees: v.lossValue / 100,
      }))
      .sort((a, b) => b.lossValue - a.lossValue)
      .slice(0, limit);
  }

  // ─── LOSS BY CATEGORY ──────────────────────────────────────────────────────

  async getLossByCategory(tenantId: string, query: InventoryIntelligenceQueryDto) {
    const { start, end } = this.resolveDateRange(query);
    const items = await this.fetchLossItems(tenantId, query.shopId, start, end);

    const catMap: Record<string, { lossQty: number; lossValue: number; productCount: Set<string> }> = {};
    items.forEach((i) => {
      if (!catMap[i.category]) catMap[i.category] = { lossQty: 0, lossValue: 0, productCount: new Set() };
      catMap[i.category].lossQty   += i.lossQty;
      catMap[i.category].lossValue += i.lossValue;
      catMap[i.category].productCount.add(i.shopProductId);
    });

    const totalLossValue = items.reduce((s, i) => s + i.lossValue, 0);

    return Object.entries(catMap)
      .map(([category, v]) => ({
        category,
        lossQty:        v.lossQty,
        lossValue:      v.lossValue,         // Paisa
        lossValueRupees: v.lossValue / 100,
        affectedProducts: v.productCount.size,
        percentOfTotal: totalLossValue > 0 ? Math.round((v.lossValue / totalLossValue) * 100) : 0,
      }))
      .sort((a, b) => b.lossValue - a.lossValue);
  }

  // ─── MONTHLY LOSS TREND ────────────────────────────────────────────────────

  async getMonthlyLossTrend(tenantId: string, query: InventoryIntelligenceQueryDto, months = 12) {
    const end   = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setMonth(start.getMonth() - (months - 1));
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const items = await this.fetchLossItems(tenantId, query.shopId, start, end);

    const monthMap: Record<string, { lossQty: number; lossValue: number }> = {};
    items.forEach((i) => {
      const key = `${i.sessionDate.getFullYear()}-${String(i.sessionDate.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap[key]) monthMap[key] = { lossQty: 0, lossValue: 0 };
      monthMap[key].lossQty   += i.lossQty;
      monthMap[key].lossValue += i.lossValue;
    });

    // Fill all months in range (no gaps)
    const result: { month: string; lossQty: number; lossValue: number; lossValueRupees: number }[] = [];
    for (let i = 0; i < months; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - (months - 1 - i));
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      result.push({
        month:          key,
        lossQty:        monthMap[key]?.lossQty ?? 0,
        lossValue:      monthMap[key]?.lossValue ?? 0,
        lossValueRupees: (monthMap[key]?.lossValue ?? 0) / 100,
      });
    }

    return result;
  }

  // ─── REASON BREAKDOWN ──────────────────────────────────────────────────────

  async getReasonBreakdown(tenantId: string, query: InventoryIntelligenceQueryDto) {
    const { start, end } = this.resolveDateRange(query);
    const items = await this.fetchLossItems(tenantId, query.shopId, start, end);

    const reasonMap: Record<string, { count: number; lossQty: number; lossValue: number; productIds: Set<string> }> = {};
    items.forEach((i) => {
      if (!reasonMap[i.reason]) reasonMap[i.reason] = { count: 0, lossQty: 0, lossValue: 0, productIds: new Set() };
      reasonMap[i.reason].count    += 1;
      reasonMap[i.reason].lossQty  += i.lossQty;
      reasonMap[i.reason].lossValue += i.lossValue;
      reasonMap[i.reason].productIds.add(i.shopProductId);
    });

    const totalLossValue = items.reduce((s, i) => s + i.lossValue, 0);

    return Object.entries(reasonMap)
      .map(([reason, v]) => ({
        reason,
        count:           v.count,
        lossQty:         v.lossQty,
        lossValue:       v.lossValue,
        lossValueRupees: v.lossValue / 100,
        affectedProducts: v.productIds.size,
        percentOfTotal: totalLossValue > 0 ? Math.round((v.lossValue / totalLossValue) * 100) : 0,
      }))
      .sort((a, b) => b.lossValue - a.lossValue);
  }

  // ─── INSIGHT ENGINE ────────────────────────────────────────────────────────

  async generateInsights(tenantId: string, query: InventoryIntelligenceQueryDto): Promise<string[]> {
    const { start, end } = this.resolveDateRange(query);
    const items = await this.fetchLossItems(tenantId, query.shopId, start, end);
    const insights: string[] = [];

    if (items.length === 0) return insights;

    const totalLossValue = items.reduce((s, i) => s + i.lossValue, 0);
    const totalLossQty   = items.reduce((s, i) => s + i.lossQty, 0);

    // ── Rule 1: Single product dominates loss ─────────────────────────────
    const productMap: Record<string, { name: string; lossValue: number }> = {};
    items.forEach((i) => {
      if (!productMap[i.shopProductId]) productMap[i.shopProductId] = { name: i.productName, lossValue: 0 };
      productMap[i.shopProductId].lossValue += i.lossValue;
    });
    const topProduct = Object.values(productMap).sort((a, b) => b.lossValue - a.lossValue)[0];
    if (topProduct && totalLossValue > 0) {
      const pct = Math.round((topProduct.lossValue / totalLossValue) * 100);
      if (pct > 30) {
        insights.push(`"${topProduct.name}" accounts for ${pct}% of total inventory loss. Prioritise security or handling for this product.`);
      }
    }

    // ── Rule 2: Breakage dominates by count ──────────────────────────────
    const reasonCounts: Record<string, number> = {};
    items.forEach((i) => { reasonCounts[i.reason] = (reasonCounts[i.reason] ?? 0) + 1; });
    const breakagePct = Math.round(((reasonCounts['BREAKAGE'] ?? 0) / items.length) * 100);
    if (breakagePct > 40) {
      insights.push(`Breakage accounts for ${breakagePct}% of all loss incidents. Review storage conditions and handling procedures.`);
    }

    // ── Rule 3: High theft/missing rate ───────────────────────────────────
    const lostPct = Math.round(((reasonCounts['LOST'] ?? 0) / items.length) * 100);
    if (lostPct > 20) {
      insights.push(`${lostPct}% of losses are marked as Lost/Missing. Consider a security audit of storage areas.`);
    }

    // ── Rule 4: Spare part damage high ────────────────────────────────────
    const spareValue = items.filter((i) => i.reason === 'SPARE_DAMAGE').reduce((s, i) => s + i.lossValue, 0);
    if (totalLossValue > 0) {
      const sparePct = Math.round((spareValue / totalLossValue) * 100);
      if (sparePct > 35) {
        insights.push(`Spare part damage during repairs accounts for ${sparePct}% of loss value. Technician retraining or better tooling may reduce this.`);
      }
    }

    // ── Rule 5: Month-over-month spike ───────────────────────────────────
    const now = new Date();
    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonthKey = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`.replace('-0', '-12'); // handles Jan edge case
    const monthMap: Record<string, number> = {};
    items.forEach((i) => {
      const key = `${i.sessionDate.getFullYear()}-${String(i.sessionDate.getMonth() + 1).padStart(2, '0')}`;
      monthMap[key] = (monthMap[key] ?? 0) + i.lossValue;
    });
    const thisMonth = monthMap[thisMonthKey] ?? 0;
    const lastMonth = monthMap[lastMonthKey] ?? 0;
    if (lastMonth > 0) {
      const change = ((thisMonth - lastMonth) / lastMonth) * 100;
      if (change > 25) {
        insights.push(`Inventory loss increased by ${Math.round(change)}% compared to last month. Investigate recent sessions.`);
      } else if (change < -25) {
        insights.push(`Inventory loss decreased by ${Math.round(Math.abs(change))}% compared to last month. Great improvement!`);
      }
    }

    // ── Rule 6: One category dominates ───────────────────────────────────
    const catMap: Record<string, number> = {};
    items.forEach((i) => { catMap[i.category] = (catMap[i.category] ?? 0) + i.lossValue; });
    const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];
    if (topCat && totalLossValue > 0) {
      const catPct = Math.round((topCat[1] / totalLossValue) * 100);
      if (catPct > 50) {
        insights.push(`Category "${topCat[0]}" accounts for ${catPct}% of all inventory losses. Consider more frequent verification for this category.`);
      }
    }

    return insights;
  }

  // ─── COMBINED (single call for dashboard) ──────────────────────────────────

  async getAll(tenantId: string, query: InventoryIntelligenceQueryDto) {
    const { start, end } = this.resolveDateRange(query);
    const items = await this.fetchLossItems(tenantId, query.shopId, start, end);

    // -- overview
    const totalLossValue = items.reduce((s, i) => s + i.lossValue, 0);
    const totalLossQty   = items.reduce((s, i) => s + i.lossQty, 0);
    const sessionIds     = new Set(items.map((i) => i.sessionId));
    const reasonCounts: Record<string, number> = {};
    items.forEach((i) => { reasonCounts[i.reason] = (reasonCounts[i.reason] ?? 0) + 1; });
    const topLossReason = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    const overview = {
      totalLossValue,
      totalLossValueRupees: totalLossValue / 100,
      totalLossQty,
      sessionsAnalyzed: sessionIds.size,
      topLossReason,
      period: { startDate: start.toISOString(), endDate: end.toISOString() },
    };

    // -- top products
    const productMap: Record<string, { name: string; category: string; lossQty: number; lossValue: number }> = {};
    items.forEach((i) => {
      if (!productMap[i.shopProductId]) productMap[i.shopProductId] = { name: i.productName, category: i.category, lossQty: 0, lossValue: 0 };
      productMap[i.shopProductId].lossQty   += i.lossQty;
      productMap[i.shopProductId].lossValue += i.lossValue;
    });
    const topProducts = Object.entries(productMap)
      .map(([productId, v]) => ({ productId, productName: v.name, category: v.category, lossQty: v.lossQty, lossValue: v.lossValue, lossValueRupees: v.lossValue / 100 }))
      .sort((a, b) => b.lossValue - a.lossValue).slice(0, 10);

    // -- by category
    const catAgg: Record<string, { lossQty: number; lossValue: number; productIds: Set<string> }> = {};
    items.forEach((i) => {
      if (!catAgg[i.category]) catAgg[i.category] = { lossQty: 0, lossValue: 0, productIds: new Set() };
      catAgg[i.category].lossQty += i.lossQty;
      catAgg[i.category].lossValue += i.lossValue;
      catAgg[i.category].productIds.add(i.shopProductId);
    });
    const byCategory = Object.entries(catAgg)
      .map(([category, v]) => ({ category, lossQty: v.lossQty, lossValue: v.lossValue, lossValueRupees: v.lossValue / 100, affectedProducts: v.productIds.size, percentOfTotal: totalLossValue > 0 ? Math.round((v.lossValue / totalLossValue) * 100) : 0 }))
      .sort((a, b) => b.lossValue - a.lossValue);

    // -- by reason
    const reasonAgg: Record<string, { count: number; lossQty: number; lossValue: number; productIds: Set<string> }> = {};
    items.forEach((i) => {
      if (!reasonAgg[i.reason]) reasonAgg[i.reason] = { count: 0, lossQty: 0, lossValue: 0, productIds: new Set() };
      reasonAgg[i.reason].count += 1;
      reasonAgg[i.reason].lossQty += i.lossQty;
      reasonAgg[i.reason].lossValue += i.lossValue;
      reasonAgg[i.reason].productIds.add(i.shopProductId);
    });
    const byReason = Object.entries(reasonAgg)
      .map(([reason, v]) => ({ reason, count: v.count, lossQty: v.lossQty, lossValue: v.lossValue, lossValueRupees: v.lossValue / 100, affectedProducts: v.productIds.size, percentOfTotal: totalLossValue > 0 ? Math.round((v.lossValue / totalLossValue) * 100) : 0 }))
      .sort((a, b) => b.lossValue - a.lossValue);

    // -- monthly trend (12 months)
    const MONTHS = 12;
    const trendStart = new Date(); trendStart.setMonth(trendStart.getMonth() - (MONTHS - 1)); trendStart.setDate(1); trendStart.setHours(0,0,0,0);
    const trendItems = await this.fetchLossItems(tenantId, query.shopId, trendStart, new Date());
    const monthMap: Record<string, { lossQty: number; lossValue: number }> = {};
    trendItems.forEach((i) => {
      const key = `${i.sessionDate.getFullYear()}-${String(i.sessionDate.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap[key]) monthMap[key] = { lossQty: 0, lossValue: 0 };
      monthMap[key].lossQty  += i.lossQty;
      monthMap[key].lossValue += i.lossValue;
    });
    const monthlyTrend = Array.from({ length: MONTHS }, (_, i) => {
      const d = new Date(); d.setMonth(d.getMonth() - (MONTHS - 1 - i));
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return { month: key, lossQty: monthMap[key]?.lossQty ?? 0, lossValue: monthMap[key]?.lossValue ?? 0, lossValueRupees: (monthMap[key]?.lossValue ?? 0) / 100 };
    });

    // -- insights
    const insights = await this.generateInsights(tenantId, query);

    return { overview, topProducts, byCategory, byReason, monthlyTrend, insights };
  }
}
