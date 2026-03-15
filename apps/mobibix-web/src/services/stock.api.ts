import { authenticatedFetch, extractData } from "./auth.api";

export interface StockBalance {
  productId: string;
  name: string;
  stockQty: number;
  isNegative: boolean;
}

export interface StockCorrectionRequest {
  shopId: string;
  shopProductId: string;
  quantity: number;
  reason: string;
  note?: string;
}

export interface StockCorrectionResponse {
  id: string;
  success: boolean;
}

export interface NegativeStockItem {
  shopProductId: string;
  shopId: string;
  shopName: string;
  productName: string;
  currentStock: number;
  firstNegativeDate: string;
}

export interface NegativeStockReportResponse {
  items: NegativeStockItem[];
}

/**
 * Fetch stock balances for a shop (derived from StockLedger)
 */
export async function getStockBalances(
  shopId: string,
): Promise<StockBalance[]> {
  const response = await authenticatedFetch(
    `/mobileshop/stock/summary?shopId=${encodeURIComponent(shopId)}`,
  );

  if (!response.ok) {
    const error = await extractData(response);
    throw new Error((error as any).message || "Failed to fetch stock balances");
  }

  return extractData(response);
}

/**
 * Submit a manual stock correction
 */
export async function correctStock(
  data: StockCorrectionRequest,
): Promise<StockCorrectionResponse> {
  const response = await authenticatedFetch("/mobileshop/stock/correct", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await extractData(response);
    throw new Error((error as any).message || "Failed to correct stock");
  }

  return extractData(response);
}

/**
 * Get list of products with negative stock
 */
export async function getNegativeStockReport(
  shopId?: string,
): Promise<NegativeStockReportResponse> {
  const params = shopId ? `?shopId=${encodeURIComponent(shopId)}` : "";
  const response = await authenticatedFetch(`/reports/negative-stock${params}`);

  if (!response.ok) {
    const error = await extractData(response);
    throw new Error((error as any).message || "Failed to fetch negative stock report");
  }

  return extractData(response);
}
/**
 * Get stock overview KPIs
 */
export async function getStockOverview(
  shopId?: string,
): Promise<{
  totalProducts: number;
  totalItems: number;
  totalValue: number;
  lowStockItems: number;
  potentialRevenue: number;
}> {
  const params = shopId ? `?shopId=${encodeURIComponent(shopId)}` : "";
  const response = await authenticatedFetch(`/mobileshop/stock/overview${params}`);

  if (!response.ok) {
    const error = await extractData(response);
    throw new Error((error as any).message || "Failed to fetch stock overview");
  }

  return extractData(response);
}

export type ImeiStatus =
  | "IN_STOCK"
  | "RESERVED"
  | "SOLD"
  | "RETURNED"
  | "RETURNED_GOOD"
  | "RETURNED_DAMAGED"
  | "DAMAGED"
  | "TRANSFERRED"
  | "LOST"
  | "SCRAPPED";

export interface ImeiRecord {
  id: string;
  imei: string;
  status: ImeiStatus;
  shopId: string | null;
  shopProductId: string;
  invoiceId: string | null;
  transferredToShopId: string | null;
  damageNotes: string | null;
  lostReason: string | null;
  soldAt: string | null;
  returnedAt: string | null;
  createdAt: string;
  updatedAt: string;
  product?: { id: string; name: string; type: string };
  invoice?: {
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    customerName: string | null;
  } | null;
}

export async function getImeiDetails(imei: string): Promise<ImeiRecord & { product: any }> {
  const response = await authenticatedFetch(`/mobileshop/stock/imei/${encodeURIComponent(imei)}`);
  if (!response.ok) {
    const error = await extractData(response);
    throw new Error((error as any).message || "IMEI not found");
  }
  return extractData(response);
}

export async function getImeiList(filters: {
  status?: ImeiStatus;
  shopId?: string;
  productId?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: ImeiRecord[]; total: number; page: number; limit: number }> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.shopId) params.set("shopId", filters.shopId);
  if (filters.productId) params.set("productId", filters.productId);
  if (filters.search) params.set("search", filters.search);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  const response = await authenticatedFetch(`/mobileshop/stock/imei?${params}`);
  if (!response.ok) {
    const error = await extractData(response);
    throw new Error((error as any).message || "Failed to fetch IMEIs");
  }
  return extractData(response);
}

export async function updateImeiStatus(
  imei: string,
  status: ImeiStatus,
  notes?: string,
): Promise<{ success: boolean; imei: string; status: ImeiStatus }> {
  const response = await authenticatedFetch(
    `/mobileshop/stock/imei/${encodeURIComponent(imei)}/status`,
    { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, notes }) },
  );
  if (!response.ok) {
    const error = await extractData(response);
    throw new Error((error as any).message || "Failed to update IMEI status");
  }
  return extractData(response);
}

export async function transferImei(imei: string, targetShopId: string): Promise<ImeiRecord> {
  const response = await authenticatedFetch(
    `/mobileshop/stock/imei/${encodeURIComponent(imei)}/transfer`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetShopId }) },
  );
  if (!response.ok) {
    const error = await extractData(response);
    throw new Error((error as any).message || "Failed to transfer IMEI");
  }
  return extractData(response);
}

export async function reserveImei(imei: string): Promise<ImeiRecord> {
  const response = await authenticatedFetch(
    `/mobileshop/stock/imei/${encodeURIComponent(imei)}/reserve`,
    { method: "POST" },
  );
  if (!response.ok) {
    const error = await extractData(response);
    throw new Error((error as any).message || "Failed to reserve IMEI");
  }
  return extractData(response);
}

export async function releaseImeiReserve(imei: string): Promise<ImeiRecord> {
  const response = await authenticatedFetch(
    `/mobileshop/stock/imei/${encodeURIComponent(imei)}/reserve`,
    { method: "DELETE" },
  );
  if (!response.ok) {
    const error = await extractData(response);
    throw new Error((error as any).message || "Failed to release IMEI reserve");
  }
  return extractData(response);
}
