"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { useTheme } from "@/context/ThemeContext";
import { Header } from "../layout/Header";
import { Footer } from "../layout/Footer";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, ChevronDown } from "lucide-react";
import { BlogSection } from "./BlogSection";
import { TestimonialsSection } from "./TestimonialsSection";

// Helper components

function StatItem({ value, unit, label }: { value: string; unit: string; label: string }) {
  return (
    <div className="border-l border-border pl-6 hover:border-primary transition-colors duration-500">
      <p className="text-4xl md:text-5xl font-black text-foreground mb-2">
        {value}<span className="text-xl text-primary font-normal align-top ml-1">{unit}</span>
      </p>
      <p className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground">{label}</p>
    </div>
  );
}

export function HeroSlidesClient({ posts }: { posts: any[] }) {
  const { theme: _theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollCooldown = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sections = [
    { id: "hero", label: "Hero" },
    { id: "features", label: "Features" },
    { id: "stats", label: "Impact" },
    { id: "testimonials", label: "Wall of Love" },
    { id: "blog", label: "Insights" },
    { id: "faq", label: "FAQ" },
    { id: "cta", label: "Launch" },
    { id: "footer", label: "Closure" },
  ];

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const now = Date.now();
      if (now - scrollCooldown.current < 1000) return;

      if (e.deltaY > 50 && activeSection < sections.length - 1) {
        setActiveSection(prev => prev + 1);
        scrollCooldown.current = now;
      } else if (e.deltaY < -50 && activeSection > 0) {
        setActiveSection(prev => prev - 1);
        scrollCooldown.current = now;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" && activeSection < sections.length - 1) setActiveSection(activeSection + 1);
      else if (e.key === "ArrowUp" && activeSection > 0) setActiveSection(activeSection - 1);
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeSection, sections.length]);

  if (!mounted) return null;

  return (
    <div className="bg-background text-foreground selection:bg-primary/30 h-screen w-screen overflow-hidden transition-colors duration-500">
      <Header />

      {/* Main Container for Sliding Sections */}
      <motion.div 
        className="h-full w-full flex flex-col"
        animate={{ y: `-${activeSection * 100}vh` }}
        transition={{ 
          type: "spring", 
          stiffness: 70, 
          damping: 20, 
          mass: 1 
        }}
        onAnimationStart={() => setIsScrolling(true)}
        onAnimationComplete={() => setIsScrolling(false)}
      >
        {/* Section 1: Hero */}
        <div className="h-screen w-screen flex flex-col items-center justify-center relative pt-24 px-6 shrink-0 overflow-hidden">
          <motion.div 
             animate={activeSection === 0 ? { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" } : { opacity: 0, scale: 0.9, y: 50, filter: "blur(10px)" }}
             transition={{ duration: 0.8 }}
             className="relative z-10 w-full max-w-5xl text-center"
          >
              <div className="mb-10 inline-flex items-center gap-3 px-5 py-2 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-3xl shadow-2xl shadow-primary/10">
                  <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Trusted by 500+ Mobile Retailers</span>
              </div>
              
              <h1 className="text-5xl md:text-[8rem] font-black mb-10 tracking-tighter leading-[0.8] text-foreground uppercase italic text-glow-indigo">
                  Run Your <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-500 to-indigo-500 drop-shadow-2xl">Mobile Shop.</span>
              </h1>
              
              <p className="text-muted-foreground text-xl md:text-2xl font-bold max-w-2xl mx-auto mb-16 leading-relaxed italic opacity-80">
                  The SaaS-grade Retail OS. Stop losing track of IMEIs, repairs, and stock. Generate GST bills in 5 seconds.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
                  <Link href="/auth" className="group relative w-full sm:w-auto px-12 py-6 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest transition-all shadow-2xl shadow-primary/20 overflow-hidden">
                      <span className="relative z-10">Start Free Trial</span>
                      <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  </Link>
                  <Link href="/pricing" className="w-full sm:w-auto px-12 py-6 rounded-2xl border-2 border-border text-foreground text-center font-black uppercase tracking-widest hover:bg-muted transition-all backdrop-blur-md">
                      Pricing Plans
                  </Link>
              </div>
          </motion.div>
          
          {/* Animated Background Orbs */}
          <div className="absolute top-[20%] -left-[10%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[150px] animate-pulse pointer-events-none" />
          <div className="absolute bottom-[10%] -right-[10%] w-[700px] h-[700px] bg-blue-500/20 rounded-full blur-[180px] animate-pulse pointer-events-none delay-1000" />
        </div>

        {/* Section 2: Features */}
        <div className="h-screen w-screen flex flex-col items-center justify-center px-6 shrink-0 bg-muted/5 relative overflow-hidden">
          <motion.div 
            animate={activeSection === 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
            className="w-full max-w-7xl relative z-10"
          >
            <div className="mb-20 text-center">
              <span className="text-primary text-[10px] font-black uppercase tracking-[0.6em] mb-4 block">Engineered for Growth</span>
              <h2 className="text-5xl md:text-[7rem] font-black text-foreground tracking-tighter uppercase italic leading-[0.8]">Protect <br />Inventory.</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              {[
                { title: "IMEI TRACK", desc: "Digital ownership.", icon: "/assets/landing/inventory-icon.png" },
                { title: "REPAIR HUB", desc: "Live job tracking.", icon: "/assets/landing/repairs-icon.png" },
                { title: "GST READY", desc: "Auto-tax calc.", icon: "/assets/landing/billing-icon.png" },
                { title: "HYPER CRM", desc: "WhatsApp reach.", icon: "/assets/landing/marketing-icon.png" },
                { title: "B2B SYNC", desc: "Stock sharing.", icon: "/assets/landing/inventory-icon.png" },
              ].map((feat, i) => (
                <motion.div 
                  key={i}
                  animate={activeSection === 1 ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.9 }}
                  transition={{ delay: i * 0.1 }}
                  className="p-10 rounded-[3rem] bg-card/40 backdrop-blur-2xl border border-border/50 hover:border-primary/50 transition-all duration-500 group text-center"
                >
                    <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-8 mx-auto border border-primary/20 overflow-hidden p-4 group-hover:scale-110 transition-transform">
                        <NextImage src={feat.icon} alt={feat.title} width={80} height={80} className="object-contain filter drop-shadow-xl" />
                    </div>
                    <h3 className="text-lg font-black uppercase tracking-tight mb-2 leading-none">{feat.title}</h3>
                    <p className="text-muted-foreground font-bold text-[9px] uppercase tracking-widest opacity-60 leading-relaxed">{feat.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Section 3: Stats */}
        <div className="h-screen w-screen flex items-center justify-center px-6 shrink-0 bg-background">
          <motion.div 
             animate={activeSection === 2 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
             className="w-full max-w-7xl"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-32 items-center">
              <div>
                  <span className="text-primary text-[10px] font-black uppercase tracking-[0.6em] mb-6 block">The Multiplier</span>
                  <h2 className="text-6xl md:text-[8rem] font-black text-foreground mb-12 tracking-tighter leading-[0.8] uppercase italic">3x ROI.</h2>
                  <div className="grid grid-cols-2 gap-12">
                      <StatItem value="5" unit="min" label="Setup" />
                      <StatItem value="100" unit="%" label="Uptime" />
                      <StatItem value="3x" unit="" label="Turnover" />
                      <StatItem value="0" unit="₹" label="Leads" />
                  </div>
              </div>
              <div className="relative p-12 rounded-[4rem] border border-border/60 bg-muted/10 backdrop-blur-3xl shadow-2xl">
                  <h4 className="text-[12px] font-black uppercase tracking-[0.4em] text-primary mb-10 text-center">Efficiency Growth</h4>
                  <div className="space-y-8">
                      {["Billing", "Repairs", "Inventory"].map((l, i) => (
                          <div key={i} className="space-y-3">
                              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-foreground/70">
                                  <span>{l}</span>
                                  <span>{75 + (i * 10)}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                                  <motion.div 
                                    animate={activeSection === 2 ? { width: `${75 + (i * 10)}%` } : { width: 0 }}
                                    transition={{ duration: 1.5, ease: "circOut", delay: 0.5 }}
                                    className="h-full bg-primary" 
                                  />
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Section 4: Testimonials */}
        <div className="h-screen w-screen flex items-center justify-center shrink-0 bg-muted/5">
           <TestimonialsSection />
        </div>

        {/* Section 5: Blog */}
        <div className="h-screen w-screen px-6 shrink-0 flex items-center justify-center bg-background">
           <BlogSection posts={posts} />
        </div>

        {/* Section 6: FAQ */}
        <div className="h-screen w-screen flex flex-col items-center justify-center px-6 shrink-0 bg-muted/5 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
           <div className="w-full max-w-4xl pt-20 relative z-10">
              <div className="mb-24 text-center">
                  <span className="text-primary text-[10px] font-black uppercase tracking-[0.6em] mb-4 block">Operations Mastery</span>
                  <h2 className="text-5xl md:text-[6rem] font-black text-foreground tracking-tighter uppercase italic leading-[0.8] mb-8">The FAQ.</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-20 gap-y-16">
                 {[
                    { q: "Setup duration?", a: "5 minutes. Simple data import, zero downtime." },
                    { q: "Anti-theft protocol?", a: "Serial-locked inventory means zero stock leakage." },
                    { q: "Device compatibility?", a: "Web-native. Runs on tablets, laptops, and mobile." },
                    { q: "WhatsApp Cost?", a: "Integrated. Send notifications for free directly." }
                 ].map((faq, i) => (
                    <motion.div 
                      key={i} 
                      animate={activeSection === 5 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                      transition={{ delay: i * 0.1 }}
                      className="group border-l-4 border-primary/20 pl-8 hover:border-primary transition-colors"
                    >
                       <h3 className="text-xl font-black text-foreground mb-4 group-hover:text-primary transition-colors uppercase italic leading-tight">{faq.q}</h3>
                       <p className="text-muted-foreground font-bold text-xs uppercase tracking-widest leading-loose opacity-60">{faq.a}</p>
                    </motion.div>
                 ))}
              </div>
           </div>
        </div>

        {/* Section 7: CTA Only - Theme Consistent */}
        <div className="h-screen w-screen flex flex-col items-center justify-center relative shrink-0 overflow-hidden">
           <motion.div 
              animate={activeSection === 6 ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 1.1, y: 50 }}
              className="flex flex-col items-center justify-center text-center px-6 relative z-10"
           >
              <h2 className="text-7xl md:text-[11rem] font-black text-foreground mb-16 tracking-tighter leading-[0.7] uppercase italic drop-shadow-2xl">
                STOP <br />LEAKING.
              </h2>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-10">
                <Link href="/auth" className="w-full sm:w-auto px-16 py-8 rounded-3xl bg-primary text-primary-foreground font-black uppercase tracking-[0.2em] hover:brightness-110 transition-all shadow-[0_20px_80px_rgba(20,184,166,0.3)] text-center text-xl">
                    Deploy Now
                </Link>
                <Link href="/pricing" className="w-full sm:w-auto px-16 py-8 rounded-3xl border-4 border-border text-foreground font-black uppercase tracking-[0.2em] hover:bg-muted transition-all text-center text-xl">
                    Plans
                </Link>
              </div>
           </motion.div>
           
           {/* High-Impact Focal Glow */}
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-primary/5 rounded-full blur-[160px] pointer-events-none" />
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[400px] bg-blue-600/5 rounded-full blur-[200px] rotate-12 pointer-events-none" />
        </div>

        {/* Section 8: Dedicated Footer Closure */}
        <div className="h-screen w-screen flex flex-col items-center justify-center relative shrink-0 bg-background pt-20">
           <div className="w-full mt-auto mb-auto overflow-y-auto max-h-full py-10">
              <Footer compact={false} />
           </div>
        </div>
      </motion.div>

      {/* SaaS-Grade Minimalist Section Rail - Desktop */}
      <div className="fixed right-10 top-1/2 -translate-y-1/2 z-[100] hidden lg:flex flex-col items-center gap-5">
        {sections.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveSection(index)}
            className="relative group flex items-center justify-center w-12 py-2"
            aria-label={`Go to section ${index + 1}`}
          >
            <div className={`w-[3px] transition-all duration-700 ease-out rounded-full shadow-lg
              ${activeSection === index 
                ? "h-12 bg-primary shadow-[0_0_25px_rgba(20,184,166,1)]" 
                : "h-3 bg-foreground/10 group-hover:bg-foreground/30"}
            `} />
          </button>
        ))}
      </div>

      {/* Premium Bottom Progress Pill - Mobile */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] lg:hidden flex items-center px-6 py-4 rounded-full bg-background/60 backdrop-blur-3xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
          <div className="flex gap-4">
              {sections.map((_, index) => (
                  <button 
                      key={index}
                      onClick={() => setActiveSection(index)}
                      className={`h-2 rounded-full transition-all duration-500
                          ${activeSection === index ? "w-12 bg-primary glow-primary" : "w-2 bg-white/20"}
                      `}
                  />
              ))}
          </div>
      </div>
    </div>
  );
}

