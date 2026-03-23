"use client";

import { useEffect, useState, useCallback } from "react";
import { Trophy, TrendingUp, Wrench, ShoppingBag, IndianRupee } from "lucide-react";
import { authenticatedFetch } from "@/services/auth.api";
import { listShops, type Shop } from "@/services/shops.api";

interface LeaderboardRow {
  staffId: string;
  staffName: string;
  revenueTarget: number;
  revenueActual: number;
  earnedTotal: number;
  invoiceCount: number;
  repairTarget?: number;
  salesTarget?: number;
  revenuePct: number;
}

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

const MEDAL = ["🥇","🥈","🥉"];

function MiniBar({ value }: { value: number }) {
  const color =
    value >= 100 ? "#10b981" :
    value >= 75  ? "#0ea5e9" :
    value >= 50  ? "#f59e0b" : "#94a3b8";
  return (
    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }} />
    </div>
  );
}

function fmt(paisa: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paisa / 100);
}

export default function LeaderboardTab() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year] = useState(new Date().getFullYear());
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listShops().then((s) => {
      setShops(s);
      if (s.length > 0) setSelectedShopId(s[0].id);
    });
  }, []);

  const load = useCallback(async () => {
    if (!selectedShopId) return;
    setLoading(true);
    try {
      const res = await authenticatedFetch(
        `/mobileshop/targets/leaderboard?shopId=${selectedShopId}&month=${month}&year=${year}`
      );
      if (res.ok) {
        const data = await res.json();
        setRows(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedShopId, month, year]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {shops.length > 1 && (
          <select className="border rounded-lg px-3 py-2 text-sm bg-background"
            value={selectedShopId} onChange={(e) => setSelectedShopId(e.target.value)}>
            {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        <select className="border rounded-lg px-3 py-2 text-sm bg-background"
          value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {MONTHS.map((m, i) => (
            <option key={i} value={i + 1}>{m} {year}</option>
          ))}
        </select>
        {loading && <span className="text-xs text-muted-foreground animate-pulse">Loading...</span>}
      </div>

      {!loading && rows.length === 0 ? (
        <div className="glass-card p-12 flex flex-col items-center gap-3 text-center">
          <Trophy className="w-10 h-10 text-muted-foreground/40" />
          <p className="font-semibold text-foreground">No targets set for {MONTHS[month - 1]}</p>
          <p className="text-sm text-muted-foreground">Set individual staff targets to see the leaderboard.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(loading ? Array(3).fill(null) : rows).map((row, idx) =>
            row === null ? (
              <div key={idx} className="glass-card p-5 animate-pulse">
                <div className="h-5 w-40 bg-muted rounded mb-3" />
                <div className="h-2 w-full bg-muted rounded-full" />
              </div>
            ) : (
              <div key={row.staffId} className="glass-card p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0
                      ${idx === 0 ? "bg-yellow-400/20 text-yellow-500" :
                        idx === 1 ? "bg-slate-300/20 text-slate-400" :
                        idx === 2 ? "bg-orange-400/20 text-orange-600" : "bg-muted text-muted-foreground"}`}>
                      {idx < 3 ? MEDAL[idx] : `#${idx + 1}`}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{row.staffName}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.invoiceCount} invoice{row.invoiceCount !== 1 ? "s" : ""} ·{" "}
                        {fmt(row.earnedTotal)} earned
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-black ${row.revenuePct >= 100 ? "text-emerald-500" : row.revenuePct >= 75 ? "text-sky-500" : "text-foreground"}`}>
                      {row.revenuePct}%
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {fmt(row.revenueActual)} / {fmt(row.revenueTarget)}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <MiniBar value={row.revenuePct} />
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {row.repairTarget ? (
                      <span className="flex items-center gap-1">
                        <Wrench className="w-3 h-3" /> –/{row.repairTarget} repairs
                      </span>
                    ) : null}
                    {row.salesTarget ? (
                      <span className="flex items-center gap-1">
                        <ShoppingBag className="w-3 h-3" /> –/{row.salesTarget} units
                      </span>
                    ) : null}
                    {row.revenuePct >= 100 && (
                      <span className="ml-auto text-emerald-500 font-semibold">🎉 Target Hit!</span>
                    )}
                    {row.revenuePct > 0 && row.revenuePct < 100 && (
                      <span className="ml-auto flex items-center gap-1">
                        <IndianRupee className="w-3 h-3" />
                        {fmt(row.revenueTarget - row.revenueActual)} to go
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
