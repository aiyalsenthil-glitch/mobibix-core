"use client";

import { useEffect, useState } from "react";
import {
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
  Plus,
  X,
} from "lucide-react";
import { listShops, type Shop } from "@/services/shops.api";
import { HelpGuide } from "@/components/common/HelpGuide";

const FINANCE_GUIDE = [
  {
    title: "Two types of financing",
    description: "MobiBix tracks two types: NBFC EMI (Bajaj Finserv, Home Credit, HDFC etc.) where the bank pays you directly, and Kistikatta — your own monthly payment plans for trusted customers.",
    tip: "Switch between tabs: 'NBFC EMI Applications' and 'Kistikatta Plans'.",
  },
  {
    title: "Create an NBFC EMI Application",
    description: "Click 'New EMI', enter the invoice ID, select the finance provider, fill in loan amount, tenure, and monthly EMI. Track it from APPLIED → APPROVED → SETTLED.",
    tip: "The Subvention field captures the cost of offering 0% EMI — track it to know your real margin.",
  },
  {
    title: "Create a Kistikatta Plan",
    description: "Click 'New Plan', enter the customer, invoice, total amount, down payment and tenure. Monthly slots are auto-generated for each month. No manual calculation needed.",
    tip: "Collect at least 20% down payment and limit tenure to 3–6 months to reduce bad debt risk.",
  },
  {
    title: "Record slot payments",
    description: "Click any plan card to open the detail view. You'll see all monthly slots with their due dates. Click 'Record Payment' on any slot when the customer pays.",
    tip: "Partial payments are supported — the slot stays PARTIALLY_PAID until the full amount is collected.",
  },
  {
    title: "Monitor overdue slots",
    description: "The dashboard KPI card shows overdue count. Slots past their due date are automatically marked OVERDUE. Call or WhatsApp the customer before it becomes a bad debt.",
    tip: "Catch problems at slot 1. After 3 consecutive missed slots, consider pausing future credit to that customer.",
  },
];

import {
  financeApi,
  type EmiApplication,
  type EmiStatus,
  type FinanceSummary,
  type InstallmentPlan,
  type InstallmentSlot,
  type SlotStatus,
} from "@/services/finance.api";

type Tab = "emi" | "installment";

const EMI_STATUS_COLORS: Record<EmiStatus, string> = {
  APPLIED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  APPROVED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  SETTLED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  CANCELLED: "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400",
};

const SLOT_STATUS_COLORS: Record<SlotStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  PAID: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  PARTIALLY_PAID: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  OVERDUE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  WAIVED: "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400",
};

const FINANCE_PROVIDERS = [
  "Bajaj Finserv",
  "Home Credit",
  "HDFC",
  "ICICI",
  "Axis Bank",
  "Kotak",
  "TVS Credit",
  "Other",
];

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const inputCls = "mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500";
const labelCls = "text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide";

// ─── EMI Create Form ──────────────────────────────────────────────────────────

function EmiForm({
  shopId,
  onCreated,
  onClose,
}: {
  shopId: string;
  onCreated: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    invoiceId: "",
    financeProvider: "Bajaj Finserv",
    applicationRef: "",
    loanAmount: "",
    downPayment: "",
    tenureMonths: "12",
    monthlyEmi: "",
    interestRate: "",
    subventionAmount: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await financeApi.createEmi({
        shopId,
        invoiceId: form.invoiceId,
        financeProvider: form.financeProvider,
        applicationRef: form.applicationRef || undefined,
        loanAmount: parseFloat(form.loanAmount),
        downPayment: form.downPayment ? parseFloat(form.downPayment) : undefined,
        tenureMonths: parseInt(form.tenureMonths),
        monthlyEmi: parseFloat(form.monthlyEmi),
        interestRate: form.interestRate ? parseFloat(form.interestRate) : undefined,
        subventionAmount: form.subventionAmount ? parseFloat(form.subventionAmount) : undefined,
        notes: form.notes || undefined,
      });
      onCreated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const set = (k: keyof typeof form, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">New EMI Application (NBFC)</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-gray-500 dark:text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-lg">{error}</div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>Invoice ID</label>
              <input required value={form.invoiceId} onChange={(e) => set("invoiceId", e.target.value)} placeholder="Invoice ID" className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Finance Provider</label>
              <select value={form.financeProvider} onChange={(e) => set("financeProvider", e.target.value)} className={inputCls}>
                {FINANCE_PROVIDERS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Loan Amount (₹)</label>
              <input required type="number" value={form.loanAmount} onChange={(e) => set("loanAmount", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Down Payment (₹)</label>
              <input type="number" value={form.downPayment} onChange={(e) => set("downPayment", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Tenure (months)</label>
              <select value={form.tenureMonths} onChange={(e) => set("tenureMonths", e.target.value)} className={inputCls}>
                {[3, 6, 9, 12, 18, 24].map((m) => <option key={m} value={m}>{m} months</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Monthly EMI (₹)</label>
              <input required type="number" value={form.monthlyEmi} onChange={(e) => set("monthlyEmi", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Interest Rate (%)</label>
              <input type="number" step="0.01" value={form.interestRate} onChange={(e) => set("interestRate", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Subvention (₹)</label>
              <input type="number" value={form.subventionAmount} onChange={(e) => set("subventionAmount", e.target.value)} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Application Ref #</label>
              <input value={form.applicationRef} onChange={(e) => set("applicationRef", e.target.value)} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Notes</label>
              <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} className={inputCls} />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Create EMI Application"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Installment Create Form ──────────────────────────────────────────────────

function PlanForm({
  shopId,
  onCreated,
  onClose,
}: {
  shopId: string;
  onCreated: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    invoiceId: "",
    customerId: "",
    totalAmount: "",
    downPayment: "",
    tenureMonths: "6",
    startDate: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await financeApi.createPlan({
        shopId,
        invoiceId: form.invoiceId,
        customerId: form.customerId,
        totalAmount: parseFloat(form.totalAmount),
        downPayment: form.downPayment ? parseFloat(form.downPayment) : undefined,
        tenureMonths: parseInt(form.tenureMonths),
        startDate: form.startDate || undefined,
        notes: form.notes || undefined,
      });
      onCreated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const set = (k: keyof typeof form, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">New Kistikatta Plan</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-gray-500 dark:text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-lg">{error}</div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>Invoice ID</label>
              <input required value={form.invoiceId} onChange={(e) => set("invoiceId", e.target.value)} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Customer ID</label>
              <input required value={form.customerId} onChange={(e) => set("customerId", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Total Amount (₹)</label>
              <input required type="number" value={form.totalAmount} onChange={(e) => set("totalAmount", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Down Payment (₹)</label>
              <input type="number" value={form.downPayment} onChange={(e) => set("downPayment", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Tenure (months)</label>
              <select value={form.tenureMonths} onChange={(e) => set("tenureMonths", e.target.value)} className={inputCls}>
                {[2, 3, 4, 5, 6, 9, 12].map((m) => <option key={m} value={m}>{m} months</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Start Date</label>
              <input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} className={inputCls} />
            </div>
          </div>
          <button type="submit" disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-medium disabled:opacity-50 transition-colors">
            {saving ? "Saving..." : "Create Plan & Generate Slots"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Plan Detail Modal ────────────────────────────────────────────────────────

function PlanDetailModal({
  planId,
  onClose,
}: {
  planId: string;
  onClose: () => void;
}) {
  const [plan, setPlan] = useState<InstallmentPlan | null>(null);
  const [payingSlot, setPayingSlot] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    financeApi.getPlan(planId).then(setPlan);
  }, [planId]);

  const handlePay = async (slot: InstallmentSlot) => {
    if (!payAmount) return;
    setPaying(true);
    try {
      await financeApi.recordPayment(slot.id, { paidAmount: parseFloat(payAmount) });
      const updated = await financeApi.getPlan(planId);
      setPlan(updated);
      setPayingSlot(null);
      setPayAmount("");
    } finally {
      setPaying(false);
    }
  };

  if (!plan) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-8 text-gray-500 dark:text-slate-400">Loading...</div>
      </div>
    );
  }

  const paidSlots = plan.slots?.filter((s) => s.status === "PAID" || s.status === "WAIVED").length ?? 0;
  const totalSlots = plan.slots?.length ?? 0;
  const progress = totalSlots > 0 ? Math.round((paidSlots / totalSlots) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b dark:border-slate-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Plan #{plan.planNumber}</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">{plan.customer?.name} · {plan.customer?.phone}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-gray-500 dark:text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 dark:text-slate-400">Total</p>
              <p className="font-semibold text-gray-900 dark:text-white">{fmt(plan.totalAmount)}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 dark:text-slate-400">Remaining</p>
              <p className="font-semibold text-blue-700 dark:text-blue-400">{fmt(plan.remainingAmount)}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 dark:text-slate-400">Progress</p>
              <p className="font-semibold text-green-700 dark:text-green-400">{paidSlots}/{totalSlots} slots</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
            <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>

          {/* Slots */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300">Payment Schedule</h3>
            {plan.slots?.map((slot) => (
              <div key={slot.id} className="flex items-center justify-between p-3 border dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    slot.status === "PAID" ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" :
                    slot.status === "OVERDUE" ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" :
                    "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400"
                  }`}>
                    {slot.slotNumber}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{fmt(slot.amount)}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{fmtDate(slot.dueDate)}</p>
                    {slot.paidAmount > 0 && slot.status !== "PAID" && (
                      <p className="text-xs text-blue-600 dark:text-blue-400">Paid: {fmt(slot.paidAmount)}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SLOT_STATUS_COLORS[slot.status]}`}>
                    {slot.status.replace("_", " ")}
                  </span>
                  {(slot.status === "PENDING" || slot.status === "OVERDUE" || slot.status === "PARTIALLY_PAID") && (
                    payingSlot === slot.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          placeholder="₹"
                          className="w-20 border dark:border-slate-600 rounded px-2 py-1 text-xs bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                          autoFocus
                        />
                        <button onClick={() => handlePay(slot)} disabled={paying} className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded disabled:opacity-50">
                          Pay
                        </button>
                        <button onClick={() => setPayingSlot(null)} className="text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600">✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setPayingSlot(slot.id); setPayAmount(String(slot.amount - slot.paidAmount)); }}
                        className="text-xs bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-400 px-2 py-1 rounded transition-colors"
                      >
                        Record Payment
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FinancePage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopId, setShopId] = useState("");
  const [tab, setTab] = useState<Tab>("emi");
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [emiList, setEmiList] = useState<EmiApplication[]>([]);
  const [planList, setPlanList] = useState<InstallmentPlan[]>([]);
  const [emiFilter, setEmiFilter] = useState<EmiStatus | "">("");
  const [showEmiForm, setShowEmiForm] = useState(false);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [viewPlanId, setViewPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listShops().then((s) => {
      setShops(s);
      if (s.length > 0) setShopId(s[0].id);
    });
  }, []);

  useEffect(() => {
    if (!shopId) return;
    setLoading(true);
    Promise.all([
      financeApi.getSummary(shopId),
      financeApi.listEmi(shopId, emiFilter || undefined),
      financeApi.listPlans(shopId),
    ])
      .then(([sum, emi, plans]) => {
        setSummary(sum);
        setEmiList(emi?.items ?? []);
        setPlanList(plans?.items ?? []);
      })
      .finally(() => setLoading(false));
  }, [shopId, emiFilter]);

  const refresh = () => {
    if (!shopId) return;
    Promise.all([
      financeApi.getSummary(shopId),
      financeApi.listEmi(shopId, emiFilter || undefined),
      financeApi.listPlans(shopId),
    ]).then(([sum, emi, plans]) => {
      setSummary(sum);
      setEmiList(emi?.items ?? []);
      setPlanList(plans?.items ?? []);
    });
  };

  return (
    <div className="p-6 space-y-6 dark:bg-slate-950 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Consumer Finance</h1>
            <HelpGuide title="How Consumer Finance Works" subtitle="5-step guide" steps={FINANCE_GUIDE} side="bottom" />
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">EMI applications & Kistikatta installment plans</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={shopId}
            onChange={(e) => setShopId(e.target.value)}
            className="border dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
          >
            {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button
            onClick={() => tab === "emi" ? setShowEmiForm(true) : setShowPlanForm(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            {tab === "emi" ? "New EMI" : "New Plan"}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/40 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-500" />
              <span className="text-xs font-medium text-yellow-700 dark:text-yellow-400 uppercase tracking-wide">Pending EMI</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.emi.pending.count}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{fmt(summary.emi.pending.totalLoanAmount)} outstanding</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/40 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-500" />
              <span className="text-xs font-medium text-blue-700 dark:text-blue-400 uppercase tracking-wide">Approved</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.emi.approved.count}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{fmt(summary.emi.approved.totalLoanAmount)} to settle</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-500" />
              <span className="text-xs font-medium text-red-700 dark:text-red-400 uppercase tracking-wide">Overdue Slots</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.installment.overdueSlots}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Kistikatta installments</p>
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800/40 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="w-4 h-4 text-indigo-600 dark:text-indigo-500" />
              <span className="text-xs font-medium text-indigo-700 dark:text-indigo-400 uppercase tracking-wide">This Month Due</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.installment.thisMonthDue.count}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{fmt(summary.installment.thisMonthDue.amount)} expected</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b dark:border-slate-700">
        <div className="flex gap-6">
          {(["emi", "installment"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                  : "border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
              }`}
            >
              {t === "emi" ? "NBFC EMI Applications" : "Kistikatta Plans"}
            </button>
          ))}
        </div>
      </div>

      {/* EMI List */}
      {tab === "emi" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <select
              value={emiFilter}
              onChange={(e) => setEmiFilter(e.target.value as EmiStatus | "")}
              className="border dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            >
              <option value="">All Status</option>
              {(["APPLIED", "APPROVED", "SETTLED", "REJECTED", "CANCELLED"] as EmiStatus[]).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400 dark:text-slate-500">Loading...</div>
          ) : emiList.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-slate-500">
              <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>No EMI applications yet</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-800/60 text-xs text-gray-500 dark:text-slate-400 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">EMI #</th>
                    <th className="px-4 py-3 text-left">Invoice</th>
                    <th className="px-4 py-3 text-left">Provider</th>
                    <th className="px-4 py-3 text-right">Loan</th>
                    <th className="px-4 py-3 text-right">Monthly</th>
                    <th className="px-4 py-3 text-center">Tenure</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-700/50">
                  {emiList.map((emi) => (
                    <tr key={emi.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-medium text-gray-700 dark:text-slate-300">{emi.emiNumber}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-white">{emi.invoice?.invoiceNumber ?? (emi.invoiceId ? emi.invoiceId.slice(0, 8) : "—")}</p>
                        {emi.invoice?.invoiceDate && (
                          <p className="text-xs text-gray-500 dark:text-slate-400">{fmtDate(emi.invoice.invoiceDate)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-slate-300">{emi.financeProvider}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{fmt(emi.loanAmount)}</td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-slate-300">{fmt(emi.monthlyEmi)}</td>
                      <td className="px-4 py-3 text-center text-gray-500 dark:text-slate-400">{emi.tenureMonths}m</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${EMI_STATUS_COLORS[emi.status]}`}>
                          {emi.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Installment Plan List */}
      {tab === "installment" && (
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12 text-gray-400 dark:text-slate-500">Loading...</div>
          ) : planList.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-slate-500">
              <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>No installment plans yet</p>
            </div>
          ) : (
            planList.map((plan) => (
              <div
                key={plan.id}
                className="bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-xl p-4 hover:shadow-md dark:hover:bg-slate-800/50 cursor-pointer transition-all"
                onClick={() => setViewPlanId(plan.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{plan.customer?.name ?? "Customer"}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        Plan #{plan.planNumber} · {plan.tenureMonths} months
                        {plan.invoice?.invoiceNumber && ` · ${plan.invoice.invoiceNumber}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{fmt(plan.remainingAmount)} left</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{fmt(plan.monthlyAmount)}/mo</p>
                      {plan.nextSlot && (
                        <p className={`text-xs mt-0.5 font-medium ${plan.nextSlot.status === "OVERDUE" ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-slate-400"}`}>
                          Due: {fmtDate(plan.nextSlot.dueDate)}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modals */}
      {showEmiForm && (
        <EmiForm shopId={shopId} onCreated={() => { setShowEmiForm(false); refresh(); }} onClose={() => setShowEmiForm(false)} />
      )}
      {showPlanForm && (
        <PlanForm shopId={shopId} onCreated={() => { setShowPlanForm(false); refresh(); }} onClose={() => setShowPlanForm(false)} />
      )}
      {viewPlanId && (
        <PlanDetailModal planId={viewPlanId} onClose={() => { setViewPlanId(null); refresh(); }} />
      )}
    </div>
  );
}
