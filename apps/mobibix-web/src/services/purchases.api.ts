import { authenticatedFetch } from "./auth.api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost_REPLACED:3000/api";

export type PaymentMode = "CASH" | "CARD" | "UPI" | "BANK";
export type PurchaseStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "CANCELLED";

export interface PurchaseItem {
  id: string;
  shopProductId?: string;
  description: string;
  hsnSac?: string;
  quantity: number;
  purchasePrice: number;
  gstRate?: number;
  subTotal: number;
  gstAmount: number;
  total: number;
}

export interface SupplierPayment {
  id: string;
  amount: number;
  paymentMethod: PaymentMode;
  paymentReference?: string;
  notes?: string;
  createdAt: string | Date;
}

export interface Purchase {
  id: string;
  shopId: string;
  globalSupplierId?: string;
  supplierName: string;
  supplierGstin?: string;
  invoiceNumber: string;
  invoiceDate: string | Date;
  dueDate?: string | Date;
  status: PurchaseStatus;
  paymentMethod: PaymentMode;
  subTotal: number;
  totalGst: number;
  grandTotal: number;
  paidAmount: number;
  outstandingAmount: number;
  items: PurchaseItem[];
  payments: SupplierPayment[];
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface PurchaseItemDto {
  shopProductId?: string;
  description: string;
  hsnSac?: string;
  quantity: number;
  purchasePrice: number;
  gstRate?: number;
}

export interface CreatePurchaseDto {
  shopId: string;
  globalSupplierId?: string;
  supplierName: string;
  supplierGstin?: string;
  invoiceNumber: string;
  invoiceDate?: string;
  dueDate?: string;
  paymentMethod: PaymentMode;
  items: PurchaseItemDto[];
}

export interface UpdatePurchaseDto {
  supplierName?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  status?: PurchaseStatus;
  paymentMethod?: PaymentMode;
  items?: PurchaseItemDto[];
}

export interface RecordPaymentDto {
  amount: number;
  paymentMethod: PaymentMode;
  paymentReference?: string;
  notes?: string;
}

export interface OutstandingAmount {
  outstandingAmount: number;
}

export interface SupplierOutstanding {
  supplierId: string;
  supplierName: string;
  totalOutstanding: number;
}

/**
 * List all purchases with optional filters
 */
export async function listPurchases(params?: {
  shopId?: string;
  status?: PurchaseStatus;
  supplierId?: string;
  skip?: number;
  take?: number;
}): Promise<Purchase[]> {
  try {
    const queryParams = new URLSearchParams();
    if (params?.shopId) queryParams.append("shopId", params.shopId);
    if (params?.status) queryParams.append("status", params.status);
    if (params?.supplierId) queryParams.append("supplierId", params.supplierId);
    if (params?.skip !== undefined)
      queryParams.append("skip", params.skip.toString());
    if (params?.take !== undefined)
      queryParams.append("take", params.take.toString());

    const url = `/purchases${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    const response = await authenticatedFetch(url);

    if (!response.ok) {
      let errorMessage = "Failed to fetch purchases";
      try {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
        console.error("API Error:", {
          status: response.status,
          message: errorMessage,
          params,
        });
      } catch (e) {
        console.error("Failed to parse error response:", e);
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    // Backend returns paginated response: { data: [], total: number }
    // Return just the data array for compatibility with existing code
    return result.data || result;
  } catch (error: any) {
    console.error("List purchases error:", error);
    throw error;
  }
}

/**
 * Get a single purchase by ID
 */
export async function getPurchase(purchaseId: string): Promise<Purchase> {
  const response = await authenticatedFetch(`/purchases/${purchaseId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch purchase");
  }

  return response.json();
}

/**
 * Create a new purchase
 */
export async function createPurchase(
  data: CreatePurchaseDto,
): Promise<Purchase> {
  const response = await authenticatedFetch("/purchases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create purchase");
  }

  return response.json();
}

/**
 * Update a purchase
 */
export async function updatePurchase(
  purchaseId: string,
  data: UpdatePurchaseDto,
): Promise<Purchase> {
  const response = await authenticatedFetch(`/purchases/${purchaseId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update purchase");
  }

  return response.json();
}

/**
 * Cancel a purchase (soft delete)
 */
export async function cancelPurchase(purchaseId: string): Promise<void> {
  const response = await authenticatedFetch(`/purchases/${purchaseId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to cancel purchase");
  }
}

/**
 * Record a payment for a purchase
 */
export async function recordPayment(
  purchaseId: string,
  data: RecordPaymentDto,
): Promise<Purchase> {
  const response = await authenticatedFetch(`/purchases/${purchaseId}/pay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to record payment");
  }

  return response.json();
}

/**
 * Get outstanding amount for a purchase
 */
export async function getPurchaseOutstanding(
  purchaseId: string,
): Promise<OutstandingAmount> {
  const response = await authenticatedFetch(
    `/purchases/${purchaseId}/outstanding`,
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch outstanding amount");
  }

  return response.json();
}

/**
 * List purchases by supplier
 */
export async function getPurchasesBySupplier(
  supplierId: string,
): Promise<Purchase[]> {
  const response = await authenticatedFetch(
    `/purchases/supplier/${supplierId}`,
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch supplier purchases");
  }

  return response.json();
}

/**
 * Get supplier outstanding balance across all purchases
 */
export async function getSupplierOutstanding(
  supplierId: string,
): Promise<SupplierOutstanding> {
  const response = await authenticatedFetch(
    `/purchases/supplier/${supplierId}/outstanding`,
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      error.message || "Failed to fetch supplier outstanding balance",
    );
  }

  return response.json();
}

/**
 * Submit a purchase for approval (Atomic Stock In & Cost Update)
 */
export async function submitPurchase(
  purchaseId: string,
): Promise<{ message: string; purchaseId: string }> {
  const response = await authenticatedFetch(`/purchases/${purchaseId}/submit`, {
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to submit purchase");
  }

  return response.json();
}
