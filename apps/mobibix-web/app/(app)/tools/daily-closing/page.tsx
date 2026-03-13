"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Calendar, Lock, Unlock, AlertTriangle, CheckCircle2,
  TrendingUp, TrendingDown, Banknote, Wallet, Loader2,
  RefreshCw, ChevronDown, ChevronUp, History, X
} from "lucide-react";
import { useShop } from "@/context/ShopContext";
import {
  getDailySummary, closeDay, reopenDay, getDailyClosings,
  getCashVariances, approveCashVariance,
  openShift, closeShift, getCurrentShift,
  getCashLeakageAnalysis,
  type DailySummary, type DailyClosing, type CashVariance, type ShiftClosing, type CashLeakageAnalysis,
} from "@/services/operations.api";

const today = () => new Date().toISOString().split("T")[0];

function fmt(paisa: number) {
  const v = paisa / 100;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    OPEN: "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400",
    DRAFT: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    SUBMITTED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    REOPENED: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    PENDING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    APPROVED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[status] ?? "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400"}`}>
      {status}
    </span>
  );
}

export default function DailyClosingPage() {
  const { selectedShop } = useShop();
  const shopId = selectedShop?.id ?? "";

  const [date, setDate] = useState(today());
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [history, setHistory] = useState<DailyClosing[]>([]);
  const [variances, setVariances] = useState<CashVariance[]>([]);
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [showReopen, setShowReopen] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [physicalCash, setPhysicalCash] = useState("");
  const [varianceReason, setVarianceReason] = useState("");
  const [varianceNote, setVarianceNote] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shiftName, setShiftName] = useState("");

  const [mode, setMode] = useState<'SYSTEM' | 'MANUAL'>('SYSTEM');
  const [manualValues, setManualValues] = useState<Record<string, string>>({});
  const [denominations, setDenominations] = useState<Record<string, string>>({
    "500": "", "200": "", "100": "", "50": "", "20": "", "10": "", "5": "", "2": "", "1": ""
  });
  const [showDenominations, setShowDenominations] = useState(false);
  const [analysis, setAnalysis] = useState<CashLeakageAnalysis | null>(null);

  const load = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    setError("");
    try {
      const [sr, hr, vr] = await Promise.allSettled([
        getDailySummary(shopId, date),
        getDailyClosings(shopId),
        getCashVariances(shopId, { status: "PENDING" }),
      ]);
      if (sr.status === "fulfilled") setSummary(sr.value);
      else setError(sr.reason?.message ?? "Failed to load summary");
      if (hr.status === "fulfilled") setHistory(hr.value);
      if (vr.status === "fulfilled") setVariances(vr.value);
    } finally {
      setLoading(false);
    }
  }, [shopId, date]);

  useEffect(() => { load(); }, [load]);


  const handleClose = async () => {
    if (!physicalCash) { setError("Enter physical cash count before closing."); return; }
    setClosing(true); setError(""); setSuccess("");
    try {
      const manualEntries = mode === 'MANUAL' ? {
        salesCash: manualValues.salesCash ? parseFloat(manualValues.salesCash) * 100 : undefined,
        salesUpi: manualValues.salesUpi ? parseFloat(manualValues.salesUpi) * 100 : undefined,
        salesCard: manualValues.salesCard ? parseFloat(manualValues.salesCard) * 100 : undefined,
        salesBank: manualValues.salesBank ? parseFloat(manualValues.salesBank) * 100 : undefined,
        otherCashIn: manualValues.otherCashIn ? parseFloat(manualValues.otherCashIn) * 100 : undefined,
        cashWithdrawFromBank: manualValues.cashWithdrawFromBank ? parseFloat(manualValues.cashWithdrawFromBank) * 100 : undefined,
        expenseCash: manualValues.expenseCash ? parseFloat(manualValues.expenseCash) * 100 : undefined,
        supplierPaymentsCash: manualValues.supplierPaymentsCash ? parseFloat(manualValues.supplierPaymentsCash) * 100 : undefined,
        otherCashOut: manualValues.otherCashOut ? parseFloat(manualValues.otherCashOut) * 100 : undefined,
        cashDepositToBank: manualValues.cashDepositToBank ? parseFloat(manualValues.cashDepositToBank) * 100 : undefined,
      } : undefined;

      const dens: Record<string, number> = {};
      Object.entries(denominations).forEach(([k, v]) => {
        if (v) dens[k] = parseInt(v);
      });

      await closeDay({ 
        shopId, 
        date, 
        mode,
        reportedClosingCash: parseFloat(physicalCash) * 100, 
        manualEntries,
        denominations: Object.keys(dens).length > 0 ? dens : undefined,
        varianceReason: (parseFloat(physicalCash) * 100) !== currentExpectedPaisa ? (varianceReason || "Discrepancy reported") : "",
        varianceNote 
      });
      setSuccess("Day closed successfully!");
      setPhysicalCash(""); setManualValues({}); setDenominations({
        "500": "", "200": "", "100": "", "50": "", "20": "", "10": "", "5": "", "2": "", "1": ""
      });
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setClosing(false);
    }
  };

  const handleOpenShift = async () => {
    if (!shiftName) return;
    try {
      await openShift({ shopId, shiftName });
      setSuccess("Shift opened.");
      setShowShiftModal(false);
      await load();
    } catch (e: any) { setError(e.message); }
  };

  const handleCloseShift = async () => {
    if (!physicalCash) return;
    try {
      await closeShift({ shopId, reportedClosingCash: parseFloat(physicalCash) });
      setSuccess("Shift closed.");
      setPhysicalCash("");
      await load();
    } catch (e: any) { setError(e.message); }
  };

  const handleReopen = async () => {
    if (!reopenReason.trim()) { setError("Provide a reason to reopen."); return; }
    setClosing(true); setError(""); setSuccess("");
    try {
      await reopenDay({ shopId, date, reason: reopenReason });
      setSuccess("Day reopened. Make corrections and close again.");
      setShowReopen(false); setReopenReason("");
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setClosing(false);
    }
  };

  const handleApproveVariance = async (v: CashVariance) => {
    try {
      await approveCashVariance({ varianceId: v.id, shopId });
      setSuccess("Variance approved.");
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  // Denomination Sum
  const denomTotal = Object.entries(denominations).reduce((sum, [denom, count]) => {
    return sum + (parseInt(denom) * (parseInt(count) || 0));
  }, 0);

  // Derived Financials
  const getValue = (key: string, systemPaisa: number) => {
    if (mode === 'SYSTEM') return systemPaisa;
    return manualValues[key] !== undefined ? parseFloat(manualValues[key]) * 100 : systemPaisa;
  };

  const curSalesCash = getValue('salesCash', summary?.salesCash || 0);
  const curWithdraw = getValue('cashWithdrawFromBank', summary?.cashWithdrawFromBank || 0);
  const curOtherIn = getValue('otherCashIn', summary?.otherCashIn || 0);
  const curExpense = getValue('expenseCash', summary?.expenseCash || 0);
  const curSupplier = getValue('supplierPaymentsCash', summary?.supplierPaymentsCash || 0);
  const curOtherOut = getValue('otherCashOut', summary?.otherCashOut || 0);
  const curDeposit = getValue('cashDepositToBank', summary?.cashDepositToBank || 0);

  const currentExpectedPaisa = (summary?.openingCash || 0) + curSalesCash + curWithdraw + curOtherIn - curExpense - curSupplier - curOtherOut - curDeposit;
  const currentPhysicalPaisa = parseFloat(physicalCash) * 100 || 0;
  const differencePaisa = currentPhysicalPaisa - currentExpectedPaisa;

  useEffect(() => {
    if (Math.abs(differencePaisa) > 0 && shopId && date) {
      const timer = setTimeout(() => {
        getCashLeakageAnalysis(shopId, date)
          .then(setAnalysis)
          .catch(() => setAnalysis(null));
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setAnalysis(null);
    }
  }, [differencePaisa, shopId, date]);

  const isConfirmed = summary?.status === "SUBMITTED";
  const isReopened  = summary?.status === "REOPENED";
  const canClose    = summary?.status === "OPEN" || isReopened || summary?.status === "DRAFT";
  const isFuture    = date > today();

  const handleManualChange = (key: string, val: string) => {
    setManualValues(prev => ({ ...prev, [key]: val }));
  };

  if (!shopId) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-slate-400">
        Select a shop to use Daily Closing.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Daily Account Closing</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">Seal the day's cash position for {selectedShop?.name}</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400 transition-colors">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Date Picker */}
      <div className="flex items-center gap-3">
        <Calendar size={18} className="text-gray-400 dark:text-slate-500" />
        <input
          type="date"
          value={date}
          max={today()}
          onChange={(e) => setDate(e.target.value)}
          className="border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-slate-200"
        />
        {summary && <StatusBadge status={summary.status} />}
      </div>

      {isFuture && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/30 rounded-lg p-3 text-sm text-yellow-700 dark:text-yellow-400">
          Cannot close a future date.
        </div>
      )}

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

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-blue-500" size={28} />
        </div>
      ) : summary ? (
        <>
          {/* 1. Header + Mode Toggle */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto shadow-inner">
                <button
                  onClick={() => setMode('SYSTEM')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    mode === 'SYSTEM' 
                      ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-md" 
                      : "text-gray-500 hover:text-gray-700 dark:hover:text-slate-300"
                  }`}
                >
                  System Data
                </button>
                <button
                  onClick={() => setMode('MANUAL')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    mode === 'MANUAL' 
                      ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-md" 
                      : "text-gray-500 hover:text-gray-700 dark:hover:text-slate-300"
                  }`}
                >
                  Manual Entry
                </button>
              </div>
              {mode === 'MANUAL' && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/30 rounded-lg text-[11px] font-bold text-yellow-700 dark:text-yellow-400 uppercase tracking-wider animate-pulse">
                  <AlertTriangle size={14} /> Manual Reconciliation Mode
                </div>
              )}
            </div>
          </div>

          {/* 2. Cash Summary Section */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-4 shadow-sm">
              <p className="text-[10px] text-blue-500 dark:text-blue-400 font-bold uppercase tracking-wider mb-1">Opening Cash</p>
              <p className="text-xl font-black text-blue-700 dark:text-blue-300">{fmt(summary.openingCash)}</p>
            </div>
            
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-900/30 rounded-2xl p-4 shadow-sm">
              <p className="text-[10px] text-purple-500 dark:text-purple-400 font-bold uppercase tracking-wider mb-1">Cash Movement</p>
              <div className="flex items-center gap-1">
                <span className={`text-sm font-bold ${curSalesCash + curWithdraw + curOtherIn - (curExpense + curSupplier + curOtherOut + curDeposit) >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {curSalesCash + curWithdraw + curOtherIn - (curExpense + curSupplier + curOtherOut + curDeposit) >= 0 ? "+" : ""}
                </span>
                <p className="text-xl font-black text-purple-700 dark:text-purple-300">
                  {fmt(Math.abs(curSalesCash + curWithdraw + curOtherIn - (curExpense + curSupplier + curOtherOut + curDeposit)))}
                </p>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 rounded-2xl p-4 shadow-sm transition-all border-l-4">
              <p className="text-[10px] text-green-500 dark:text-green-400 font-bold uppercase tracking-wider mb-1">Expected Closing</p>
              <p className="text-xl font-black text-green-700 dark:text-green-300">{fmt(currentExpectedPaisa)}</p>
            </div>
          </div>

          {/* Shift Info (Only if active) */}
          {summary.shiftInfo && (
            <div className="bg-slate-50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Shift Status</span>
                <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full font-bold">{summary.shiftInfo.closedShifts} / {summary.shiftInfo.totalShifts} Closed</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {summary.shiftInfo.shifts.map(s => (
                  <div key={s.id} className="flex justify-between items-center text-[11px] bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <span className="font-bold text-slate-600 dark:text-slate-400">{s.shiftName}</span>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={s.status} />
                      <span className="font-black text-slate-900 dark:text-slate-200">
                        {s.reportedClosingCash !== undefined ? fmt(s.reportedClosingCash) : "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {summary.shiftInfo.shifts.some(s => s.status === 'OPEN') ? (
                <button 
                  onClick={() => setShowShiftModal(true)}
                  className="w-full text-xs font-black bg-purple-100 text-purple-700 py-2.5 rounded-xl hover:bg-purple-200 transition-colors"
                >
                  MANAGE ACTIVE SHIFT
                </button>
              ) : (
                <button 
                  onClick={() => { setShiftName(""); setShowShiftModal(true); }}
                  className="w-full text-xs font-black border-2 border-dashed border-purple-200 dark:border-purple-900/40 text-purple-600 dark:text-purple-400 py-2.5 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-all"
                >
                  + START NEW SHIFT
                </button>
              )}
            </div>
          )}

          {/* 3. Cash In / Out Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* IN breakdown */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl backdrop-blur-sm bg-white/80 dark:bg-slate-900/80">
              <div className="flex items-center justify-between border-b border-green-50 dark:border-green-900/20 pb-2">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-bold">
                  <TrendingUp size={18} /> <span>↑ Cash IN</span>
                </div>
                <span className="text-lg font-black text-green-600 dark:text-green-400">{fmt(curSalesCash + curWithdraw + curOtherIn)}</span>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Sales — Cash",  key: 'salesCash', value: summary.salesCash },
                  { label: "Sales — UPI",   key: 'salesUpi', value: summary.salesUpi },
                  { label: "Sales — Card",  key: 'salesCard', value: summary.salesCard },
                  { label: "Sales — Bank",  key: 'salesBank', value: summary.salesBank },
                  { label: "Other Cash In", key: 'otherCashIn', value: summary.otherCashIn },
                  { label: "Withdraw from Bank", key: 'cashWithdrawFromBank', value: summary.cashWithdrawFromBank },
                ].map(({ label, key, value }) => (
                  <div key={label} className="flex justify-between items-center text-sm group">
                    <span className="text-gray-500 dark:text-slate-400 font-medium">{label}</span>
                    {mode === 'MANUAL' ? (
                      <div className="relative w-32">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">₹</span>
                        <input
                          type="number"
                          value={manualValues[key] ?? value / 100}
                          onChange={(e) => handleManualChange(key, e.target.value)}
                          className="w-full pl-5 pr-2 py-1.5 rounded-lg border-2 border-blue-50 dark:border-slate-800 bg-blue-50/30 dark:bg-slate-950 text-right font-bold text-blue-700 dark:text-blue-400 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    ) : (
                      <span className="font-bold text-gray-900 dark:text-slate-200">{fmt(value)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* OUT breakdown */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl backdrop-blur-sm bg-white/80 dark:bg-slate-900/80">
              <div className="flex items-center justify-between border-b border-red-50 dark:border-red-900/20 pb-2">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold">
                  <TrendingDown size={18} /> <span>↓ Cash OUT</span>
                </div>
                <span className="text-lg font-black text-red-600 dark:text-red-400">{fmt(curExpense + curSupplier + curOtherOut + curDeposit)}</span>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Cash Expenses",      key: 'expenseCash', value: summary.expenseCash },
                  { label: "Supplier Payments",  key: 'supplierPaymentsCash', value: summary.supplierPaymentsCash },
                  { label: "Other Cash Out",     key: 'otherCashOut', value: summary.otherCashOut },
                  { label: "Deposit to Bank",    key: 'cashDepositToBank', value: summary.cashDepositToBank },
                ].map(({ label, key, value }) => (
                  <div key={label} className="flex justify-between items-center text-sm group">
                    <span className="text-gray-500 dark:text-slate-400 font-medium">{label}</span>
                    {mode === 'MANUAL' ? (
                      <div className="relative w-32">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">₹</span>
                        <input
                          type="number"
                          value={manualValues[key] ?? value / 100}
                          onChange={(e) => handleManualChange(key, e.target.value)}
                          className="w-full pl-5 pr-2 py-1.5 rounded-lg border-2 border-red-50 dark:border-slate-800 bg-red-50/30 dark:bg-slate-950 text-right font-bold text-red-700 dark:text-red-400 focus:outline-none focus:border-red-500"
                        />
                      </div>
                    ) : (
                      <span className="font-bold text-gray-900 dark:text-slate-200">{fmt(value)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 4. Physical Cash Count Section */}
          {canClose && !isFuture && (
            <div className="bg-white dark:bg-slate-900 border-2 border-blue-100 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Banknote size={120} />
              </div>

              <div className="flex items-center justify-between relative z-10">
                <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <Banknote className="text-blue-500" /> Physical Cash Count
                </h2>
                <button 
                  onClick={() => setShowDenominations(!showDenominations)}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-full transition-colors"
                >
                  {showDenominations ? <ChevronUp size={14}/> : <ChevronDown size={14}/>} Count by Denomination
                </button>
              </div>

              {showDenominations && (
                <div className="bg-gray-50 dark:bg-slate-950/50 rounded-2xl p-5 border border-gray-100 dark:border-slate-800/50 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300 relative z-10">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {["500", "200", "100", "50", "20", "10", "5", "2", "1"].map(denom => (
                      <div key={denom} className="space-y-1 group">
                        <label className="text-[10px] uppercase font-black text-gray-400 dark:text-slate-500 group-focus-within:text-blue-500 transition-colors">₹{denom}</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            placeholder="0"
                            value={denominations[denom]}
                            onChange={(e) => setDenominations(prev => ({ ...prev, [denom]: e.target.value }))}
                            className="w-full px-3 py-2 text-sm font-bold border-2 border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl focus:border-blue-500 outline-none transition-all"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 border-t-2 border-dashed border-gray-200 dark:border-slate-800 flex justify-between items-center bg-blue-50/30 dark:bg-slate-900/30 -mx-5 -mb-5 p-5 rounded-b-2xl">
                    <span className="text-xs font-black text-gray-500 uppercase tracking-tighter">Total Counter Sum</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-black text-blue-600">₹{denomTotal}</span>
                      <button 
                        onClick={() => setPhysicalCash(denomTotal.toString())}
                        className="text-xs font-bold bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                      >
                        Apply To Total
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4 relative z-10">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Actual Physical Cash</label>
                  <div className="relative group">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black text-gray-300 group-focus-within:text-blue-500 transition-colors">₹</span>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={physicalCash}
                      onChange={(e) => setPhysicalCash(e.target.value)}
                      className="w-full pl-12 pr-6 py-5 border-2 border-gray-100 dark:border-slate-700 rounded-3xl text-3xl font-black focus:outline-none focus:border-blue-500 bg-white dark:bg-slate-950 dark:text-slate-100 shadow-inner group-hover:border-gray-200 dark:group-hover:border-slate-600 transition-all"
                    />
                  </div>
                </div>

                {/* Difference Indicator */}
                {physicalCash && (
                  <div className={`p-5 rounded-2xl border-2 animate-in zoom-in duration-300 flex items-center gap-4 ${
                    differencePaisa === 0 
                      ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30" 
                      : differencePaisa > 0 
                        ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-900/30" 
                        : "bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30"
                  }`}>
                    <div className={`p-3 rounded-full ${
                      differencePaisa === 0 ? "bg-green-500/20" : differencePaisa > 0 ? "bg-yellow-500/20" : "bg-red-500/20"
                    }`}>
                      {differencePaisa === 0 ? <CheckCircle2 size={24} /> : differencePaisa > 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-black opacity-60">Result</p>
                      <p className="text-xl font-black">
                        {differencePaisa === 0 ? "Balanced" : differencePaisa > 0 ? `Excess Cash ${fmt(differencePaisa)}` : `Shortage ${fmt(Math.abs(differencePaisa))}`}
                      </p>
                      <p className="text-xs opacity-70">
                         Expected: {fmt(currentExpectedPaisa)} | Actual: {fmt(currentPhysicalPaisa)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Leakage Analysis Suggestions */}
                {analysis && analysis.suggestions.length > 0 && (
                  <div className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/20 rounded-2xl p-5 animate-in slide-in-from-left-4 duration-500">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                      <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Auto Leakage Detection</p>
                    </div>
                    <ul className="space-y-3">
                      {analysis.suggestions.map((s, i) => (
                        <li key={i} className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-start gap-2.5 leading-relaxed">
                          <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-indigo-400" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {physicalCash && differencePaisa !== 0 && (
                <div className="space-y-3 p-5 bg-red-50/50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20 animate-in slide-in-from-bottom-2">
                  <p className="text-xs text-red-600 dark:text-red-400 font-bold uppercase tracking-widest flex items-center gap-2">
                    <AlertTriangle size={14} /> Mismatch Reason Required
                  </p>
                  <select
                    value={varianceReason}
                    onChange={(e) => setVarianceReason(e.target.value)}
                    className="w-full border-2 border-red-100 dark:border-red-900/30 rounded-xl px-4 py-3 text-sm font-bold bg-white dark:bg-slate-950 dark:text-slate-200 focus:outline-none focus:border-red-500 transition-all"
                  >
                    <option value="">Select a reason...</option>
                    <option value="MISSED_ENTRY">Missed Entry</option>
                    <option value="THEFT">Potential Theft</option>
                    <option value="ERROR_GIVING_CHANGE">Error giving change</option>
                    <option value="UNACCOUNTED_EXPENSE">Unaccounted Expense</option>
                    <option value="OTHER">Other Reason (Write in notes)</option>
                  </select>
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Closing Notes</label>
                <textarea
                  placeholder="Explain any details or reason for mismatch..."
                  value={varianceNote}
                  onChange={(e) => setVarianceNote(e.target.value)}
                  rows={3}
                  className="w-full border-2 border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:border-blue-500 resize-none dark:text-slate-200 shadow-inner"
                />
              </div>

              <button
                onClick={() => {
                  if (differencePaisa !== 0) {
                    if (confirm(`Cash mismatch detected. \n\n${differencePaisa > 0 ? "EXCESS" : "SHORTAGE"}: ${fmt(Math.abs(differencePaisa))} \n\nDo you want to proceed with this discrepancy?`)) {
                      handleClose();
                    }
                  } else {
                    handleClose();
                  }
                }}
                disabled={closing || !physicalCash || (differencePaisa !== 0 && !varianceReason)}
                className="w-full bg-blue-600 text-white py-6 rounded-3xl text-lg font-black hover:bg-blue-700 disabled:opacity-50 shadow-2xl shadow-blue-600/30 active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-tighter"
              >
                {closing ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={24} />}
                Confirm & Seal Day
              </button>
            </div>
          )}

          {isConfirmed && (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-900/30 rounded-3xl p-8 text-center shadow-xl animate-in zoom-in">
                <div className="w-20 h-20 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/20">
                  <Lock size={40} />
                </div>
                <h3 className="text-2xl font-black text-green-700 dark:text-green-300 mb-2 uppercase italic tracking-tighter">Account Sealed</h3>
                <p className="text-sm font-bold text-green-600 dark:text-green-400 mb-6">
                  Successfully reconciled for {new Date(date).toLocaleDateString("en-IN", { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <div className="bg-white/50 dark:bg-slate-950/30 rounded-2xl p-4 inline-block border border-green-100 dark:border-green-900/20">
                   <p className="text-xs text-green-500 dark:text-green-500 font-black uppercase mb-1">Final Reported Cash</p>
                   <p className="text-3xl font-black text-green-700 dark:text-green-300">{fmt(summary.reportedClosingCash)}</p>
                </div>
              </div>
              <button
                onClick={() => setShowReopen(true)}
                className="w-full border-2 border-dashed border-orange-200 dark:border-orange-900/40 text-orange-600 dark:text-orange-400 py-4 rounded-2xl text-sm font-black hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-all flex items-center justify-center gap-2 group"
              >
                <Unlock size={18} className="group-hover:rotate-12 transition-transform" /> REOPEN FOR CORRECTIONS
              </button>
            </div>
          )}

          {showReopen && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-900/30 rounded-3xl p-6 space-y-4 animate-in slide-in-from-top-4">
              <p className="text-sm font-black text-orange-700 dark:text-orange-400 uppercase tracking-widest pl-1">Why are you reopening?</p>
              <select
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                className="w-full border-2 border-orange-100 dark:border-orange-900/40 rounded-xl px-4 py-3 text-sm font-bold bg-white dark:bg-slate-900 dark:text-slate-200 focus:outline-none focus:border-orange-500"
              >
                <option value="">Select reason...</option>
                <option value="missed expense">Missed expense entry</option>
                <option value="wrong cash count">Wrong cash count</option>
                <option value="staff mistake">Staff mistake</option>
                <option value="missing transaction">Missing transaction</option>
                <option value="other">Other</option>
              </select>
              <div className="flex gap-3">
                <button
                  onClick={handleReopen}
                  disabled={closing || !reopenReason}
                  className="flex-[2] bg-orange-600 text-white py-4 rounded-2xl text-sm font-black hover:bg-orange-700 disabled:opacity-50 shadow-lg shadow-orange-600/20"
                >
                  {closing ? <Loader2 className="animate-spin mx-auto" /> : "YES, REOPEN NOW"}
                </button>
                <button onClick={() => setShowReopen(false)} className="flex-1 border-2 border-gray-200 dark:border-slate-800 text-gray-500 dark:text-slate-400 py-4 rounded-2xl text-sm font-black hover:bg-gray-100 dark:hover:bg-slate-800 transition-all">
                  CANCEL
                </button>
              </div>
            </div>
          )}

          {/* Pending Variances */}
          {variances.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/10 border-2 border-amber-200 dark:border-amber-900/20 rounded-3xl p-6 space-y-4 shadow-xl">
              <p className="text-sm font-black text-amber-800 dark:text-amber-400 flex items-center gap-2 uppercase tracking-widest">
                <AlertTriangle size={20} /> Attention: {variances.length} Pending Variances
              </p>
              <div className="space-y-3">
                {variances.map((v) => (
                  <div key={v.id} className="bg-white dark:bg-slate-900 border border-amber-100 dark:border-amber-900/20 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                    <div className="space-y-1">
                      <p className="text-sm font-black text-gray-900 dark:text-slate-200">
                        Diff: <span className={v.difference < 0 ? "text-red-600" : "text-green-600"}>{fmt(v.difference)}</span>
                      </p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">
                        Exp {fmt(v.expectedCash)} — Phys {fmt(v.physicalCash)}
                      </p>
                      {v.notes && <p className="text-xs text-gray-500 italic">"{v.notes}"</p>}
                    </div>
                    <button
                      onClick={() => handleApproveVariance(v)}
                      className="text-xs font-black bg-green-600 text-white px-5 py-2.5 rounded-xl hover:bg-green-700 shadow-lg shadow-green-500/20"
                    >
                      APPROVE
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* History Toggle (Compact) */}
      <div className="flex justify-center pt-4">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 text-xs font-black text-gray-400 dark:text-slate-500 hover:text-gray-900 dark:hover:text-slate-200 transition-colors uppercase tracking-widest"
        >
          <History size={14} /> {showHistory ? "Hide History" : "View Recent Closings"}
        </button>
      </div>

      {showHistory && (
        <div className="bg-white dark:bg-slate-900 border-2 border-gray-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4">
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {history.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-10 font-bold uppercase italic tracking-tighter">No historical data available</p>
            ) : history.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                onClick={() => setDate(new Date(c.date).toISOString().split("T")[0])}
              >
                <div>
                  <p className="text-sm font-black text-gray-900 dark:text-slate-200 uppercase tracking-tighter">{new Date(c.date).toLocaleDateString("en-IN", { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 font-bold">Closed at {fmt(c.reportedClosingCash)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`text-[10px] font-black px-2 py-0.5 rounded-full ${c.cashDifference === 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {c.cashDifference === 0 ? "BALANCED" : fmt(c.cashDifference)}
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shift Management Modal (Dark Polished) */}
      {showShiftModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 border-2 border-gray-100 dark:border-slate-800 rounded-[2.5rem] w-full max-w-sm shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in duration-300">
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-black text-xl text-gray-900 dark:text-white uppercase italic tracking-tighter">Shift Control</h3>
              <button onClick={() => setShowShiftModal(false)} className="bg-gray-100 dark:bg-slate-800 p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-slate-200">
                <X size={20} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              {summary?.shiftInfo?.shifts.some(s => s.status === 'OPEN') ? (
                <>
                  <div className="bg-purple-50 dark:bg-purple-900/10 p-5 rounded-3xl space-y-2 border-2 border-purple-100 dark:border-purple-900/20 shadow-inner">
                    <p className="text-[10px] font-black text-purple-700 dark:text-purple-400 uppercase tracking-widest">Active Shift Operator</p>
                    <p className="text-lg font-black text-gray-900 dark:text-white truncate">
                      {summary?.shiftInfo?.shifts?.find(s => s.status === 'OPEN')?.shiftName}
                    </p>
                    <p className="text-[10px] text-gray-400">Recording transactions to this operator's ID.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Report Physical Cash (₹)</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={physicalCash}
                      onChange={(e) => setPhysicalCash(e.target.value)}
                      className="w-full border-2 border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-2xl px-5 py-4 text-xl font-black focus:outline-none focus:border-purple-500 dark:text-slate-200 shadow-inner"
                    />
                  </div>
                  <button
                    onClick={handleCloseShift}
                    disabled={!physicalCash}
                    className="w-full bg-purple-600 text-white py-5 rounded-3xl font-black text-lg hover:bg-purple-700 transition-all shadow-xl shadow-purple-600/30 active:scale-95 disabled:opacity-50 uppercase tracking-tighter"
                  >
                    CLOSE SHIFT & SETTLE
                  </button>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Operator Name / PIN</label>
                    <input
                      type="text"
                      placeholder="Rahul / Counter-01"
                      value={shiftName}
                      onChange={(e) => setShiftName(e.target.value)}
                      className="w-full border-2 border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-2xl px-5 py-4 text-lg font-black focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200 shadow-inner"
                    />
                  </div>
                  <div className="bg-blue-50/50 dark:bg-slate-800/30 p-4 rounded-2xl border-2 border-blue-50 dark:border-slate-800/50">
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1 italic">Notice</p>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-relaxed font-bold">New shift inherits current shop cash position as Opening Balance.</p>
                  </div>
                  <button
                    onClick={handleOpenShift}
                    disabled={!shiftName}
                    className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/30 active:scale-95 disabled:opacity-50 uppercase tracking-tighter"
                  >
                    INITIATE SHIFT
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
