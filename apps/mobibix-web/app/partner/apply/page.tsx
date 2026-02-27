"use client";

import { useState } from "react";
import { Header } from "../../../components/layout/Header";
import { Footer } from "../../../components/layout/Footer";
import { CheckCircle2, Send, Users, ShieldCheck, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

export default function PartnerApplyPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1500);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 text-center shadow-xl border border-teal-100 dark:border-teal-900/30"
          >
            <div className="w-20 h-20 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-teal-600 dark:text-teal-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Application Received!</h1>
            <p className="text-slate-600 dark:text-slate-400 mb-8">
              Thank you for applying to be a MobiBix Partner. We will review your application within 48 hours.
            </p>
            <button 
              onClick={() => window.location.href = "/"}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-teal-600/20"
            >
              Back to Home
            </button>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <Header />
      
      <main className="flex-1 py-12 px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Side: Value Prop */}
          <div className="space-y-8">
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
            >
                <span className="px-4 py-1.5 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 rounded-full text-sm font-semibold tracking-wide uppercase">
                Partner Program
                </span>
                <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white mt-4 leading-tight">
                Grow Your Business with <span className="text-teal-600">MobiBix</span>
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400 mt-6 max-w-lg leading-relaxed">
                Join our network of authorized partners and earn recurring commissions for every shop you bring onto India's fastest-growing mobile ERP.
                </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 gap-6">
              {[
                { icon: TrendingUp, title: "Recurring Income", desc: "Earn up to 20% commission on every renewal." },
                { icon: Users, title: "Dedicated Support", desc: "Get a dedicated manager for your region." },
                { icon: ShieldCheck, title: "Official Rights", desc: "Get authorized MobiBix partner certification." },
                { icon: Send, title: "Sales Kit", desc: "Full marketing kit and demo accounts provided." }
              ].map((item, idx) => (
                <motion.div 
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * idx }}
                    className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm"
                >
                  <item.icon className="w-8 h-8 text-teal-600 mb-3" />
                  <h3 className="font-bold text-slate-900 dark:text-white">{item.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right Side: Form */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 lg:p-10 shadow-2xl border border-teal-100 dark:border-teal-900/20 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Become a Partner</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Business Name</label>
                  <input required type="text" placeholder="e.g. Senthil Electronics" className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 outline-none transition-all" />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Contact Person</label>
                  <input required type="text" placeholder="Name" className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 outline-none transition-all" />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Partner Type</label>
                  <select className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 outline-none transition-all">
                    <option>Distributor</option>
                    <option>Academy</option>
                    <option>Hardware Supplier</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email Address</label>
                  <input required type="email" placeholder="name@company.com" className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 outline-none transition-all" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone Number</label>
                  <input required type="tel" placeholder="+91 00000 00000" className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 outline-none transition-all" />
                </div>

                <div className="space-y-2 col-span-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Region Covered</label>
                  <input required type="text" placeholder="e.g. Coimbatore, Tamil Nadu" className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 outline-none transition-all" />
                </div>

                <div className="space-y-2 col-span-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Message / Retailers Currently Served</label>
                  <textarea rows={3} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 outline-none transition-all"></textarea>
                </div>
              </div>

              <button 
                disabled={loading}
                className="w-full py-4 bg-slate-900 dark:bg-teal-600 hover:bg-slate-800 dark:hover:bg-teal-700 text-white rounded-xl font-bold text-lg mt-4 transition-all flex items-center justify-center gap-2 group"
              >
                {loading ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                    <>
                    Submit Application
                    <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </>
                )}
              </button>
            </form>

            <p className="text-center text-xs text-slate-500 mt-6">
              By applying, you agree to our Partner Terms of Service.
            </p>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
