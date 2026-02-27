"use client";

import { useState, useEffect } from "react";
import {
  Users,
  TrendingUp,
  Wallet,
  Clock,
  ExternalLink,
  Copy,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Bell,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";

interface PartnerStats {
  referralCode: string;
  businessName: string;
  totalReferrals: number;
  totalEarned: number;
  totalPaid: number;
  pendingCommission: number;
  totalRevenue: number;
  referralList: Array<{
    id: string;
    tenantId: string;
    subscriptionPlan: string;
    subscriptionAmount: number;
    commissionAmount: number;
    status: string;
    createdAt: string;
  }>;
}

export default function PartnerDashboard() {
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("partner_token");
    if (!token) {
      window.location.href = "/partner/login";
      return;
    }

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/partners/dashboard/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (res.status === 401) {
          localStorage.removeItem("partner_token");
          window.location.href = "/partner/login";
          return;
        }
        if (!res.ok) throw new Error("Failed to load dashboard");
        return res.json();
      })
      .then((data) => {
        if (data) setStats(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const copyCode = () => {
    if (!stats?.referralCode) return;
    navigator.clipboard.writeText(stats.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = () => {
    localStorage.removeItem("partner_token");
    window.location.href = "/partner/login";
  };

  const statCards = stats
    ? [
        { label: "Active Shops", value: stats.totalReferrals.toString(), icon: Users, color: "bg-blue-500" },
        {
          label: "Total Revenue",
          value: `₹${(stats.totalRevenue / 100).toLocaleString("en-IN")}`,
          icon: TrendingUp,
          color: "bg-teal-500",
        },
        {
          label: "Commission Earned",
          value: `₹${(stats.totalEarned / 100).toLocaleString("en-IN")}`,
          icon: Wallet,
          color: "bg-purple-500",
        },
        {
          label: "Pending Payout",
          value: `₹${(stats.pendingCommission / 100).toLocaleString("en-IN")}`,
          icon: Clock,
          color: "bg-orange-500",
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col p-6 space-y-8">
        <img src="/assets/mobibix-main-logo.png" alt="MobiBix" className="h-12 w-auto object-contain" />
        <nav className="flex-1 space-y-1">
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-teal-50 dark:bg-teal-900/20 text-teal-600 font-bold">
            <LayoutDashboard className="w-5 h-5" /> Dashboard
          </a>
        </nav>
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all w-full"
          >
            <LogOut className="w-5 h-5" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-10">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Welcome back{stats ? `, ${stats.businessName}` : ""}!
            </h1>
            <p className="text-slate-500">Here's how your referral network is performing.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl relative">
              <Bell className="w-5 h-5 text-slate-500" />
            </button>
            <div className="h-10 w-10 bg-teal-600 rounded-full flex items-center justify-center text-white font-bold">
              {stats?.businessName?.[0]?.toUpperCase() ?? "P"}
            </div>
          </div>
        </header>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 mb-8">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Stats Grid */}
        {!loading && stats && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              {statCards.map((s, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm"
                >
                  <div className={`${s.color} w-10 h-10 rounded-xl flex items-center justify-center text-white mb-4`}>
                    <s.icon className="w-5 h-5" />
                  </div>
                  <p className="text-sm text-slate-500 font-medium">{s.label}</p>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{s.value}</h3>
                </motion.div>
              ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Referral Code */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-gradient-to-br from-teal-600 to-teal-800 p-8 rounded-[2.5rem] text-white shadow-xl shadow-teal-600/20 relative overflow-hidden">
                  <div className="relative z-10">
                    <h3 className="text-lg font-bold opacity-80 mb-2">My Referral Code</h3>
                    <div className="flex items-center justify-between bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
                      <span className="text-2xl font-mono font-bold tracking-widest">{stats.referralCode}</span>
                      <button onClick={copyCode} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                        <Copy className={`w-5 h-5 ${copied ? "text-teal-300" : "text-white"}`} />
                      </button>
                    </div>
                    <p className="text-sm opacity-70 mt-4 leading-relaxed">
                      Share this code with shop owners to provide them with a free trial.
                    </p>
                  </div>
                  <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                </div>

                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Referral Link</h3>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center gap-3 overflow-hidden">
                    <span className="text-sm text-slate-500 font-mono flex-1 truncate">
                      https://app.REMOVED_DOMAIN/signup?ref={stats.referralCode}
                    </span>
                    <ExternalLink className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Referral List */}
              <div className="lg:col-span-2">
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                  <div className="p-8 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Active Referrals</h3>
                  </div>
                  {stats.referralList.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                      <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p>No referrals yet. Share your referral code to get started.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                          <tr>
                            <th className="text-left px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Plan</th>
                            <th className="text-left px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                            <th className="text-left px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Commission</th>
                            <th className="text-left px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {stats.referralList.map((r) => (
                            <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                              <td className="px-8 py-5 font-medium text-slate-900 dark:text-white">{r.subscriptionPlan}</td>
                              <td className="px-8 py-5 text-sm text-slate-600 dark:text-slate-400">
                                ₹{(r.subscriptionAmount / 100).toLocaleString("en-IN")}
                              </td>
                              <td className="px-8 py-5 text-sm text-teal-600 font-semibold">
                                ₹{(r.commissionAmount / 100).toLocaleString("en-IN")}
                              </td>
                              <td className="px-8 py-5">
                                <span
                                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                                    r.status === "CONFIRMED"
                                      ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                                      : r.status === "PAID"
                                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                                      : "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400"
                                  }`}
                                >
                                  {r.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
