"use client";

import { useState, useEffect } from "react";
import {
  Users,
  TrendingUp,
  Wallet,
  Clock,
  Copy,
  LogOut,
  Bell,
  Loader2,
  AlertCircle,
  Plus,
  CheckCircle2,
  KeyRound,
  MessageCircle,
  Award,
  X,
  Repeat,
  Store,
  ChevronRight,
  ArrowUpRight,
  UserCircle,
  Save,
  Phone,
  MapPin,
  Mail,
  Building2,
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
    type: string;
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
    renewalDate: string | null;
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

interface PartnerProfile {
  id: string;
  businessName: string;
  contactPerson: string;
  email: string;
  phone: string;
  region: string | null;
  partnerType: string;
  referralCode: string;
  status: string;
  firstCommissionPct: number;
  renewalCommissionPct: number;
  totalEarned: number;
  totalPaid: number;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  bankName: string | null;
  upiId: string | null;
  payoutRequestedAt: string | null;
  lastPayoutAt: string | null;
  approvedAt: string | null;
  createdAt: string;
}

const TIERS = [
  { name: "Starter", emoji: "🌱", recurring: 5, next: 5, nextName: "Growth (10%)", min: 0, max: 4, color: "text-slate-600 bg-slate-100 border-slate-200", bar: "bg-slate-400" },
  { name: "Growth", emoji: "📈", recurring: 10, next: 21, nextName: "Pro (15%)", min: 5, max: 20, color: "text-blue-700 bg-blue-50 border-blue-200", bar: "bg-blue-500" },
  { name: "Pro", emoji: "⚡", recurring: 15, next: 51, nextName: "Elite (20%)", min: 21, max: 50, color: "text-violet-700 bg-violet-50 border-violet-200", bar: "bg-violet-500" },
  { name: "Elite", emoji: "👑", recurring: 20, next: null, nextName: null, min: 51, max: null, color: "text-amber-700 bg-amber-50 border-amber-200", bar: "bg-amber-500" },
];

function getTier(count: number) {
  if (count >= 51) return { ...TIERS[3], progress: 100 };
  if (count >= 21) return { ...TIERS[2], progress: Math.round(((count - 21) / 30) * 100) };
  if (count >= 5) return { ...TIERS[1], progress: Math.round(((count - 5) / 16) * 100) };
  return { ...TIERS[0], progress: Math.round((count / 5) * 100) };
}

export default function PartnerDashboard() {
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Promo state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<CreatePromoForm>({ code: "", type: "FREE_TRIAL", durationDays: 14, bonusMonths: 3, maxUses: 100, expiresAt: "" });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState<Array<{ id: string; type: string; title: string; body: string; isRead: boolean; createdAt: string }>>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  // Change password
  const [showChangePw, setShowChangePw] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  // Profile
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [profileForm, setProfileForm] = useState({
    businessName: "", contactPerson: "", phone: "", region: "",
    bankAccountName: "", bankAccountNumber: "", bankIfsc: "", bankName: "", upiId: "",
  });
  const [payoutRequesting, setPayoutRequesting] = useState(false);
  const [payoutMsg, setPayoutMsg] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState<"overview" | "shops" | "commissions" | "profile">("overview");

  const token = typeof window !== "undefined" ? localStorage.getItem("partner_token") : null;

  useEffect(() => {
    if (!token) { window.location.href = "/partner/login"; return; }
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/partners/dashboard/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (res.status === 401) { localStorage.removeItem("partner_token"); window.location.href = "/partner/login"; return; }
        if (!res.ok) throw new Error("Failed to load dashboard");
        return res.json();
      })
      .then((json) => { const d = json?.data ?? json; if (d) setStats(d); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/partner/auth/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((json) => {
        const d = json?.data ?? json;
        if (d) { setNotifications(d.items ?? []); setUnreadCount(d.unreadCount ?? 0); }
      })
      .catch(() => {});
  }, []);

  // Fetch full profile when Profile tab is first opened
  const fetchProfile = async () => {
    if (!token || profileLoading) return;
    setProfileLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/partner/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load profile");
      const json = await res.json();
      const d: PartnerProfile = json?.data ?? json;
      setProfile(d);
      setProfileForm({
        businessName: d.businessName ?? "",
        contactPerson: d.contactPerson ?? "",
        phone: d.phone ?? "",
        region: d.region ?? "",
        bankAccountName: d.bankAccountName ?? "",
        bankAccountNumber: d.bankAccountNumber ?? "",
        bankIfsc: d.bankIfsc ?? "",
        bankName: d.bankName ?? "",
        upiId: d.upiId ?? "",
      });
    } catch (err: any) {
      setProfileError(err.message);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setProfileSaving(true); setProfileError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/partner/auth/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(profileForm),
      });
      if (!res.ok) { const b = await res.json(); throw new Error(b.message || "Failed to update profile"); }
      const json = await res.json();
      const d: PartnerProfile = json?.data ?? json;
      setProfile(d);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3500);
    } catch (err: any) { setProfileError(err.message); }
    finally { setProfileSaving(false); }
  };

  const handleRequestPayout = async () => {
    if (!token || payoutRequesting) return;
    setPayoutRequesting(true); setPayoutMsg(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/partner/auth/request-payout`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      const d = json?.data ?? json;
      if (!res.ok) throw new Error(d.message || "Failed");
      setPayoutMsg(`Payout request submitted! ₹${((d.pendingAmount ?? 0) / 100).toLocaleString("en-IN")} will be processed by the 5th.`);
      if (profile) setProfile({ ...profile, payoutRequestedAt: new Date().toISOString() });
    } catch (err: any) { setPayoutMsg(`Error: ${err.message}`); }
    finally { setPayoutRequesting(false); }
  };

  const getNextPayoutDate = () => {
    const now = new Date();
    const fifth = new Date(now.getFullYear(), now.getMonth() + (now.getDate() >= 5 ? 1 : 0), 5);
    return fifth.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const markAllRead = () => {
    if (!token) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/partner/auth/notifications/read`, {
      method: "PATCH", headers: { Authorization: `Bearer ${token}` },
    }).then(() => { setUnreadCount(0); setNotifications((n) => n.map((x) => ({ ...x, isRead: true }))); });
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true); setCreateError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/partners/promo/my`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          code: createForm.code.toUpperCase(),
          type: createForm.type,
          durationDays: createForm.type === "FREE_TRIAL" ? Number(createForm.durationDays) : 0,
          bonusMonths: createForm.type === "SUBSCRIPTION_BONUS" ? Number(createForm.bonusMonths) : 0,
          maxUses: Number(createForm.maxUses),
          expiresAt: createForm.expiresAt || undefined,
        }),
      });
      if (!res.ok) { const b = await res.json(); throw new Error(b.message || "Failed"); }
      setCreateSuccess(true); setShowCreateForm(false);
      setCreateForm({ code: "", type: "FREE_TRIAL", durationDays: 14, bonusMonths: 3, maxUses: 100, expiresAt: "" });
      const sr = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/partners/dashboard/stats`, { headers: { Authorization: `Bearer ${token}` } });
      if (sr.ok) { const j = await sr.json(); setStats(j?.data ?? j); }
      setTimeout(() => setCreateSuccess(false), 3000);
    } catch (err: any) { setCreateError(err.message); }
    finally { setCreateLoading(false); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) { setPwError("Passwords do not match"); return; }
    if (pwForm.next.length < 8) { setPwError("Min 8 characters"); return; }
    setPwLoading(true); setPwError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/partner/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed");
      setPwSuccess(true); setPwForm({ current: "", next: "", confirm: "" });
      setTimeout(() => { setPwSuccess(false); setShowChangePw(false); }, 3000);
    } catch (err: any) { setPwError(err.message); }
    finally { setPwLoading(false); }
  };

  const tier = stats ? getTier(stats.totalReferrals) : null;

  const STAT_CARDS = stats ? [
    { label: "Active Shops", value: String(stats.totalReferrals ?? 0), icon: Users, gradient: "from-blue-500 to-cyan-500", sub: "Total referred" },
    { label: "Commission Earned", value: `₹${((stats.totalEarned ?? 0) / 100).toLocaleString("en-IN")}`, icon: Wallet, gradient: "from-violet-500 to-purple-600", sub: "All time" },
    { label: "Pending Payout", value: `₹${((stats.pendingCommission ?? 0) / 100).toLocaleString("en-IN")}`, icon: Clock, gradient: "from-orange-500 to-amber-500", sub: "Awaiting transfer" },
    { label: "Total Paid Out", value: `₹${((stats.totalPaid ?? 0) / 100).toLocaleString("en-IN")}`, icon: TrendingUp, gradient: "from-emerald-500 to-teal-500", sub: "Received" },
  ] : [];

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0a0f1e]">

      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#0d1220]/90 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <img src="/assets/mobibix-main-logo.png" alt="MobiBix" className="h-8 w-auto object-contain" />
            <nav className="hidden md:flex items-center gap-1">
              {(["overview", "shops", "commissions", "profile"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); if (tab === "profile" && !profile) fetchProfile(); }}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${activeTab === tab ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => { setShowNotifications((v) => !v); if (unreadCount > 0) markAllRead(); }}
                className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-12 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">Notifications</span>
                      <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-10">No notifications yet</p>
                      ) : notifications.map((n) => (
                        <div key={n.id} className={`px-4 py-3 border-b border-slate-50 dark:border-slate-800/50 last:border-0 ${n.isRead ? "" : "bg-blue-50/50 dark:bg-blue-900/10"}`}>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">{n.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5 leading-snug">{n.body}</p>
                          <p className="text-[10px] text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString("en-IN")}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Change password */}
            <button
              onClick={() => { setShowChangePw((v) => !v); setPwError(null); setPwSuccess(false); }}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Change Password"
            >
              <KeyRound className="w-5 h-5" />
            </button>

            {/* Avatar + logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700 ml-1">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white text-sm font-black">
                {stats?.businessName?.[0]?.toUpperCase() ?? "P"}
              </div>
              <button
                onClick={() => { localStorage.removeItem("partner_token"); window.location.href = "/partner/login"; }}
                className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Change Password Panel */}
        <AnimatePresence>
          {showChangePw && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 max-w-md">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-teal-600" /> Change Password
                </h3>
                {pwSuccess ? (
                  <div className="flex items-center gap-2 text-emerald-700 text-sm font-semibold"><CheckCircle2 className="w-4 h-4" /> Password changed successfully!</div>
                ) : (
                  <form onSubmit={handleChangePassword} className="space-y-3">
                    {["current", "next", "confirm"].map((field) => (
                      <input key={field} required type="password" placeholder={field === "current" ? "Current password" : field === "next" ? "New password (min 8)" : "Confirm new password"}
                        value={pwForm[field as keyof typeof pwForm]}
                        onChange={(e) => setPwForm({ ...pwForm, [field]: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                      />
                    ))}
                    {pwError && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{pwError}</p>}
                    <div className="flex gap-2">
                      <button type="submit" disabled={pwLoading} className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold flex items-center justify-center gap-2">
                        {pwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Password"}
                      </button>
                      <button type="button" onClick={() => setShowChangePw(false)} className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-bold">Cancel</button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading */}
        {loading && <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-teal-600 animate-spin" /></div>}
        {error && !loading && (
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-2xl text-red-600 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />{error}
          </div>
        )}

        {!loading && stats && (
          <>
            {/* Hero Row: Welcome + Tier */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                  Welcome back, {stats.businessName || "Partner"}!
                </h1>
                <p className="text-slate-500 text-sm mt-0.5">Here's how your referral network is performing today.</p>
              </div>
              {tier && (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${tier.color}`}>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Award className="w-4 h-4" />
                      <span className="text-sm font-black">{tier.emoji} {tier.name} Partner</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <Repeat className="w-3 h-3 opacity-60" />
                      <span className="text-xs font-bold opacity-80">{tier.recurring}% recurring commission</span>
                    </div>
                  </div>
                  {tier.next !== null && (
                    <div className="ml-2 text-right">
                      <div className="w-24 h-1.5 bg-black/10 rounded-full overflow-hidden mb-1">
                        <div className={`h-full ${tier.bar} rounded-full`} style={{ width: `${tier.progress}%` }} />
                      </div>
                      <span className="text-[10px] font-bold opacity-60">{stats.totalReferrals}/{tier.next} → {tier.nextName}</span>
                    </div>
                  )}
                  {tier.next === null && (
                    <span className="text-[10px] font-black opacity-60 ml-2">MAX TIER</span>
                  )}
                </div>
              )}
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {STAT_CARDS.map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                  className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-5 overflow-hidden"
                >
                  <div className={`absolute -top-6 -right-6 w-20 h-20 bg-gradient-to-br ${s.gradient} opacity-10 rounded-full blur-xl`} />
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center mb-3`}>
                    <s.icon className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">{s.label}</p>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">{s.value}</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">{s.sub}</p>
                </motion.div>
              ))}
            </div>

            {/* Tabs (mobile) */}
            <div className="flex md:hidden items-center gap-2 overflow-x-auto pb-1">
              {(["overview", "shops", "commissions", "profile"] as const).map((tab) => (
                <button key={tab} onClick={() => { setActiveTab(tab); if (tab === "profile" && !profile) fetchProfile(); }}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize whitespace-nowrap transition-all ${activeTab === tab ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900" : "bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700"}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Overview Tab */}
            {(activeTab === "overview") && (
              <div className="grid lg:grid-cols-3 gap-6">

                {/* Left column */}
                <div className="space-y-5">
                  {/* Referral Code Card */}
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white">
                    <div className="absolute -top-8 -right-8 w-32 h-32 bg-teal-500/20 rounded-full blur-2xl" />
                    <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-violet-500/20 rounded-full blur-2xl" />
                    <div className="relative">
                      <p className="text-xs font-bold text-white/60 uppercase tracking-widest mb-3">My Referral Code</p>
                      <div className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-3 mb-4 backdrop-blur-sm">
                        <span className="text-xl font-mono font-black tracking-widest">{stats.referralCode}</span>
                        <button onClick={() => copy(stats.referralCode, "code")} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                          <Copy className={`w-4 h-4 ${copied === "code" ? "text-teal-400" : "text-white/60"}`} />
                        </button>
                      </div>
                      <p className="text-xs text-white/50 leading-relaxed">Share your code — shops get free trial or +3 months bonus on their first paid plan.</p>
                    </div>
                  </div>

                  {/* Referral Link */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Referral Link</p>
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2.5 mb-3">
                      <span className="text-xs text-slate-500 font-mono flex-1 truncate">REMOVED_DOMAIN/pricing?ref={stats.referralCode}</span>
                      <button onClick={() => copy(`https://REMOVED_DOMAIN/pricing?ref=${stats.referralCode}`, "link")} className="flex-shrink-0 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg">
                        <Copy className={`w-3.5 h-3.5 ${copied === "link" ? "text-teal-500" : "text-slate-400"}`} />
                      </button>
                    </div>
                    <button
                      onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Bhai, main MobiBix use kar raha hoon apne mobile shop ke liye — job cards, GST billing, stock sab ek jagah! 🚀\n\nFree try karo mere code se: ${stats.referralCode}\n👉 https://REMOVED_DOMAIN/pricing?ref=${stats.referralCode}`)}`, "_blank")}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-sm font-bold transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" /> Share on WhatsApp
                    </button>
                  </div>

                  {/* Promo Codes */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">Promo Codes</p>
                      <button onClick={() => { setShowCreateForm((v) => !v); setCreateError(null); }}
                        className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 hover:bg-teal-100 transition-colors">
                        <Plus className="w-3 h-3" /> New
                      </button>
                    </div>

                    <AnimatePresence>
                      {showCreateForm && (
                        <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                          onSubmit={handleCreatePromo} className="mb-4 overflow-hidden">
                          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-2.5">
                            <input required placeholder="Code e.g. SUMMER25" value={createForm.code}
                              onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })}
                              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-sm font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-teal-500" />
                            <select value={createForm.type} onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
                              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                              <option value="FREE_TRIAL">Free Trial (N days)</option>
                              <option value="SUBSCRIPTION_BONUS">+N Bonus Months</option>
                            </select>
                            {createForm.type === "FREE_TRIAL" && (
                              <div className="flex items-center gap-2">
                                <input type="number" min={1} value={createForm.durationDays}
                                  onChange={(e) => setCreateForm({ ...createForm, durationDays: Number(e.target.value) })}
                                  className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                                <span className="text-xs font-bold text-slate-500">days</span>
                              </div>
                            )}
                            {createForm.type === "SUBSCRIPTION_BONUS" && (
                              <div className="flex items-center gap-2">
                                <input type="number" min={1} max={3} value={createForm.bonusMonths}
                                  onChange={(e) => setCreateForm({ ...createForm, bonusMonths: Math.min(3, Math.max(1, Number(e.target.value))) })}
                                  className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                                <span className="text-xs font-bold text-slate-500">months (max 3)</span>
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-2">
                              <input type="number" min={1} placeholder="Max uses" value={createForm.maxUses}
                                onChange={(e) => setCreateForm({ ...createForm, maxUses: Number(e.target.value) })}
                                className="px-3 py-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                              <input type="date" value={createForm.expiresAt}
                                onChange={(e) => setCreateForm({ ...createForm, expiresAt: e.target.value })}
                                className="px-3 py-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                            </div>
                            {createError && <p className="text-xs text-red-600">{createError}</p>}
                            <div className="flex gap-2">
                              <button type="submit" disabled={createLoading}
                                className="flex-1 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold flex items-center justify-center gap-1.5">
                                {createLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><CheckCircle2 className="w-3.5 h-3.5" /> Create</>}
                              </button>
                              <button type="button" onClick={() => setShowCreateForm(false)} className="px-3 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-sm font-bold">✕</button>
                            </div>
                          </div>
                        </motion.form>
                      )}
                    </AnimatePresence>

                    {createSuccess && (
                      <div className="mb-3 flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-xl">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Promo code created!
                      </div>
                    )}

                    <div className="space-y-2.5">
                      {(stats.promoCodes ?? []).map((pc) => (
                        <div key={pc.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black font-mono text-teal-600">{pc.code}</span>
                              <button onClick={() => copy(pc.code, pc.code)} className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded">
                                <Copy className={`w-3 h-3 ${copied === pc.code ? "text-teal-500" : "text-slate-400"}`} />
                              </button>
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                              {pc.type === "FREE_TRIAL" ? `${pc.durationDays}-day trial` : `+${pc.bonusMonths}mo bonus`}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-black text-slate-600 dark:text-slate-300">{pc.usedCount}/{pc.maxUses}</span>
                            <p className="text-[10px] text-slate-400">uses</p>
                          </div>
                        </div>
                      ))}
                      {(stats.promoCodes ?? []).length === 0 && (
                        <p className="text-xs text-slate-400 text-center py-4">No codes yet. Create your first campaign above.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right column: Recent commissions */}
                <div className="lg:col-span-2 space-y-5">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Commissions</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{(stats.referralList ?? []).length} transactions</p>
                      </div>
                      <button onClick={() => setActiveTab("commissions")} className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1">
                        View all <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {(stats.referralList ?? []).length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-14 text-slate-400">
                        <Users className="w-8 h-8 mb-2 opacity-30" />
                        <p className="text-sm font-medium">No referrals yet</p>
                        <p className="text-xs mt-1">Share your referral link to get started</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50">
                              <th className="text-left px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Plan</th>
                              <th className="text-left px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Amount</th>
                              <th className="text-left px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Type</th>
                              <th className="text-left px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Commission</th>
                              <th className="text-left px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {(stats.referralList ?? []).slice(0, 8).map((r) => (
                              <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                <td className="px-6 py-3.5 text-sm font-semibold text-slate-800 dark:text-slate-200">{r.subscriptionPlan}</td>
                                <td className="px-6 py-3.5 text-sm text-slate-500">₹{(r.subscriptionAmount / 100).toLocaleString("en-IN")}</td>
                                <td className="px-6 py-3.5">
                                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${r.isFirstPayment ? "bg-teal-50 dark:bg-teal-900/20 text-teal-700" : "bg-slate-100 dark:bg-slate-800 text-slate-600"}`}>
                                    {r.isFirstPayment ? `First · ${r.commissionPercentage}%` : `Renewal · ${r.commissionPercentage}%`}
                                  </span>
                                </td>
                                <td className="px-6 py-3.5 text-sm font-bold text-teal-600">₹{(r.commissionAmount / 100).toLocaleString("en-IN")}</td>
                                <td className="px-6 py-3.5">
                                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${r.status === "CONFIRMED" ? "bg-emerald-50 text-emerald-700" : r.status === "PAID" ? "bg-blue-50 text-blue-700" : "bg-orange-50 text-orange-700"}`}>
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

                  {/* Payout info banner */}
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-0.5">Next Payout Date</p>
                      <p className="text-sm font-black text-slate-900 dark:text-white">{getNextPayoutDate()}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Payouts processed every month on the 5th</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {stats.pendingCommission > 0 && (
                        <button
                          onClick={handleRequestPayout}
                          disabled={payoutRequesting}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors disabled:opacity-60 whitespace-nowrap"
                        >
                          {payoutRequesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wallet className="w-3.5 h-3.5" />}
                          Request ₹{((stats.pendingCommission) / 100).toLocaleString("en-IN")} Payout
                        </button>
                      )}
                      {payoutMsg && <p className={`text-[11px] font-bold max-w-48 text-right ${payoutMsg.startsWith("Error") ? "text-red-600" : "text-emerald-600"}`}>{payoutMsg}</p>}
                    </div>
                  </div>

                  {/* Quick stats row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Commission Rate</p>
                      <div className="flex items-end gap-2">
                        <span className="text-3xl font-black text-slate-900 dark:text-white">30%</span>
                        <span className="text-sm text-slate-400 font-semibold mb-0.5">first payment</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-2">
                        <Repeat className="w-3.5 h-3.5 text-teal-500" />
                        <span className="text-sm font-bold text-teal-600">{tier?.recurring ?? 5}% recurring</span>
                        <span className="text-xs text-slate-400">({tier?.name ?? "Starter"} tier)</span>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Shops CRM</p>
                      <div className="flex items-end gap-2">
                        <span className="text-3xl font-black text-slate-900 dark:text-white">{stats.referredShops?.length ?? 0}</span>
                        <span className="text-sm text-slate-400 font-semibold mb-0.5">total shops</span>
                      </div>
                      <button onClick={() => setActiveTab("shops")} className="mt-2 text-xs font-bold text-teal-600 flex items-center gap-1 hover:gap-2 transition-all">
                        View all shops <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Shops Tab */}
            {activeTab === "shops" && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2"><Store className="w-4 h-4 text-teal-600" /> My Shops</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Businesses using your referral code</p>
                  </div>
                  <span className="text-xs font-bold bg-teal-50 dark:bg-teal-900/20 text-teal-700 px-2.5 py-1 rounded-full">
                    {(stats.referredShops ?? []).length} shops
                  </span>
                </div>
                {(stats.referredShops ?? []).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <Store className="w-10 h-10 mb-3 opacity-20" />
                    <p className="text-sm font-medium">No shops referred yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50">
                          {["Shop", "Location", "Plan", "Status", "Renews On", "Your Commission", "Joined"].map((h) => (
                            <th key={h} className="text-left px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {(stats.referredShops ?? []).map((shop) => (
                          <tr key={shop.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                            <td className="px-6 py-4">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">{shop.name}</p>
                              {shop.phone && <p className="text-xs text-slate-400 mt-0.5">{shop.phone}</p>}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-500">{shop.city ?? "—"}</td>
                            <td className="px-6 py-4 text-sm text-slate-500">{shop.plan ?? "—"}</td>
                            <td className="px-6 py-4">
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${shop.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                {shop.isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-400">
                              {shop.renewalDate
                                ? new Date(shop.renewalDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                                : "—"}
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-teal-600">₹{(shop.totalCommission / 100).toLocaleString("en-IN")}</td>
                            <td className="px-6 py-4 text-xs text-slate-400">{new Date(shop.joinedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div className="max-w-2xl space-y-6">
                {profileLoading ? (
                  <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 text-teal-600 animate-spin" /></div>
                ) : (
                  <>
                    {/* Read-only info card */}
                    {profile && (
                      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                        <div className="flex items-center gap-4 mb-6">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white text-2xl font-black">
                            {profile.businessName?.[0]?.toUpperCase() ?? "P"}
                          </div>
                          <div>
                            <h2 className="text-lg font-black text-slate-900 dark:text-white">{profile.businessName}</h2>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${profile.status === "APPROVED" ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"}`}>
                                {profile.status}
                              </span>
                              <span className="text-xs text-slate-400 font-medium">{profile.partnerType?.replace(/_/g, " ")}</span>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { icon: Mail, label: "Email", value: profile.email },
                            { icon: Copy, label: "Referral Code", value: profile.referralCode },
                            { icon: TrendingUp, label: "First Commission", value: `${profile.firstCommissionPct}%` },
                            { icon: Repeat, label: "Renewal Commission", value: `${profile.renewalCommissionPct}%` },
                          ].map((item) => (
                            <div key={item.label} className="flex items-start gap-2.5 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                              <item.icon className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{item.label}</p>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">{item.value}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        {profile.approvedAt && (
                          <p className="text-xs text-slate-400 mt-4">Partner since {new Date(profile.approvedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
                        )}
                      </div>
                    )}

                    {/* Editable form */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
                        <UserCircle className="w-4 h-4 text-teal-600" /> Edit Profile
                      </h3>
                      <form onSubmit={handleUpdateProfile} className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                              <Building2 className="w-3 h-3" /> Business Name
                            </label>
                            <input
                              required
                              value={profileForm.businessName}
                              onChange={(e) => setProfileForm({ ...profileForm, businessName: e.target.value })}
                              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                              placeholder="Your Business Name"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                              <UserCircle className="w-3 h-3" /> Contact Person
                            </label>
                            <input
                              required
                              value={profileForm.contactPerson}
                              onChange={(e) => setProfileForm({ ...profileForm, contactPerson: e.target.value })}
                              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                              placeholder="Full Name"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                              <Phone className="w-3 h-3" /> Phone
                            </label>
                            <input
                              required
                              value={profileForm.phone}
                              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                              placeholder="+91 98765 43210"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                              <MapPin className="w-3 h-3" /> Region / City
                            </label>
                            <input
                              value={profileForm.region}
                              onChange={(e) => setProfileForm({ ...profileForm, region: e.target.value })}
                              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                              placeholder="e.g. Mumbai, Maharashtra"
                            />
                          </div>
                        </div>
                        {/* Bank Details */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                          <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                            <Wallet className="w-3 h-3" /> Bank / UPI Details for Payout
                          </p>
                          <div className="grid sm:grid-cols-2 gap-4">
                            {[
                              { key: "bankAccountName", label: "Account Holder Name", placeholder: "As per bank records" },
                              { key: "bankName", label: "Bank Name", placeholder: "e.g. HDFC Bank" },
                              { key: "bankAccountNumber", label: "Account Number", placeholder: "Enter account number" },
                              { key: "bankIfsc", label: "IFSC Code", placeholder: "e.g. HDFC0001234" },
                            ].map((f) => (
                              <div key={f.key}>
                                <label className="block text-xs font-bold text-slate-400 mb-1.5">{f.label}</label>
                                <input
                                  value={profileForm[f.key as keyof typeof profileForm]}
                                  onChange={(e) => setProfileForm({ ...profileForm, [f.key]: f.key === "bankIfsc" ? e.target.value.toUpperCase() : e.target.value })}
                                  placeholder={f.placeholder}
                                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                />
                              </div>
                            ))}
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-bold text-slate-400 mb-1.5">UPI ID (optional — faster payouts)</label>
                              <input
                                value={profileForm.upiId}
                                onChange={(e) => setProfileForm({ ...profileForm, upiId: e.target.value })}
                                placeholder="yourname@upi"
                                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                              />
                            </div>
                          </div>
                          {profile?.payoutRequestedAt && (
                            <div className="mt-3 flex items-center gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 rounded-xl">
                              <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                              <p className="text-xs font-bold text-amber-700">Payout requested on {new Date(profile.payoutRequestedAt).toLocaleDateString("en-IN")} — admin will process by the 5th.</p>
                            </div>
                          )}
                          {profile?.lastPayoutAt && (
                            <p className="text-xs text-slate-400 mt-2">Last payout processed: {new Date(profile.lastPayoutAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <p className="text-xs text-slate-400 flex items-center gap-1"><Mail className="w-3 h-3" /> Email cannot be changed. <a href="/support" className="text-teal-600 underline ml-1">Contact support</a></p>
                        </div>
                        {profileError && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{profileError}</p>}
                        {profileSuccess && (
                          <div className="flex items-center gap-2 text-emerald-700 text-sm font-semibold">
                            <CheckCircle2 className="w-4 h-4" /> Profile updated successfully!
                          </div>
                        )}
                        <button
                          type="submit"
                          disabled={profileSaving}
                          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold transition-colors disabled:opacity-60"
                        >
                          {profileSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          {profileSaving ? "Saving..." : "Save Changes"}
                        </button>
                      </form>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Commissions Tab */}
            {activeTab === "commissions" && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">All Commission Records</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{(stats.referralList ?? []).length} total transactions</p>
                </div>
                {(stats.referralList ?? []).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <Wallet className="w-10 h-10 mb-3 opacity-20" />
                    <p className="text-sm font-medium">No commissions yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50">
                          {["Plan", "Revenue", "Type", "Commission", "Status", "Date"].map((h) => (
                            <th key={h} className="text-left px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {(stats.referralList ?? []).map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                            <td className="px-6 py-3.5 text-sm font-semibold text-slate-800 dark:text-slate-200">{r.subscriptionPlan}</td>
                            <td className="px-6 py-3.5 text-sm text-slate-500">₹{(r.subscriptionAmount / 100).toLocaleString("en-IN")}</td>
                            <td className="px-6 py-3.5">
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${r.isFirstPayment ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-600"}`}>
                                {r.isFirstPayment ? `First · ${r.commissionPercentage}%` : `Renewal · ${r.commissionPercentage}%`}
                              </span>
                            </td>
                            <td className="px-6 py-3.5 text-sm font-bold text-teal-600">₹{(r.commissionAmount / 100).toLocaleString("en-IN")}</td>
                            <td className="px-6 py-3.5">
                              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${r.status === "CONFIRMED" ? "bg-emerald-50 text-emerald-700" : r.status === "PAID" ? "bg-blue-50 text-blue-700" : "bg-orange-50 text-orange-700"}`}>
                                {r.status}
                              </span>
                            </td>
                            <td className="px-6 py-3.5 text-xs text-slate-400">{new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
