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
  shopName?: string;
}

export interface PurchaseReportItem {
  purchaseNo: string;
  supplier: string | null;
  date: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  stockReceived: boolean;
  shopName?: string;
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
  
  // Breakdown
  salesRevenue: number;
  salesCost: number;
  salesProfit: number;
  
  repairRevenue: number;
  repairCost: number;
  repairProfit: number;
}



export type ReportParams = {
  startDate?: string;
  endDate?: string;
  shopId?: string;
  partyId?: string;
};

// Helper: Remove undefined/null params to avoid "undefined" strings in URL
function cleanParams(params: ReportParams): Record<string, string> {
  const cleaned: Record<string, string> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      cleaned[key] = value;
    }
  });
  return cleaned;
}

export async function getSalesReport(
  params: ReportParams = {},
): Promise<SalesReportItem[]> {
  const query = new URLSearchParams(cleanParams(params));
  const response = await authenticatedFetch(
    `/api/mobileshop/reports/sales?${query}`,
  );
  if (!response.ok) throw new Error("Failed to fetch sales report");
  const data: SalesReportItem[] = await response.json();
  
  // Backend already returns values in Rupees
  return data;
}

export async function getPurchaseReport(
  params: ReportParams = {},
): Promise<PurchaseReportItem[]> {
  const query = new URLSearchParams(cleanParams(params));
  const response = await authenticatedFetch(
    `/api/mobileshop/reports/purchases?${query}`,
  );
  if (!response.ok) throw new Error("Failed to fetch purchase report");
  const data: PurchaseReportItem[] = await response.json();

  // Backend already returns values in Rupees
  return data;
}

export async function getInventoryReport(
  shopId?: string,
): Promise<InventoryReportItem[]> {
  const query = shopId ? `?shopId=${shopId}` : "";
  const response = await authenticatedFetch(
    `/api/mobileshop/reports/inventory${query}`,
  );
  if (!response.ok) throw new Error("Failed to fetch inventory report");
  const data: InventoryReportItem[] = await response.json();

  // Backend already returns values in Rupees (Division by 100 handled in backend)
  return data;
}

export async function getProfitSummary(
  params: ReportParams = {},
): Promise<{ metrics: ProfitSummaryMetrics }> {
  const query = new URLSearchParams(cleanParams(params));
  const response = await authenticatedFetch(
    `/api/mobileshop/reports/profit?${query}`,
  );
  if (!response.ok) throw new Error("Failed to fetch profit summary");
  const data: { metrics: ProfitSummaryMetrics } = await response.json();

  // Backend already returns values in Rupees (division by 100 handled there)
  return data;
}

export interface TopProductItem {
  productId: string;
  name: string;
  totalQty: number;
  totalAmount: number;
}

export async function getTopSellingProducts(
  params: ReportParams = {},
): Promise<TopProductItem[]> {
  const query = new URLSearchParams(cleanParams(params));
  const response = await authenticatedFetch(
    `/api/mobileshop/reports/top-products?${query}`,
  );
  if (!response.ok) throw new Error("Failed to fetch top products");
  const data: TopProductItem[] = await response.json();

  // Convert Paise to Rupees
  return data.map(item => ({
    ...item,
    totalAmount: item.totalAmount / 100,
  }));
}
