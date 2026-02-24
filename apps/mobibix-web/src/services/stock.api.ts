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
    throw new Error(error.message || "Failed to fetch stock balances");
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
    throw new Error(error.message || "Failed to correct stock");
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
    throw new Error(error.message || "Failed to fetch negative stock report");
  }

  return extractData(response);
}
