import { authenticatedFetch, extractData } from "./auth.api";

export type GRNStatus = "DRAFT" | "CONFIRMED" | "CANCELLED";

export interface GRNItem {
  id: string;
  poItemId: string;
  shopProductId: string;
  receivedQuantity: number;
  confirmedPrice?: number;
  uom?: string;
}

export interface GRN {
  id: string;
  tenantId: string;
  shopId: string;
  poId: string;
  grnNumber: string;
  receivedDate: string;
  status: GRNStatus;
  isVarianceOverridden: boolean;
  overrideNote?: string;
  overriddenBy?: string;
  createdAt: string;
  updatedAt: string;
  items: GRNItem[];
}

export interface CreateGRNItemDto {
  poItemId: string;
  shopProductId: string;
  receivedQuantity: number;
  confirmedPrice?: number;
  uom?: string;
}

export interface CreateGRNDto {
  shopId: string;
  poId: string;
  grnNumber: string;
  receivedDate?: string;
  isVarianceOverridden?: boolean;
  overrideNote?: string;
  items: CreateGRNItemDto[];
}

/**
 * List all GRNs for a tenant/shop
 */
export async function listGrns(shopId?: string): Promise<GRN[]> {
  const url = `/grns${shopId ? `?shopId=${shopId}` : ""}`;
  const response = await authenticatedFetch(url);

  if (!response.ok) {
    const error = await extractData(response) as any;
    throw new Error(error?.message || "Failed to fetch GRNs");
  }

  return extractData(response);
}

/**
 * Get a single GRN by ID
 */
export async function getGrn(id: string): Promise<GRN> {
  const response = await authenticatedFetch(`/grns/${id}`);

  if (!response.ok) {
    const error = await extractData(response) as any;
    throw new Error(error?.message || "Failed to fetch GRN");
  }

  return extractData(response);
}

/**
 * Create a new DRAFT GRN
 */
export async function createGrn(data: CreateGRNDto): Promise<GRN> {
  const response = await authenticatedFetch("/grns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await extractData(response) as any;
    throw new Error(error?.message || "Failed to create GRN");
  }

  return extractData(response);
}

/**
 * Confirm a GRN (Stock-driving event)
 */
export async function confirmGrn(id: string): Promise<GRN> {
  const response = await authenticatedFetch(`/grns/${id}/confirm`, {
    method: "POST",
  });

  if (!response.ok) {
    const error = await extractData(response) as any;
    throw new Error(error?.message || "Failed to confirm GRN");
  }

  return extractData(response);
}
