import { authenticatedFetch, extractData } from "./auth.api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost_REPLACED:3000/api";

export type PriceAlertStatus = "PENDING" | "CLAIMED" | "DISMISSED";

export interface PriceAlert {
  id: string;
  shopId: string;
  shopProductId: string;
  supplierId: string;
  affectedPurchaseId: string;
  newGrnId: string;
  previousPrice: number; // rupees
  newPrice: number; // rupees
  priceDrop: number; // rupees
  quantityAtRisk: number;
  potentialCredit: number; // rupees
  status: PriceAlertStatus;
  creditNoteId?: string;
  dismissedAt?: string;
  createdAt: string;
  shopProduct?: { name: string; sku?: string };
}

export async function listPriceAlerts(
  shopId: string,
  status?: PriceAlertStatus
): Promise<PriceAlert[]> {
  const q = new URLSearchParams({ shopId });
  if (status) q.set("status", status);
  const res = await authenticatedFetch(`${API_BASE_URL}/price-alerts?${q}`);
  return extractData<PriceAlert[]>(res);
}

export async function dismissPriceAlert(id: string): Promise<PriceAlert> {
  const res = await authenticatedFetch(`${API_BASE_URL}/price-alerts/${id}/dismiss`, {
    method: "PATCH",
  });
  return extractData<PriceAlert>(res);
}

export async function claimPriceAlert(id: string): Promise<PriceAlert> {
  const res = await authenticatedFetch(`${API_BASE_URL}/price-alerts/${id}/claim`, {
    method: "PATCH",
  });
  return extractData<PriceAlert>(res);
}
