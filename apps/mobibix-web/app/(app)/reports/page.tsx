"use client";

import { useTheme } from "@/context/ThemeContext";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  FileText,
  ShoppingBag,
  Box,
  TrendingUp,
  CreditCard,
  DollarSign,
  BarChart3,
  PieChart as PieChartIcon,
  Lock,
  Settings,
  Calendar,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useShop } from "@/context/ShopContext";
import {
  getSalesReport,
  getTopSellingProducts,
  getProfitSummary,
  type SalesReportItem,
  type TopProductItem,
  type ProfitSummaryMetrics,
} from "@/services/reports.api";
import { getSubscription } from "@/services/tenant.api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export default function ReportsPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const { selectedShopId } = useShop();

  // State
  const { authUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState<SalesReportItem[]>([]);
  const [topProducts, setTopProducts] = useState<TopProductItem[]>([]);
  const [profitMetrics, setProfitMetrics] = useState<ProfitSummaryMetrics | null>(null);
  const [dateRange, setDateRange] = useState<number | "custom">(30);
  const [maxHistoryDays, setMaxHistoryDays] = useState(30);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const customPickerRef = useRef<HTMLDivElement>(null);

  // Load plan limit from subscription API
  useEffect(() => {
    getSubscription()
      .then((sub) => {
        const limit = sub.current?.analyticsHistoryDays ?? 30;
        setMaxHistoryDays(limit);
      })
      .catch(() => {/* keep default 30 */});
  }, []);

  // Close custom picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (customPickerRef.current && !customPickerRef.current.contains(e.target as Node)) {
        setShowCustomPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Auto-downgrade if current preset exceeds limit
  useEffect(() => {
    if (typeof dateRange === "number" && dateRange > maxHistoryDays) {
      setDateRange(maxHistoryDays);
    }
  }, [maxHistoryDays, dateRange]);

  const fetchData = async () => {
    // Don't fetch if no shop is selected yet
    if (!selectedShopId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // console.log('[Reports] Fetching data for shopId:', selectedShopId);
      
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999); // End of day to include all transactions
      
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - dateRange);
      startDate.setHours(0, 0, 0, 0); // Start of day

      const startStr = startDate.toISOString();
      const endStr = endDate.toISOString();

      // console.log('[Reports] Date range:', startStr, 'to', endStr);

      const [sales, products, profit] = await Promise.all([
        getSalesReport({
          shopId: selectedShopId,
          startDate: startStr,
          endDate: endStr,
        }),
        getTopSellingProducts({
          shopId: selectedShopId,
          startDate: startStr,
          endDate: endStr,
        }),
        getProfitSummary({
          shopId: selectedShopId,
          startDate: startStr,
          endDate: endStr,
        }),
      ]);

      setSalesData(sales);
      setTopProducts(products);
      setProfitMetrics(profit.metrics);
    } catch (error) {
      console.error("Failed to load dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedShopId, dateRange]);

  // Aggregation for Charts
  // 1. Daily Sales Trend
  const dailyTrend = salesData.reduce((acc, curr) => {
    const date = new Date(curr.date).toLocaleDateString("en-US", { month: 'short', day: 'numeric' });
    const existing = acc.find(item => item.date === date);
    if (existing) {
      existing.sales += curr.totalAmount;
      existing.profit += (curr.profit || 0);
    } else {
      acc.push({ date, sales: curr.totalAmount, profit: curr.profit || 0 });
    }
    return acc;
  }, [] as { date: string; sales: number; profit: number }[]).reverse(); // API returns desc

  // 2. Payment Modes - Split MIXED payments into individual methods
  const paymentModes = salesData.reduce((acc, curr) => {
    const mode = curr.paymentMode || "UNKNOWN";
    
    // Split payment mode if it contains ' + ' (e.g., "CASH + UPI" -> ["CASH", "UPI"])
    const methods = mode.includes(' + ') ? mode.split(' + ') : [mode];
    
    methods.forEach(method => {
      const trimmedMethod = method.trim();
      const existing = acc.find(item => item.name === trimmedMethod);
      // Divide amount equally among methods for MIXED payments
      const shareAmount = curr.totalAmount / methods.length;
      
      if (existing) {
        existing.value += shareAmount;
      } else {
        acc.push({ name: trimmedMethod, value: shareAmount });
      }
    });
    
    return acc;
  }, [] as { name: string; value: number }[]);

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

  // Navigation Cards
  const REPORT_CARDS = [
    {
      title: "Sales Report",
      description: "Daily sales invoices & profit",
      icon: <FileText className="w-5 h-5" />,
      href: "/reports/sales",
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      title: "Purchase Report",
      description: "Supplier purchases & stocks",
      icon: <ShoppingBag className="w-5 h-5" />,
      href: "/reports/purchases",
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-900/20",
    },
    {
      title: "Inventory Report",
      description: "Stock levels & valuation",
      icon: <Box className="w-5 h-5" />,
      href: "/reports/inventory",
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-50 dark:bg-orange-900/20",
    },
    {
      title: "Profit Summary",
      description: "Revenue vs Cost Analysis",
      icon: <TrendingUp className="w-5 h-5" />,
      href: "/reports/profit",
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    {
      title: "Repair Report",
      description: "Service revenue & part costs",
      icon: <Settings className="w-5 h-5" />,
      href: "/reports/repair",
      color: "text-teal-600 dark:text-teal-400",
      bg: "bg-teal-50 dark:bg-teal-900/20",
    },
    {
      title: "GSTR-1 Report",
      description: "Sales register & HSN summary",
      icon: <FileText className="w-5 h-5" />,
      href: "/reports/gstr-1",
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-50 dark:bg-indigo-900/20",
    },
    {
      title: "GSTR-2 Report",
      description: "Purchase register & ITC claims",
      icon: <CreditCard className="w-5 h-5" />,
      href: "/reports/gstr-2",
      color: "text-pink-600 dark:text-pink-400",
      bg: "bg-pink-50 dark:bg-pink-900/20",
    },
  ];

  return (
    <div className={`min-h-screen ${theme === "dark" ? "bg-gray-950" : "bg-gray-50"}`}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              Dashboard
            </h1>
            <p className={`mt-1 text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
              Overview of your business performance
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
              {[7, 30, 90, 365].map((days) => {
                const isLocked = days > maxHistoryDays;
                return (
                  <button
                    key={days}
                    disabled={isLocked}
                    onClick={() => !isLocked && setDateRange(days)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${
                      dateRange === days
                        ? theme === "dark"
                          ? "bg-gray-700 text-white shadow-sm"
                          : "bg-gray-100 text-gray-900 shadow-sm"
                        : theme === "dark"
                        ? "text-gray-400 hover:text-white"
                        : "text-gray-500 hover:text-gray-900"
                    } ${isLocked ? "opacity-50 cursor-not-allowed" : ""}`}
                    title={isLocked ? `Available in Pro plan` : `Last ${days} days`}
                  >
                    {isLocked && <Lock className="w-3 h-3" />}
                    Last {days} Days
                  </button>
                );
              })}
            </div>
            {maxHistoryDays < 365 && (
              <p className="text-[10px] text-muted-foreground">
                History limited to {maxHistoryDays} days on your current plan.
              </p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* 1. Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
               <SummaryCard 
                 title="Total Revenue" 
                 value={`₹${(profitMetrics?.totalRevenue ?? 0).toFixed(2)}`} 
                 icon={<DollarSign className="w-4 h-4 text-emerald-500" />}
                 theme={theme}
               />
               <SummaryCard 
                 title="Gross Profit" 
                 value={`₹${(profitMetrics?.grossProfit ?? 0).toFixed(2)}`} 
                 icon={<TrendingUp className="w-4 h-4 text-blue-500" />}
                 theme={theme}
               />
               <SummaryCard 
                 title="Profit Margin" 
                 value={`${(profitMetrics?.margin ?? 0).toFixed(1)}%`} 
                 icon={<BarChart3 className="w-4 h-4 text-purple-500" />}
                 theme={theme}
               />
               <SummaryCard 
                 title="Transactions" 
                 value={salesData.length.toString()} 
                 icon={<FileText className="w-4 h-4 text-orange-500" />}
                 theme={theme}
               />
            </div>

            {/* 2. Main Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sales Trend */}
              <div className={`p-6 rounded-xl border min-w-0 ${theme === "dark" ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
                <h3 className={`text-sm font-semibold mb-6 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Sales Trend</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#374151" : "#e5e7eb"} />
                      <XAxis dataKey="date" stroke={theme === "dark" ? "#9ca3af" : "#6b7280"} fontSize={12} />
                      <YAxis stroke={theme === "dark" ? "#9ca3af" : "#6b7280"} fontSize={12} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: theme === "dark" ? "#1f2937" : "#fff", borderColor: theme === "dark" ? "#374151" : "#e5e7eb" }}
                        itemStyle={{ color: theme === "dark" ? "#fff" : "#000" }} 
                      />
                      <Legend />
                      <Line type="monotone" dataKey="sales" name="Sales" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="profit" name="Profit" stroke="#10b981" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Payment Modes */}
              <div className={`p-6 rounded-xl border min-w-0 ${theme === "dark" ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
                <h3 className={`text-sm font-semibold mb-6 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Payment Modes</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentModes}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {paymentModes.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* 3. Top Products & Navigation */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Top Products */}
              <div className={`col-span-1 lg:col-span-2 p-6 rounded-xl border min-w-0 ${theme === "dark" ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
                 <h3 className={`text-sm font-semibold mb-6 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Top Selling Products</h3>
                 <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topProducts} layout="vertical" margin={{ left: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#374151" : "#e5e7eb"} horizontal={true} vertical={false} />
                      <XAxis type="number" stroke={theme === "dark" ? "#9ca3af" : "#6b7280"} fontSize={12} />
                      <YAxis dataKey="name" type="category" stroke={theme === "dark" ? "#9ca3af" : "#6b7280"} fontSize={11} width={150} />
                      <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: theme === "dark" ? "#1f2937" : "#fff" }} />
                      <Bar dataKey="totalAmount" name="Revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Quick Links */}
              <div className="col-span-1 flex flex-col gap-4">
                 <h3 className={`text-sm font-semibold ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Quick Access</h3>
                 {REPORT_CARDS.map((card) => (
                  <div
                    key={card.href}
                    onClick={() => router.push(card.href)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-800 ${
                      theme === "dark"
                        ? "bg-gray-900 border-gray-800"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${card.bg} ${card.color}`}>
                        {card.icon}
                      </div>
                      <div>
                        <h4 className={`text-sm font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                          {card.title}
                        </h4>
                        <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                         View detailed report
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
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
         {icon}
      </div>
      <div className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{value}</div>
    </div>
  );
}
