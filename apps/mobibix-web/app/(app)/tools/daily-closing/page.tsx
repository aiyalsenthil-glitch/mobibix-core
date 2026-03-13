"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Calendar, Lock, Unlock, AlertTriangle, CheckCircle2,
  TrendingUp, TrendingDown, Banknote, Wallet, Loader2,
  RefreshCw, ChevronDown, ChevronUp, History
} from "lucide-react";
import { useShop } from "@/context/ShopContext";
import {
  getDailySummary, closeDay, reopenDay, getDailyClosings,
  getCashVariances, approveCashVariance,
  type DailySummary, type DailyClosing, type CashVariance,
} from "@/services/operations.api";

const today = () => new Date().toISOString().split("T")[0];

function fmt(v: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    OPEN: "bg-gray-100 text-gray-600",
    DRAFT: "bg-yellow-100 text-yellow-700",
    CONFIRMED: "bg-green-100 text-green-700",
    REOPENED: "bg-orange-100 text-orange-700",
    PENDING: "bg-yellow-100 text-yellow-700",
    APPROVED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[status] ?? "bg-gray-100 text-gray-600"}`}>
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
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const load = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    setError("");
    try {
      const [sr, hr, vr] = await Promise.allSettled([
        getDailySummary(shopId, date),
        getDailyClosings(shopId, {
          startDate: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0],
          endDate: today(),
        }),
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
      await closeDay({ shopId, date, physicalCashCounted: parseFloat(physicalCash), notes });
      setSuccess("Day closed successfully!");
      setPhysicalCash(""); setNotes("");
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setClosing(false);
    }
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

  const isConfirmed = summary?.status === "CONFIRMED";
  const isReopened  = summary?.status === "REOPENED";
  const canClose    = summary?.status === "OPEN" || isReopened;
  const isFuture    = date > today();

  if (!shopId) {
    return (
      <div className="p-8 text-center text-gray-500">
        Select a shop to use Daily Closing.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Daily Account Closing</h1>
          <p className="text-sm text-gray-500">Seal the day's cash position for {selectedShop?.name}</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Date Picker */}
      <div className="flex items-center gap-3">
        <Calendar size={18} className="text-gray-400" />
        <input
          type="date"
          value={date}
          max={today()}
          onChange={(e) => setDate(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {summary && <StatusBadge status={summary.status} />}
      </div>

      {isFuture && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
          Cannot close a future date.
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-center gap-2">
          <CheckCircle2 size={16} /> {success}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-blue-500" size={28} />
        </div>
      ) : summary ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-xs text-blue-500 font-medium mb-1">Opening Balance</p>
              <p className="text-2xl font-bold text-blue-700">{fmt(summary.openingBalance)}</p>
            </div>
            <div className="bg-green-50 border border-green-100 rounded-xl p-4">
              <p className="text-xs text-green-500 font-medium mb-1">Expected Closing</p>
              <p className="text-2xl font-bold text-green-700">{fmt(summary.expectedClosingBalance)}</p>
            </div>
          </div>

          {/* IN breakdown */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-green-600 font-medium text-sm">
              <TrendingUp size={16} /> Cash IN — {fmt(summary.totalIn)}
            </div>
            {[
              { label: "Sales — Cash",  value: summary.salesCash },
              { label: "Sales — UPI",   value: summary.salesUpi },
              { label: "Sales — Card",  value: summary.salesCard },
              { label: "Sales — Bank",  value: summary.salesBank },
              { label: "Other Income",  value: summary.otherIncome },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium">{fmt(value)}</span>
              </div>
            ))}
          </div>

          {/* OUT breakdown */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-red-600 font-medium text-sm">
              <TrendingDown size={16} /> Cash OUT — {fmt(summary.totalOut)}
            </div>
            {[
              { label: "Expenses",           value: summary.expensesCash },
              { label: "Purchase Payments",  value: summary.purchasePayments },
              { label: "Salary",             value: summary.salaryPayments },
              { label: "Refunds",            value: summary.refunds },
              { label: "Other Deductions",   value: summary.otherDeductions },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium">{fmt(value)}</span>
              </div>
            ))}
          </div>

          {/* Close / Reopen */}
          {canClose && !isFuture && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
              <p className="text-sm font-medium text-gray-700">Physical Cash Count</p>
              <div className="flex items-center gap-2">
                <Banknote size={18} className="text-gray-400" />
                <input
                  type="number"
                  placeholder="Enter actual cash in drawer (₹)"
                  value={physicalCash}
                  onChange={(e) => setPhysicalCash(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {physicalCash && (
                <div className={`text-sm font-medium flex items-center gap-1 ${
                  parseFloat(physicalCash) < summary.expectedClosingBalance
                    ? "text-red-600" : "text-green-600"
                }`}>
                  <Wallet size={14} />
                  Variance: {fmt(parseFloat(physicalCash) - summary.expectedClosingBalance)}
                </div>
              )}
              <textarea
                placeholder="Notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <button
                onClick={handleClose}
                disabled={closing || !physicalCash}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {closing ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                Confirm Close
              </button>
            </div>
          )}

          {isConfirmed && (
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <CheckCircle2 size={24} className="text-green-500 mx-auto mb-1" />
                <p className="text-sm font-medium text-green-700">Day is closed.</p>
                <p className="text-xs text-green-500 mt-1">
                  Closing balance {fmt(summary.expectedClosingBalance)} carries to tomorrow.
                </p>
              </div>
              <button
                onClick={() => setShowReopen(true)}
                className="w-full border border-orange-200 text-orange-600 py-2.5 rounded-lg text-sm font-medium hover:bg-orange-50 flex items-center justify-center gap-2"
              >
                <Unlock size={16} /> Reopen Day
              </button>
            </div>
          )}

          {showReopen && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-orange-700">Why are you reopening?</p>
              <select
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                className="w-full border border-orange-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none"
              >
                <option value="">Select reason</option>
                <option value="missed expense">Missed expense entry</option>
                <option value="wrong cash count">Wrong cash count</option>
                <option value="staff mistake">Staff mistake</option>
                <option value="missing transaction">Missing transaction</option>
                <option value="other">Other</option>
              </select>
              {reopenReason === "other" && (
                <input
                  type="text"
                  placeholder="Describe reason…"
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  className="w-full border border-orange-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none"
                />
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleReopen}
                  disabled={closing || !reopenReason}
                  className="flex-1 bg-orange-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
                >
                  {closing ? <Loader2 size={14} className="animate-spin mx-auto" /> : "Reopen"}
                </button>
                <button onClick={() => setShowReopen(false)} className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Pending Variances */}
          {variances.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-yellow-800 flex items-center gap-2">
                <AlertTriangle size={16} /> {variances.length} Pending Cash Variance(s)
              </p>
              {variances.map((v) => (
                <div key={v.id} className="bg-white border border-yellow-100 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      Difference: <span className={v.difference < 0 ? "text-red-600" : "text-green-600"}>{fmt(v.difference)}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      Expected {fmt(v.expectedCash)} — Physical {fmt(v.physicalCash)}
                    </p>
                    <p className="text-xs text-gray-400">Date: {v.dailyClosing?.date ? new Date(v.dailyClosing.date).toLocaleDateString("en-IN") : "—"}</p>
                  </div>
                  <button
                    onClick={() => handleApproveVariance(v)}
                    className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700"
                  >
                    Approve
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}

      {/* Closing History */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 text-sm font-medium text-gray-700"
        >
          <span className="flex items-center gap-2"><History size={16} /> Last 30 Days</span>
          {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showHistory && (
          <div className="divide-y divide-gray-100">
            {history.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No closings yet.</p>
            ) : history.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer"
                onClick={() => setDate(new Date(c.date).toISOString().split("T")[0])}
              >
                <div>
                  <p className="text-sm font-medium">{new Date(c.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</p>
                  <p className="text-xs text-gray-400">Closing: {fmt(c.expectedClosingBalance)}</p>
                </div>
                <StatusBadge status={c.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
