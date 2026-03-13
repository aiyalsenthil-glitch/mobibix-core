"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Activity, AlertTriangle, TrendingDown, Package, Users,
  Truck, Loader2, RefreshCw, ChevronDown, ChevronUp,
  BarChart2, Calendar,
} from "lucide-react";
import { useShop } from "@/context/ShopContext";
import {
  getShrinkageIntelligence,
  getShrinkageMonthlyTrend,
  type ShrinkageIntelligence,
  type ShrinkageMonthlyTrend,
} from "@/services/operations.api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number) {
  if (Math.abs(v) >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (Math.abs(v) >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(v);
}

function fmtDate(d: Date) {
  return d.toISOString().split("T")[0];
}

const REASON_LABEL: Record<string, string> = {
  BREAKAGE:     "Breakage",
  DAMAGE:       "Damage",
  LOST:         "Lost",
  INTERNAL_USE: "Internal Use",
  CORRECTION:   "Correction",
  SPARE_DAMAGE: "Spare Damage",
};

const REASON_COLOR: Record<string, string> = {
  BREAKAGE:     "bg-red-500",
  DAMAGE:       "bg-orange-500",
  LOST:         "bg-purple-500",
  INTERNAL_USE: "bg-blue-500",
  CORRECTION:   "bg-gray-400",
  SPARE_DAMAGE: "bg-yellow-500",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4 space-y-2 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500 dark:text-slate-400 font-medium uppercase tracking-wide">{label}</p>
        <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
          <Icon size={15} className="text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-slate-500">{sub}</p>}
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }: {
  title: string; icon: React.ElementType; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-slate-800/50 text-sm font-semibold text-gray-700 dark:text-slate-200"
      >
        <span className="flex items-center gap-2">
          <Icon size={15} className="text-gray-500 dark:text-slate-400" />
          {title}
        </span>
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

/** Inline bar showing relative width */
function BarRow({
  label, value, max, sub, colorClass = "bg-red-400",
}: {
  label: string; value: number; max: number; sub?: string; colorClass?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-700 dark:text-slate-300 truncate max-w-[60%]">{label}</span>
        <span className="font-semibold text-gray-900 dark:text-slate-100">{fmt(value)}</span>
      </div>
      {sub && <p className="text-xs text-gray-400 dark:text-slate-500">{sub}</p>}
      <div className="h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${colorClass} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Monthly Trend Chart ───────────────────────────────────────────────────────

function TrendChart({ data }: { data: ShrinkageMonthlyTrend[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-6">No trend data available.</p>;
  }
  const maxVal = Math.max(...data.map((d) => d.lossValue), 1);
  return (
    <div className="space-y-1">
      <div className="flex items-end gap-1 h-32">
        {data.map((d) => {
          const h = Math.max(4, Math.round((d.lossValue / maxVal) * 100));
          const [yr, mo] = d.month.split("-");
          const label = new Date(Number(yr), Number(mo) - 1).toLocaleString("en-IN", { month: "short" });
          return (
            <div
              key={d.month}
              className="flex-1 flex flex-col items-center gap-1 group relative"
              title={`${d.month}: ${fmt(d.lossValue)}`}
            >
              <div
                className="w-full bg-red-400 dark:bg-red-500/50 rounded-t-sm transition-all group-hover:bg-red-500 dark:group-hover:bg-red-400"
                style={{ height: `${h}%` }}
              />
              <span className="text-[10px] text-gray-400 dark:text-slate-500">{label}</span>
              {/* Tooltip */}
              <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap shadow-lg z-10">
                {fmt(d.lossValue)} · {d.lossQty} units
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ShrinkagePage() {
  const { selectedShop } = useShop();
  const shopId = selectedShop?.id ?? "";

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 2);
    return fmtDate(d);
  });
  const [endDate, setEndDate] = useState(() => fmtDate(new Date()));

  const [intel, setIntel] = useState<ShrinkageIntelligence | null>(null);
  const [trend, setTrend] = useState<ShrinkageMonthlyTrend[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    setError("");
    try {
      const [i, t] = await Promise.allSettled([
        getShrinkageIntelligence(shopId, startDate, endDate),
        getShrinkageMonthlyTrend(shopId, 12),
      ]);
      if (i.status === "fulfilled") setIntel(i.value);
      else setError((i as any).reason?.message ?? "Failed to load report");
      if (t.status === "fulfilled") setTrend(t.value);
    } finally {
      setLoading(false);
    }
  }, [shopId, startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  if (!shopId) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-slate-400">
        Select a shop to view Shrinkage Intelligence.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity size={20} className="text-red-500" />
            Shrinkage Intelligence
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Stock loss analysis for {selectedShop?.name}
          </p>
        </div>
        <button onClick={load} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400 transition-colors">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Date Range */}
      <div className="flex items-center gap-3 flex-wrap">
        <Calendar size={16} className="text-gray-400 dark:text-slate-500" />
        <input
          type="date"
          value={startDate}
          max={endDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
        />
        <span className="text-gray-400 dark:text-slate-500 text-sm">to</span>
        <input
          type="date"
          value={endDate}
          min={startDate}
          max={fmtDate(new Date())}
          onChange={(e) => setEndDate(e.target.value)}
          className="border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
        />
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg p-3 text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-red-400" />
        </div>
      ) : intel ? (
        <>
          {/* KPI Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              label="Total Loss Value"
              value={fmt(intel.totalLostValue)}
              sub={`${intel.totalLostUnits} units lost`}
              icon={TrendingDown}
              color="bg-red-500"
            />
            <KpiCard
              label="Worst Category"
              value={intel.topLossCategory ?? "—"}
              sub={intel.byCategory[0] ? fmt(intel.byCategory[0].lostValue) : ""}
              icon={Package}
              color="bg-orange-500"
            />
            <KpiCard
              label="Top Loss Staff"
              value={intel.topLossStaff ?? "—"}
              sub={intel.byStaff[0] ? `${intel.byStaff[0].sessions} sessions` : ""}
              icon={Users}
              color="bg-purple-500"
            />
            <KpiCard
              label="Top Supplier"
              value={intel.topLossSupplier ?? "—"}
              sub={intel.bySupplier[0] ? fmt(intel.bySupplier[0].lostValue) : ""}
              icon={Truck}
              color="bg-blue-500"
            />
          </div>

          {/* Monthly Trend */}
          <SectionCard title="Monthly Loss Trend (Last 12 Months)" icon={BarChart2}>
            <TrendChart data={trend} />
          </SectionCard>

          {/* By Reason */}
          <SectionCard title="Loss by Reason" icon={Activity}>
            {intel.byReason.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">No losses recorded in this period.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {intel.byReason.map((r) => (
                  <div key={r.reason} className="border border-gray-100 dark:border-slate-800 rounded-lg p-3 space-y-1 bg-white dark:bg-slate-900 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${REASON_COLOR[r.reason] ?? "bg-gray-400"}`} />
                      <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                        {REASON_LABEL[r.reason] ?? r.reason}
                      </span>
                    </div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{fmt(r.lostValue)}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500">{r.lostUnits} units · {r.count} items</p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* By Category */}
          <SectionCard title="Loss by Product Category" icon={Package}>
            {intel.byCategory.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">No data.</p>
            ) : (
              <div className="space-y-3">
                {intel.byCategory.map((c, i) => (
                  <BarRow
                    key={c.category}
                    label={c.category}
                    value={c.lostValue}
                    max={intel.byCategory[0].lostValue}
                    sub={`${c.lostUnits} units · ${c.affectedProducts} products`}
                    colorClass={i === 0 ? "bg-red-500" : "bg-red-300"}
                  />
                ))}
              </div>
            )}
          </SectionCard>

          {/* Top Loss Products */}
          <SectionCard title="Top 10 Loss Products" icon={TrendingDown}>
            {intel.topProducts.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">No data.</p>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-slate-800">
                {intel.topProducts.map((p, i) => (
                  <div key={p.productId} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${i < 3 ? "bg-red-500" : "bg-gray-300"}`}>
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-slate-200">{p.productName}</p>
                        <p className="text-xs text-gray-400 dark:text-slate-500">{p.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-red-600 dark:text-red-400">{fmt(p.lossValue)}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">{p.lossQty} units</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* By Staff */}
          <SectionCard title="Loss by Staff Member" icon={Users}>
            {intel.byStaff.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">No data.</p>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-slate-800">
                {intel.byStaff.map((s) => (
                  <div key={s.staffId} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-semibold text-sm">
                        {s.staffName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-slate-200">{s.staffName}</p>
                        <p className="text-xs text-gray-400 dark:text-slate-500">{s.sessions} session{s.sessions !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">{fmt(s.lostValue)}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">{s.lostUnits} units</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* By Supplier */}
          {intel.bySupplier.length > 0 && (
            <SectionCard title="Loss by Supplier (Damage / Breakage)" icon={Truck}>
              <div className="space-y-3">
                {intel.bySupplier.map((s, i) => (
                  <BarRow
                    key={s.supplierId}
                    label={s.supplierName}
                    value={s.lostValue}
                    max={intel.bySupplier[0].lostValue}
                    sub={`${s.lostUnits} units · ${s.affectedProducts} products`}
                    colorClass={i === 0 ? "bg-blue-500" : "bg-blue-300"}
                  />
                ))}
              </div>
            </SectionCard>
          )}
        </>
      ) : (
        <div className="text-center py-16 text-gray-400 dark:text-slate-500">
          <Activity size={32} className="mx-auto mb-3 text-gray-300 dark:text-slate-700" />
          <p className="text-sm">No stock verification data for this period.</p>
          <p className="text-xs mt-1">Confirm a stock verification session to see shrinkage analytics.</p>
        </div>
      )}
    </div>
  );
}
