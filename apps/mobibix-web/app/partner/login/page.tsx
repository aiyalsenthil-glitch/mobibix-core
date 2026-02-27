"use client";

import { useState } from "react";
import { ShieldCheck, Lock, Mail, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function PartnerLoginPage() {
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Logic for partner login
    setTimeout(() => {
        window.location.href = "/partner/dashboard";
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="text-center mb-8">
            <img src="/assets/mobibix-main-logo.png" alt="MobiBix" className="h-20 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Partner Portal</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2">Access your referral dashboard & commissions</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-teal-100 dark:border-teal-900/20">
            <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <Mail className="w-4 h-4" /> Email Address
                    </label>
                    <input 
                        required 
                        type="email" 
                        placeholder="partner@example.com" 
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 outline-none transition-all" 
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <Lock className="w-4 h-4" /> Password
                    </label>
                    <input 
                        required 
                        type="password" 
                        placeholder="••••••••" 
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 outline-none transition-all" 
                    />
                </div>

                <button 
                    disabled={loading}
                    className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-lg mt-2 transition-all flex items-center justify-center gap-2 group shadow-lg shadow-teal-600/20"
                >
                    {loading ? (
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                        <>
                        Sign In
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
                <p className="text-sm text-slate-500">
                    Not a partner yet?{" "}
                    <a href="/partner/apply" className="text-teal-600 font-semibold hover:underline">Apply Now</a>
                </p>
            </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-slate-400 text-xs uppercase tracking-widest font-bold">
            <ShieldCheck className="w-4 h-4" /> Secure Partner Access
        </div>
      </motion.div>
    </div>
  );
}
