"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Gift, Check, X, Plus, TrendingUp, Landmark, ShieldAlert, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

interface Partner {
  id: string;
  businessName: string;
  contactPerson: string;
  email: string;
  partnerType: string;
  region: string;
  status: string;
  commissionPercentage: number;
  totalEarned: number;
  referralCode?: string;
  createdAt: string;
}

interface PromoCode {
  id: string;
  code: string;
  type: string;
  durationDays: number;
  maxUses: number;
  usedCount: number;
  isActive: boolean;
  expiresAt: string | null;
  partner?: { businessName: string; referralCode: string };
}

const API = process.env.NEXT_PUBLIC_API_URL;

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("access_token")}`,
});

export default function AdminPartnerManagement() {
  const [activeTab, setActiveTab] = useState("applications");
  const [partners, setPartners] = useState<Partner[]>([]);
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approveState, setApproveState] = useState<{ id: string; commission: string } | null>(null);
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [promoForm, setPromoForm] = useState({ code: "", type: "FREE_TRIAL", durationDays: "90", maxUses: "500", expiresAt: "" });

  const fetchPartners = useCallback(async (status?: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = status ? `${API}/partners?status=${status}` : `${API}/partners`;
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load partners");
      setPartners(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPromos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/partners/promo`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load promo codes");
      setPromos(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "applications") fetchPartners("PENDING");
    else if (activeTab === "partners") fetchPartners("APPROVED");
    else if (activeTab === "promos") fetchPromos();
  }, [activeTab, fetchPartners, fetchPromos]);

  const handleApprove = async (id: string) => {
    if (!approveState || approveState.id !== id) {
      setApproveState({ id, commission: "10" });
      return;
    }
    try {
      const res = await fetch(`${API}/partners/${id}/approve`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ commission: parseFloat(approveState.commission) }),
      });
      if (!res.ok) throw new Error("Failed to approve");
      setApproveState(null);
      fetchPartners("PENDING");
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleSuspend = async (id: string) => {
    if (!confirm("Suspend this partner?")) return;
    try {
      const res = await fetch(`${API}/partners/${id}/suspend`, { method: "PATCH", headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to suspend");
      fetchPartners("APPROVED");
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/partners/promo/generate`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          ...promoForm,
          durationDays: parseInt(promoForm.durationDays),
          maxUses: parseInt(promoForm.maxUses),
          expiresAt: promoForm.expiresAt || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create promo");
      setShowPromoForm(false);
      fetchPromos();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-white to-stone-500 bg-clip-text text-transparent">
              Partner &amp; Promo Control
            </h1>
            <p className="text-stone-400 mt-2">Manage the MobiBix referral ecosystem and commission engine.</p>
          </div>
          <button
            onClick={() => setShowPromoForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 rounded-xl font-bold transition-all shadow-lg shadow-teal-600/20"
          >
            <Plus className="w-5 h-5" /> Create Promo
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 flex items-center gap-3 p-4 bg-red-900/20 border border-red-700/30 rounded-2xl text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Create Promo Modal */}
        {showPromoForm && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-stone-950 border border-white/10 rounded-3xl p-8 w-full max-w-md">
              <h3 className="text-xl font-bold mb-6">Create Promo Code</h3>
              <form onSubmit={handleCreatePromo} className="space-y-4">
                {[
                  { label: "Code", name: "code", type: "text", placeholder: "e.g. MB-LAUNCH-25" },
                  { label: "Duration (days)", name: "durationDays", type: "number", placeholder: "90" },
                  { label: "Max Uses", name: "maxUses", type: "number", placeholder: "500" },
                  { label: "Expires At (optional)", name: "expiresAt", type: "date", placeholder: "" },
                ].map((f) => (
                  <div key={f.name}>
                    <label className="text-sm text-stone-400 font-medium">{f.label}</label>
                    <input required={f.name !== "expiresAt"} type={f.type} name={f.name} placeholder={f.placeholder}
                      value={(promoForm as any)[f.name]} onChange={(e) => setPromoForm((p) => ({ ...p, [f.name]: e.target.value }))}
                      className="mt-1 w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>
                ))}
                <div>
                  <label className="text-sm text-stone-400 font-medium">Type</label>
                  <select name="type" value={promoForm.type} onChange={(e) => setPromoForm((p) => ({ ...p, type: e.target.value }))}
                    className="mt-1 w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl outline-none">
                    <option value="FREE_TRIAL">Free Trial</option>
                    <option value="DISCOUNT">Discount</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 rounded-xl font-bold transition-all">Create</button>
                  <button type="button" onClick={() => setShowPromoForm(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold transition-all">Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 p-1.5 bg-white/5 border border-white/10 rounded-2xl w-fit mb-8">
          {["applications", "partners", "promos"].map((t) => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all capitalize ${activeTab === t ? "bg-white text-black" : "text-stone-500 hover:text-stone-300"}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden backdrop-blur-md">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
            </div>
          ) : (
            <>
              {/* Applications / Partners Table */}
              {(activeTab === "applications" || activeTab === "partners") && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="border-b border-white/10 bg-white/[0.02]">
                      <tr>
                        <th className="px-8 py-5 text-stone-500 text-xs font-bold uppercase">Business / Contact</th>
                        <th className="px-8 py-5 text-stone-500 text-xs font-bold uppercase">Type &amp; Region</th>
                        <th className="px-8 py-5 text-stone-500 text-xs font-bold uppercase">Status</th>
                        <th className="px-8 py-5 text-stone-500 text-xs font-bold uppercase text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {partners.length === 0 ? (
                        <tr><td colSpan={4} className="px-8 py-12 text-center text-stone-500">No records found.</td></tr>
                      ) : partners.map((p) => (
                        <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-8 py-6">
                            <div className="font-bold text-lg">{p.businessName}</div>
                            <div className="text-stone-400 text-sm">{p.contactPerson} • {p.email}</div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="text-white font-medium">{p.partnerType}</div>
                            <div className="text-stone-500 text-xs">{p.region}</div>
                          </td>
                          <td className="px-8 py-6">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${p.status === "PENDING" ? "bg-orange-500/10 text-orange-400 border-orange-500/20" : p.status === "APPROVED" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-right">
                            {activeTab === "applications" ? (
                              <div className="flex justify-end gap-3 items-center">
                                {approveState?.id === p.id && (
                                  <input type="number" min="0" max="100" value={approveState.commission}
                                    onChange={(e) => setApproveState({ ...approveState, commission: e.target.value })}
                                    placeholder="Commission %" className="w-28 px-2 py-1.5 bg-white/10 border border-white/20 rounded-lg text-sm text-right" />
                                )}
                                <button onClick={() => handleApprove(p.id)} className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-lg transition-all" title={approveState?.id === p.id ? "Confirm Approve" : "Approve"}>
                                  <Check className="w-5 h-5" />
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => handleSuspend(p.id)} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all" title="Suspend">
                                <X className="w-5 h-5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Promos Table */}
              {activeTab === "promos" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="border-b border-white/10 bg-white/[0.02]">
                      <tr>
                        <th className="px-8 py-5 text-stone-500 text-xs font-bold uppercase">Code</th>
                        <th className="px-8 py-5 text-stone-500 text-xs font-bold uppercase">Type</th>
                        <th className="px-8 py-5 text-stone-500 text-xs font-bold uppercase">Usage</th>
                        <th className="px-8 py-5 text-stone-500 text-xs font-bold uppercase">Partner</th>
                        <th className="px-8 py-5 text-stone-500 text-xs font-bold uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {promos.length === 0 ? (
                        <tr><td colSpan={5} className="px-8 py-12 text-center text-stone-500">No promo codes found.</td></tr>
                      ) : promos.map((pr) => (
                        <tr key={pr.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-8 py-6 font-mono font-bold text-teal-400">{pr.code}</td>
                          <td className="px-8 py-6 text-stone-300">{pr.type} ({pr.durationDays}d)</td>
                          <td className="px-8 py-6">
                            <div className="text-sm">{pr.usedCount} / {pr.maxUses}</div>
                            <div className="w-24 bg-white/10 rounded-full h-1.5 mt-1.5">
                              <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (pr.usedCount / pr.maxUses) * 100)}%` }} />
                            </div>
                          </td>
                          <td className="px-8 py-6 text-stone-400 text-sm">{pr.partner?.businessName ?? "—"}</td>
                          <td className="px-8 py-6">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${pr.isActive ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-stone-700/30 text-stone-500 border-stone-700/20"}`}>
                              {pr.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {/* Security Alert */}
        <div className="mt-12 p-6 border border-red-500/20 bg-red-500/5 rounded-3xl flex items-center gap-4">
          <ShieldAlert className="w-8 h-8 text-red-500" />
          <div>
            <h4 className="text-red-400 font-bold">Admin Security Note</h4>
            <p className="text-stone-500 text-sm">Approving a partner sends credentials via email and activates their referral engine. Ensure business verification is done before approval.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
