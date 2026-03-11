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
  Gift,
  Menu,
  X,
  Plus,
  CheckCircle2,
  KeyRound,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PartnerStats {
  referralCode: string;
  businessName: string;
  totalReferrals: number;
  totalEarned: number;
  totalPaid: number;
  pendingCommission: number;
  totalRevenue: number;
  promoCodes: Array<{
    id: string;
    code: string;
    type: string;        // FREE_TRIAL | SUBSCRIPTION_BONUS | DISCOUNT
    durationDays: number;
    bonusMonths: number;
    maxUses: number;
    usedCount: number;
    expiresAt: string | null;
  }>;
  referralList: Array<{
    id: string;
    tenantId: string;
    subscriptionPlan: string;
    subscriptionAmount: number;
    commissionAmount: number;
    commissionPercentage: number;
    isFirstPayment: boolean;
    status: string;
    createdAt: string;
  }>;
  referredShops: Array<{
    id: string;
    name: string;
    phone: string | null;
    city: string | null;
    plan: string | null;
    isActive: boolean;
    totalCommission: number;
    joinedAt: string;
  }>;
}

interface CreatePromoForm {
  code: string;
  type: string;
  durationDays: number;
  bonusMonths: number;
  maxUses: number;
  expiresAt: string;
}

export default function PartnerDashboard() {
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Create promo code state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<CreatePromoForm>({
    code: "",
    type: "FREE_TRIAL",
    durationDays: 14,
    bonusMonths: 3,
    maxUses: 100,
    expiresAt: "",
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState(false);

  // Change password state
  const [showChangePw, setShowChangePw] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

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
      .then((json) => {
        const data = json?.data ?? json;
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

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);
    const token = localStorage.getItem("partner_token");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/partners/promo/my`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: createForm.code.toUpperCase(),
          type: createForm.type,
          durationDays: createForm.type === "FREE_TRIAL" ? Number(createForm.durationDays) : 0,
          bonusMonths: createForm.type === "SUBSCRIPTION_BONUS" ? Number(createForm.bonusMonths) : 0,
          maxUses: Number(createForm.maxUses),
          expiresAt: createForm.expiresAt || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message || "Failed to create code");
      }
      setCreateSuccess(true);
      setShowCreateForm(false);
      setCreateForm({ code: "", type: "FREE_TRIAL", durationDays: 14, bonusMonths: 3, maxUses: 100, expiresAt: "" });
      // Refresh stats
      const statsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/partners/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (statsRes.ok) { const j = await statsRes.json(); setStats(j?.data ?? j); }
      setTimeout(() => setCreateSuccess(false), 3000);
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) {
      setPwError("Passwords do not match");
      return;
    }
    if (pwForm.next.length < 8) {
      setPwError("New password must be at least 8 characters");
      return;
    }
    setPwLoading(true);
    setPwError(null);
    const token = localStorage.getItem("partner_token");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/partner/auth/change-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
        }
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed");
      setPwSuccess(true);
      setPwForm({ current: "", next: "", confirm: "" });
      setTimeout(() => { setPwSuccess(false); setShowChangePw(false); }, 3000);
    } catch (err: any) {
      setPwError(err.message);
    } finally {
      setPwLoading(false);
    }
  };

  const statCards = stats
    ? [
        { label: "Active Shops", value: String(stats.totalReferrals ?? 0), icon: Users, color: "bg-blue-500" },
        {
          label: "Total Revenue",
          value: `₹${((stats.totalRevenue ?? 0) / 100).toLocaleString("en-IN")}`,
          icon: TrendingUp,
          color: "bg-teal-500",
        },
        {
          label: "Commission Earned",
          value: `₹${((stats.totalEarned ?? 0) / 100).toLocaleString("en-IN")}`,
          icon: Wallet,
          color: "bg-purple-500",
        },
        {
          label: "Pending Payout",
          value: `₹${((stats.pendingCommission ?? 0) / 100).toLocaleString("en-IN")}`,
          icon: Clock,
          color: "bg-orange-500",
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row relative">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
        <img src="/assets/mobibix-main-logo.png" alt="MobiBix" className="h-8 w-auto object-contain" />
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col p-6 space-y-8 z-50 lg:hidden"
            >
              <div className="flex items-center justify-between">
                <img src="/assets/mobibix-main-logo.png" alt="MobiBix" className="h-10 w-auto object-contain" />
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex-1 space-y-1">
                <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-teal-50 dark:bg-teal-900/20 text-teal-600 font-bold">
                  <LayoutDashboard className="w-5 h-5" /> Dashboard
                </a>
                <button
                  onClick={() => { setShowChangePw((v) => !v); setPwError(null); setPwSuccess(false); }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all w-full font-medium"
                >
                  <KeyRound className="w-5 h-5" /> Change Password
                </button>
              </nav>
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all w-full"
                >
                  <LogOut className="w-5 h-5" /> Logout
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col p-6 space-y-8 h-screen sticky top-0">
        <img src="/assets/mobibix-main-logo.png" alt="MobiBix" className="h-12 w-auto object-contain" />
        <nav className="flex-1 space-y-1">
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-teal-50 dark:bg-teal-900/20 text-teal-600 font-bold">
            <LayoutDashboard className="w-5 h-5" /> Dashboard
          </a>
          <button
            onClick={() => { setShowChangePw((v) => !v); setPwError(null); setPwSuccess(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full font-medium ${showChangePw ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
          >
            <KeyRound className="w-5 h-5" /> Change Password
          </button>
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
      <main className="flex-1 p-6 lg:p-10 w-full overflow-x-hidden">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Welcome back{stats?.businessName ? `, ${stats.businessName}` : ""}!
            </h1>
            <p className="text-slate-500">Here&apos;s how your referral network is performing.</p>
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

            {/* Change Password Panel */}
            <AnimatePresence>
              {showChangePw && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mb-2"
                >
                  <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 max-w-md">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                      <KeyRound className="w-5 h-5 text-teal-600" /> Change Password
                    </h3>
                    {pwSuccess ? (
                      <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-700 dark:text-emerald-400 text-sm font-bold">
                        <CheckCircle2 className="w-5 h-5" /> Password changed successfully!
                      </div>
                    ) : (
                      <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Current Password</label>
                          <input
                            required
                            type="password"
                            value={pwForm.current}
                            onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
                            placeholder="••••••••"
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">New Password</label>
                          <input
                            required
                            type="password"
                            value={pwForm.next}
                            onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })}
                            placeholder="Min 8 characters"
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Confirm New Password</label>
                          <input
                            required
                            type="password"
                            value={pwForm.confirm}
                            onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                            placeholder="Repeat new password"
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                          />
                        </div>
                        {pwError && (
                          <p className="text-xs text-red-600 font-medium flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5" /> {pwError}
                          </p>
                        )}
                        <div className="flex gap-2 pt-1">
                          <button
                            type="submit"
                            disabled={pwLoading}
                            className="flex-1 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
                          >
                            {pwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Update Password</>}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowChangePw(false)}
                            className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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
                      Share your promo codes below — shops get a free trial or +3 months on first paid plan.
                    </p>
                  </div>
                  <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                </div>

                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Referral Link</h3>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center gap-3 overflow-hidden">
                    <span className="text-sm text-slate-500 font-mono flex-1 truncate">
                      {`https://app.REMOVED_DOMAIN/signup?ref=${stats.referralCode}`}
                    </span>
                    <button onClick={() => {
                        navigator.clipboard.writeText(`https://app.REMOVED_DOMAIN/signup?ref=${stats.referralCode}`);
                        alert("Referral link copied!");
                    }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                      <Copy className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                </div>

                {/* Promo Codes */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Active Promo Codes</h3>
                    <button
                      onClick={() => { setShowCreateForm((v) => !v); setCreateError(null); }}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Create Code
                    </button>
                  </div>

                  {/* Create promo form */}
                  <AnimatePresence>
                    {showCreateForm && (
                      <motion.form
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        onSubmit={handleCreatePromo}
                        className="mb-6 overflow-hidden"
                      >
                        <div className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl space-y-3">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">New Campaign Code (max 5)</p>

                          <input
                            required
                            placeholder="Code (e.g. SUMMER25)"
                            value={createForm.code}
                            onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })}
                            className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-sm font-mono font-bold uppercase text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />

                          <select
                            value={createForm.type}
                            onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                          >
                            <option value="FREE_TRIAL">Free Trial (N days)</option>
                            <option value="SUBSCRIPTION_BONUS">+N Months on First Paid Plan</option>
                          </select>

                          {createForm.type === "FREE_TRIAL" && (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={1}
                                required
                                placeholder="Trial days"
                                value={createForm.durationDays}
                                onChange={(e) => setCreateForm({ ...createForm, durationDays: Number(e.target.value) })}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                              />
                              <span className="text-xs font-bold text-slate-500">days</span>
                            </div>
                          )}

                          {createForm.type === "SUBSCRIPTION_BONUS" && (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={1}
                                max={3}
                                required
                                placeholder="Bonus months (max 3)"
                                value={createForm.bonusMonths}
                                onChange={(e) => setCreateForm({ ...createForm, bonusMonths: Math.min(3, Math.max(1, Number(e.target.value))) })}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                              />
                              <span className="text-xs font-bold text-slate-500">months (max 3)</span>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Max Uses</p>
                              <input
                                type="number"
                                min={1}
                                value={createForm.maxUses}
                                onChange={(e) => setCreateForm({ ...createForm, maxUses: Number(e.target.value) })}
                                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                              />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Expires (optional)</p>
                              <input
                                type="date"
                                value={createForm.expiresAt}
                                onChange={(e) => setCreateForm({ ...createForm, expiresAt: e.target.value })}
                                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                              />
                            </div>
                          </div>

                          {createError && (
                            <p className="text-xs text-red-600 font-medium">{createError}</p>
                          )}

                          <div className="flex gap-2 pt-1">
                            <button
                              type="submit"
                              disabled={createLoading}
                              className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
                            >
                              {createLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Create Code</>}
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowCreateForm(false)}
                              className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </motion.form>
                    )}
                  </AnimatePresence>

                  {createSuccess && (
                    <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" /> Promo code created successfully!
                    </div>
                  )}

                  <div className="space-y-4">
                    {(stats.promoCodes ?? []).map((pc) => (
                      <div key={pc.id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-sm font-bold text-teal-600 font-mono tracking-wider">{pc.code}</span>
                          <button onClick={() => {
                              navigator.clipboard.writeText(pc.code);
                              alert(`Promo code ${pc.code} copied!`);
                          }} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors">
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                          <span>
                            {pc.type === "FREE_TRIAL"
                              ? `${pc.durationDays}-Day Free Trial`
                              : pc.type === "SUBSCRIPTION_BONUS"
                              ? `+${pc.bonusMonths} Months on First Plan`
                              : "Discount Code"}
                          </span>
                          <span>{pc.usedCount} / {pc.maxUses} Uses</span>
                        </div>
                      </div>
                    ))}
                    {(stats.promoCodes ?? []).length === 0 && (
                      <p className="text-sm text-slate-500 text-center py-4">No active promo codes. Create your first campaign code above.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Referral List */}
              <div className="lg:col-span-2">
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                  <div className="p-8 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Active Referrals</h3>
                  </div>
                  {(stats.referralList ?? []).length === 0 ? (
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
                            <th className="text-left px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                            <th className="text-left px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Commission</th>
                            <th className="text-left px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {(stats.referralList ?? []).map((r) => (
                            <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                              <td className="px-8 py-5 font-medium text-slate-900 dark:text-white">{r.subscriptionPlan}</td>
                              <td className="px-8 py-5 text-sm text-slate-600 dark:text-slate-400">
                                ₹{(r.subscriptionAmount / 100).toLocaleString("en-IN")}
                              </td>
                              <td className="px-8 py-5">
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${r.isFirstPayment ? "bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}>
                                  {r.isFirstPayment ? `First (${r.commissionPercentage}%)` : `Renewal (${r.commissionPercentage}%)`}
                                </span>
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

            {/* My Shops CRM */}
            {(stats.referredShops ?? []).length > 0 && (
              <div className="mt-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">My Shops</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Businesses using your referral code</p>
                  </div>
                  <span className="text-xs font-bold bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 px-3 py-1.5 rounded-full">
                    {(stats.referredShops ?? []).length} shops
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                      <tr>
                        <th className="text-left px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Shop</th>
                        <th className="text-left px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Location</th>
                        <th className="text-left px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Plan</th>
                        <th className="text-left px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="text-left px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Your Commission</th>
                        <th className="text-left px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(stats.referredShops ?? []).map((shop) => (
                        <tr key={shop.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-8 py-5">
                            <div className="font-semibold text-slate-900 dark:text-white text-sm">{shop.name}</div>
                            {shop.phone && <div className="text-xs text-slate-400 mt-0.5">{shop.phone}</div>}
                          </td>
                          <td className="px-8 py-5 text-sm text-slate-500">{shop.city ?? "—"}</td>
                          <td className="px-8 py-5 text-sm text-slate-600 dark:text-slate-400">{shop.plan ?? "—"}</td>
                          <td className="px-8 py-5">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${shop.isActive ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                              {shop.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-sm font-semibold text-teal-600">
                            ₹{(shop.totalCommission / 100).toLocaleString("en-IN")}
                          </td>
                          <td className="px-8 py-5 text-xs text-slate-400">
                            {new Date(shop.joinedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
