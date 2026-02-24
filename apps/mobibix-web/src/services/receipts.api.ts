import { authenticatedFetch, extractData } from "./auth.api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost_REPLACED:3000/api";

export type PaymentMode = "CASH" | "UPI" | "CARD" | "BANK" | "CREDIT";
export type ReceiptType = "CUSTOMER" | "GENERAL" | "ADJUSTMENT" | "PAYMENT";
export type ReceiptStatus = "ACTIVE" | "CANCELLED";

export interface Receipt {
  id: string;
  tenantId: string;
  shopId: string;
  receiptId: string;
  printNumber: string;
  receiptType: ReceiptType;
  amount: number;
  paymentMethod: PaymentMode;
  transactionRef?: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  linkedInvoiceId?: string;
  linkedJobId?: string; // ID for reference
  narration?: string;
  status: ReceiptStatus;
  createdAt: Date | string;
  createdBy?: string;
  
  // Relations (if populated)
  jobCard?: {
    jobNumber: string;
  };
  invoice?: {
    invoiceNumber: string;
  };
}

export interface CreateReceiptRequest {
  paymentMethod: PaymentMode;
  amount: number;
  receiptType: ReceiptType;
  customerName: string;
  customerId?: string; // Added field
  customerPhone?: string;
  linkedInvoiceId?: string;
  linkedJobId?: string;
  narration?: string;
  transactionRef?: string;
}

export interface ReceiptsListResponse {
  data: Receipt[];
  total: number;
}

export interface ReceiptSummary {
  totalReceipts: number;
  totalAmount: number;
  byPaymentMode: Record<string, { count: number; amount: number }>;
}

/**
 * Create a receipt for money received
 * ONLY for CASH/UPI/CARD/BANK - CREDIT is rejected
 */
export async function createReceipt(
  request: CreateReceiptRequest,
): Promise<Receipt> {
  const response = await authenticatedFetch(`/receipts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await extractData(response);
    throw new Error(error.message || "Failed to create receipt");
  }

  return extractData(response);
}

/**
 * Get all receipts for the authenticated shop
 */
export async function getReceipts(filters?: {
  shopId?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  paymentMethod?: PaymentMode;
  status?: ReceiptStatus;
  skip?: number;
  take?: number;
}): Promise<ReceiptsListResponse> {
  const params = new URLSearchParams();

  if (filters?.startDate) {
    params.append("startDate", new Date(filters.startDate).toISOString());
  }
  if (filters?.endDate) {
    params.append("endDate", new Date(filters.endDate).toISOString());
  }
  if (filters?.paymentMethod) {
    params.append("paymentMethod", filters.paymentMethod);
  }
  if (filters?.shopId) {
    params.append("shopId", filters.shopId);
  }
  if (filters?.status) {
    params.append("status", filters.status);
  }
  if (filters?.skip !== undefined) {
    params.append("skip", filters.skip.toString());
  }
  if (filters?.take !== undefined) {
    params.append("take", filters.take.toString());
  }

  const url = `/receipts${params.toString() ? `?${params}` : ""}`;
  const response = await authenticatedFetch(url);

  if (!response.ok) {
    throw new Error("Failed to fetch receipts");
  }

  return extractData(response);
}

/**
 * Get a single receipt by ID
 */
export async function getReceipt(receiptId: string): Promise<Receipt> {
  const response = await authenticatedFetch(`/receipts/${receiptId}`);

  if (!response.ok) {
    throw new Error("Receipt not found");
  }

  return extractData(response);
}

/**
 * Cancel a receipt (soft delete - status = CANCELLED)
 */
export async function cancelReceipt(
  receiptId: string,
  reason: string,
): Promise<Receipt> {
  const response = await authenticatedFetch(`/receipts/${receiptId}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    const error = await extractData(response);
    throw new Error(error.message || "Failed to cancel receipt");
  }

  return extractData(response);
}

/**
 * Get receipt summary by date range
 */
export async function getReceiptSummary(
  shopId?: string,
  startDate?: Date | string,
  endDate?: Date | string,
): Promise<ReceiptSummary> {
  const params = new URLSearchParams();

  if (shopId) {
    params.append("shopId", shopId);
  }

  if (startDate) {
    params.append("startDate", new Date(startDate).toISOString());
  }
  if (endDate) {
    params.append("endDate", new Date(endDate).toISOString());
  }

  const url = `/receipts/summary${params.toString() ? `?${params}` : ""}`;
  const response = await authenticatedFetch(url);

  if (!response.ok) {
    throw new Error("Failed to fetch receipt summary");
  }

  return extractData(response);
}
