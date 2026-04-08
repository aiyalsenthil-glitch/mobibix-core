"use client";

import { motion } from "framer-motion";
import NextImage from "next/image";

interface FeaturesSectionProps {
  activeSection: number;
}

export function FeaturesSection({ activeSection }: FeaturesSectionProps) {
  const features = [
    { title: "IMEI TRACKING", desc: "Track every device serial-perfect.", icon: "/assets/landing/inventory-icon.png" },
    { title: "REPAIR HUB", desc: "Manage jobs, status & delivery.", icon: "/assets/landing/repairs-icon.png" },
    { title: "BILLING & GST", desc: "Generate GST bills in 5 seconds.", icon: "/assets/landing/billing-icon.png" },
    { title: "HYPER CRM", desc: "Automatic WhatsApp follow-ups.", icon: "/assets/landing/marketing-icon.png" },
    { title: "DASHBOARD", desc: "Daily profit & sales at a glance.", icon: "/assets/landing/inventory-icon.png" },
  ];

  return (
    <div className="h-svh w-screen flex flex-col items-center justify-start px-4 md:px-6 shrink-0 bg-background relative overflow-hidden transition-colors duration-500 overflow-y-auto">
      <div className="h-28 md:h-44 w-full shrink-0" />
      <motion.div
        animate={activeSection === 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
        className="w-full max-w-7xl relative z-10 flex-1"
      >
        <div className="mb-8 md:mb-16 lg:mb-20 text-center">
          <span className="text-primary text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] md:tracking-[0.6em] mb-3 block">
            The Solution
          </span>
          <h2 className="text-2xl sm:text-4xl md:text-[7rem] font-black text-foreground tracking-tighter uppercase italic leading-[0.85] md:leading-[0.8]">
            Everything your <br className="hidden md:block" />shop needs.
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-6 pb-10 lg:pb-0">
          {features.map((feat, i) => (
            <motion.div
              key={i}
              animate={activeSection === 2
                ? { opacity: 1, y: 0, scale: 1 }
                : { opacity: 0, y: 30, scale: 0.9 }}
              transition={{ delay: i * 0.1 }}
              className={`${i === 4 ? "col-span-2 lg:col-span-1" : ""} w-full p-4 sm:p-6 md:p-10 rounded-2xl sm:rounded-3xl md:rounded-4xl bg-card border border-border/50 hover:border-primary/50 transition-all duration-500 group text-center shadow-sm flex flex-col items-center justify-center`}
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-20 md:h-20 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center mb-3 sm:mb-4 md:mb-8 mx-auto border border-primary/20 p-2 sm:p-3 md:p-4 group-hover:scale-110 transition-transform">
                <NextImage 
                  src={feat.icon} 
                  alt={feat.title} 
                  width={80} 
                  height={80} 
                  className="object-contain"
                  sizes="(max-width: 768px) 48px, 80px"
                />
              </div>
              <h3 className="text-[10px] sm:text-xs md:text-lg font-black uppercase tracking-tight mb-1 sm:mb-2 leading-none">{feat.title}</h3>
              <p className="text-muted-foreground font-bold text-[8px] sm:text-[10px] uppercase tracking-widest opacity-60 leading-tight sm:leading-relaxed">{feat.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
