import { authenticatedFetch, extractData } from "./auth.api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost_REPLACED:3000/api";

export type PaymentMode = "CASH" | "UPI" | "CARD" | "BANK" | "CREDIT";
export type VoucherType = "SUPPLIER" | "EXPENSE" | "SALARY" | "ADJUSTMENT";
export type VoucherStatus = "ACTIVE" | "CANCELLED";

export interface PaymentVoucher {
  id: string;
  tenantId: string;
  shopId: string;
  voucherId: string;
  voucherType: VoucherType;
  date: Date | string;
  amount: number;
  paymentMethod: PaymentMode;
  transactionRef?: string;
  narration?: string;
  globalSupplierId?: string;
  expenseCategory?: string;
  linkedPurchaseId?: string;
  status: VoucherStatus;
  createdAt: Date | string;
  createdBy?: string;
}

export interface CreateVoucherRequest {
  paymentMethod: PaymentMode;
  amount: number;
  voucherType: VoucherType;
  globalSupplierId?: string;
  expenseCategory?: string;
  linkedPurchaseId?: string;
  narration?: string;
  transactionRef?: string;
}

export interface VouchersListResponse {
  data: PaymentVoucher[];
  total: number;
}

export interface VoucherSummary {
  totalVouchers: number;
  totalAmount: number;
  byVoucherType: Record<string, { count: number; amount: number }>;
  byPaymentMode: Record<string, { count: number; amount: number }>;
}

/**
 * Create a voucher for money paid out
 * ONLY for CASH/UPI/CARD/BANK - CREDIT is rejected
 */
export async function createVoucher(
  request: CreateVoucherRequest,
): Promise<PaymentVoucher> {
  const response = await authenticatedFetch(`/vouchers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await extractData(response);
    throw new Error((error as any).message || "Failed to create voucher");
  }

  return extractData(response);
}

/**
 * Get all vouchers for the authenticated shop
 */
export async function getVouchers(filters?: {
  shopId?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  paymentMethod?: PaymentMode;
  status?: VoucherStatus;
  voucherType?: VoucherType;
  skip?: number;
  take?: number;
}): Promise<VouchersListResponse> {
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
  if (filters?.voucherType) {
    params.append("voucherType", filters.voucherType);
  }
  if (filters?.skip !== undefined) {
    params.append("skip", filters.skip.toString());
  }
  if (filters?.take !== undefined) {
    params.append("take", filters.take.toString());
  }

  const url = `/vouchers${params.toString() ? `?${params}` : ""}`;
  const response = await authenticatedFetch(url);

  if (!response.ok) {
    throw new Error("Failed to fetch vouchers");
  }

  return extractData(response);
}

/**
 * Get a single voucher by ID
 */
export async function getVoucher(voucherId: string): Promise<PaymentVoucher> {
  const response = await authenticatedFetch(`/vouchers/${voucherId}`);

  if (!response.ok) {
    throw new Error("Voucher not found");
  }

  return extractData(response);
}

/**
 * Cancel a voucher (soft delete - status = CANCELLED)
 */
export async function cancelVoucher(
  voucherId: string,
  reason: string,
): Promise<PaymentVoucher> {
  const response = await authenticatedFetch(`/vouchers/${voucherId}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    const error = await extractData(response);
    throw new Error((error as any).message || "Failed to cancel voucher");
  }

  return extractData(response);
}

/**
 * Get voucher summary by date range
 */
export async function getVoucherSummary(
  shopId?: string,
  startDate?: Date | string,
  endDate?: Date | string,
): Promise<VoucherSummary> {
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

  const url = `/vouchers/summary${params.toString() ? `?${params}` : ""}`;
  const response = await authenticatedFetch(url);

  if (!response.ok) {
    throw new Error("Failed to fetch voucher summary");
  }

  return extractData(response);
}

/**
 * Get advance balance for a supplier voucher
 */
export async function getAdvanceBalance(
  voucherId: string
): Promise<{ originalAmount: number; appliedAmount: number; remainingBalance: number }> {
  const response = await authenticatedFetch(`/vouchers/advance/${voucherId}/balance`);

  if (!response.ok) {
    throw new Error("Failed to fetch advance balance");
  }

  return extractData(response);
}

/**
 * Apply advance to a purchase invoice
 */
export async function applyAdvanceToPurchase(
  voucherId: string,
  purchaseId: string,
  appliedAmount: number
): Promise<{ message: string; appliedAmount: number }> {
  const response = await authenticatedFetch(`/vouchers/advance/${voucherId}/apply-to-purchase`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ purchaseId, appliedAmount }),
  });

  if (!response.ok) {
    const error = await extractData(response);
    throw new Error((error as any).message || "Failed to apply advance to purchase");
  }

  return extractData(response);
}

