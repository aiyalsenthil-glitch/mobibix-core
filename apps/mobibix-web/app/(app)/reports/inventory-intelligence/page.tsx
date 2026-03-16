"use client";

import { useState, useEffect, useCallback } from "react";
import { useShop } from "@/context/ShopContext";
import {
  getInventoryIntelligence,
  type InventoryIntelligence,
} from "@/services/inventory-intelligence.api";
import {
  BarChart2, PackageX, Loader2, AlertTriangle, RefreshCw,
  TrendingDown, Layers, ClipboardCheck, Lightbulb, ChevronRight, TrendingUp,
} from "lucide-react";
import Link from "next/link";
import {
  getDemandForecast,
  type DemandForecastItem,
} from "@/services/demand-forecast.api";

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmt(rupees: number) {
  if (Math.abs(rupees) >= 100000) return `₹${(rupees / 100000).toFixed(1)}L`;
  if (Math.abs(rupees) >= 1000)   return `₹${(rupees / 1000).toFixed(1)}K`;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(rupees);
}

function monthLabel(yyyymm: string) {
  const [y, m] = yyyymm.split("-");
  return new Date(Number(y), Number(m) - 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

const REASON_META: Record<string, { label: string; color: string }> = {
  BREAKAGE:     { label: "Breakage",        color: "bg-red-500" },
  DAMAGE:       { label: "Damage",          color: "bg-orange-500" },
  LOST:         { label: "Lost / Missing",  color: "bg-purple-500" },
  INTERNAL_USE: { label: "Internal Use",    color: "bg-blue-500" },
  SPARE_DAMAGE: { label: "Spare Damage",    color: "bg-yellow-500" },
  CORRECTION:   { label: "Data Correction", color: "bg-gray-400" },
};

// ── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
      <p className="text-[11px] text-gray-400 dark:text-slate-500 uppercase tracking-widest font-bold mb-1">{label}</p>
      <p className={`text-2xl font-black ${accent ?? "text-gray-900 dark:text-white"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
        <Icon size={15} className="text-gray-500 dark:text-slate-400" />
        <p className="text-xs font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wider">{title}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// Bar chart — uses px heights so % doesn't break inside flex children
const BAR_MAX_PX = 100;
function BarChart({ data }: { data: { month: string; lossValueRupees: number }[] }) {
  const max = Math.max(...data.map((d) => d.lossValueRupees), 1);
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-end gap-1 w-full" style={{ height: `${BAR_MAX_PX + 28}px` }}>
        {data.map((d) => {
          const barPx = Math.max(Math.round((d.lossValueRupees / max) * BAR_MAX_PX), d.lossValueRupees > 0 ? 4 : 1);
          return (
            <div key={d.month} className="flex-1 flex flex-col items-center group relative" style={{ height: '100%', justifyContent: 'flex-end' }}>
              {/* Tooltip */}
              {d.lossValueRupees > 0 && (
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {monthLabel(d.month)}: {fmt(d.lossValueRupees)}
                </div>
              )}
              <div
                className={`w-full rounded-t transition-colors cursor-default ${d.lossValueRupees > 0 ? "bg-rose-400 dark:bg-rose-500 group-hover:bg-rose-500 dark:group-hover:bg-rose-400" : "bg-gray-100 dark:bg-slate-800"}`}
                style={{ height: `${barPx}px` }}
              />
              <span className="text-[9px] text-gray-400 dark:text-slate-500 mt-1 whitespace-nowrap">
                {monthLabel(d.month)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function InventoryIntelligencePage() {
  const { selectedShop } = useShop();
  const shopId = selectedShop?.id ?? "";

  const today = new Date().toISOString().split("T")[0];
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(ninetyDaysAgo);
  const [endDate, setEndDate]     = useState(today);
  const [data, setData]           = useState<InventoryIntelligence | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [forecast, setForecast]   = useState<DemandForecastItem[]>([]);
  const [forecastLoading, setForecastLoading] = useState(false);

  const load = useCallback(async () => {
    if (!shopId) return;
    setLoading(true); setError("");
    try {
      const res = await getInventoryIntelligence(shopId, startDate, endDate);
      setData(res);
    } catch (e: any) {
      setError(e.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [shopId, startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!shopId) return;
    setForecastLoading(true);
    getDemandForecast(shopId)
      .then(setForecast)
      .catch(() => {})
      .finally(() => setForecastLoading(false));
  }, [shopId]);

  if (!shopId) return (
    <div className="p-8 text-center text-gray-500 dark:text-slate-400">Select a shop first.</div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-100 dark:bg-rose-900/30 rounded-xl">
            <BarChart2 size={22} className="text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Inventory Intelligence</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">Loss patterns from confirmed stock verifications</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={startDate} max={endDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-3 py-1.5 text-sm dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
          <span className="text-gray-400 text-sm">—</span>
          <input type="date" value={endDate} min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-3 py-1.5 text-sm dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
          <button onClick={load} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400 transition-colors">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg p-3 text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-rose-500" size={32} />
        </div>
      ) : !data ? null : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard
              label="Total Loss Value"
              value={fmt(data.overview.totalLossValueRupees)}
              sub={`${data.overview.totalLossQty} units`}
              accent="text-rose-600 dark:text-rose-400"
            />
            <KpiCard
              label="Sessions Analyzed"
              value={String(data.overview.sessionsAnalyzed)}
              sub="confirmed verifications"
            />
            <KpiCard
              label="Worst Category"
              value={data.byCategory[0]?.category ?? "—"}
              sub={data.byCategory[0] ? fmt(data.byCategory[0].lossValueRupees) : undefined}
              accent="text-orange-600 dark:text-orange-400"
            />
            <KpiCard
              label="Top Loss Reason"
              value={REASON_META[data.overview.topLossReason ?? ""]?.label ?? data.overview.topLossReason ?? "—"}
              sub="most frequent"
            />
          </div>

          {/* Insights */}
          {data.insights.length > 0 && (
            <SectionCard title="AI Insights" icon={Lightbulb}>
              <ul className="space-y-2">
                {data.insights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-slate-300">
                    <Lightbulb size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    {insight}
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {/* Monthly Trend */}
          <SectionCard title="Monthly Loss Trend (Last 12 Months)" icon={TrendingDown}>
            {data.monthlyTrend.every((m) => m.lossValueRupees === 0) ? (
              <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-6">No loss data for this period.</p>
            ) : (
              <BarChart data={data.monthlyTrend} />
            )}
          </SectionCard>

          {/* Reason Breakdown */}
          <SectionCard title="Loss by Reason" icon={PackageX}>
            {data.byReason.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">No data.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.byReason.map((r) => {
                  const meta = REASON_META[r.reason] ?? { label: r.reason, color: "bg-gray-400" };
                  return (
                    <div key={r.reason} className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3 border border-gray-100 dark:border-slate-800">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 rounded-full ${meta.color} flex-shrink-0`} />
                        <p className="text-xs font-semibold text-gray-700 dark:text-slate-300">{meta.label}</p>
                        <span className="ml-auto text-[10px] font-bold text-gray-400 dark:text-slate-500">{r.percentOfTotal}%</span>
                      </div>
                      <p className={`text-lg font-black ${r.lossValueRupees > 0 ? "text-rose-600 dark:text-rose-400" : "text-gray-900 dark:text-white"}`}>{fmt(r.lossValueRupees)}</p>
                      <p className="text-[11px] text-gray-400 dark:text-slate-500">{r.lossQty} units · {r.count} incidents</p>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {/* Loss by Category */}
          <SectionCard title="Loss by Product Category" icon={Layers}>
            {data.byCategory.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">No data.</p>
            ) : (
              <div className="space-y-3">
                {data.byCategory.map((c) => (
                  <div key={c.category}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-800 dark:text-slate-200">{c.category}</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400">{fmt(c.lossValueRupees)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-400 dark:bg-rose-500 rounded-full" style={{ width: `${c.percentOfTotal}%` }} />
                    </div>
                    <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">{c.lossQty} units · {c.affectedProducts} products</p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Top Loss Products */}
          <SectionCard title="Top 10 Loss Products" icon={ClipboardCheck}>
            {data.topProducts.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">No data.</p>
            ) : (
              <div className="space-y-2">
                {data.topProducts.map((p, idx) => (
                  <div key={p.productId} className="flex items-center gap-3 py-2 border-b border-gray-50 dark:border-slate-800 last:border-0">
                    <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-slate-200 truncate">{p.productName}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">{p.category} · {p.lossQty} units</p>
                    </div>
                    <p className="text-sm font-black text-rose-600 dark:text-rose-400 flex-shrink-0">{fmt(p.lossValueRupees)}</p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Demand Forecast */}
          <SectionCard title="Demand Forecast — Reorder Planning (90-day)" icon={TrendingUp}>
            {forecastLoading ? (
              <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-gray-400" /></div>
            ) : forecast.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">No sales data in last 90 days.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b dark:border-slate-700 text-left text-xs text-gray-400 dark:text-slate-500">
                      <th className="pb-2 pr-3">Product</th>
                      <th className="pb-2 pr-3 text-right">Stock</th>
                      <th className="pb-2 pr-3 text-right">Avg/day</th>
                      <th className="pb-2 pr-3 text-right">Days Left</th>
                      <th className="pb-2 pr-3 text-right">Reorder Qty</th>
                      <th className="pb-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecast.slice(0, 20).map((item) => (
                      <tr key={item.shopProductId} className="border-b dark:border-slate-800">
                        <td className="py-2 pr-3">
                          <p className="font-medium text-gray-800 dark:text-slate-200 truncate max-w-[180px]">{item.name}</p>
                          {item.category && <p className="text-xs text-gray-400">{item.category}</p>}
                        </td>
                        <td className="py-2 pr-3 text-right text-gray-600 dark:text-slate-400">{item.currentStock}</td>
                        <td className="py-2 pr-3 text-right text-gray-600 dark:text-slate-400">{item.avgDailyDemand}</td>
                        <td className="py-2 pr-3 text-right font-medium">
                          {item.daysOfStock >= 9999 ? "∞" : item.daysOfStock}
                        </td>
                        <td className="py-2 pr-3 text-right text-blue-700 dark:text-blue-400 font-medium">{item.suggestedReorder}</td>
                        <td className="py-2 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            item.urgency === "CRITICAL"
                              ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                              : item.urgency === "LOW"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                              : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                          }`}>
                            {item.urgency === "CRITICAL" ? "Critical" : item.urgency === "LOW" ? "Low Stock" : "OK"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {forecast.length > 20 && (
                  <p className="text-xs text-gray-400 mt-2 text-center">{forecast.length - 20} more products...</p>
                )}
              </div>
            )}
          </SectionCard>

          {/* Quick links */}
          <div className="grid grid-cols-2 gap-3">
            <Link href="/tools/stock-verification" className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl hover:border-rose-300 dark:hover:border-rose-800 transition-colors group shadow-sm">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-200">Stock Verification</p>
                <p className="text-xs text-gray-400 dark:text-slate-500">Run a physical count</p>
              </div>
              <ChevronRight size={16} className="text-gray-400 group-hover:text-rose-500 transition-colors" />
            </Link>
            <Link href="/tools/shrinkage" className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl hover:border-rose-300 dark:hover:border-rose-800 transition-colors group shadow-sm">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-200">Shrinkage Intelligence</p>
                <p className="text-xs text-gray-400 dark:text-slate-500">Staff & supplier breakdown</p>
              </div>
              <ChevronRight size={16} className="text-gray-400 group-hover:text-rose-500 transition-colors" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
