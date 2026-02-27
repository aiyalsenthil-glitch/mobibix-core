"use client";

import { useState } from "react";
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
  Bell
} from "lucide-react";
import { motion } from "framer-motion";

export default function PartnerDashboard() {
  const [copied, setCopied] = useState(false);
  const referralCode = "RG-MB-01"; // Mock referral code

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stats = [
    { label: "Active Shops", value: "12", icon: Users, color: "bg-blue-500" },
    { label: "Total Revenue", value: "₹45,000", icon: TrendingUp, color: "bg-teal-500" },
    { label: "Commission Earned", value: "₹9,000", icon: Wallet, color: "bg-purple-500" },
    { label: "Pending Payout", value: "₹2,500", icon: Clock, color: "bg-orange-500" },
  ];

  const referredShops = [
    { name: "Super Mobile Care", city: "Coimbatore", date: "Feb 20, 2024", plan: "PRO (90 Day Trial)", status: "Active" },
    { name: "Vicky Telecom", city: "Erode", date: "Feb 15, 2024", plan: "PRO (Paid)", status: "Active" },
    { name: "Global Repairs", city: "Salem", date: "Jan 12, 2024", plan: "Basic", status: "Inactive" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row">
      
      {/* Sidebar (Desktop) */}
      <aside className="hidden lg:flex w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col p-6 space-y-8">
        <img src="/assets/mobibix-main-logo.png" alt="MobiBix" className="h-12 w-auto object-contain" />
        
        <nav className="flex-1 space-y-1">
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-teal-50 dark:bg-teal-900/20 text-teal-600 font-bold">
            <LayoutDashboard className="w-5 h-5" /> Dashboard
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
            <Users className="w-5 h-5" /> Sub-Partners
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
            <Wallet className="w-5 h-5" /> Payouts
          </a>
        </nav>

        <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
           <button onClick={() => window.location.href = "/partner/login"} className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all w-full">
            <LogOut className="w-5 h-5" /> Logout
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-10">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome back, Senthil!</h1>
            <p className="text-slate-500">Here's how your referral network is performing.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl relative">
                <Bell className="w-5 h-5 text-slate-500" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
            </button>
            <div className="h-10 w-10 bg-teal-600 rounded-full flex items-center justify-center text-white font-bold">S</div>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {stats.map((s, idx) => (
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
            
            {/* Referral Link & Code Section */}
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-gradient-to-br from-teal-600 to-teal-800 p-8 rounded-[2.5rem] text-white shadow-xl shadow-teal-600/20 relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-lg font-bold opacity-80 mb-2">My Referral Code</h3>
                        <div className="flex items-center justify-between bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
                            <span className="text-2xl font-mono font-bold tracking-widest">{referralCode}</span>
                            <button onClick={copyCode} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                                <Copy className={`w-5 h-5 ${copied ? 'text-teal-300' : 'text-white'}`} />
                            </button>
                        </div>
                        <p className="text-sm opacity-70 mt-4 leading-relaxed">
                            Share this code with shop owners to provide them with a 3-month free trial.
                        </p>
                    </div>
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Referral Link</h3>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center gap-3 overflow-hidden">
                        <span className="text-sm text-slate-500 font-mono flex-1 truncate">https://REMOVED_DOMAIN/signup?ref={referralCode}</span>
                        <ExternalLink className="w-4 h-4 text-slate-400" />
                    </div>
                </div>
            </div>

            {/* Recent Shops Section */}
            <div className="lg:col-span-2">
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Active Referrals</h3>
                        <button className="text-teal-600 font-semibold text-sm hover:underline flex items-center gap-1">
                            View All <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-800/50">
                                <tr>
                                    <th className="text-left px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Shop Name</th>
                                    <th className="text-left px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                                    <th className="text-left px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Plan</th>
                                    <th className="text-left px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {referredShops.map((shop, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-8 py-5">
                                            <p className="font-bold text-slate-900 dark:text-white">{shop.name}</p>
                                            <p className="text-xs text-slate-500">{shop.city}</p>
                                        </td>
                                        <td className="px-8 py-5 text-sm text-slate-600 dark:text-slate-400">{shop.date}</td>
                                        <td className="px-8 py-5">
                                            <span className="text-xs font-semibold px-2.5 py-1 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 rounded-lg">
                                                {shop.plan}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${shop.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                                                <span className={`text-sm font-medium ${shop.status === 'Active' ? 'text-emerald-600' : 'text-slate-500'}`}>{shop.status}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
}
