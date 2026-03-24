"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  TrendingUp, TrendingDown, PieChart, BarChart3, 
  Lightbulb, Calendar, RefreshCw, AlertCircle, 
  Wallet, Banknote, CreditCard, Smartphone
} from "lucide-react";
import { useShop } from "@/context/ShopContext";
import { 
  getExpenseIntelligence, 
  ExpenseIntelligence
} from "@/services/operations.api";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, LineChart, Line, AreaChart, Area
} from "recharts";

const today = () => new Date().toISOString().split("T")[0];
const startOfMonth = () => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
};

function formatCurrency(paisa: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paisa / 100);
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function ExpenseIntelligencePage() {
  const { selectedShopId: shopId, selectedShop } = useShop();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ExpenseIntelligence | null>(null);
  const [error, setError] = useState("");
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(),
    end: today(),
  });

  const load = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    setError("");
    try {
      const res = await getExpenseIntelligence(shopId, dateRange.start, dateRange.end);
      setData(res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [shopId, dateRange]);

  useEffect(() => {
    load();
  }, [load]);

  if (!shopId) return <div className="p-8 text-center text-gray-500">Select a shop first.</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="text-blue-500" /> Expense Intelligence
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">AI-driven insights and spending patterns for {selectedShop?.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg p-1 shadow-sm">
            <input 
              type="date" 
              value={dateRange.start} 
              onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="bg-transparent border-none text-xs focus:ring-0 px-2 py-1 dark:text-slate-200"
            />
            <span className="text-gray-400 px-1 py-1">→</span>
            <input 
              type="date" 
              value={dateRange.end} 
              onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="bg-transparent border-none text-xs focus:ring-0 px-2 py-1 dark:text-slate-200"
            />
          </div>
          <button 
            onClick={load} 
            className="p-2 bg-gray-100 dark:bg-slate-800 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw size={18} className={loading ? "animate-spin text-blue-500" : "text-gray-600 dark:text-gray-300"} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-xl p-4 text-sm text-red-700 dark:text-red-400 flex items-center gap-3">
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {loading && !data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-gray-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : data ? (
        <>
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              label="Total Spend" 
              value={formatCurrency(data.overview.totalExpense)} 
              icon={<Wallet className="text-blue-500" />}
              color="blue"
            />
            <StatCard 
              label="Daily Average" 
              value={formatCurrency(data.overview.averageDailyExpense)} 
              icon={<TrendingUp className="text-emerald-500" />}
              color="emerald"
            />
            <StatCard 
              label="Peak Spending Day" 
              value={data.overview.highestExpenseDay.date ? new Date(data.overview.highestExpenseDay.date).toLocaleDateString() : "N/A"} 
              subValue={formatCurrency(data.overview.highestExpenseDay.amount)}
              icon={<Calendar className="text-orange-500" />}
              color="orange"
            />
            <StatCard 
              label="Insights" 
              value={`${data.insights.insights.length} Observations`} 
              icon={<Lightbulb className="text-yellow-500" />}
              color="yellow"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Trend Chart */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6">Spending Trend (Last 12 Months)</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.monthlyTrend}>
                    <defs>
                      <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="month" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 12 }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 12 }} 
                      tickFormatter={(val) => `₹${val/100/1000}k`}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      formatter={(val: any) => [formatCurrency(Number(val) || 0), 'Expenses']}
                    />
                    <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSpend)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Smart Insights Panel */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl shadow-blue-500/20">
              <div className="flex items-center gap-2 mb-6">
                <div className="bg-white/20 p-2 rounded-xl">
                  <Lightbulb size={20} />
                </div>
                <h3 className="text-lg font-bold">Smart Insights</h3>
              </div>
              
              <div className="space-y-4">
                {data.insights.insights.length > 0 ? (
                  data.insights.insights.map((insight, i) => (
                    <div key={i} className="flex gap-3 bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
                      <div className="mt-1">
                        <TrendingUp size={16} className="text-blue-200" />
                      </div>
                      <p className="text-sm font-medium leading-relaxed">{insight}</p>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-white/60 text-sm">
                    No recurring patterns or anomalies detected for this period.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Category Breakdown */}
            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6">Top Expense Categories</h3>
              <div className="space-y-6">
                {data.categoryBreakdown.slice(0, 5).map((cat, i) => {
                  const percentage = Math.round((cat.amount / data.overview.totalExpense) * 100);
                  return (
                    <div key={cat.category} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold dark:text-slate-300">{cat.category}</span>
                        <span className="text-gray-500">{formatCurrency(cat.amount)} ({percentage}%)</span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-1000" 
                          style={{ 
                            width: `${percentage}%`, 
                            backgroundColor: COLORS[i % COLORS.length] 
                          }} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payment Method Distribution */}
            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Payment Methods</h3>
              <p className="text-sm text-gray-500 mb-6 font-medium">Distribution of spend across different payment modes</p>
              
              <div className="grid grid-cols-2 gap-4">
                {data.paymentMethods.map((pm, i) => (
                  <div key={pm.method} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-800">
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-blue-500">
                      {pm.method === 'CASH' ? <Banknote size={20} /> : 
                       pm.method === 'UPI' ? <Smartphone size={20} /> : 
                       pm.method === 'CARD' ? <CreditCard size={20} /> : <TrendingUp size={20} />}
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">{pm.method}</p>
                      <p className="text-sm font-bold dark:text-white">{formatCurrency(pm.amount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function StatCard({ label, value, subValue, icon, color }: any) {
  const bgMap: any = {
    blue: "bg-blue-50 dark:bg-blue-900/10 text-blue-500",
    emerald: "bg-emerald-50 dark:bg-emerald-900/10 text-emerald-500",
    orange: "bg-orange-50 dark:bg-orange-900/10 text-orange-500",
    yellow: "bg-yellow-50 dark:bg-yellow-900/10 text-yellow-500",
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-start justify-between">
        <div className={`p-4 rounded-2xl ${bgMap[color]} transition-transform group-hover:scale-110 duration-300`}>
          {icon}
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium text-gray-500 dark:text-slate-400">{label}</p>
        <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{value}</p>
        {subValue && <p className="text-xs text-gray-400 mt-1 font-medium">{subValue}</p>}
      </div>
    </div>
  );
}
