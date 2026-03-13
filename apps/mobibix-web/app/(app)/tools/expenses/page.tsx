"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, IndianRupee, Loader2, AlertTriangle, CheckCircle2,
  ChevronDown, Coffee, Truck, Fuel, Zap, Wifi, MoreHorizontal,
  BarChart2, RefreshCw,
} from "lucide-react";
import { useShop } from "@/context/ShopContext";
import {
  createExpense, getExpenses, getExpenseCategoryBreakdown,
  type Expense, type ExpenseCategoryBreakdown,
} from "@/services/operations.api";

const CATEGORIES = [
  { value: "tea",           label: "Tea / Snacks",     icon: Coffee },
  { value: "courier",       label: "Courier",          icon: Truck },
  { value: "petrol",        label: "Petrol / Travel",  icon: Fuel },
  { value: "salary_advance",label: "Salary Advance",   icon: IndianRupee },
  { value: "electricity",   label: "Electricity",      icon: Zap },
  { value: "internet",      label: "Internet",         icon: Wifi },
  { value: "misc",          label: "Miscellaneous",    icon: MoreHorizontal },
];

const PAYMENT_METHODS = ["CASH", "UPI", "CARD", "BANK"] as const;

function fmt(paisa: number) {
  const v = paisa / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(v);
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function monthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const end = todayStr();
  return { start, end };
}

export default function ExpensesPage() {
  const { selectedShop } = useShop();
  const shopId = selectedShop?.id ?? "";

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [breakdown, setBreakdown] = useState<ExpenseCategoryBreakdown[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("misc");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "UPI" | "CARD" | "BANK">("CASH");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayStr());

  // Filter state
  const [startDate, setStartDate] = useState(monthRange().start);
  const [endDate, setEndDate] = useState(monthRange().end);

  const load = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const [list, cats] = await Promise.all([
        getExpenses(shopId, { startDate, endDate, take: 50 }),
        getExpenseCategoryBreakdown(shopId, startDate, endDate),
      ]);
      setExpenses(list.data);
      setBreakdown(cats);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [shopId, startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!amount || parseFloat(amount) <= 0) { setError("Enter a valid amount."); return; }
    setSaving(true); setError(""); setSuccess("");
    try {
      await createExpense({ shopId, amount: parseFloat(amount), category, paymentMethod, note, date });
      setSuccess("Expense recorded.");
      setAmount(""); setNote(""); setDate(todayStr()); setShowForm(false);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const totalThisPeriod = breakdown.reduce((s, b) => s + b.total, 0);

  if (!shopId) return <div className="p-8 text-center text-gray-500 dark:text-slate-400">Select a shop first.</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Expense Manager</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">Track daily operational costs</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-100 transition-colors">
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-blue-600 dark:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-all shadow-md active:scale-95"
          >
            <Plus size={16} /> Add Expense
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg p-3 text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/30 rounded-lg p-3 text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
          <CheckCircle2 size={16} /> {success}
        </div>
      )}

      {/* Add Expense Form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
          <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">New Expense</p>

          {/* Category */}
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setCategory(value)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs border transition-all ${
                  category === value
                    ? "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400 shadow-inner"
                    : "border-gray-200 dark:border-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800"
                }`}
              >
                <Icon size={18} />
                <span className="text-center leading-tight">{label}</span>
              </button>
            ))}
          </div>

          {/* Amount */}
          <div className="flex items-center gap-2 border border-gray-200 dark:border-slate-800 rounded-lg px-3 py-2 bg-white dark:bg-slate-950 focus-within:ring-2 focus-within:ring-blue-500">
            <IndianRupee size={16} className="text-gray-400 dark:text-slate-500" />
            <input
              type="number"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 text-sm outline-none bg-transparent dark:text-slate-200"
            />
          </div>

          {/* Payment Method */}
          <div className="flex gap-2">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m}
                onClick={() => setPaymentMethod(m)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                  paymentMethod === m
                    ? "bg-gray-900 dark:bg-slate-100 text-white dark:text-slate-900 border-gray-900 dark:border-slate-100"
                    : "border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Date */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 dark:text-slate-500 w-16">Date</label>
            <input
              type="date"
              value={date}
              max={todayStr()}
              onChange={(e) => setDate(e.target.value)}
              className="border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-3 py-2 text-sm focus:outline-none dark:text-slate-200"
            />
          </div>

          {/* Note */}
          <input
            type="text"
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-3 py-2 text-sm focus:outline-none dark:text-slate-200"
          />

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !amount}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : null} Save
            </button>
            <button onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 py-2.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Date Range Filter */}
      <div className="flex items-center gap-3 text-sm">
        <span className="text-gray-500 dark:text-slate-400">From</span>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
          className="border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-2 py-1.5 text-sm dark:text-slate-200" />
        <span className="text-gray-500 dark:text-slate-400">to</span>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
          className="border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-2 py-1.5 text-sm dark:text-slate-200" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-blue-500" size={28} />
        </div>
      ) : (
        <>
          {/* Category Breakdown */}
          {breakdown.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700 dark:text-slate-200 flex items-center gap-2">
                   <BarChart2 size={16} className="text-blue-500" /> Breakdown
                </p>
                <span className="text-sm font-bold text-red-600 dark:text-red-400">{fmt(totalThisPeriod)}</span>
              </div>
              {breakdown.map((b) => {
                const pct = totalThisPeriod > 0 ? (b.total / totalThisPeriod) * 100 : 0;
                const cat = CATEGORIES.find((c) => c.value === b.category);
                return (
                  <div key={b.category} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600 dark:text-slate-400">{cat?.label ?? b.category}</span>
                      <span className="font-medium dark:text-slate-200">{fmt(b.total)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-400 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Expense List */}
          <div className="space-y-2">
            {expenses.length === 0 ? (
              <div className="text-center py-12 text-gray-400 dark:text-slate-500 text-sm">No expenses in this period.</div>
            ) : expenses.map((e) => {
              const cat = CATEGORIES.find((c) => c.value === e.expenseCategory);
              const Icon = cat?.icon ?? MoreHorizontal;
              return (
                <div key={e.id} className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800/50 rounded-xl px-4 py-3 flex items-center gap-4 transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/30">
                  <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-500 dark:text-slate-400">
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-gray-900 dark:text-slate-200">{cat?.label ?? e.expenseCategory ?? "Expense"}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500">
                      {new Date(e.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      {e.narration ? ` · ${e.narration}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400">{fmt(e.amount)}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-tighter font-bold">{e.paymentMethod}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
