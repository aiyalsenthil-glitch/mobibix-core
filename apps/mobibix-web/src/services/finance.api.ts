const API = process.env.NEXT_PUBLIC_API_URL;

// ─── Types ────────────────────────────────────────────────────────────────────

export type EmiStatus = 'APPLIED' | 'APPROVED' | 'SETTLED' | 'REJECTED' | 'CANCELLED';
export type InstallmentStatus = 'ACTIVE' | 'COMPLETED' | 'DEFAULTED' | 'CANCELLED';
export type SlotStatus = 'PENDING' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'WAIVED';

export interface EmiApplication {
  id: string;
  tenantId: string;
  shopId: string;
  invoiceId: string;
  customerId?: string;
  emiNumber: string;
  financeProvider: string;
  applicationRef?: string;
  loanAmount: number;
  downPayment: number;
  tenureMonths: number;
  monthlyEmi: number;
  interestRate?: number;
  subventionAmount: number;
  status: EmiStatus;
  settlementAmount?: number;
  settledAt?: string;
  rejectedReason?: string;
  notes?: string;
  createdAt: string;
  invoice?: { invoiceNumber: string; invoiceDate: string; totalAmount: number; customerName?: string };
}

export interface InstallmentSlot {
  id: string;
  planId: string;
  tenantId: string;
  slotNumber: number;
  dueDate: string;
  amount: number;
  paidAmount: number;
  paidAt?: string;
  receiptId?: string;
  status: SlotStatus;
  reminderSentAt?: string;
}

export interface InstallmentPlan {
  id: string;
  tenantId: string;
  shopId: string;
  invoiceId: string;
  customerId: string;
  planNumber: string;
  totalAmount: number;
  downPayment: number;
  remainingAmount: number;
  tenureMonths: number;
  monthlyAmount: number;
  startDate: string;
  status: InstallmentStatus;
  notes?: string;
  createdAt: string;
  customer?: { name: string; phone: string };
  invoice?: { invoiceNumber: string; totalAmount: number };
  slots?: InstallmentSlot[];
  nextSlot?: InstallmentSlot;
}

export interface FinanceSummary {
  emi: {
    pending: { count: number; totalLoanAmount: number };
    approved: { count: number; totalLoanAmount: number };
    settled: { count: number; totalSettled: number };
    rejected: { count: number };
  };
  installment: {
    activePlans: { count: number; totalRemaining: number };
    overdueSlots: number;
    thisMonthDue: { count: number; amount: number };
  };
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { credentials: 'include' });
  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();
  return json?.data ?? json;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();
  return json?.data ?? json;
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();
  return json?.data ?? json;
}

// ─── Finance API ──────────────────────────────────────────────────────────────

export const financeApi = {
  // Dashboard
  getSummary: (shopId: string) =>
    get<FinanceSummary>(`/finance/summary?shopId=${shopId}`),

  // EMI Applications
  createEmi: (data: {
    shopId: string;
    invoiceId: string;
    customerId?: string;
    financeProvider: string;
    applicationRef?: string;
    loanAmount: number;
    downPayment?: number;
    tenureMonths: number;
    monthlyEmi: number;
    interestRate?: number;
    subventionAmount?: number;
    notes?: string;
  }) => post<EmiApplication>('/finance/emi', data),

  listEmi: (shopId: string, status?: EmiStatus, page = 1, limit = 50) => {
    const params = new URLSearchParams({ shopId, page: String(page), limit: String(limit) });
    if (status) params.set('status', status);
    return get<{ items: EmiApplication[]; total: number; page: number; limit: number }>(
      `/finance/emi?${params}`,
    );
  },

  getEmi: (id: string) => get<EmiApplication>(`/finance/emi/${id}`),

  updateEmiStatus: (
    id: string,
    data: { status: EmiStatus; applicationRef?: string; settlementAmount?: number; rejectedReason?: string },
  ) => patch<EmiApplication>(`/finance/emi/${id}/status`, data),

  // Installment Plans
  createPlan: (data: {
    shopId: string;
    invoiceId: string;
    customerId: string;
    totalAmount: number;
    downPayment?: number;
    tenureMonths: number;
    startDate?: string;
    notes?: string;
  }) => post<InstallmentPlan>('/finance/installment', data),

  listPlans: (shopId: string, status?: InstallmentStatus, page = 1, limit = 50) => {
    const params = new URLSearchParams({ shopId, page: String(page), limit: String(limit) });
    if (status) params.set('status', status);
    return get<{ items: InstallmentPlan[]; total: number; page: number; limit: number }>(
      `/finance/installment?${params}`,
    );
  },

  getPlan: (id: string) => get<InstallmentPlan>(`/finance/installment/${id}`),

  recordPayment: (slotId: string, data: { paidAmount: number; receiptId?: string; status?: SlotStatus }) =>
    post<InstallmentSlot>(`/finance/installment/slots/${slotId}/pay`, data),
};
