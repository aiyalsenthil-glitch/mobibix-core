"use client";

import { useTheme } from "@/context/ThemeContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Wrench,
  TrendingUp,
  DollarSign,
  FileText,
  ArrowLeft,
  Settings,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { useShop } from "@/context/ShopContext";
import {
  getRepairReport,
  getRepairMetrics,
  type SalesReportItem,
  type RepairMetrics,
} from "@/services/reports.api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function RepairReportPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const { selectedShopId } = useShop();

  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<SalesReportItem[]>([]);
  const [metrics, setMetrics] = useState<RepairMetrics | null>(null);
  const [dateRange, setDateRange] = useState(30);

  const fetchData = async () => {
    if (!selectedShopId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - dateRange);
      startDate.setHours(0, 0, 0, 0);

      const [report, stats] = await Promise.all([
        getRepairReport({
          shopId: selectedShopId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
        getRepairMetrics({
          shopId: selectedShopId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
      ]);

      setReportData(report);
      setMetrics(stats);
    } catch (error) {
      console.error("Failed to load repair report:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedShopId, dateRange]);

  const dailyTrend = reportData.reduce((acc, curr) => {
    const date = new Date(curr.date).toLocaleDateString("en-US", { month: 'short', day: 'numeric' });
    const existing = acc.find(item => item.date === date);
    if (existing) {
      existing.revenue += curr.totalAmount;
      existing.profit += (curr.profit || 0);
    } else {
      acc.push({ date, revenue: curr.totalAmount, profit: curr.profit || 0 });
    }
    return acc;
  }, [] as { date: string; revenue: number; profit: number }[]).reverse();

  return (
    <div className={`min-h-screen ${theme === "dark" ? "bg-gray-950" : "bg-gray-50"}`}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/reports")}
              className={`p-2 rounded-lg border ${theme === "dark" ? "bg-gray-900 border-gray-800 text-gray-400" : "bg-white border-gray-200 text-gray-500"} hover:text-primary transition-colors`}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                Repair Performance
              </h1>
              <p className={`mt-1 text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                Revenue and profit analysis for your service center
              </p>
            </div>
          </div>
          <div className="flex bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                onClick={() => setDateRange(days)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  dateRange === days
                    ? theme === "dark" ? "bg-gray-700 text-white shadow-sm" : "bg-gray-100 text-gray-900 shadow-sm"
                    : theme === "dark" ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Last {days} Days
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
               <SummaryCard 
                 title="Repair Revenue" 
                 value={`₹${metrics?.totalRevenue.toFixed(2)}`} 
                 icon={<DollarSign className="w-4 h-4 text-emerald-500" />}
                 theme={theme}
               />
               <SummaryCard 
                 title="Total Profit" 
                 value={`₹${metrics?.totalProfit.toFixed(2)}`} 
                 icon={<TrendingUp className="w-4 h-4 text-blue-500" />}
                 theme={theme}
               />
               <SummaryCard 
                 title="Repair Count" 
                 value={metrics?.totalRepairs.toString() || "0"} 
                 icon={<Wrench className="w-4 h-4 text-orange-500" />}
                 theme={theme}
               />
               <SummaryCard 
                 title="Avg. Margin" 
                 value={`${metrics?.margin.toFixed(1)}%`} 
                 icon={<FileText className="w-4 h-4 text-purple-500" />}
                 theme={theme}
               />
            </div>

            {/* Trends */}
            <div className={`p-6 rounded-xl border ${theme === "dark" ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
              <h3 className={`text-sm font-semibold mb-6 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Service Growth Trend</h3>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#374151" : "#e5e7eb"} />
                    <XAxis dataKey="date" stroke={theme === "dark" ? "#9ca3af" : "#6b7280"} fontSize={12} />
                    <YAxis stroke={theme === "dark" ? "#9ca3af" : "#6b7280"} fontSize={12} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: theme === "dark" ? "#1f2937" : "#000", border: 'none', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4, fill: '#0ea5e9' }} />
                    <Line type="monotone" dataKey="profit" name="Profit" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Repair List */}
            <div className={`rounded-xl border overflow-hidden ${theme === "dark" ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
              <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <h3 className={`text-sm font-semibold ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Completed Repairs</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className={theme === "dark" ? "bg-gray-800/50 text-gray-400" : "bg-gray-50 text-gray-500"}>
                    <tr>
                      <th className="px-4 py-3 font-medium">Invoice No</th>
                      <th className="px-4 py-3 font-medium">Customer</th>
                      <th className="px-4 py-3 font-medium text-right">Revenue</th>
                      <th className="px-4 py-3 font-medium text-right">Profit</th>
                      <th className="px-4 py-3 font-medium">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {reportData.map((repair) => (
                      <tr key={repair.invoiceNo} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-primary">#{repair.invoiceNo}</td>
                        <td className={`px-4 py-3 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                          {repair.customer || "Walking Customer"}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                          ₹{repair.totalAmount.toFixed(2)}
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${repair.profit && repair.profit > 0 ? "text-blue-600 dark:text-blue-400" : "text-gray-400"}`}>
                          {repair.profit ? `₹${repair.profit.toFixed(2)}` : "-"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            repair.paymentMode.includes('CASH') ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                          }`}>
                            {repair.paymentMode}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {reportData.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                          No repairs found in this date range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon, theme }: { title: string; value: string; icon: React.ReactNode; theme: string }) {
  return (
    <div className={`p-5 rounded-xl border ${theme === "dark" ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
      <div className="flex items-center justify-between mb-2">
         <span className={`text-xs font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>{title}</span>
         <div className="p-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/50">
           {icon}
         </div>
      </div>
      <div className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{value}</div>
    </div>
  );
}
