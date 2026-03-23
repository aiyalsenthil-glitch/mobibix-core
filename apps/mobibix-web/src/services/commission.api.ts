import { authenticatedFetch, extractData } from "./auth.api";

export type CommissionScope = "ALL_STAFF" | "SPECIFIC_STAFF" | "SPECIFIC_ROLE" | "CATEGORY_SPECIFIC" | "PRODUCT_SPECIFIC";
export type CommissionType = "PERCENTAGE_OF_SALE" | "PERCENTAGE_OF_PROFIT" | "FIXED_PER_ITEM";
export type EarningStatus = "PENDING" | "APPROVED" | "PAID" | "CANCELLED";

export interface CommissionRule {
  id: string;
  shopId: string | null;
  name: string;
  description?: string;
  applyTo: CommissionScope;
  staffId?: string;
  staffRole?: string;
  category?: string;
  productId?: string;
  type: CommissionType;
  value: number;
  isActive: boolean;
  createdAt: string;
}

export interface StaffEarning {
  id: string;
  staffId: string;
  invoiceId: string;
  ruleId: string;
  saleAmount: number; // paisa
  profitAmount: number; // paisa
  earned: number; // paisa
  status: EarningStatus;
  paidAt?: string;
  createdAt: string;
  rule?: { name: string; type: CommissionType };
  invoice?: { invoiceNumber: string; invoiceDate: string };
  staff?: { name: string; email: string };
}

export interface CreateCommissionRuleDto {
  shopId?: string;
  name: string;
  description?: string;
  applyTo?: CommissionScope;
  staffId?: string;
  staffRole?: string;
  category?: string;
  productId?: string;
  type: CommissionType;
  value: number;
  minSaleAmount?: number;
}

// ─── Rules ────────────────────────────────────────────────────────────────────

export async function listCommissionRules(shopId: string): Promise<CommissionRule[]> {
  const res = await authenticatedFetch(`/commission/rules?shopId=${shopId}`);
  const data = await extractData<CommissionRule[] | { rules: CommissionRule[] }>(res);
  // Normalise — some backends return { rules: [...] }
  return Array.isArray(data) ? data : (data as any)?.rules ?? [];
}

export async function createCommissionRule(dto: CreateCommissionRuleDto): Promise<CommissionRule> {
  const res = await authenticatedFetch(`/commission/rules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });
  return extractData<CommissionRule>(res);
}

export async function toggleCommissionRule(ruleId: string, active: boolean): Promise<CommissionRule> {
  const res = await authenticatedFetch(
    `/commission/rules/${ruleId}/toggle?active=${active}`,
    { method: "PATCH" }
  );
  return extractData<CommissionRule>(res);
}

export async function deleteCommissionRule(ruleId: string): Promise<void> {
  const res = await authenticatedFetch(`/commission/rules/${ruleId}`, { method: "DELETE" });
  await extractData(res);
}

// ─── Earnings ─────────────────────────────────────────────────────────────────

export interface EarningsResponse {
  earnings: StaffEarning[];
  total: number;
  page: number;
  limit: number;
}

export async function listEarnings(params: {
  shopId: string;
  staffId?: string;
  status?: EarningStatus;
  page?: number;
  limit?: number;
}): Promise<EarningsResponse> {
  const q = new URLSearchParams({ shopId: params.shopId });
  if (params.staffId) q.set("staffId", params.staffId);
  if (params.status) q.set("status", params.status);
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));

  const res = await authenticatedFetch(`/commission/earnings?${q}`);
  const data = await extractData<EarningsResponse | StaffEarning[]>(res);
  // Normalise — handle both { earnings: [...], total } and plain array
  if (Array.isArray(data)) return { earnings: data, total: data.length, page: 1, limit: data.length };
  return data as EarningsResponse;
}

export async function markEarningsPaid(earningIds: string[]): Promise<{ updated: number }> {
  const res = await authenticatedFetch(`/commission/earnings/mark-paid`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ earningIds }),
  });
  return extractData(res);
}
