"use client";

import { motion } from "framer-motion";
import Link from "next/link";

interface CTASectionProps {
  activeSection: number;
}

export function CTASection({ activeSection }: CTASectionProps) {
  return (
    <div className="h-svh w-screen flex flex-col items-center justify-center relative shrink-0 bg-background overflow-hidden px-5 transition-colors duration-500">
      <motion.div
        animate={activeSection === 8
          ? { opacity: 1, scale: 1, y: 0 }
          : { opacity: 0, scale: 1.1, y: 50 }}
        className="flex flex-col items-center justify-center text-center relative z-10 w-full"
      >
        <h2 className="text-3xl sm:text-5xl md:text-[9rem] lg:text-[11rem] font-black text-foreground mb-10 md:mb-16 tracking-tighter leading-[0.75] md:leading-[0.7] uppercase italic drop-shadow-2xl">
          STOP <br />LEAKING.
        </h2>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-5 md:gap-10 w-full">
          <Link
            href="/auth"
            className="w-full sm:w-auto px-10 md:px-16 py-5 md:py-8 rounded-2xl md:rounded-3xl bg-primary text-primary-foreground font-black uppercase tracking-[0.15em] md:tracking-[0.2em] hover:brightness-110 transition-all shadow-[0_20px_80px_rgba(20,184,166,0.3)] text-center text-base md:text-xl"
          >
            Deploy Now
          </Link>
          <Link
            href="/pricing"
            className="w-full sm:w-auto px-10 md:px-16 py-5 md:py-8 rounded-2xl md:rounded-3xl border-4 border-border text-foreground font-black uppercase tracking-[0.15em] md:tracking-[0.2em] hover:bg-muted transition-all text-center text-base md:text-xl"
          >
            Plans
          </Link>
        </div>
      </motion.div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] md:w-[1000px] h-[400px] md:h-[600px] bg-primary/5 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] md:w-[1200px] h-[300px] md:h-[400px] bg-blue-600/5 rounded-full blur-[200px] rotate-12 pointer-events-none" />
    </div>
  );
}
