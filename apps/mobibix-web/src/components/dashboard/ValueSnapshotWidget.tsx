"use client";
import React from "react";
import { TrendingUp, TrendingDown, DollarSign, CheckCircle, Zap, MessageSquare, Clock } from "lucide-react";
import { CurrencyText } from "@/components/ui/currency-text";

interface ValueSnapshotWidgetProps {
  data: {
    monthRevenue: number;
    lastMonthRevenue: number;
    invoiceCount: number;
    collectionRate: number;
    whatsappStats: {
      sent: number;
      delivered: number;
      recoveredAmount: number;
    };
    repairTurnaroundDays: string;
  };
  isLoading?: boolean;
}

export function ValueSnapshotWidget({ data, isLoading }: ValueSnapshotWidgetProps) {
  if (isLoading) {
    return (
      <div className="w-full h-32 bg-muted/20 animate-pulse rounded-2xl border border-border/50" />
    );
  }

  const revenueChange = data.monthRevenue - data.lastMonthRevenue;
  const isRevenueUp = revenueChange >= 0;
  const revenuePercent = data.lastMonthRevenue > 0 
    ? Math.round((revenueChange / data.lastMonthRevenue) * 100) 
    : 0;

  return (
    <div className="human-card p-10 relative overflow-hidden group bg-white dark:bg-zinc-900/50">
      {/* Subtle Architectural Gradient */}
      <div className="absolute top-0 right-0 w-1/4 h-full bg-linear-to-l from-zinc-50 dark:from-white/5 to-transparent pointer-events-none" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 relative z-10">
        <div className="space-y-1">
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400/80 flex items-center gap-3">
            Business Integrity Snapshot
          </h2>
          <p className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 italic">Real-time Performance Intelligence</p>
        </div>
        <div className="flex items-center gap-3">
           <span className="text-[9px] font-bold uppercase tracking-[0.2em] px-4 py-2 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full bg-emerald-50/50 dark:bg-emerald-500/5">Active ROI Tracker</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Revenue Impact */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
            <DollarSign className="w-3.5 h-3.5" />
            <span>Monthly Revenue</span>
          </div>
          <div className="text-2xl font-bold flex items-baseline gap-2">
            <CurrencyText amount={data.monthRevenue} isPaise={false} />
            {data.lastMonthRevenue > 0 && (
              <span className={`text-xs flex items-center ${isRevenueUp ? 'text-emerald-600' : 'text-red-500'}`}>
                {isRevenueUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(revenuePercent)}%
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            vs last mo (<CurrencyText amount={data.lastMonthRevenue} isPaise={false} />)
          </p>
        </div>

        {/* Collection Efficiency */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Collection Rate</span>
          </div>
          <div className="text-2xl font-bold">{data.collectionRate}%</div>
          <p className="text-[10px] text-muted-foreground font-medium">ROI on automated followups</p>
        </div>

        {/* Automation Savings */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp Impact</span>
          </div>
          <div className="text-2xl font-bold">{data.whatsappStats.sent < 10 && data.whatsappStats.sent > 0 ? `0${data.whatsappStats.sent}` : data.whatsappStats.sent}</div>
          <p className="text-[10px] text-emerald-600 font-bold">
            <CurrencyText amount={data.whatsappStats.recoveredAmount} isPaise={false} /> recovered
          </p>
        </div>

        {/* Repair Efficiency */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
            <Clock className="w-3.5 h-3.5" />
            <span>Avg Turnaround</span>
          </div>
          <div className="text-2xl font-bold">{data.repairTurnaroundDays} <span className="text-sm font-normal text-muted-foreground">days</span></div>
          <p className="text-[10px] text-muted-foreground">Repairs completed avg time</p>
        </div>
      </div>
    </div>
  );
}
