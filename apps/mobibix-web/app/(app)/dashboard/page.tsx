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
  bgColor,
  onClick,
}: {
  label: string;
  value: string | number;
  icon: string;
  subtext?: string;
  bgColor: string;
  onClick?: () => void;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${onClick ? "cursor-pointer" : "cursor-default"} ${bgColor}`}
    >
      {/* Content */}
      <div className="relative space-y-3">
        {/* Icon */}
        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-white/80 dark:bg-gray-800 text-white shadow-md text-2xl group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>

        {/* Label */}
        <p
          className="text-sm font-bold dark:text-gray-300 tracking-wide"
          style={{ color: isDark ? "#d1d5db" : "#000000" }}
        >
          {label}
        </p>

        {/* Value */}
        <p className="text-3xl font-black text-white dark:text-white leading-none">
          {value}
        </p>

        {/* Subtext */}
        {subtext && (
          <p
            className="text-xs dark:text-gray-400 font-medium"
            style={{ color: isDark ? "#9ca3af" : "#111827" }}
          >
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
}

function ChartSection({ title }: { title: string }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <div
      className={`rounded-2xl border p-8 ${
        isDark
          ? "bg-gradient-to-br from-gray-900 to-gray-950 border-gray-800"
          : "bg-gradient-to-br from-white to-gray-50 border-gray-200"
      }`}
    >
      <h3
        className={`text-lg font-bold mb-6 ${isDark ? "text-white" : "text-black"}`}
      >
        {title}
      </h3>
      <div
        className={`h-64 flex items-center justify-center rounded-xl ${
          isDark ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-800"
        }`}
      >
        <p className="text-center">
          Chart placeholder - Connect your data source
          <br />
          <span
            className={`${isDark ? "text-gray-500" : "text-gray-600"} text-xs`}
          >
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
    <div className={`space-y-8 ${isDark ? "text-white" : "text-gray-900"}`}>
      {/* Header */}
      <div className="flex flex-col gap-2 mb-8">
        <p className="text-lg font-semibold text-black dark:text-gray-400">
          Welcome back! Here's your business overview.
        </p>
      </div>

      {/* Today's Sales Section */}
      <div>
        <h2
          className="text-2xl font-bold dark:text-white mb-4 flex items-center gap-2"
          style={{ color: isDark ? undefined : "#000000" }}
        >
          <span>📊</span> Today's Sales
        </h2>
        <div className="grid grid-cols-4 gap-3">
          <StatCard
            label="Total Sales"
            value={`$${(data.today?.salesAmount ?? 0).toLocaleString()}`}
            icon="💰"
            subtext="Today's revenue"
            bgColor="bg-gradient-to-br from-pink-100 to-pink-50 dark:from-pink-500/20 dark:to-pink-500/10 border border-pink-200/50 dark:border-pink-500/30"
            onClick={() => router.push("/dashboard/sales-detail")}
          />
          <StatCard
            label="Top Products"
            value={data.today?.jobsReceived ?? 0}
            icon="⭐"
            subtext="Sold today"
            bgColor="bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-500/20 dark:to-amber-500/10 border border-amber-200/50 dark:border-amber-500/30"
            onClick={() => router.push("/dashboard/products-detail")}
          />
          <StatCard
            label="Products Sold"
            value={data.month?.invoiceCount ?? 0}
            icon="📦"
            subtext="This month"
            bgColor="bg-gradient-to-br from-green-100 to-green-50 dark:from-green-500/20 dark:to-green-500/10 border border-green-200/50 dark:border-green-500/30"
            onClick={() =>
              router.push("/dashboard/products-detail?period=month")
            }
          />
          <StatCard
            label="Total Products"
            value={data.inventory?.totalProducts ?? 0}
            icon="📦"
            subtext="In inventory"
            bgColor="bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-500/20 dark:to-purple-500/10 border border-purple-200/50 dark:border-purple-500/30"
            onClick={() => router.push("/dashboard/inventory-detail")}
          />
        </div>
      </div>

      {/* Today's Repair Section */}
      <div>
        <h2
          className="text-2xl font-bold dark:text-white mb-4 flex items-center gap-2"
          style={{ color: isDark ? undefined : "#000000" }}
        >
          <span>🔧</span> Today's Repairs
        </h2>
        <div className="grid grid-cols-4 gap-3">
          <StatCard
            label="Received"
            value={repairs?.inProgress ?? 0}
            icon="📥"
            subtext="In progress"
            bgColor="bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-500/20 dark:to-blue-500/10 border border-blue-200/50 dark:border-blue-500/30"
          />
          <StatCard
            label="In Process"
            value={repairs?.waitingForParts ?? 0}
            icon="⚙️"
            subtext="Being worked on"
            bgColor="bg-gradient-to-br from-yellow-100 to-yellow-50 dark:from-yellow-500/20 dark:to-yellow-500/10 border border-yellow-200/50 dark:border-yellow-500/30"
          />
          <StatCard
            label="Delivered"
            value={repairs?.deliveredToday ?? 0}
            icon="✅"
            subtext="Ready for pickup"
            bgColor="bg-gradient-to-br from-teal-100 to-teal-50 dark:from-teal-500/20 dark:to-teal-500/10 border border-teal-200/50 dark:border-teal-500/30"
          />
          <StatCard
            label="Await Spares"
            value={repairs?.ready ?? 0}
            icon="⏳"
            subtext="Waiting for parts"
            bgColor="bg-gradient-to-br from-red-100 to-red-50 dark:from-red-500/20 dark:to-red-500/10 border border-red-200/50 dark:border-red-500/30"
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
        <div
          className={`rounded-2xl border p-8 ${
            useTheme().theme === "dark"
              ? "bg-gradient-to-br from-gray-900 to-gray-950 border-gray-800"
              : "bg-gradient-to-br from-white to-gray-50 border-gray-200"
          }`}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-xl">
              ⚡
            </div>
            <h3
              className={`text-lg font-bold ${useTheme().theme === "dark" ? "text-white" : "text-gray-900"}`}
            >
              Quick Actions
            </h3>
          </div>
          <div className="space-y-3">
            <button className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold transition-all duration-200 shadow-md hover:shadow-lg">
              Create New Job Card
            </button>
            <button
              className={`w-full px-4 py-3 rounded-lg font-semibold transition-all duration-200 ${
                useTheme().theme === "dark"
                  ? "bg-gray-800 hover:bg-gray-700 text-white"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-900"
              }`}
            >
              View Reports
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div
          className={`rounded-2xl border p-8 ${
            useTheme().theme === "dark"
              ? "bg-gradient-to-br from-gray-900 to-gray-950 border-gray-800"
              : "bg-gradient-to-br from-white to-gray-50 border-gray-200"
          }`}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-xl">
              📋
            </div>
            <h3
              className={`text-lg font-bold ${useTheme().theme === "dark" ? "text-white" : "text-gray-900"}`}
            >
              Recent Activity
            </h3>
          </div>
          <div className="space-y-3 text-center py-8">
            <p
              className={`${useTheme().theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
            >
              No recent activity yet
            </p>
            <p
              className={`text-xs ${useTheme().theme === "dark" ? "text-gray-500" : "text-gray-500"}`}
            >
              Your recent actions will appear here
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
