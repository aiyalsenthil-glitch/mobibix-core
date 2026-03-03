"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface GlobalStats {
  totalTenants: number;
  totalUsers: number;
  mrr: number;
  churnRate: number;
}

interface GrowthData {
  month: string;
  tenants: number;
}

export default function AdminDashboard() {
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [growthData, setGrowthData] = useState<GrowthData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          setError("Not authenticated");
          setLoading(false);
          return;
        }

        const [statsRes, growthRes] = await Promise.all([
          fetch("/api/admin/analytics/global", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/admin/analytics/growth", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!statsRes.ok || !growthRes.ok) {
          throw new Error("Failed to fetch analytics");
        }

        const stats = await statsRes.json();
        const growth = await growthRes.json();

        setGlobalStats(stats);
        setGrowthData(growth);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-stone-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-2">⚠️ Error</p>
          <p className="text-stone-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🎯 Admin Dashboard
          </h1>
          <p className="text-stone-400">
            Platform analytics and tenant management
          </p>
        </div>

        {/* Global Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur">
            <p className="text-stone-400 text-sm mb-2">Total Tenants</p>
            <p className="text-3xl font-bold text-teal-300">
              {globalStats?.totalTenants || 0}
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur">
            <p className="text-stone-400 text-sm mb-2">Total Users</p>
            <p className="text-3xl font-bold text-purple-300">
              {globalStats?.totalUsers || 0}
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur">
            <p className="text-stone-400 text-sm mb-2">Monthly Revenue (MRR)</p>
            <p className="text-3xl font-bold text-green-300">
              ${globalStats?.mrr?.toFixed(2) || "0.00"}
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur">
            <p className="text-stone-400 text-sm mb-2">Churn Rate</p>
            <p className="text-3xl font-bold text-orange-300">
              {globalStats?.churnRate || 0}%
            </p>
          </div>
        </div>

        {/* Growth Chart */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur mb-8">
          <h2 className="text-2xl font-bold text-teal-300 mb-6">
            📈 Tenant Growth (Last 6 Months)
          </h2>
          <div className="space-y-4">
            {growthData.map((data) => (
              <div key={data.month} className="flex items-center gap-4">
                <div className="w-24 text-stone-400 text-sm">{data.month}</div>
                <div className="flex-1">
                  <div className="bg-stone-800 rounded-full h-8 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-teal-500 to-purple-500 h-full flex items-center px-4"
                      style={{
                        width: `${Math.max((data.tenants / Math.max(...growthData.map((d) => d.tenants))) * 100, 5)}%`,
                      }}
                    >
                      <span className="text-sm font-semibold text-white">
                        {data.tenants}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur">
          <h2 className="text-2xl font-bold text-purple-300 mb-4">
            ⚡ Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="px-6 py-3 bg-teal-500 hover:bg-teal-600 rounded-lg font-semibold transition-all">
              Manage Tenants
            </button>
            <button className="px-6 py-3 bg-purple-500 hover:bg-purple-600 rounded-lg font-semibold transition-all">
              View Subscriptions
            </button>
            <Link href="/dashboard/admin/privacy" className="px-6 py-3 bg-red-500 hover:bg-red-600 rounded-lg font-semibold transition-all text-center">
              Privacy & Deletions
            </Link>
            <button className="px-6 py-3 bg-orange-500 hover:bg-orange-600 rounded-lg font-semibold transition-all">
              System Logs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
