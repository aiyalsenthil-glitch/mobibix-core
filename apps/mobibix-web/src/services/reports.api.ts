import { authenticatedFetch } from "./auth.api";

export interface SalesReportItem {
  invoiceNo: string;
  date: string;
  customer: string | null;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  paymentMode: string;
  profit: number | null;
}

export interface PurchaseReportItem {
  purchaseNo: string;
  supplier: string | null;
  date: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  stockReceived: boolean;
}

export interface InventoryReportItem {
  product: string;
  isSerialized: boolean;
  quantity: number;
  costPrice: number;
  stockValue: number | null;
  lowStock: boolean;
}

export interface ProfitSummaryMetrics {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  margin: number;
}

export type ReportParams = {
  startDate?: string;
  endDate?: string;
  shopId?: string;
};

export async function getSalesReport(
  params: ReportParams = {},
): Promise<SalesReportItem[]> {
  const query = new URLSearchParams(params as Record<string, string>);
  const response = await authenticatedFetch(
    `/api/mobileshop/reports/sales?${query}`,
  );
  if (!response.ok) throw new Error("Failed to fetch sales report");
  return response.json();
}

export async function getPurchaseReport(
  params: ReportParams = {},
): Promise<PurchaseReportItem[]> {
  const query = new URLSearchParams(params as Record<string, string>);
  const response = await authenticatedFetch(
    `/api/mobileshop/reports/purchases?${query}`,
  );
  if (!response.ok) throw new Error("Failed to fetch purchase report");
  return response.json();
}

export async function getInventoryReport(
  shopId?: string,
): Promise<InventoryReportItem[]> {
  const query = shopId ? `?shopId=${shopId}` : "";
  const response = await authenticatedFetch(
    `/api/mobileshop/reports/inventory${query}`,
  );
  if (!response.ok) throw new Error("Failed to fetch inventory report");
  return response.json();
}

export async function getProfitSummary(
  params: ReportParams = {},
): Promise<{ metrics: ProfitSummaryMetrics }> {
  const query = new URLSearchParams(params as Record<string, string>);
  const response = await authenticatedFetch(
    `/api/mobileshop/reports/profit?${query}`,
  );
  if (!response.ok) throw new Error("Failed to fetch profit summary");
  return response.json();
}
