"use client";

import { motion } from "framer-motion";
import Link from "next/link";

interface PricingSectionProps {
  activeSection: number;
}

export function PricingSection({ activeSection }: PricingSectionProps) {
  return (
    <div className="h-svh w-screen flex flex-col items-center justify-start px-5 md:px-6 shrink-0 bg-background relative overflow-hidden transition-colors duration-500 overflow-y-auto scrollbar-none">
      <div className="h-28 md:h-44 w-full shrink-0" />
      <motion.div
        animate={activeSection === 6 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
        className="w-full max-w-5xl z-10 pb-10 flex-1"
      >
        <div className="text-center mb-12 md:mb-20">
           <span className="text-primary text-[9px] font-black uppercase tracking-[0.4em] mb-4 block">Fair & Simple</span>
           <h2 className="text-3xl sm:text-5xl md:text-[7rem] font-black text-foreground tracking-tighter uppercase italic leading-none">Starting at ₹ 299</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
           <div className="p-6 md:p-10 rounded-3xl md:rounded-4xl bg-card border border-border shadow-2xl text-center">
              <h3 className="text-xl font-black uppercase mb-2">Basic</h3>
              <p className="text-4xl font-black text-foreground mb-6">₹ 299<span className="text-xs text-muted-foreground">/mo</span></p>
              <ul className="text-left space-y-4 mb-10 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                 <li>• Full Inventory & IMEI</li>
                 <li>• Repair Job Manager</li>
                 <li>• Professional GST Billing</li>
              </ul>
              <Link href="/auth" className="block w-full py-4 rounded-2xl bg-muted hover:bg-muted font-black uppercase tracking-widest transition-all">Start Trial</Link>
           </div>
           <div className="p-6 md:p-10 rounded-3xl md:rounded-4xl bg-primary text-white text-center shadow-2xl shadow-primary/20">
              <h3 className="text-xl font-black uppercase mb-2">Pro</h3>
              <p className="text-4xl font-black mb-6">₹ 499<span className="text-xs opacity-70">/mo</span></p>
              <ul className="text-left space-y-4 mb-10 text-xs font-black uppercase tracking-widest">
                 <li>• Everything in Basic</li>
                 <li>• WhatsApp Automation</li>
                 <li>• Payment Reminders</li>
              </ul>
              <Link href="/auth" className="block w-full py-4 rounded-2xl bg-white text-primary font-black uppercase tracking-widest transition-all">Go Professional</Link>
           </div>
        </div>
      </motion.div>
    </div>
  );
}
