import { authenticatedFetch, extractData } from "./auth.api";

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
    `/mobileshop/reports/sales?${query}`,
  );
  if (!response.ok) throw new Error("Failed to fetch sales report");
  const data: SalesReportItem[] = await extractData(response);
  
  // Backend already returns values in Rupees
  return data;
}

export async function getPurchaseReport(
  params: ReportParams = {},
): Promise<PurchaseReportItem[]> {
  const query = new URLSearchParams(cleanParams(params));
  const response = await authenticatedFetch(
    `/mobileshop/reports/purchases?${query}`,
  );
  if (!response.ok) throw new Error("Failed to fetch purchase report");
  const data: PurchaseReportItem[] = await extractData(response);

  // Backend already returns values in Rupees
  return data;
}

export async function getInventoryReport(
  shopId?: string,
): Promise<InventoryReportItem[]> {
  const query = shopId ? `?shopId=${shopId}` : "";
  const response = await authenticatedFetch(
    `/mobileshop/reports/inventory${query}`,
  );
  if (!response.ok) throw new Error("Failed to fetch inventory report");
  const data: InventoryReportItem[] = await extractData(response);

  // Backend already returns values in Rupees (Division by 100 handled in backend)
  return data;
}

export async function getProfitSummary(
  params: ReportParams = {},
): Promise<{ metrics: ProfitSummaryMetrics }> {
  const query = new URLSearchParams(cleanParams(params));
  const response = await authenticatedFetch(
    `/mobileshop/reports/profit?${query}`,
  );
  if (!response.ok) throw new Error("Failed to fetch profit summary");
  const data: { metrics: ProfitSummaryMetrics } = await extractData(response);

  // Backend already returns values in Rupees (division by 100 handled there)
  return data;
}

export interface TopProductItem {
  productId: string;
  name: string;
  totalQty: number;
  totalAmount: number;
}

export interface RepairMetrics {
  totalRepairs: number;
  totalRevenue: number;
  totalProfit: number;
  margin: number;
}

export async function getTopSellingProducts(
  params: ReportParams = {},
): Promise<TopProductItem[]> {
  const query = new URLSearchParams(cleanParams(params));
  const response = await authenticatedFetch(
    `/mobileshop/reports/top-products?${query}`,
  );
  if (!response.ok) throw new Error("Failed to fetch top products");
  const data: TopProductItem[] = await extractData(response);

  // Convert Paise to Rupees
  return data.map((item) => ({
    ...item,
    totalAmount: item.totalAmount / 100,
  }));
}

export async function getRepairReport(
  params: ReportParams = {},
): Promise<SalesReportItem[]> {
  const query = new URLSearchParams(cleanParams(params));
  const response = await authenticatedFetch(
    `/mobileshop/reports/repairs?${query}`,
  );
  if (!response.ok) throw new Error("Failed to fetch repair report");
  const data: SalesReportItem[] = await extractData(response);
  return data;
}

export async function getRepairMetrics(
  params: ReportParams = {},
): Promise<RepairMetrics> {
  const query = new URLSearchParams(cleanParams(params));
  const response = await authenticatedFetch(
    `/mobileshop/reports/repair-metrics?${query}`,
  );
  if (!response.ok) throw new Error("Failed to fetch repair metrics");
  const data: RepairMetrics = await extractData(response);
  return data;
}

// =============================================================================
// GSTR-1 & TAX REPORTS (TIER-2)
// =============================================================================

export interface Gstr1SummaryItem {
  hsnCode: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  taxableValue?: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
}

export interface Gstr1Record {
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  gstinUin: string;
  invoiceAmount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  category: string;
}

export interface Gstr1Report {
  period: string;
  generatedDate: string;
  totalInvoices: number;
  b2bCount: number;
  b2cCount: number;
  exportCount: number;
  totalTaxableAmount: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  records: Gstr1Record[];
}

export async function getGstr1SalesRegister(
  startDate: string,
  endDate: string
): Promise<Gstr1Report> {
  const query = new URLSearchParams({ startDate, endDate });
  const response = await authenticatedFetch(
    `/reports/gstr1?${query}`
  );
  if (!response.ok) throw new Error("Failed to fetch GSTR-1 Sales Register");
  const data = await extractData(response);
  return data;
}

export async function getGstr1HsnSummary(
  startDate: string,
  endDate: string
): Promise<Gstr1SummaryItem[]> {
  const query = new URLSearchParams({ startDate, endDate });
  const response = await authenticatedFetch(
    `/reports/gstr1/hsn-summary?${query}`
  );
  if (!response.ok) throw new Error("Failed to fetch GSTR-1 HSN Summary");
  const data = await extractData(response);
  return data;
}

// =============================================================================
// GSTR-2 REPORTS
// =============================================================================

export interface Gstr2SummaryItem {
  hsnCode: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  itcEligible: boolean;
}

export interface Gstr2Record {
  purchaseNumber: string;
  invoiceDate: string;
  supplierName: string;
  supplierGstin: string;
  invoiceAmount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  itcEligible: boolean;
  itcCgstAmount: number;
  itcSgstAmount: number;
  itcIgstAmount: number;
}

export interface Gstr2Report {
  period: string;
  generatedDate: string;
  totalPurchases: number;
  itcEligibleCount: number;
  legacyUnverifiedCount: number;
  totalTaxableAmount: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalITC: number;
  records: Gstr2Record[];
}

export async function getGstr2PurchaseRegister(
  startDate: string,
  endDate: string
): Promise<Gstr2Report> {
  const query = new URLSearchParams({ startDate, endDate });
  const response = await authenticatedFetch(
    `/reports/gstr2?${query}`
  );
  if (!response.ok) throw new Error("Failed to fetch GSTR-2 Purchase Register");
  const data = await extractData(response);
  return data;
}

export async function getGstr2HsnSummary(
  startDate: string,
  endDate: string
): Promise<Gstr2SummaryItem[]> {
  const query = new URLSearchParams({ startDate, endDate });
  const response = await authenticatedFetch(
    `/reports/gstr2/hsn-summary?${query}`
  );
  if (!response.ok) throw new Error("Failed to fetch GSTR-2 HSN Summary");
  const data = await extractData(response);
  return data;
}

// =============================================================================
// AGING REPORTS (TIER-2)
// =============================================================================

export interface AgingBucket {
  bucket: string;
  amount: number;
  count: number;
}

export interface AgingReport {
  totalOutstanding: number;
  buckets: AgingBucket[];
}

export interface AgingReportDetailed extends AgingReport {
  items: any[]; // Detailed items
}

export async function getReceivablesAging(detailed = false): Promise<AgingReport | AgingReportDetailed> {
  const endpoint = detailed ? "/reports/receivables-aging/detailed" : "/reports/receivables-aging";
  const response = await authenticatedFetch(endpoint);
  if (!response.ok) throw new Error("Failed to fetch Receivables Aging report");
  const data = await extractData(response);
  return data;
}

export async function getPayablesAging(detailed = false): Promise<AgingReport | AgingReportDetailed> {
  const endpoint = detailed ? "/reports/payables-aging/detailed" : "/reports/payables-aging";
  const response = await authenticatedFetch(endpoint);
  if (!response.ok) throw new Error("Failed to fetch Payables Aging report");
  const data = await extractData(response);
  return data;
}
