import { authenticatedFetch, extractData } from "./auth.api";

export type DailyClosingStatus = "DRAFT" | "SUBMITTED" | "REOPENED";
export type CashVarianceStatus = "PENDING" | "APPROVED" | "REJECTED";
export type StockVerificationStatus = "DRAFT" | "CONFIRMED" | "CANCELLED";
export type ShiftClosingStatus = "OPEN" | "CLOSED";
export type CashClosingMode = "DAILY_ONLY" | "SHIFT_AND_DAILY";
export type AdjustmentReason =
  | "BREAKAGE"
  | "DAMAGE"
  | "LOST"
  | "INTERNAL_USE"
  | "CORRECTION"
  | "SPARE_DAMAGE";

export interface ExpenseCategory {
  id: string;
  name: string;
  isDefault: boolean;
  shopId?: string;
}

export interface CashLeakageAnalysis {
  difference: number;
  severity: "NONE" | "LOW" | "MEDIUM" | "HIGH";
  suggestions: string[];
}

// ─── DAILY CLOSING ────────────────────────────────────────────────────────────

export interface DailySummary {
  date: string;
  shopId: string;
  status: DailyClosingStatus | "OPEN";
  openingCash: number;
  salesCash: number;
  salesUpi: number;
  salesCard: number;
  salesBank: number;
  cashWithdrawFromBank: number;
  cashDepositToBank: number;
  otherCashIn: number;
  otherCashOut: number;
  totalIn: number;
  totalOut: number;
  supplierPaymentsCash: number;
  expenseCash: number;
  expectedClosingCash: number;
  reportedClosingCash: number;
  cashDifference: number;
  shiftInfo?: {
    totalShifts: number;
    closedShifts: number;
    shifts: ShiftClosing[];
  } | null;
}

export interface ShiftClosing {
  id: string;
  date: string;
  shiftName: string;
  openingCash: number;
  reportedClosingCash?: number;
  cashDifference?: number;
  status: ShiftClosingStatus;
  openedBy: string;
  closedBy?: string;
  closedAt?: string;
}

export interface DailyClosing {
  id: string;
  shopId: string;
  date: string;
  status: DailyClosingStatus;
  openingCash: number;
  salesCash: number;
  salesUpi: number;
  salesCard: number;
  salesBank: number;
  expectedClosingCash: number;
  reportedClosingCash: number;
  cashDifference: number;
  varianceReason?: string;
  varianceNote?: string;
  closedBy?: string;
  closedAt?: string;
  createdAt: string;
}

export interface CashVariance {
  id: string;
  shopId: string;
  dailyClosingId: string;
  expectedCash: number;
  physicalCash: number;
  difference: number;
  reason: string;
  reportedBy: string;
  approvedBy?: string;
  approvedAt?: string;
  status: CashVarianceStatus;
  notes?: string;
  createdAt: string;
  dailyClosing?: { date: string };
}

export async function getDailySummary(
  shopId: string,
  date: string
): Promise<DailySummary> {
  const res = await authenticatedFetch(
    `/mobileshop/reports/daily-summary?shopId=${shopId}&date=${date}`
  );
  if (!res.ok) throw new Error("Failed to fetch daily summary");
  return extractData(res);
}

export async function getCashLeakageAnalysis(
  shopId: string,
  date: string
): Promise<CashLeakageAnalysis> {
  const res = await authenticatedFetch(
    `/mobileshop/reports/cash-leakage-analysis?shopId=${shopId}&date=${date}`
  );
  if (!res.ok) throw new Error("Failed to fetch leakage analysis");
  return extractData(res);
}

export async function closeDay(payload: {
  shopId: string;
  date: string;
  mode: "SYSTEM" | "MANUAL";
  reportedClosingCash: number;
  manualEntries?: {
    salesCash?: number;
    salesUpi?: number;
    salesCard?: number;
    salesBank?: number;
    otherCashIn?: number;
    cashWithdrawFromBank?: number;
    expenseCash?: number;
    supplierPaymentsCash?: number;
    otherCashOut?: number;
    cashDepositToBank?: number;
  };
  denominations?: Record<string, number>;
  varianceReason?: string;
  varianceNote?: string;
}): Promise<DailyClosing> {
  const res = await authenticatedFetch(`/cash/daily-close`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await extractData(res);
    throw new Error((err as any).message || "Failed to close day");
  }
  return extractData(res);
}

export async function reopenDay(payload: {
  shopId: string;
  date: string;
  reason: string;
}): Promise<DailyClosing> {
  // Note: Backend might need a specific reopen endpoint in CashController if not reusing legacy
  const res = await authenticatedFetch(`/operations/daily-closing/reopen`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await extractData(res);
    throw new Error((err as any).message || "Failed to reopen day");
  }
  return extractData(res);
}

export async function getDailyClosings(
  shopId: string
): Promise<DailyClosing[]> {
  const res = await authenticatedFetch(`/cash/daily-history?shopId=${shopId}`);
  if (!res.ok) throw new Error("Failed to fetch closings");
  return extractData(res);
}

// ─── SHIFT MANAGEMENT ──────────────────────────────────────────────────────────

export async function openShift(payload: {
  shopId: string;
  shiftName: string;
}): Promise<ShiftClosing> {
  const res = await authenticatedFetch(`/cash/shift/open`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await extractData(res);
    throw new Error((err as any).message || "Failed to open shift");
  }
  return extractData(res);
}

export async function closeShift(payload: {
  shopId: string;
  reportedClosingCash: number;
}): Promise<ShiftClosing> {
  const res = await authenticatedFetch(`/cash/shift/close`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await extractData(res);
    throw new Error((err as any).message || "Failed to close shift");
  }
  return extractData(res);
}

export async function getCurrentShift(shopId: string): Promise<ShiftClosing | null> {
  const res = await authenticatedFetch(`/cash/shift/current?shopId=${shopId}`);
  if (!res.ok) throw new Error("Failed to fetch current shift");
  return extractData(res);
}

export async function getCashVariances(
  shopId: string,
  filters?: { status?: string; startDate?: string; endDate?: string }
): Promise<CashVariance[]> {
  const p = new URLSearchParams({ shopId });
  if (filters?.status) p.append("status", filters.status);
  const res = await authenticatedFetch(`/operations/daily-closing/variances?${p}`);
  if (!res.ok) throw new Error("Failed to fetch variances");
  return extractData(res);
}

export async function approveCashVariance(payload: {
  varianceId: string;
  shopId: string;
  notes?: string;
}): Promise<CashVariance> {
  const res = await authenticatedFetch(
    `/operations/daily-closing/variances/approve`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) {
    const err = await extractData(res);
    throw new Error((err as any).message || "Failed to approve variance");
  }
  return extractData(res);
}

// ─── EXPENSES ─────────────────────────────────────────────────────────────────

export interface Expense {
  id: string;
  voucherId: string;
  shopId: string;
  amount: number;
  expenseCategory?: string;
  expenseCategoryId?: string;
  paymentMethod: string;
  narration?: string;
  date: string;
  status: string;
  createdAt: string;
}

export interface ExpenseCategoryBreakdown {
  category: string;
  total: number;
}

export async function createExpense(payload: {
  shopId: string;
  amount: number;
  category?: string;
  categoryId?: string;
  paymentMethod: string;
  note?: string;
  date?: string;
}): Promise<Expense> {
  const res = await authenticatedFetch(`/operations/expenses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await extractData(res);
    throw new Error((err as any).message || "Failed to create expense");
  }
  return extractData(res);
}

export async function getExpenseCategories(shopId: string): Promise<ExpenseCategory[]> {
  const res = await authenticatedFetch(`/operations/expenses/categories/list?shopId=${shopId}`);
  if (!res.ok) throw new Error("Failed to fetch expense categories");
  return extractData(res);
}

export async function seedExpenseCategories(): Promise<void> {
  await authenticatedFetch(`/operations/expenses/categories/seed`, { method: "POST" });
}

export async function getExpenses(
  shopId: string,
  filters?: {
    startDate?: string;
    endDate?: string;
    skip?: number;
    take?: number;
  }
): Promise<{ data: Expense[]; total: number }> {
  const p = new URLSearchParams({ shopId });
  if (filters?.startDate) p.append("startDate", filters.startDate);
  if (filters?.endDate) p.append("endDate", filters.endDate);
  if (filters?.skip !== undefined) p.append("skip", String(filters.skip));
  if (filters?.take !== undefined) p.append("take", String(filters.take));
  const res = await authenticatedFetch(`/operations/expenses?${p}`);
  if (!res.ok) throw new Error("Failed to fetch expenses");
  return extractData(res);
}

export async function getExpenseCategoryBreakdown(
  shopId: string,
  startDate: string,
  endDate: string
): Promise<ExpenseCategoryBreakdown[]> {
  const p = new URLSearchParams({ shopId, startDate, endDate });
  const res = await authenticatedFetch(`/operations/expenses/categories?${p}`);
  if (!res.ok) throw new Error("Failed to fetch category breakdown");
  return extractData(res);
}

// ─── STOCK VERIFICATION ───────────────────────────────────────────────────────

export interface StockVerificationSummary {
  totalItemsChecked: number;
  mismatchItems: number;
  totalLossValue: number;        // Paisa
  totalLossValueRupees: number;  // Rupees (ready to display)
}

export interface StockVerificationSession {
  id: string;
  shopId: string;
  sessionDate: string;
  status: StockVerificationStatus;
  notes?: string;
  createdBy: string;
  confirmedBy?: string;
  confirmedAt?: string;
  createdAt: string;
  _count?: { items: number };
  summary?: StockVerificationSummary;
}

export interface StockVerificationItem {
  id: string;
  shopProductId: string;
  systemQty: number;
  physicalQty: number;
  difference: number;
  reason?: AdjustmentReason;
  notes?: string;
  stockLedgerId?: string;
  shopProduct?: { name: string; category?: string; quantity: number; avgCost?: number };
}

export async function createVerificationSession(payload: {
  shopId: string;
  sessionDate: string;
  notes?: string;
}): Promise<StockVerificationSession> {
  const res = await authenticatedFetch(`/operations/stock-verification`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await extractData(res);
    throw new Error((err as any).message || "Failed to create session");
  }
  return extractData(res);
}

export async function addVerificationItems(
  sessionId: string,
  items: Array<{
    shopProductId: string;
    physicalQty: number;
    reason?: AdjustmentReason;
    notes?: string;
  }>
): Promise<StockVerificationSession> {
  const res = await authenticatedFetch(
    `/operations/stock-verification/${sessionId}/items`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    }
  );
  if (!res.ok) {
    const err = await extractData(res);
    throw new Error((err as any).message || "Failed to add items");
  }
  return extractData(res);
}

export async function confirmVerificationSession(
  sessionId: string,
  shopId: string
): Promise<StockVerificationSession> {
  const res = await authenticatedFetch(
    `/operations/stock-verification/${sessionId}/confirm`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopId }),
    }
  );
  if (!res.ok) {
    const err = await extractData(res);
    throw new Error((err as any).message || "Failed to confirm session");
  }
  return extractData(res);
}

export async function getVerificationSessions(
  shopId: string,
  filters?: { status?: string; startDate?: string; endDate?: string }
): Promise<StockVerificationSession[]> {
  const p = new URLSearchParams({ shopId });
  if (filters?.status) p.append("status", filters.status);
  if (filters?.startDate) p.append("startDate", filters.startDate);
  if (filters?.endDate) p.append("endDate", filters.endDate);
  const res = await authenticatedFetch(`/operations/stock-verification?${p}`);
  if (!res.ok) throw new Error("Failed to fetch sessions");
  return extractData(res);
}

export async function getVerificationSession(
  sessionId: string
): Promise<StockVerificationSession & { items: StockVerificationItem[] }> {
  const res = await authenticatedFetch(
    `/operations/stock-verification/${sessionId}`
  );
  if (!res.ok) throw new Error("Session not found");
  return extractData(res);
}

// ─── MONTHLY REPORT ───────────────────────────────────────────────────────────

export interface MonthlyProfit {
  totalSales: number;
  totalCogs: number;
  totalExpenses: number;
  totalRefunds: number;
  totalInvLoss: number;
  netProfit: number;
}

export interface MonthlyReport {
  period: { month: number; year: number; startDate: string; endDate: string };
  sales: { totalAmount: number; totalInvoices: number };
  purchases: { totalAmount: number; totalPurchases: number };
  expenses: { totalAmount: number; totalVouchers: number };
  salary: { totalAmount: number };
  refunds: { totalAmount: number };
  inventoryLoss: number;
  jobCards: { completed: number };
  profitSummary: {
    grossRevenue: number;
    totalCosts: number;
    netProfit: number;
    profitMarginPct: number;
  };
}

export async function getMonthlySummary(
  shopId: string,
  month: number,
  year: number
): Promise<MonthlyReport> {
  const p = new URLSearchParams({
    shopId,
    month: String(month),
    year: String(year),
  });
  const res = await authenticatedFetch(`/operations/monthly-report?${p}`);
  if (!res.ok) throw new Error("Failed to fetch monthly report");
  return extractData(res);
}

export async function getMonthlyProfit(
  shopId: string,
  month: number,
  year: number
): Promise<MonthlyProfit> {
  const p = new URLSearchParams({
    shopId,
    month: String(month),
    year: String(year),
  });
  const res = await authenticatedFetch(`/mobileshop/reports/monthly-profit?${p}`);
  if (!res.ok) throw new Error("Failed to fetch monthly profit");
  return extractData(res);
}

export async function getMonthlyTrend(
  shopId: string,
  months = 6
): Promise<MonthlyReport[]> {
  const p = new URLSearchParams({ shopId, months: String(months) });
  const res = await authenticatedFetch(`/operations/monthly-report/trend?${p}`);
  if (!res.ok) throw new Error("Failed to fetch trend");
  return extractData(res);
}

// ─── SHRINKAGE INTELLIGENCE ───────────────────────────────────────────────────

export interface ShrinkageByCategory {
  category: string;
  lostUnits: number;
  lostValue: number;
  affectedProducts: number;
}

export interface ShrinkageByStaff {
  staffId: string;
  staffName: string;
  staffEmail: string;
  sessions: number;
  lostUnits: number;
  lostValue: number;
}

export interface ShrinkageBySupplier {
  supplierId: string;
  supplierName: string;
  lostUnits: number;
  lostValue: number;
  affectedProducts: number;
}

export interface ShrinkageByReason {
  reason: string;
  count: number;
  lostUnits: number;
  lostValue: number;
}

export interface ShrinkageTopProduct {
  productId: string;
  productName: string;
  category: string;
  lossQty: number;
  lossValue: number;
}

export interface ShrinkageMonthlyTrend {
  month: string;
  lossValue: number;
  lossQty: number;
}

export interface ShrinkageIntelligence {
  period: { startDate: string; endDate: string };
  totalLostValue: number;
  totalLostUnits: number;
  topLossCategory: string | null;
  topLossStaff: string | null;
  topLossSupplier: string | null;
  byCategory: ShrinkageByCategory[];
  byStaff: ShrinkageByStaff[];
  bySupplier: ShrinkageBySupplier[];
  byReason: ShrinkageByReason[];
  topProducts: ShrinkageTopProduct[];
}

export async function getShrinkageIntelligence(
  shopId: string,
  startDate: string,
  endDate: string
): Promise<ShrinkageIntelligence> {
  const p = new URLSearchParams({ shopId, startDate, endDate });
  const res = await authenticatedFetch(`/operations/shrinkage/intelligence?${p}`);
  if (!res.ok) throw new Error("Failed to fetch shrinkage intelligence");
  return extractData(res);
}

export async function getShrinkageTopProducts(
  shopId: string,
  startDate: string,
  endDate: string,
  limit = 10
): Promise<ShrinkageTopProduct[]> {
  const p = new URLSearchParams({ shopId, startDate, endDate, limit: String(limit) });
  const res = await authenticatedFetch(`/operations/shrinkage/top-loss-products?${p}`);
  if (!res.ok) throw new Error("Failed to fetch top loss products");
  return extractData(res);
}

export async function getShrinkageMonthlyTrend(
  shopId: string,
  months = 12
): Promise<ShrinkageMonthlyTrend[]> {
  const p = new URLSearchParams({ shopId, months: String(months) });
  const res = await authenticatedFetch(`/operations/shrinkage/monthly-trend?${p}`);
  if (!res.ok) throw new Error("Failed to fetch shrinkage trend");
  return extractData(res);
}
// ─── EXPENSE INTELLIGENCE ────────────────────────────────────────────────────

export interface ExpenseIntelligenceOverview {
  totalExpense: number;
  averageDailyExpense: number;
  highestExpenseDay: {
    date: string;
    amount: number;
  };
}

export interface ExpenseIntelligenceCategory {
  category: string;
  amount: number;
}

export interface ExpenseIntelligenceTrend {
  month: string;
  amount: number;
}

export interface ExpenseIntelligencePayment {
  method: string;
  amount: number;
}

export interface ExpenseIntelligence {
  overview: ExpenseIntelligenceOverview;
  categoryBreakdown: ExpenseIntelligenceCategory[];
  monthlyTrend: ExpenseIntelligenceTrend[];
  paymentMethods: ExpenseIntelligencePayment[];
  insights: { insights: string[] };
}

export async function getExpenseIntelligence(
  shopId: string,
  startDate?: string,
  endDate?: string
): Promise<ExpenseIntelligence> {
  const p = new URLSearchParams({ shopId });
  if (startDate) p.append("startDate", startDate);
  if (endDate) p.append("endDate", endDate);
  
  const res = await authenticatedFetch(`/reports/expense-intelligence?${p}`);
  if (!res.ok) throw new Error("Failed to fetch expense intelligence");
  return extractData(res);
}
