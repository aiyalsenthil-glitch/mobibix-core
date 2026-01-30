"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
import { getAccessToken } from "@/services/auth.api";

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
  jobs?: {
    inProgress: number;
    waitingForParts: number;
    ready: number;
    deliveredToday: number;
  };
  stockAlerts?: {
    negativeStockCount: number;
    zeroStockCount: number;
  };
}

function StatCard({
  label,
  value,
  icon,
  subtext,
  accentColor,
  onClick,
}: {
  label: string;
  value: string | number;
  icon: string;
  subtext?: string;
  accentColor: "teal" | "amber" | "emerald" | "cyan" | "yellow" | "orange";
  onClick?: () => void;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Map accent colors to tailwind classes for icon background and text
  const colorMap = {
    teal: { bg: "bg-teal-50 dark:bg-teal-900/20", text: "text-teal-600 dark:text-teal-400" },
    amber: { bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-600 dark:text-amber-400" },
    emerald: { bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-600 dark:text-emerald-400" },
    cyan: { bg: "bg-cyan-50 dark:bg-cyan-900/20", text: "text-cyan-600 dark:text-cyan-400" },
    yellow: { bg: "bg-yellow-50 dark:bg-yellow-900/20", text: "text-yellow-600 dark:text-yellow-400" },
    orange: { bg: "bg-orange-50 dark:bg-orange-900/20", text: "text-orange-600 dark:text-orange-400" },
  };

  const colors = colorMap[accentColor];

  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xl bg-card border border-border p-5 transition-all duration-200 hover:shadow-md ${
        onClick ? "cursor-pointer hover:border-primary/50" : "cursor-default"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
          {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${colors.bg} ${colors.text} text-xl transition-colors`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function ChartSection({ title }: { title: string }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h3 className="text-base font-semibold text-foreground mb-6">{title}</h3>
      <div className={`h-64 flex items-center justify-center rounded-lg border border-dashed border-border ${isDark ? "bg-muted/10" : "bg-muted/30"}`}>
        <p className="text-center text-muted-foreground">
          Chart placeholder - Connect your data source
          <br />
          <span className="text-xs opacity-70">
            This section will display analytics
          </span>
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { authUser } = useAuth();
  const [data, setData] = useState<DashboardData>({});
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = getAccessToken();
        if (!token) {
          setLoading(false);
          return;
        }
        const endpoint =
          authUser?.role?.toLowerCase() === "owner" ? "owner" : "staff";
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost_REPLACED:3000/api"}/mobileshop/dashboard/${endpoint}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        if (response.ok) {
          const dashboardData = await response.json();
          setData(dashboardData);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (authUser) {
      fetchDashboard();
    }
  }, [authUser]);

  const repairs = data.repairs || data.jobs;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Overview</h1>
        <p className="text-base text-muted-foreground">
          Welcome back! Here's your business overview.
        </p>
      </div>

      {/* Today's Sales Section */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground flex items-center gap-2">
           Today's Sales
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Sales"
            value={new Intl.NumberFormat('en-IN', {
              style: 'currency',
              currency: 'INR',
              maximumFractionDigits: 0,
            }).format(data.today?.salesAmount ?? 0)}
            icon="💰"
            subtext="Today's revenue"
            accentColor="teal"
            onClick={() => router.push("/dashboard/sales-detail")}
          />
          <StatCard
            label="Top Products"
            value={data.today?.jobsReceived ?? 0}
            icon="⭐"
            subtext="Sold today"
            accentColor="amber"
            onClick={() => router.push("/dashboard/products-detail")}
          />
          <StatCard
            label="Products Sold"
            value={data.month?.invoiceCount ?? 0}
            icon="📦"
            subtext="This month"
            accentColor="emerald"
            onClick={() =>
              router.push("/dashboard/products-detail?period=month")
            }
          />
          <StatCard
            label="Total Products"
            value={data.inventory?.totalProducts ?? 0}
            icon="📦"
            subtext="In inventory"
            accentColor="cyan"
            onClick={() => router.push("/dashboard/inventory-detail")}
          />
        </div>
      </div>

      {/* Today's Repair Section */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground flex items-center gap-2">
           Today's Repairs
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Received"
            value={repairs?.inProgress ?? 0}
            icon="📥"
            subtext="In progress"
            accentColor="teal"
          />
          <StatCard
            label="In Process"
            value={repairs?.waitingForParts ?? 0}
            icon="⚙️"
            subtext="Being worked on"
            accentColor="yellow"
          />
          <StatCard
            label="Delivered"
            value={repairs?.deliveredToday ?? 0}
            icon="✅"
            subtext="Ready for pickup"
            accentColor="teal"
          />
          <StatCard
            label="Await Spares"
            value={repairs?.ready ?? 0}
            icon="⏳"
            subtext="Waiting for parts"
            accentColor="orange"
          />
        </div>
      </div>

      {/* Charts Section - Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSection title="Total Revenue (Sales vs Service)" />
        <ChartSection title="Weekly Performance" />
      </div>

      {/* Charts Section - Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartSection title="Top Products This Week" />
        </div>
        <ChartSection title="Inventory Status" />
      </div>

      {/* Additional Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${isDark ? "bg-teal-900/30 text-teal-400" : "bg-teal-50 text-teal-600"}`}>
              ⚡
            </div>
            <h3 className="text-base font-semibold text-foreground">
              Quick Actions
            </h3>
          </div>
          <div className="space-y-3">
            <button 
              onClick={() => router.push("/jobcards/create")}
              className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium transition-colors hover:bg-primary/90 shadow-sm"
            >
              Create New Job Card
            </button>
            <button className="w-full px-4 py-2.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground font-medium transition-colors">
              View Reports
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${isDark ? "bg-teal-900/30 text-teal-400" : "bg-teal-50 text-teal-600"}`}>
              📋
            </div>
            <h3 className="text-base font-semibold text-foreground">
              Recent Activity
            </h3>
          </div>
          <div className="space-y-3 text-center py-8">
            <p className="text-sm text-muted-foreground">
              No recent activity yet
            </p>
            <p className="text-xs text-muted-foreground/60">
              Your recent actions will appear here
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
