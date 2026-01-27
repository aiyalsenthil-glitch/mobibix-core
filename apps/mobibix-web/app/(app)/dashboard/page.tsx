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
      className={`group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${onClick ? "cursor-pointer" : "cursor-default"} ${bgColor} ${
        !isDark ? "border-2 border-white/50 shadow-lg" : ""
      }`}
    >
      {/* Content */}
      <div className="relative space-y-3">
        {/* Icon */}
        <div
          className={`flex items-center justify-center w-12 h-12 rounded-xl ${
            isDark
              ? "bg-white/80 dark:bg-gray-800 text-white shadow-md"
              : "bg-white/90 text-teal-600 shadow-lg"
          } text-2xl group-hover:scale-110 transition-transform duration-300`}
        >
          {icon}
        </div>

        {/* Label */}
        <p
          className={`text-sm font-bold tracking-wide ${
            isDark ? "text-gray-300" : "text-teal-900"
          }`}
        >
          {label}
        </p>

        {/* Value */}
        <p
          className={`text-3xl font-black leading-none ${
            isDark ? "text-white" : "text-teal-700"
          }`}
        >
          {value}
        </p>

        {/* Subtext */}
        {subtext && (
          <p
            className={`text-xs font-medium ${
              isDark ? "text-gray-400" : "text-teal-600/80"
            }`}
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
      className={`rounded-2xl border p-8 shadow-lg ${
        isDark
          ? "bg-gradient-to-br from-gray-900 to-gray-950 border-gray-800"
          : "bg-gradient-to-br from-white via-teal-50/30 to-white border-teal-100 shadow-teal-500/5"
      }`}
    >
      <h3
        className={`text-lg font-bold mb-6 ${
          isDark ? "text-white" : "text-teal-900"
        }`}
      >
        {title}
      </h3>
      <div
        className={`h-64 flex items-center justify-center rounded-xl ${
          isDark
            ? "bg-gray-800 text-gray-400"
            : "bg-gradient-to-br from-teal-50/50 to-white text-teal-700 border border-teal-100"
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
            bgColor="bg-gradient-to-br from-teal-100 via-teal-50 to-teal-100 dark:from-pink-500/20 dark:to-pink-500/10 border border-teal-200 dark:border-pink-500/30"
            onClick={() => router.push("/dashboard/sales-detail")}
          />
          <StatCard
            label="Top Products"
            value={data.today?.jobsReceived ?? 0}
            icon="⭐"
            subtext="Sold today"
            bgColor="bg-gradient-to-br from-amber-100 via-amber-50 to-amber-100 dark:from-amber-500/20 dark:to-amber-500/10 border border-amber-200 dark:border-amber-500/30"
            onClick={() => router.push("/dashboard/products-detail")}
          />
          <StatCard
            label="Products Sold"
            value={data.month?.invoiceCount ?? 0}
            icon="📦"
            subtext="This month"
            bgColor="bg-gradient-to-br from-emerald-100 via-emerald-50 to-emerald-100 dark:from-green-500/20 dark:to-green-500/10 border border-emerald-200 dark:border-green-500/30"
            onClick={() =>
              router.push("/dashboard/products-detail?period=month")
            }
          />
          <StatCard
            label="Total Products"
            value={data.inventory?.totalProducts ?? 0}
            icon="📦"
            subtext="In inventory"
            bgColor="bg-gradient-to-br from-cyan-100 via-cyan-50 to-cyan-100 dark:from-purple-500/20 dark:to-purple-500/10 border border-cyan-200 dark:border-purple-500/30"
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
            bgColor="bg-gradient-to-br from-teal-100 via-teal-50 to-teal-100 dark:from-teal-500/20 dark:to-teal-500/10 border border-teal-200 dark:border-teal-500/30"
          />
          <StatCard
            label="In Process"
            value={repairs?.waitingForParts ?? 0}
            icon="⚙️"
            subtext="Being worked on"
            bgColor="bg-gradient-to-br from-yellow-100 via-yellow-50 to-yellow-100 dark:from-yellow-500/20 dark:to-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30"
          />
          <StatCard
            label="Delivered"
            value={repairs?.deliveredToday ?? 0}
            icon="✅"
            subtext="Ready for pickup"
            bgColor="bg-gradient-to-br from-teal-200 via-teal-100 to-teal-200 dark:from-teal-500/20 dark:to-teal-500/10 border border-teal-300 dark:border-teal-500/30"
          />
          <StatCard
            label="Await Spares"
            value={repairs?.ready ?? 0}
            icon="⏳"
            subtext="Waiting for parts"
            bgColor="bg-gradient-to-br from-orange-100 via-orange-50 to-orange-100 dark:from-red-500/20 dark:to-red-500/10 border border-orange-200 dark:border-red-500/30"
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
          className={`rounded-2xl border p-8 shadow-lg ${
            useTheme().theme === "dark"
              ? "bg-gradient-to-br from-gray-900 to-gray-950 border-gray-800"
              : "bg-gradient-to-br from-white via-teal-50/30 to-white border-teal-100 shadow-teal-500/5"
          }`}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-teal-500/30">
              ⚡
            </div>
            <h3
              className={`text-lg font-bold ${
                useTheme().theme === "dark" ? "text-white" : "text-teal-900"
              }`}
            >
              Quick Actions
            </h3>
          </div>
          <div className="space-y-3">
            <button className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-teal-600 via-teal-500 to-teal-600 hover:from-teal-700 hover:via-teal-600 hover:to-teal-700 text-white font-bold transition-all duration-200 shadow-lg shadow-teal-500/30 hover:shadow-xl hover:scale-[1.02]">
              Create New Job Card
            </button>
            <button
              className={`w-full px-4 py-3 rounded-xl font-semibold transition-all duration-200 ${
                useTheme().theme === "dark"
                  ? "bg-gray-800 hover:bg-gray-700 text-white"
                  : "bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 hover:border-teal-300 shadow-sm"
              }`}
            >
              View Reports
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div
          className={`rounded-2xl border p-8 shadow-lg ${
            useTheme().theme === "dark"
              ? "bg-gradient-to-br from-gray-900 to-gray-950 border-gray-800"
              : "bg-gradient-to-br from-white via-teal-50/30 to-white border-teal-100 shadow-teal-500/5"
          }`}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-teal-500/30">
              📋
            </div>
            <h3
              className={`text-lg font-bold ${
                useTheme().theme === "dark" ? "text-white" : "text-teal-900"
              }`}
            >
              Recent Activity
            </h3>
          </div>
          <div className="space-y-3 text-center py-8">
            <p
              className={`${
                useTheme().theme === "dark"
                  ? "text-gray-400"
                  : "text-teal-700/70"
              }`}
            >
              No recent activity yet
            </p>
            <p
              className={`text-xs ${
                useTheme().theme === "dark"
                  ? "text-gray-500"
                  : "text-teal-600/60"
              }`}
            >
              Your recent actions will appear here
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
