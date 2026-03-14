"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  TrendingUp, PieChart, BarChart3, 
  Lightbulb, Calendar, RefreshCw, AlertCircle, 
  Wallet, Banknote, CreditCard, Smartphone
} from "lucide-react";
import { 
  getExpenseIntelligence, 
  ExpenseIntelligence
} from "@/services/operations.api";
import { 
  Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid
} from "recharts";

function formatCurrency(paisa: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paisa / 100);
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export function ExpenseIntelligenceDashboard({ shopId, selectedShopName }: { shopId: string, selectedShopName?: string }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ExpenseIntelligence | null>(null);
  const [error, setError] = useState("");
  
  const load = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    setError("");
    try {
      const res = await getExpenseIntelligence(shopId);
      setData(res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-slate-800 rounded-2xl" />)}
        </div>
        <div className="h-64 bg-gray-100 dark:bg-slate-800 rounded-3xl" />
      </div>
    );
  }

  if (error) return <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>;
  if (!data) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
          <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 mb-1">Total Spend</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(data.overview.totalExpense)}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
          <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 mb-1">Daily Avg</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(data.overview.averageDailyExpense)}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
          <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 mb-1">Peak Day</p>
          <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{data.overview.highestExpenseDay.date ? new Date(data.overview.highestExpenseDay.date).toLocaleDateString() : 'N/A'}</p>
        </div>
        <div className="bg-blue-600 p-4 rounded-2xl shadow-lg shadow-blue-500/20 text-white">
          <p className="text-[10px] uppercase font-bold text-blue-100 mb-1">Insights</p>
          <p className="text-lg font-bold">{data.insights.insights.length} Observations</p>
        </div>
      </div>

      {/* Main Graph */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800">
         <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4">6-Month Spending Trend</h3>
         <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.monthlyTrend}>
                <defs>
                  <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" hide />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '12px' }}
                  formatter={(val: any) => [formatCurrency(Number(val) || 0), 'Spent']}
                />
                <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} fill="url(#colorSpend)" />
              </AreaChart>
            </ResponsiveContainer>
         </div>
      </div>

      {/* Insights & Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Insights */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-3xl border border-indigo-100 dark:border-indigo-900/30">
          <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-300 mb-4 flex items-center gap-2">
            <Lightbulb size={16} /> AI Insights
          </h3>
          <div className="space-y-3">
             {data.insights.insights.map((insight, i) => (
               <div key={i} className="flex gap-3 text-xs text-indigo-800 dark:text-indigo-400 leading-relaxed">
                  <span className="w-1 h-1 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                  {insight}
               </div>
             ))}
             {data.insights.insights.length === 0 && <p className="text-xs text-indigo-400">Stable spending patterns detected.</p>}
          </div>
        </div>

        {/* Categories */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm">
           <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4">Top Categories</h3>
           <div className="space-y-4">
              {data.categoryBreakdown.slice(0, 4).map((cat, i) => {
                const pct = (cat.amount / data.overview.totalExpense) * 100;
                return (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      <span>{cat.category}</span>
                      <span>{Math.round(pct)}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
           </div>
        </div>
      </div>

      {/* Payment methods */}
      <div className="pt-2">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Spending by Mode</h3>
        <div className="flex flex-wrap gap-2">
          {data.paymentMethods.map(pm => (
            <div key={pm.method} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl text-xs shadow-sm">
               {pm.method === 'CASH' ? <Banknote size={14} className="text-green-500" /> : <Smartphone size={14} className="text-blue-500" />}
               <span className="font-bold dark:text-slate-300">{pm.method}</span>
               <span className="text-gray-400">{formatCurrency(pm.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
