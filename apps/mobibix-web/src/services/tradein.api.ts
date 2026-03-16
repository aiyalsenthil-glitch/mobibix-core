import { authenticatedFetch, extractData } from "./auth.api";

export type TradeInGrade = "EXCELLENT" | "GOOD" | "FAIR" | "POOR";
export type TradeInStatus =
  | "DRAFT"
  | "OFFERED"
  | "ACCEPTED"
  | "REJECTED"
  | "COMPLETED";

export type TradeInVoucherStatus = "ACTIVE" | "REDEEMED" | "EXPIRED" | "CANCELLED";

export interface TradeInVoucher {
  id: string;
  voucherCode: string;
  tradeInId: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  amount: number; // rupees
  status: TradeInVoucherStatus;
  expiresAt: string;
  redeemedAt?: string;
  redeemedByInvoiceId?: string;
  createdAt: string;
}

export interface TradeIn {
  id: string;
  tradeInNumber: string;
  shopId: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  deviceBrand: string;
  deviceModel: string;
  deviceImei?: string;
  deviceStorage?: string;
  deviceColor?: string;
  conditionChecks: Record<string, boolean>;
  conditionGrade: TradeInGrade;
  marketValue: number; // rupees
  offeredValue: number; // rupees
  status: TradeInStatus;
  linkedInvoiceId?: string;
  postCompletionAction?: string; // ADDED_TO_INVENTORY | VOUCHER_ISSUED | CASH_PAYOUT | BOTH
  inventoryProductId?: string;
  creditVoucherId?: string;
  payoutMode?: string;
  payoutAt?: string;
  notes?: string;
  createdAt: string;
  customer?: { name: string; phone: string };
  creditVoucher?: TradeInVoucher | null;
}

export interface CreateTradeInDto {
  shopId: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  deviceBrand: string;
  deviceModel: string;
  deviceImei?: string;
  deviceStorage?: string;
  deviceColor?: string;
  conditionChecks?: Record<string, boolean>;
  conditionGrade: TradeInGrade;
  marketValue: number;
  offeredValue: number;
  notes?: string;
}

export interface TradeInListResponse {
  items: TradeIn[];
  total: number;
  page: number;
  limit: number;
}

export async function listTradeIns(params: {
  shopId: string;
  status?: TradeInStatus;
  page?: number;
  limit?: number;
  search?: string;
}): Promise<TradeInListResponse> {
  const q = new URLSearchParams({ shopId: params.shopId });
  if (params.status) q.set("status", params.status);
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.search) q.set("search", params.search);

  const res = await authenticatedFetch(`/trade-in?${q}`);
  return extractData<TradeInListResponse>(res);
}

export async function getTradeIn(id: string): Promise<TradeIn> {
  const res = await authenticatedFetch(`/trade-in/${id}`);
  return extractData<TradeIn>(res);
}

export async function createTradeIn(dto: CreateTradeInDto): Promise<TradeIn> {
  const res = await authenticatedFetch(`/trade-in`, {
    method: "POST",
    body: JSON.stringify(dto),
  });
  return extractData<TradeIn>(res);
}

export async function updateTradeInStatus(
  id: string,
  status: TradeInStatus,
  linkedInvoiceId?: string
): Promise<TradeIn> {
  const res = await authenticatedFetch(`/trade-in/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, linkedInvoiceId }),
  });
  return extractData<TradeIn>(res);
}

export async function updateTradeInOffer(
  id: string,
  offeredValue: number
): Promise<TradeIn> {
  const res = await authenticatedFetch(`/trade-in/${id}/offer`, {
    method: "PATCH",
    body: JSON.stringify({ offeredValue }),
  });
  return extractData<TradeIn>(res);
}

export interface AutoGradeResult {
  grade: TradeInGrade | "JUNK";
  score: number;
  deductions: Array<{ label: string; deduction: number }>;
  valuationMultiplier: number;
  gradeLabel: string;
  recommendation: string;
  suggestedOffer: number;
}

export interface PriceIntel {
  avgOffer: number;
  minOffer: number;
  maxOffer: number;
  avgMarketValue: number;
  count: number;
  lastSeenDate: string | null;
  dataSource: "CROWD" | "CASHIFY" | null;
}

export async function getPriceIntel(
  brand: string,
  model: string,
  storage?: string
): Promise<PriceIntel | null> {
  const q = new URLSearchParams({ brand, model });
  if (storage) q.set("storage", storage);
  const res = await authenticatedFetch(`/trade-in/price-intel?${q}`);
  const data = await res.json().catch(() => null);
  const payload = data?.data ?? data;
  if (!payload || payload.count === 0) return null;
  return payload;
}

export async function autoGradeDevice(
  conditionChecks: Record<string, boolean>,
  marketValue: number
): Promise<AutoGradeResult> {
  const res = await authenticatedFetch(`/trade-in/auto-grade`, {
    method: "POST",
    body: JSON.stringify({ conditionChecks, marketValue }),
  });
  return extractData<AutoGradeResult>(res);
}

// ─── Post-Completion Actions ──────────────────────────────────────────────────

export interface AddToInventoryResult {
  alreadyAdded: boolean;
  product: {
    id: string;
    name: string;
    quantity: number;
    salePrice: number | null;
    costPrice: number | null;
    category?: string;
  } | null;
}

export async function addTradeInToInventory(
  tradeInId: string,
  salePrice?: number
): Promise<AddToInventoryResult> {
  const res = await authenticatedFetch(`/trade-in/${tradeInId}/add-to-inventory`, {
    method: "POST",
    body: JSON.stringify(salePrice !== undefined ? { salePrice } : {}),
  });
  return extractData<AddToInventoryResult>(res);
}

export interface PayoutResult {
  alreadyPaid: boolean;
  payoutMode: string;
  payoutAt: string;
  amount: number;
}

export async function completePayout(
  tradeInId: string,
  payoutMode: "CASH" | "UPI" | "BANK"
): Promise<PayoutResult> {
  const res = await authenticatedFetch(`/trade-in/${tradeInId}/payout`, {
    method: "POST",
    body: JSON.stringify({ payoutMode }),
  });
  return extractData<PayoutResult>(res);
}

export interface IssuedVoucherResult {
  alreadyIssued: boolean;
  voucher: TradeInVoucher;
}

export async function issueCreditVoucher(
  tradeInId: string
): Promise<IssuedVoucherResult> {
  const res = await authenticatedFetch(`/trade-in/${tradeInId}/issue-voucher`, {
    method: "POST",
  });
  return extractData<IssuedVoucherResult>(res);
}

// ─── Voucher Lookup / Redemption ──────────────────────────────────────────────

export async function getCustomerVouchers(
  shopId: string,
  customerId?: string,
  phone?: string
): Promise<TradeInVoucher[]> {
  const q = new URLSearchParams({ shopId });
  if (customerId) q.set("customerId", customerId);
  if (phone) q.set("phone", phone);
  const res = await authenticatedFetch(`/trade-in/vouchers?${q}`);
  return extractData<TradeInVoucher[]>(res);
}

export async function validateVoucher(
  code: string,
  shopId: string
): Promise<TradeInVoucher> {
  const q = new URLSearchParams({ code, shopId });
  const res = await authenticatedFetch(`/trade-in/vouchers/validate?${q}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.message || err?.error || "Invalid or expired voucher";
    throw new Error(Array.isArray(msg) ? msg[0] : msg);
  }
  return extractData<TradeInVoucher>(res);
}

export async function redeemVoucher(
  voucherCode: string,
  shopId: string,
  invoiceId: string
): Promise<TradeInVoucher> {
  const res = await authenticatedFetch(`/trade-in/vouchers/redeem`, {
    method: "POST",
    body: JSON.stringify({ voucherCode, shopId, invoiceId }),
  });
  return extractData<TradeInVoucher>(res);
}
