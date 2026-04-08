"use client";

import { motion } from "framer-motion";

function StatItem({ value, unit, label }: { value: string; unit: string; label: string }) {
  return (
    <div className="border-l border-border pl-4 md:pl-6 hover:border-primary transition-colors duration-500">
      <p className="text-3xl md:text-4xl lg:text-5xl font-black text-foreground mb-1 md:mb-2">
        {value}<span className="text-base md:text-xl text-primary font-normal align-top ml-1">{unit}</span>
      </p>
      <p className="text-[9px] md:text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground">{label}</p>
    </div>
  );
}

interface ShowcaseSectionProps {
  activeSection: number;
}

export function ShowcaseSection({ activeSection }: ShowcaseSectionProps) {
  return (
    <div className="h-svh w-screen flex flex-col items-center justify-start px-5 md:px-6 shrink-0 bg-background transition-colors duration-500 overflow-y-auto scrollbar-none">
      <div className="h-28 md:h-44 w-full shrink-0" />
      <motion.div
        animate={activeSection === 3 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
        className="w-full max-w-7xl flex-1"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 lg:gap-32 items-center">
          <div>
            <span className="text-primary text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] md:tracking-[0.6em] mb-4 md:mb-6 block">
              Built for Reality
            </span>
            <h2 className="text-3xl sm:text-5xl md:text-[8rem] font-black text-foreground mb-8 md:mb-12 tracking-tighter leading-[0.85] md:leading-[0.8] uppercase italic">
              Visual <br />Profit.
            </h2>
            <div className="grid grid-cols-2 gap-6 md:gap-12">
              <StatItem value="10" unit="sec" label="Billing" />
              <StatItem value="100" unit="%" label="IMEI Safe" />
              <StatItem value="50" unit="+" label="Daily Jobs" />
              <StatItem value="0" unit="₹" label="Loss" />
            </div>
          </div>

          <div className="relative p-5 md:p-8 rounded-3xl md:rounded-4xl border border-border/60 bg-muted/20 shadow-2xl">
            <div className="bg-card p-6 rounded-2xl shadow-inner border border-border/20 mb-6 font-bold tracking-tight">
               <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Empty State UX</p>
               <p className="text-2xl font-black text-foreground leading-tight italic">"No sales yet. Start by adding your first customer."</p>
               <div className="mt-4 flex gap-2">
                  <div className="h-8 w-24 bg-primary/10 rounded-lg animate-pulse" />
                  <div className="h-8 w-24 bg-primary/5 rounded-lg animate-pulse" />
               </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="h-32 bg-card rounded-2xl border border-border/20 p-4">
                  <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Repair Jobs</p>
                  <p className="text-2xl font-black text-foreground">12</p>
               </div>
               <div className="h-32 bg-primary rounded-2xl p-4 text-white">
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-80">Total Sales</p>
                  <p className="text-2xl font-black">₹ 1.2L</p>
               </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
