import { authenticatedFetch, extractData } from "./auth.api";

export interface InventoryOverview {
  totalLossValue: number;
  totalLossValueRupees: number;
  totalLossQty: number;
  sessionsAnalyzed: number;
  topLossReason: string | null;
  period: { startDate: string; endDate: string };
}

export interface InventoryTopProduct {
  productId: string;
  productName: string;
  category: string;
  lossQty: number;
  lossValue: number;
  lossValueRupees: number;
}

export interface InventoryByCategory {
  category: string;
  lossQty: number;
  lossValue: number;
  lossValueRupees: number;
  affectedProducts: number;
  percentOfTotal: number;
}

export interface InventoryByReason {
  reason: string;
  count: number;
  lossQty: number;
  lossValue: number;
  lossValueRupees: number;
  affectedProducts: number;
  percentOfTotal: number;
}

export interface InventoryMonthlyTrend {
  month: string;
  lossQty: number;
  lossValue: number;
  lossValueRupees: number;
}

export interface InventoryInsights {
  insights: string[];
}

export interface InventoryIntelligence {
  overview: InventoryOverview;
  topProducts: InventoryTopProduct[];
  byCategory: InventoryByCategory[];
  byReason: InventoryByReason[];
  monthlyTrend: InventoryMonthlyTrend[];
  insights: string[];
}

function buildParams(shopId: string, startDate?: string, endDate?: string): URLSearchParams {
  const p = new URLSearchParams({ shopId });
  if (startDate) p.append("startDate", startDate);
  if (endDate) p.append("endDate", endDate);
  return p;
}

export async function getInventoryIntelligence(
  shopId: string,
  startDate?: string,
  endDate?: string,
): Promise<InventoryIntelligence> {
  const res = await authenticatedFetch(
    `/reports/inventory-intelligence?${buildParams(shopId, startDate, endDate)}`,
  );
  if (!res.ok) throw new Error("Failed to load inventory intelligence");
  return extractData(res);
}

export async function getInventoryOverview(shopId: string, startDate?: string, endDate?: string) {
  const res = await authenticatedFetch(
    `/reports/inventory-intelligence/overview?${buildParams(shopId, startDate, endDate)}`,
  );
  if (!res.ok) throw new Error("Failed to load overview");
  return extractData(res) as InventoryOverview;
}

export async function getInventoryTopProducts(shopId: string, startDate?: string, endDate?: string) {
  const res = await authenticatedFetch(
    `/reports/inventory-intelligence/top-loss-products?${buildParams(shopId, startDate, endDate)}`,
  );
  if (!res.ok) throw new Error("Failed to load top products");
  return extractData(res) as InventoryTopProduct[];
}

export async function getInventoryLossByCategory(shopId: string, startDate?: string, endDate?: string) {
  const res = await authenticatedFetch(
    `/reports/inventory-intelligence/loss-by-category?${buildParams(shopId, startDate, endDate)}`,
  );
  if (!res.ok) throw new Error("Failed to load category breakdown");
  return extractData(res) as InventoryByCategory[];
}

export async function getInventoryMonthlyTrend(shopId: string) {
  const res = await authenticatedFetch(
    `/reports/inventory-intelligence/monthly-loss-trend?${new URLSearchParams({ shopId })}`,
  );
  if (!res.ok) throw new Error("Failed to load monthly trend");
  return extractData(res) as InventoryMonthlyTrend[];
}

export async function getInventoryReasonBreakdown(shopId: string, startDate?: string, endDate?: string) {
  const res = await authenticatedFetch(
    `/reports/inventory-intelligence/reason-breakdown?${buildParams(shopId, startDate, endDate)}`,
  );
  if (!res.ok) throw new Error("Failed to load reason breakdown");
  return extractData(res) as InventoryByReason[];
}
