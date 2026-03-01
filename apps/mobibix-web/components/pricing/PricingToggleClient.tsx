"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "../layout/Header";
import { Footer } from "../layout/Footer";
import type { Plan } from "../../app/pricing/page";
import { motion, AnimatePresence } from "framer-motion";

export function PricingToggleClient({ plans }: { plans: Plan[] }) {
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">(
    "YEARLY"
  );
  const [_openFaq, _setOpenFaq] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 transition-colors duration-500 px-6 overflow-x-hidden">
      <Header />

      {/* Background Glows */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none text-center">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Hero & Plans - Compressed for Single Viewport */}
      <section className="relative pt-32 pb-10 z-10 flex flex-col items-center justify-center min-h-[90vh]">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="container mx-auto max-w-4xl text-center mb-8"
        >
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-4 leading-none uppercase italic">
            Simple Tools. <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500">Powerful Growth.</span>
          </h1>
          
          {/* Billing Toggle - Compact */}
          <div className="relative inline-flex items-center p-1 rounded-full bg-muted/50 border border-border backdrop-blur-md shadow-xl mt-4">
            {(["MONTHLY", "YEARLY"] as const).map((cycle) => (
              <button
                key={cycle}
                onClick={() => setBillingCycle(cycle)}
                className={`relative px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-500 z-10 ${
                  billingCycle === cycle
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {billingCycle === cycle && (
                  <motion.div 
                    layoutId="toggle-active"
                    className="absolute inset-0 bg-primary rounded-full shadow-lg" 
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative">
                  {cycle === "MONTHLY" ? "Monthly" : "Yearly"}
                </span>
                {cycle === "YEARLY" && (
                   <span className="absolute -top-8 -right-2 bg-primary text-primary-foreground text-[8px] font-black px-1.5 py-0.5 rounded shadow-2xl rotate-12">
                    2 MO FREE
                   </span>
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Plans Container */}
        <div className="container mx-auto max-w-6xl">
          {plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-muted/10 rounded-[2rem] border border-border border-dashed">
               <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-6" />
               <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">Syncing Plans...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {plans.map((plan, i) => {
                const pricing = plan.pricing.find(
                  (p) => p.cycle === billingCycle
                );
                const isPro = plan.level === 2;
                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1, duration: 0.6 }}
                    viewport={{ once: true }}
                    className={`group relative rounded-[2.5rem] border p-8 flex flex-col transition-all duration-700 hover:shadow-2xl ${
                      isPro
                        ? "border-primary/40 bg-card/60 shadow-primary/5 scale-[1.02] z-20 backdrop-blur-3xl"
                        : "border-border bg-card/40 hover:bg-card/60 backdrop-blur-3xl"
                    }`}
                  >
                    {isPro && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                        <span className="bg-gradient-to-r from-primary to-blue-500 text-primary-foreground text-[8px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-2xl ring-2 ring-background">
                          MOST POPULAR
                        </span>
                      </div>
                    )}
                    
                    <div className="mb-6">
                      <h2 className="text-2xl font-black mb-1 tracking-tight uppercase">{plan.name}</h2>
                      <p className="text-muted-foreground font-bold text-xs">
                        {plan.tagline}
                      </p>
                    </div>

                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-5xl font-black tracking-tighter text-foreground">
                          {pricing?.priceFormatted ?? "—"}
                        </span>
                        <span className="text-muted-foreground font-black text-sm uppercase tracking-tighter">
                          /{billingCycle === "MONTHLY" ? "mo" : "yr"}
                        </span>
                      </div>
                      <AnimatePresence mode="wait">
                        {billingCycle === "YEARLY" && plan.savings.yearly > 0 && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest ring-1 ring-primary/20"
                          >
                             Save {plan.savings.yearlyFormatted}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <Link
                      href={`/auth?plan=${plan.id}&billing=${billingCycle}`}
                      className={`block w-full text-center px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all mb-8 shadow-2xl active:scale-95 ${
                        isPro
                          ? "bg-gradient-to-r from-primary to-blue-500 text-primary-foreground shadow-primary/20"
                          : "bg-foreground text-background hover:brightness-110 shadow-primary/5"
                      }`}
                    >
                      Start Free Trial
                    </Link>

                    <div className="space-y-4 flex-1">
                      {plan.features.slice(0, 5).map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 bg-primary/10">
                            <svg className="w-3 h-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <span className="text-muted-foreground font-bold text-[13px] line-clamp-1">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Compare Grid & FAQ - Kept below for detailed info but out of main eye-line */}
      <section className="py-20 bg-muted/10 border-t border-border rounded-[4rem] relative z-10">
        <div className="container mx-auto max-w-5xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tighter uppercase italic">Full Breakdown</h2>
            <p className="text-muted-foreground font-bold text-sm">Compare every detail before you decide.</p>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-[2.5rem] border border-border bg-card/40 backdrop-blur-3xl overflow-hidden shadow-2xl"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border">
                    <th className="p-6 font-black text-muted-foreground uppercase tracking-widest text-[9px]">Matrix</th>
                    {plans.map((plan) => (
                      <th key={plan.id} className="p-6 font-black text-center text-sm tracking-tighter uppercase">
                        {plan.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {[
                    {
                      label: "Branches",
                      render: (p: Plan) => p.level === 1 ? "1 Shop" : (p.limits.maxShops ? `${p.limits.maxShops} Shops` : "Unlimited"),
                    },
                    {
                      label: "Staff seats",
                      render: (p: Plan) => p.limits.maxStaff ? `${p.limits.maxStaff}` : "Unlimited",
                    },
                    {
                      label: "IMEI Management",
                      render: () => "✓",
                    },
                    {
                      label: "GST Billing",
                      render: () => "✓",
                    },
                    {
                      label: "WhatsApp CRM",
                      render: (p: Plan) => p.level === 2 ? "✓" : "—",
                    },
                  ].map(({ label, render }) => (
                    <tr key={label} className="hover:bg-muted/30 transition-colors group">
                      <td className="p-6 text-[11px] font-black text-muted-foreground group-hover:text-foreground transition-colors uppercase tracking-widest">{label}</td>
                      {plans.map((plan) => (
                        <td key={plan.id} className="p-6 text-center text-[11px] font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                          {render(plan)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer compact={true} />
    </div>
  );
}
