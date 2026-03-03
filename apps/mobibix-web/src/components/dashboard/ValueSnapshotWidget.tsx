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
    <div className="col-span-full glass-card p-6 bg-gradient-to-br from-emerald-500/5 to-blue-500/5 border-emerald-500/20">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-500" />
          Business Performance This Month
        </h2>
        <div className="flex items-center gap-2">
           <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded">ROI Tracker</span>
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
            <CurrencyText amount={data.monthRevenue} />
            {data.lastMonthRevenue > 0 && (
              <span className={`text-xs flex items-center ${isRevenueUp ? 'text-emerald-600' : 'text-red-500'}`}>
                {isRevenueUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(revenuePercent)}%
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            vs last mo (<CurrencyText amount={data.lastMonthRevenue} />)
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
            <CurrencyText amount={data.whatsappStats.recoveredAmount} /> recovered
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
