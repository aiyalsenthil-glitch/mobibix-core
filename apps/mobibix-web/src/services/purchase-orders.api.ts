import { authenticatedFetch, extractData } from "./auth.api";

export type POStatus = 
  | "DRAFT" 
  | "ORDERED" 
  | "DISPATCHED" 
  | "PARTIALLY_RECEIVED" 
  | "RECEIVED" 
  | "CANCELLED";

export interface POItem {
  id: string;
  shopProductId: string;
  description: string;
  quantity: number;
  receivedQuantity: number;
  price: number;
  uom?: string;
}

export interface PurchaseOrder {
  id: string;
  tenantId: string;
  shopId: string;
  poNumber: string;
  globalSupplierId?: string;
  supplierName: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  status: POStatus;
  currency: string;
  exchangeRate: number;
  paymentDueDays: number;
  notes?: string;
  items: POItem[];
}

export interface CreatePODto {
  shopId: string;
  globalSupplierId: string;
  poNumber: string;
  orderDate?: string;
  expectedDeliveryDate?: string;
  currency?: string;
  exchangeRate?: number;
  paymentDueDays?: number;
  notes?: string;
  items: {
    shopProductId: string;
    description: string;
    quantity: number;
    price: number;
    uom?: string;
  }[];
}

/**
 * List all Purchase Orders
 */
export async function listPurchaseOrders(shopId?: string): Promise<PurchaseOrder[]> {
  const url = `/purchase-orders${shopId ? `?shopId=${shopId}` : ""}`;
  const response = await authenticatedFetch(url);

  if (!response.ok) {
    const error = await extractData(response) as any;
    throw new Error(error?.message || "Failed to fetch Purchase Orders");
  }

  const data = await extractData(response);
  return data?.data || data;
}

/**
 * Create a new Purchase Order
 */
export async function createPurchaseOrder(data: CreatePODto): Promise<PurchaseOrder> {
  const response = await authenticatedFetch("/purchase-orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await extractData(response) as any;
    throw new Error(error?.message || "Failed to create Purchase Order");
  }

  return extractData(response);
}

/**
 * Transition PO status
 */
export async function transitionPOStatus(id: string, newStatus: POStatus): Promise<PurchaseOrder> {
  const response = await authenticatedFetch(`/purchase-orders/${id}/transition`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: newStatus }),
  });

  if (!response.ok) {
    const error = await extractData(response) as any;
    throw new Error(error?.message || "Failed to transition PO status");
  }

  return extractData(response);
}

/**
 * Get a single Purchase Order by ID
 */
export async function getPurchaseOrder(id: string): Promise<PurchaseOrder> {
  const response = await authenticatedFetch(`/purchase-orders/${id}`);

  if (!response.ok) {
    const error = await extractData(response) as any;
    throw new Error(error?.message || "Failed to fetch Purchase Order");
  }

  return extractData(response);
}
