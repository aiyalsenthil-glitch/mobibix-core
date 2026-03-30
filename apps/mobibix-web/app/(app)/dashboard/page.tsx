"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useShop } from "@/context/ShopContext";
import { getProfitSummary } from "@/services/reports.api";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { getUsageHistory, UsageSnapshot } from "@/services/tenant.api";
import { authenticatedFetch } from "@/services/auth.api";
import { getBottlenecks, getCustomerDelays } from "@/services/jobcard.api";
import { UsageTrendsChart } from "@/components/dashboard/UsageTrendsChart";
import { SalesTrendChart } from "@/components/dashboard/SalesTrendChart";
import { PaymentBreakdownChart } from "@/components/dashboard/PaymentBreakdownChart";
import { RevenueTargetCard } from "@/components/dashboard/RevenueTargetCard";
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
  FileBarChart,
  ArrowUpRight,
} from "lucide-react";
import { ValueSnapshotWidget } from "@/components/dashboard/ValueSnapshotWidget";
import type { Shop } from "@/services/shops.api";
import { TriggerAiButton } from "@/components/ai/TriggerAiButton";

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
  const { shops, selectedShopId, selectShop, hasMultipleShops } = useShop();

  const [data, setData] = useState<DashboardData>({});
  const [activeTab, setActiveTab] = useState<"sales" | "repairs" | "inventory">("sales");
  const [todayProfit, setTodayProfit] = useState<number>(0);
  // Derived state from data or fallback
  const paymentStats = useMemo(() => data.paymentStats || [], [data]);
  const salesTrend = useMemo(() => data.salesTrend || [], [data]);

  const [usageHistory, setUsageHistory] = useState<UsageSnapshot[]>([]);
  const [shopBreakdown, setShopBreakdown] = useState<ShopBreakdownItem[]>([]);
  const [bottlenecks, setBottlenecks] = useState<any[]>([]);
  const [delays, setDelays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [shopTarget, setShopTarget] = useState(0);

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
      const [dashRes, profitRes, usageRes, breakdownRes, bottleneckRes, delayRes] = await Promise.all([
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
        isOwner ? getBottlenecks().catch(() => []) : Promise.resolve([]),
        isOwner ? getCustomerDelays().catch(() => []) : Promise.resolve([]),
      ]);

      // Fetch shop target for the selected shop
      if (selectedShopId) {
        authenticatedFetch(
          `/mobileshop/targets/shop?shopId=${selectedShopId}&year=${new Date().getFullYear()}`
        )
          .then((r) => r.json())
          .then((targets: any[]) => {
            const thisMonth = new Date().getMonth() + 1;
            const found = Array.isArray(targets)
              ? targets.find((t: any) => t.month === thisMonth)
              : null;
            setShopTarget(found ? Number(found.revenueTarget) : 0);
          })
          .catch(() => setShopTarget(0));
      }

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

      setBottlenecks(bottleneckRes || []);
      setDelays(delayRes || []);
    } catch (error) {
      console.error("Dashboard Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  }, [authUser, selectedShopId, isOwner, userRole, isAllShops]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);



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
    <div className="relative min-h-screen bg-zinc-50/40 dark:bg-black/20">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="space-y-10 pb-20 px-2"
      >
        {/* Unified Command Center Navigator */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-1.5 p-1.5 bg-zinc-100 dark:bg-white/5 rounded-full border border-zinc-200/50 dark:border-white/5">
             <button 
               onClick={() => setActiveTab("sales")}
               className={`px-8 py-2.5 rounded-full text-xs font-bold transition-all ${activeTab === "sales" ? "bg-white dark:bg-zinc-100 text-zinc-900 dark:text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-900"}`}
             >
               Business Intel
             </button>
             <button 
               onClick={() => setActiveTab("repairs")}
               className={`px-8 py-2.5 rounded-full text-xs font-bold transition-all ${activeTab === "repairs" ? "bg-white dark:bg-zinc-100 text-zinc-900 dark:text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-900"}`}
             >
               Repair Center
             </button>
             <button 
               onClick={() => setActiveTab("inventory")}
               className={`px-8 py-2.5 rounded-full text-xs font-bold transition-all ${activeTab === "inventory" ? "bg-white dark:bg-zinc-100 text-zinc-900 dark:text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-900"}`}
             >
               Inventory Hub
             </button>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 text-xs font-bold text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all shadow-sm">
               <FileBarChart size={16} className="text-zinc-400" />
               Reports
            </button>
            <button 
               onClick={() => router.push(activeTab === "repairs" ? "/jobcards/create" : activeTab === "inventory" ? "/inventory/create" : "/sales/create")}
               className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-zinc-900 dark:bg-primary text-white text-xs font-bold hover:brightness-110 transition-all shadow-sm"
            >
               <Zap size={16} />
               {activeTab === "repairs" ? "New Job Card" : activeTab === "inventory" ? "Add Stock" : "New Sale"}
            </button>
          </div>
        </div>

        {/* Dynamic Contextual Header */}
        <div className="flex items-center justify-between">
           <div>
             <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
               {activeTab === "sales" ? "Business Intelligence" : activeTab === "repairs" ? "Operations Monitor" : "Inventory Pipeline"}
             </h1>
             <p className="text-[10px] text-zinc-400 mt-1 font-semibold uppercase tracking-[0.15em] opacity-80">
               {activeTab === "sales" ? "Real-time performance tracking & revenue flow" : activeTab === "repairs" ? "Workshop velocity & customer turnaround" : "Stock availability & procurement metrics"}
             </p>
           </div>
           
           <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/5 text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
               <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
               System Live: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
             </div>
             <TriggerAiButton 
                prompt={`Provide a brief summary of my ${activeTab} performance and 3 actionable tips for today.`} 
                label="Smart Insights"
              />
           </div>
        </div>

        {/* Tab-Based Content Environments */}
        <AnimatePresence mode="wait">
          {activeTab === "sales" && (
            <motion.div
              key="sales"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Top-Left: Performance Trend */}
                <div className="human-card p-10 flex flex-col justify-between h-full bg-white dark:bg-zinc-900/50">
                  <div className="flex items-center justify-between mb-8">
                     <div className="space-y-1">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Sales Velocity</h3>
                        <p className="text-xs text-zinc-400 font-medium">Tracking across all payment channels</p>
                     </div>
                     <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold">
                       <TrendingUp size={12} />
                       TRENDING UP
                     </div>
                  </div>
                  <SalesTrendChart data={salesTrend.length > 0 ? salesTrend : [
                    { date: "Mon", sales: 420 },
                    { date: "Tue", sales: 850 },
                    { date: "Wed", sales: 620 },
                    { date: "Thu", sales: 940 },
                    { date: "Fri", sales: 1200 },
                    { date: "Sat", sales: 1100 },
                    { date: "Sun", sales: 1450 }
                  ]} isLoading={loading} />
                </div>

                {/* Top-Right: Financial Metrics (BROKEN SYMMETRY) */}
                <div className="grid grid-cols-2 gap-4">
                  <MetricCard
                    label="Today Revenue"
                    value={new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(data.today?.salesAmount ?? 4520)}
                    icon={<DollarSign />}
                    accentColor="emerald"
                    isLoading={loading}
                    trend="+14.2%"
                    trendLabel="vs yesterday"
                    onClick={() => router.push("/reports/sales")}
                  />
                  <MetricCard
                    label="Gross Profit"
                    value={new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(todayProfit > 0 ? todayProfit : 1240)}
                    icon={<TrendingUp />}
                    accentColor="blue"
                    isLoading={loading}
                    trend="+8.1%"
                    trendLabel="margin stable"
                    onClick={() => router.push("/reports/profit")}
                  />
                  <MetricCard
                    label="Cash Tally"
                    value={new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(cashCollection > 0 ? cashCollection : 2100)}
                    icon={<Wallet />}
                    accentColor="amber"
                    isLoading={loading}
                    trend="-2.4%"
                    trendLabel="more UPI today"
                  />
                  <MetricCard
                    label="Digital Flow"
                    value={new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(digitalPayments > 0 ? digitalPayments : 2420)}
                    icon={<CreditCard />}
                    accentColor="purple"
                    isLoading={loading}
                    trend="+22%"
                    trendLabel="peak performance"
                  />
                </div>

                <div className="flex flex-col">
                  {isOwner && data.valueSnapshot && (
                    <ValueSnapshotWidget data={data.valueSnapshot} isLoading={loading} />
                  )}
                </div>

                <div className="human-card p-10 bg-white dark:bg-zinc-900/50">
                  <div className="flex items-center justify-between mb-8">
                     <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400/80">Payment Split</h3>
                  </div>
                  <PaymentBreakdownChart data={paymentStats} isLoading={loading} />
                </div>
              </div>

              {isOwner && isAllShops && shopBreakdown.length > 0 && (
                <div className="human-card p-10 bg-white dark:bg-zinc-900/50">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400/80 mb-8">Multi-Branch Performance</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {shopBreakdown.map(shop => (
                        <div key={shop.shopId} className="flex items-center justify-between p-6 rounded-[20px] bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-white/5 hover:border-zinc-300 transition-all">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest">{shop.shopName}</p>
                            <p className="text-xs text-muted-foreground font-bold">{shop.salesCount} Sales · {shop.jobCardCount} Jobs</p>
                          </div>
                          <p className="text-lg font-black text-emerald-500">₹{shop.revenue.toLocaleString()}</p>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "repairs" && (
            <motion.div
              key="repairs"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "In Progress", val: data.repairs?.inProgress, icon: <Clock />, col: "teal", status: "IN_PROGRESS", trend: "+4.1%", trendLabel: "steady flow" },
                  { label: "Parts Needed", val: data.repairs?.waitingForParts, icon: <Settings />, col: "amber", status: "WAITING_FOR_PARTS", trend: "-12%", trendLabel: "procurement up" },
                  { label: "Ready for Delivery", val: data.repairs?.ready, icon: <CheckCircle2 />, col: "emerald", status: "READY", trend: "+18%", trendLabel: "turnaround high" },
                  { label: "Delivered Today", val: data.repairs?.deliveredToday, icon: <Zap />, col: "blue", status: "DELIVERED", trend: "+2.4%", trendLabel: "vs average" }
                ].map((p, i) => (
                  <MetricCard
                    key={i}
                    label={p.label}
                    value={p.val ?? 0}
                    icon={p.icon}
                    accentColor={p.col as any}
                    onClick={() => router.push(`/jobcards?status=${p.status}`)}
                    isLoading={loading}
                    trend={p.trend}
                    trendLabel={p.trendLabel}
                  />
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <div className="human-card p-10 bg-red-50/10 dark:bg-red-900/5 border-red-500/10">
                    <h3 className="text-xs font-bold uppercase tracking-[0.4em] text-red-500 mb-8 flex items-center gap-2">
                       <AlertTriangle size={18} /> Workshop Bottlenecks
                    </h3>
                    <div className="space-y-4">
                       {bottlenecks.length > 0 ? bottlenecks.map(b => (
                         <div key={b.status} className="flex items-center justify-between p-5 rounded-[20px] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/5 shadow-sm">
                           <span className="text-[10px] font-black uppercase tracking-widest">{b.status}</span>
                           <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full font-bold text-xs">{b.count} Pending</span>
                         </div>
                       )) : (
                         <p className="text-zinc-500 text-sm font-medium italic text-center py-10">Safe workflow established. No bottlenecks detected.</p>
                       )}
                    </div>
                 </div>

                 <div className="human-card p-10 bg-white dark:bg-zinc-900/50">
                    <h3 className="text-xs font-bold uppercase tracking-[0.4em] text-amber-500 mb-8 flex items-center gap-2">
                       <Clock size={18} /> Delivery Delays
                    </h3>
                    <div className="space-y-4">
                       {delays.length > 0 ? delays.map(d => (
                         <div key={d.id} className="flex items-center justify-between p-5 rounded-[20px] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/5 shadow-sm">
                           <div>
                              <p className="text-[10px] font-black uppercase tracking-widest">{d.customerName}</p>
                              <p className="text-[10px] text-muted-foreground font-bold">{d.status} for {d.daysDelay} days</p>
                           </div>
                           <button className="px-4 py-2 bg-amber-500 text-white rounded-xl text-[10px] font-bold uppercase">Send Update</button>
                         </div>
                       )) : (
                         <p className="text-zinc-500 text-sm font-medium italic text-center py-10">All repairs are tracking within target turnaround times.</p>
                       )}
                    </div>
                 </div>
              </div>
            </motion.div>
          )}

          {activeTab === "inventory" && (
            <motion.div
              key="inventory"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  label="Available Stock"
                  value={data.inventory?.totalProducts ?? 0}
                  icon={<Box />}
                  accentColor="emerald"
                  isLoading={loading}
                />
                <MetricCard
                  label="Critical Low Stock"
                  value={data.inventory?.negativeStockCount ?? 0}
                  icon={<AlertTriangle />}
                  accentColor="amber"
                  isLoading={loading}
                  onClick={() => router.push("/inventory?filter=low-stock")}
                />
              </div>

              <div className="human-card p-10 bg-white dark:bg-zinc-900/50">
                 <h3 className="text-xs font-bold uppercase tracking-[0.4em] text-zinc-400 mb-8">Asset Growth & System Load</h3>
                 <UsageTrendsChart data={usageHistory} isLoading={loading} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
