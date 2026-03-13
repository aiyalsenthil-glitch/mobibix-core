"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp, TrendingDown, BarChart2, Loader2, AlertTriangle,
  RefreshCw, ChevronLeft, ChevronRight, Package, Wrench,
  IndianRupee, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { useShop } from "@/context/ShopContext";
import { getMonthlySummary, getMonthlyProfit, type MonthlyReport, type MonthlyProfit } from "@/services/operations.api";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function fmt(paisa: number) {
  const v = paisa / 100;
  if (Math.abs(v) >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (Math.abs(v) >= 1000)   return `₹${(v / 1000).toFixed(1)}K`;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);
}

function KpiCard({
  label, value, sub, color, icon: Icon, positive,
}: {
  label: string; value: string; sub?: string; color: string;
  icon: React.ElementType; positive?: boolean;
}) {
  return (
    <div className={`bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 space-y-2 shadow-sm`}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500 dark:text-slate-400 font-medium uppercase tracking-wide">{label}</p>
        <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
          <Icon size={16} className="text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-slate-500">{sub}</p>}
      {positive !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-medium ${positive ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
          {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {positive ? "Profitable" : "Loss"}
        </div>
      )}
    </div>
  );
}

function RowItem({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-slate-800/50 last:border-0">
      <span className={`text-sm ${muted ? "text-gray-400 dark:text-slate-500" : "text-gray-600 dark:text-slate-300"}`}>{label}</span>
      <span className={`text-sm font-medium ${muted ? "text-gray-400 dark:text-slate-500" : "text-gray-800 dark:text-slate-200"}`}>{fmt(value)}</span>
    </div>
  );
}

export default function MonthlyReportPage() {
  const { selectedShop } = useShop();
  const shopId = selectedShop?.id ?? "";

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [profitData, setProfitData] = useState<MonthlyProfit | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!shopId) return;
    setLoading(true); setError("");
    try {
      const [r, p] = await Promise.all([
        getMonthlySummary(shopId, month, year),
        getMonthlyProfit(shopId, month, year),
      ]);
      setReport(r);
      setProfitData(p);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [shopId, month, year]);

  useEffect(() => { load(); }, [load]);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    const futureMonth = month === 12 ? 1 : month + 1;
    const futureYear  = month === 12 ? year + 1 : year;
    if (futureYear > now.getFullYear() || (futureYear === now.getFullYear() && futureMonth > now.getMonth() + 1)) return;
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const isFutureMonth =
    year > now.getFullYear() ||
    (year === now.getFullYear() && month > now.getMonth() + 1);

  if (!shopId) return <div className="p-8 text-center text-gray-500 dark:text-slate-400">Select a shop first.</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Monthly Report</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">Profit &amp; Loss summary for {selectedShop?.name}</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400 transition-colors">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Month Picker */}
      <div className="flex items-center gap-4 justify-center">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
          <ChevronLeft size={18} className="text-gray-600 dark:text-slate-300" />
        </button>
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900 dark:text-white">{MONTHS[month - 1]}</p>
          <p className="text-sm text-gray-400 dark:text-slate-500">{year}</p>
        </div>
        <button onClick={nextMonth} disabled={isFutureMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors">
          <ChevronRight size={18} className="text-gray-600 dark:text-slate-300" />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg p-3 text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-blue-500" size={28} />
        </div>
      ) : report ? (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-2 gap-3">
            <KpiCard
              label="Revenue"
              value={fmt(report.profitSummary.grossRevenue)}
              sub={`${report.sales.totalInvoices} invoices`}
              color="bg-blue-500"
              icon={TrendingUp}
            />
            <KpiCard
              label="Net Profit"
              value={fmt(report.profitSummary.netProfit)}
              sub={`${report.profitSummary.profitMarginPct}% margin`}
              color={report.profitSummary.netProfit >= 0 ? "bg-green-500" : "bg-red-500"}
              icon={IndianRupee}
              positive={report.profitSummary.netProfit >= 0}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <KpiCard
              label="Purchases"
              value={fmt(report.purchases.totalAmount)}
              sub={`${report.purchases.totalPurchases} bills`}
              color="bg-orange-400"
              icon={Package}
            />
            <KpiCard
              label="Expenses"
              value={fmt(report.expenses.totalAmount)}
              sub={`${report.expenses.totalVouchers} vouchers`}
              color="bg-purple-500"
              icon={BarChart2}
            />
            <KpiCard
              label="Job Cards"
              value={String(report.jobCards.completed)}
              sub="delivered"
              color="bg-teal-500"
              icon={Wrench}
            />
          </div>

          {/* P&L Table (New Logic) */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4 shadow-sm backdrop-blur-sm bg-white/80 dark:bg-slate-900/80">
            <p className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-3 flex items-center gap-2">
              <BarChart2 size={16} className="text-blue-500" /> Operational P&amp;L
            </p>

            <p className="text-xs font-semibold uppercase text-green-600 dark:text-green-400 tracking-wide mb-1">Income</p>
            <RowItem label="Total Sales Revenue" value={profitData?.totalSales ?? 0} />
            
            <div className="mt-3 mb-1">
              <p className="text-xs font-semibold uppercase text-red-500 dark:text-red-400 tracking-wide">Expenditure & Adjustments</p>
            </div>
            <RowItem label="Cost of Goods Sold (COGS)" value={-(profitData?.totalCogs ?? 0)} />
            <RowItem label="Operational Expenses"      value={-(profitData?.totalExpenses ?? 0)} />
            <RowItem label="Sales Refunds"             value={-(profitData?.totalRefunds ?? 0)} />
            <RowItem label="Inventory Loss (Shrinkage)" value={-(profitData?.totalInvLoss ?? 0)} muted />

            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-slate-800 flex justify-between items-center">
              <span className="text-base font-bold text-gray-900 dark:text-white">Net Operational Profit</span>
              <span className={`text-xl font-bold ${profitData && profitData.netProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {fmt(profitData?.netProfit ?? 0)}
              </span>
            </div>
          </div>

          {/* Totals breakdown */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4 space-y-1 shadow-sm">
            <p className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2">Cost Breakdown</p>
            {[
              { label: "Total Costs",        value: report.profitSummary.totalCosts },
              { label: "Purchase Cost",      value: report.purchases.totalAmount },
              { label: "Operating Expenses", value: report.expenses.totalAmount },
              { label: "Salary Payments",    value: report.salary.totalAmount },
              { label: "Refunds / Returns",  value: report.refunds.totalAmount },
              { label: "Inventory Loss",     value: report.inventoryLoss },
            ].map(({ label, value }) => (
              <RowItem key={label} label={label} value={value} />
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-gray-400 dark:text-slate-500 text-sm">No data for this period.</div>
      )}
    </div>
  );
}
