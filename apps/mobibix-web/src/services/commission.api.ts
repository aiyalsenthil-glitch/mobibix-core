import { authenticatedFetch, extractData } from "./auth.api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost_REPLACED:3000/api";

export type CommissionScope = "ALL_STAFF" | "SPECIFIC_STAFF" | "SPECIFIC_ROLE";
export type CommissionType =
  | "PERCENTAGE_OF_SALE"
  | "PERCENTAGE_OF_PROFIT"
  | "FIXED_PER_ITEM";
export type EarningStatus = "PENDING" | "APPROVED" | "PAID";

export interface CommissionRule {
  id: string;
  shopId: string;
  name: string;
  applyTo: CommissionScope;
  staffId?: string;
  staffRole?: string;
  category?: string;
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
  shopId: string;
  name: string;
  applyTo?: CommissionScope;
  staffId?: string;
  staffRole?: string;
  category?: string;
  type: CommissionType;
  value: number;
}

// ─── Rules ────────────────────────────────────────────────────────────────────

export async function listCommissionRules(shopId: string): Promise<CommissionRule[]> {
  const res = await authenticatedFetch(
    `${API_BASE_URL}/commission/rules?shopId=${shopId}`
  );
  return extractData<CommissionRule[]>(res);
}

export async function createCommissionRule(
  dto: CreateCommissionRuleDto
): Promise<CommissionRule> {
  const res = await authenticatedFetch(`${API_BASE_URL}/commission/rules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });
  return extractData<CommissionRule>(res);
}

export async function toggleCommissionRule(
  ruleId: string,
  active: boolean
): Promise<CommissionRule> {
  const res = await authenticatedFetch(
    `${API_BASE_URL}/commission/rules/${ruleId}/toggle?active=${active}`,
    { method: "PATCH" }
  );
  return extractData<CommissionRule>(res);
}

export async function deleteCommissionRule(ruleId: string): Promise<void> {
  const res = await authenticatedFetch(
    `${API_BASE_URL}/commission/rules/${ruleId}`,
    { method: "DELETE" }
  );
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

  const res = await authenticatedFetch(
    `${API_BASE_URL}/commission/earnings?${q}`
  );
  return extractData<EarningsResponse>(res);
}

export async function markEarningsPaid(earningIds: string[]): Promise<{ updated: number }> {
  const res = await authenticatedFetch(
    `${API_BASE_URL}/commission/earnings/mark-paid`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ earningIds }),
    }
  );
  return extractData(res);
}
