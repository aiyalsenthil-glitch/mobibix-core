"use client";

import { useState } from "react";
import { 
  Users, 
  Gift, 
  Check, 
  X, 
  Edit, 
  Trash2, 
  Plus, 
  Filter,
  ArrowUpDown,
  TrendingUp,
  Landmark,
  ShieldAlert
} from "lucide-react";
import { motion } from "framer-motion";

export default function AdminPartnerManagement() {
  const [activeTab, setActiveTab] = useState("applications");

  const applications = [
    { id: 1, name: "Arun Academy", person: "Arun Kumar", email: "arun@academy.com", type: "Academy", region: "Chennai", status: "PENDING" },
    { id: 2, name: "KV Distributors", person: "Venkatesh", email: "kv@dist.in", type: "Distributor", region: "Madurai", status: "PENDING" },
  ];

  const partners = [
    { id: 101, name: "Senthil Partners", person: "Senthil", email: "senthil@REMOVED_DOMAIN", type: "Distributor", rev: "₹1,20,000", comm: "20%", status: "APPROVED" },
  ];

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-white to-stone-500 bg-clip-text text-transparent">
              Partner & Promo Control
            </h1>
            <p className="text-stone-400 mt-2">Manage the MobiBix referral ecosystem and commission engine.</p>
          </div>
          <div className="flex gap-3">
             <button className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 rounded-xl font-bold transition-all shadow-lg shadow-teal-600/20">
                <Plus className="w-5 h-5" /> Create Promo
             </button>
          </div>
        </div>

        {/* Top Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {[
                { label: "Total Partner Revenue", value: "₹8,45,000", icon: TrendingUp, color: "text-emerald-400" },
                { label: "Commissions Pending", value: "₹42,300", icon: Landmark, color: "text-teal-400" },
                { label: "Active Promos", value: "14", icon: Gift, color: "text-purple-400" },
            ].map((m, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-[2rem] p-8 backdrop-blur-md">
                    <m.icon className={`w-8 h-8 ${m.color} mb-4`} />
                    <p className="text-stone-400 text-sm font-medium uppercase tracking-wider">{m.label}</p>
                    <h3 className="text-3xl font-bold mt-2 tracking-tight">{m.value}</h3>
                </div>
            ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-4 p-1.5 bg-white/5 border border-white/10 rounded-2xl w-fit mb-8">
            {["applications", "partners", "promos", "commissions"].map(t => (
                <button 
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all capitalize ${activeTab === t ? 'bg-white text-black' : 'text-stone-500 hover:text-stone-300'}`}
                >
                    {t}
                </button>
            ))}
        </div>

        {/* Table / List View */}
        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden backdrop-blur-md">
            
            {activeTab === "applications" && (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b border-white/10 bg-white/[0.02]">
                            <tr>
                                <th className="px-8 py-5 text-stone-500 text-xs font-bold uppercase">Business / Contact</th>
                                <th className="px-8 py-5 text-stone-500 text-xs font-bold uppercase">Type & Region</th>
                                <th className="px-8 py-5 text-stone-500 text-xs font-bold uppercase">Status</th>
                                <th className="px-8 py-5 text-stone-500 text-xs font-bold uppercase text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {applications.map(app => (
                                <tr key={app.id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="font-bold text-lg">{app.name}</div>
                                        <div className="text-stone-400 text-sm">{app.person} • {app.email}</div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="text-white font-medium">{app.type}</div>
                                        <div className="text-stone-500 text-xs">{app.region}</div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="px-3 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-full text-xs font-bold">
                                            {app.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex justify-end gap-3">
                                            <button className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-lg transition-all" title="Approve">
                                                <Check className="w-5 h-5" />
                                            </button>
                                            <button className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all" title="Reject">
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === "partners" && (
                <div className="p-12 text-center">
                    <Users className="w-16 h-16 text-stone-700 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-stone-400">Manage Approved Partners</h3>
                    <p className="text-stone-600 mt-2">Edit commissions, view referrals, and suspend accounts here.</p>
                </div>
            )}
            
            {activeTab === "promos" && (
                <div className="p-12 text-center">
                    <Gift className="w-16 h-16 text-stone-700 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-stone-400">Promo Code Management</h3>
                    <p className="text-stone-600 mt-2">Active Code: <span className="text-teal-400 font-mono font-bold">RG-MB-01</span> (90 Day Free Trial)</p>
                </div>
            )}

        </div>

        {/* Security Alert Footer */}
        <div className="mt-12 p-6 border border-red-500/20 bg-red-500/5 rounded-3xl flex items-center gap-4">
            <ShieldAlert className="w-8 h-8 text-red-500" />
            <div>
                <h4 className="text-red-400 font-bold">Admin Security Note</h4>
                <p className="text-stone-500 text-sm">Approving a partner generates a temporary password and referral engine access. Ensure business verification is done before approval.</p>
            </div>
        </div>

      </div>
    </div>
  );
}
