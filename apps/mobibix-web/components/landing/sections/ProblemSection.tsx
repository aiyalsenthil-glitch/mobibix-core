"use client";

import { motion } from "framer-motion";

interface ProblemSectionProps {
  activeSection: number;
}

export function ProblemSection({ activeSection }: ProblemSectionProps) {
  return (
    <div className="h-svh w-screen flex flex-col items-center justify-start px-5 md:px-6 shrink-0 bg-background relative overflow-hidden transition-colors duration-500 overflow-y-auto">
      <div className="h-28 md:h-44 w-full shrink-0" />
      <motion.div
        animate={activeSection === 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
        className="w-full max-w-5xl text-center z-10 flex-1"
      >
        <span className="text-red-500 text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] mb-4 block">
          The Reality
        </span>
        <h2 className="text-3xl sm:text-5xl md:text-[7rem] font-black text-foreground mb-8 md:mb-12 tracking-tighter leading-[0.85] uppercase italic">
          Running a mobile <br />shop is <span className="text-red-500">messy.</span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
          {[
            { q: "Manual Errors", a: "Tired of billing mistakes and inventory issues?" },
            { q: "No IMEI Tracking", a: "Losing track of device serial numbers?" },
            { q: "Lost Repairs", a: "Missing job status or customer follow-ups?" },
            { q: "Revenue Leakage", a: "Unaware of your daily profit or expenses?" }
          ].map((p, i) => (
            <div key={i} className="p-6 rounded-2xl bg-card border border-border shadow-sm">
              <h3 className="text-sm font-black uppercase mb-2 text-foreground">{p.q}</h3>
              <p className="text-xs font-bold text-muted-foreground leading-relaxed">{p.a}</p>
            </div>
          ))}
        </div>
        
        <p className="mt-12 text-muted-foreground font-bold italic opacity-60">
          Stop using generic apps. Use a software built for YOUR shop.
        </p>
      </motion.div>
      <div className="absolute inset-0 bg-red-500/10 blur-[120px] rounded-full -translate-y-1/2 pointer-events-none" />
    </div>
  );
}
