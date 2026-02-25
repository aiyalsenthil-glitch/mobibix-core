"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
import { useShop } from "@/context/ShopContext";
import { getProfitSummary } from "@/services/reports.api";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { getUsageHistory, UsageSnapshot } from "@/services/tenant.api";
import { authenticatedFetch } from "@/services/auth.api";
import { UsageTrendsChart } from "@/components/dashboard/UsageTrendsChart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  Wallet,
  CreditCard,
  Box,
  AlertTriangle,
  Search,
  Zap,
  Clock,
  CheckCircle2,
  Settings,
  ArrowRight,
} from "lucide-react";
import { ValueSnapshotWidget } from "@/components/dashboard/ValueSnapshotWidget";
import type { Shop } from "@/services/shops.api";

interface DashboardData {
  today?: {
    salesAmount: number;
    jobsReceived: number;
  };
  month?: {
    salesAmount: number;
    invoiceCount: number;
  };
  inventory?: {
    totalProducts: number;
    negativeStockCount: number;
    deadStockCount: number;
  };
  repairs?: {
    inProgress: number;
    waitingForParts: number;
    ready: number;
    deliveredToday: number;
  };
  paymentStats?: { name: string; value: number }[];
  salesTrend?: { date: string; sales: number }[];
  valueSnapshot?: {
    monthRevenue: number;
    lastMonthRevenue: number; // Phase 3
    invoiceCount: number;
    collectionRate: number;
    whatsappStats: {
      sent: number;
      delivered: number;
      recoveredAmount: number; // Phase 2
    };
    repairTurnaroundDays: string;
  };
}

interface ShopBreakdownItem {
  shopId: string;
  shopName: string;
  revenue: number;
  salesCount: number;
  jobCardCount: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { authUser } = useAuth();
  const { theme } = useTheme();
  const { shops, selectedShopId, selectShop, hasMultipleShops } = useShop();
  const isDark = theme === "dark";

  const [data, setData] = useState<DashboardData>({});
  const [todayProfit, setTodayProfit] = useState<number>(0);
  // Derived state from data or fallback
  const paymentStats = useMemo(() => data.paymentStats || [], [data]);
  const salesTrend = useMemo(() => data.salesTrend || [], [data]);

  const [usageHistory, setUsageHistory] = useState<UsageSnapshot[]>([]);
  const [shopBreakdown, setShopBreakdown] = useState<ShopBreakdownItem[]>([]);
  const [loading, setLoading] = useState(true);

  const userRole = authUser?.role?.toLowerCase();
  const isOwner =
    userRole === "owner" ||
    userRole === "admin" ||
    userRole === "manager" ||
    userRole === "member";
  const isAllShops = !selectedShopId && isOwner;

  const fetchDashboard = useCallback(async () => {
    if (!authUser || !authUser.tenantId) {
      setLoading(false);
      return;
    }

    // Staff MUST have a shop selected. Owners/Admins see "All Shops" if none selected.
    if (!selectedShopId && !isOwner) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const endpoint =
        userRole === "owner" || userRole === "admin" || userRole === "manager"
          ? "owner"
          : "staff";

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startStr = today.toISOString();
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      const endStr = endOfDay.toISOString();

      const shopQuery = selectedShopId ? `&shopId=${selectedShopId}` : "";
      const reportParams = selectedShopId ? { shopId: selectedShopId } : {};

      // Optimized: Reduced from 5 to 3 calls. Sales/Trend data now comes from main dashboard API.
      const [dashRes, profitRes, usageRes, breakdownRes] = await Promise.all([
        authenticatedFetch(
          `/mobileshop/dashboard/${endpoint}${shopQuery ? "?" + shopQuery.substring(1) : ""}`,
        ).catch(() => null),
        isOwner && userRole !== "member"
          ? getProfitSummary({
              ...reportParams,
              startDate: startStr,
              endDate: endStr,
            }).catch(() => ({ metrics: { grossProfit: 0 } }))
          : Promise.resolve({ metrics: { grossProfit: 0 } }),
        isOwner ? getUsageHistory(30).catch(() => []) : Promise.resolve([]),
        isOwner && isAllShops
          ? authenticatedFetch("/mobileshop/dashboard/shop-breakdown").then(r => r.json()).catch(() => [])
          : Promise.resolve([]),
      ]);

      if (dashRes?.ok) {
        const dashData = await dashRes.json();
        setData(dashData);
      }

      setTodayProfit(profitRes.metrics?.grossProfit ?? 0);

      if (Array.isArray(usageRes)) {
        setUsageHistory(usageRes);
      }

      if (Array.isArray(breakdownRes)) {
        setShopBreakdown(breakdownRes as ShopBreakdownItem[]);
      }
    } catch (error) {
      console.error("Dashboard Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  }, [authUser, selectedShopId, isOwner, userRole, isAllShops]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Memoize chart colors to prevent recreation on every render
  const COLORS = useMemo(
    () => ["#0ea5e9", "#10b981", "#f59e0b", "##ef4444", "#8b5cf6"],
    [],
  );

  // Memoize computed payment values for better performance
  const cashCollection = useMemo(
    () => paymentStats.find((p) => p.name === "CASH")?.value ?? 0,
    [paymentStats],
  );

  const digitalPayments = useMemo(
    () =>
      paymentStats
        .filter((p) => p.name !== "CASH")
        .reduce((s, p) => s + p.value, 0),
    [paymentStats],
  );

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {isAllShops ? "Enterprise Overview" : "Dashboard Overview"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isAllShops
                ? "Consolidated metrics across all shops."
                : "Monitor your business performance in real-time."}
            </p>
          </div>
          
          {/* Shop Selector */}
          {isOwner && hasMultipleShops && (
            <div className="relative group">
              <select
                value={selectedShopId || ""}
                onChange={(e) => selectShop(e.target.value)}
                className="appearance-none bg-background border border-border rounded-lg px-4 py-2 pr-10 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer hover:border-primary/50"
              >
                <option value="">All Shops (Combined)</option>
                {shops.map((shop: Shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground group-hover:text-primary transition-colors">
                <Settings className="w-4 h-4" />
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/reports")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all shadow-sm"
          >
            Detailed Reports <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Row 0: Value Snapshot (Visible ROI) */}
      {isOwner && data.valueSnapshot && (
        <ValueSnapshotWidget data={data.valueSnapshot} isLoading={loading} />
      )}

      {/* Row 1: Financial KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label={isAllShops ? "Total Revenue" : "Today Revenue"}
          value={new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
          }).format(data.today?.salesAmount ?? 0)}
          icon={<DollarSign />}
          subtext={isAllShops ? "All shops today" : "Net sales today"}
          accentColor="emerald"
          isLoading={loading}
          onClick={() => router.push("/reports/sales")}
        />
        {isOwner && userRole !== "member" && (
          <MetricCard
            label={isAllShops ? "Total Profit" : "Today Profit"}
            value={new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
              maximumFractionDigits: 0,
            }).format(todayProfit)}
            icon={<TrendingUp />}
            subtext={isAllShops ? "All shops combined" : "Revenue minus cost"}
            accentColor="blue"
            isLoading={loading}
            onClick={() => router.push("/reports/profit")}
          />
        )}
        <MetricCard
          label="Cash Collection"
          value={new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
          }).format(cashCollection)}
          icon={<Wallet />}
          subtext="Physical cash in hand"
          accentColor="amber"
          isLoading={loading}
        />
        <MetricCard
          label="Digital Payments"
          value={new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
          }).format(digitalPayments)}
          icon={<CreditCard />}
          subtext="UPI, Card, Bank"
          accentColor="purple"
          isLoading={loading}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-semibold text-foreground">
              7-Day Sales Trend
            </h3>
            <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded-full font-medium">
              {isAllShops ? "Consolidated" : "Single Shop"}
            </span>
          </div>
          <div className="h-64 w-full">
            {loading ? (
              <div className="w-full h-full bg-muted/20 animate-pulse rounded-lg" />
            ) : salesTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesTrend}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={isDark ? "#334155" : "#e2e8f0"}
                  />
                  <XAxis
                    dataKey="date"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₹${v / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      backgroundColor: isDark ? "#1e293b" : "#fff",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    name="Sales"
                    stroke="#0ea5e9"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#0ea5e9" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground opacity-50 text-sm">
                No sales data available for this range
              </div>
            )}
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-base font-semibold text-foreground mb-6">
            Payment Distribution
          </h3>
          <div className="h-64 w-full text-xs">
            {loading ? (
              <div className="w-1/2 h-1/2 mx-auto mt-10 rounded-full border-8 border-muted/20 border-t-muted/80 animate-spin" />
            ) : paymentStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentStats}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {paymentStats.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50">
                <p className="text-sm">No recent payments</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row: Shop Breakdown (Owner All Shops Only) */}
      {isOwner && isAllShops && shopBreakdown.length > 0 && (
        <div className="glass-card p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-semibold text-foreground">
              Per-Shop Revenue Breakdown
            </h3>
            <span className="text-xs text-muted-foreground font-medium">
              Current Month
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/30">
                <tr>
                  <th className="px-4 py-3 font-semibold rounded-l-lg">Shop Name</th>
                  <th className="px-4 py-3 font-semibold text-right">Revenue (MTD)</th>
                  <th className="px-4 py-3 font-semibold text-right">Sales</th>
                  <th className="px-4 py-3 font-semibold text-right rounded-r-lg">Repairs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {shopBreakdown.map((shop) => (
                  <tr key={shop.shopId} className="hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-4 font-medium text-foreground">{shop.shopName}</td>
                    <td className="px-4 py-4 text-right font-semibold text-emerald-500">
                      {new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: "INR",
                        maximumFractionDigits: 0,
                      }).format(shop.revenue)}
                    </td>
                    <td className="px-4 py-4 text-right text-muted-foreground">{shop.salesCount}</td>
                    <td className="px-4 py-4 text-right text-muted-foreground">{shop.jobCardCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Row 2: Inventory & Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Inventory"
          value={data.inventory?.totalProducts ?? 0}
          icon={<Box />}
          subtext={isAllShops ? "Enterprise wide" : "Items in stock"}
          accentColor="cyan"
          isLoading={loading}
          onClick={() => router.push("/inventory")}
        />
        <MetricCard
          label="Low Stock"
          value={data.inventory?.negativeStockCount ?? 0}
          icon={<AlertTriangle />}
          subtext="Critical alerts"
          accentColor="orange"
          isLoading={loading}
          onClick={() => router.push("/inventory?filter=low-stock")}
        />
        <div className="md:col-span-2 glass-card p-5 flex items-center justify-between bg-primary/5">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Need a hand?</p>
              <p className="text-xs text-muted-foreground">
                Quickly create a bill or check stock.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/sales/create")}
              className="p-2 rounded-lg bg-background border border-border hover:bg-muted transition-colors"
              title="Quick Sale"
            >
              <DollarSign className="w-5 h-5 text-emerald-500" />
            </button>
            <button
              onClick={() => router.push("/inventory")}
              className="p-2 rounded-lg bg-background border border-border hover:bg-muted transition-colors"
              title="Check Stock"
            >
              <Search className="w-5 h-5 text-blue-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Row 3: Repairs (Secondary) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            Repair Pipeline {isAllShops && "(Combined)"}
          </h2>
          <button
            onClick={() => router.push("/jobcards")}
            className="text-sm text-primary hover:underline font-medium"
          >
            View Repair List
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="p-4 rounded-xl border border-border bg-card/50 hover:bg-card/80 transition-colors flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-teal-50 dark:bg-teal-900/20 text-teal-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {data.repairs?.inProgress ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </div>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card/50 hover:bg-card/80 transition-colors flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {data.repairs?.waitingForParts ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Await Parts</p>
            </div>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card/50 hover:bg-card/80 transition-colors flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data.repairs?.ready ?? 0}</p>
              <p className="text-xs text-muted-foreground">Ready</p>
            </div>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card/50 hover:bg-card/80 transition-colors flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {data.repairs?.deliveredToday ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Delivered Today</p>
            </div>
          </div>
        </div>
      </div>
      {/* Row 4: Usage Trends (Owner Only) */}
      {isOwner && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-semibold text-foreground">
              Growth Trends (Last 30 Days)
            </h3>
            <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded-full font-medium">
              Members • Staff • Shops
            </span>
          </div>
          <UsageTrendsChart data={usageHistory} isLoading={loading} />
        </div>
      )}
    </div>
  );
}
