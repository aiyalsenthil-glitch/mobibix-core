"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useTheme } from "@/context/ThemeContext";
import { Header } from "../layout/Header";
import { Footer } from "../layout/Footer";
import { motion, AnimatePresence } from "framer-motion";
import { TestimonialsSection } from "./TestimonialsSection";

// Helper components
function InventoryIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-foreground/50 group-hover:text-primary transition-colors">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

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

export function HeroSlidesClient() {
  const { theme: _theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollCooldown = useRef(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" && currentSlide < 4) setCurrentSlide(currentSlide + 1);
      else if (e.key === "ArrowUp" && currentSlide > 0) setCurrentSlide(currentSlide - 1);
    };
    const handleWheel = (e: WheelEvent) => {
      const now = Date.now();
      if (now - scrollCooldown.current < 800) return;
      if (e.deltaY > 30 && currentSlide < 4) { setCurrentSlide(prev => prev + 1); scrollCooldown.current = now; }
      else if (e.deltaY < -30 && currentSlide > 0) { setCurrentSlide(prev => prev - 1); scrollCooldown.current = now; }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => { window.removeEventListener("keydown", handleKeyDown); window.removeEventListener("wheel", handleWheel); };
  }, [currentSlide]);

  if (!mounted) return null;

  const slides = [0, 1, 2, 3, 4];

  return (
    <div className="bg-background text-foreground selection:bg-primary/30 min-h-screen overflow-hidden transition-colors duration-500">
      <Header />

      {/* Slide Container */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <motion.div 
          className="h-full w-full"
          animate={{ y: `-${currentSlide * 100}vh` }}
          transition={{ 
            type: "spring", 
            stiffness: 100, 
            damping: 20, 
            mass: 1,
            restDelta: 0.001 
          }}
        >
          {/* Slide 1: Hero */}
          <div className="h-screen w-screen flex items-center justify-center overflow-hidden relative">
            <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 50 }}
               whileInView={{ opacity: 1, scale: 1, y: 0 }}
               transition={{ duration: 0.8, delay: 0.2 }}
               className="relative z-10 w-full max-w-5xl px-6 text-center pt-20"
            >
                <div className="mb-8 inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-border bg-muted/30 backdrop-blur-xl">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Trusted by 500+ Mobile Retailers</span>
                </div>
                
                <h1 className="text-5xl md:text-8xl font-black mb-8 tracking-tighter leading-tight text-foreground uppercase">
                    Run Your Mobile Shop <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-500 to-indigo-500">Without the Chaos.</span>
                </h1>
                
                <p className="text-muted-foreground text-lg md:text-xl font-bold max-w-2xl mx-auto mb-12 leading-relaxed italic">
                    Stop losing track of IMEIs, repairs, and stock. Generate GST bills in 5 seconds. The #1 Billing & Inventory app for Indian Mobile Retailers.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                    <Link href="/auth" className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-2xl shadow-primary/20">
                        Start Free Trial
                    </Link>
                    <button onClick={() => setCurrentSlide(1)} className="w-full sm:w-auto px-10 py-5 rounded-2xl border border-border text-foreground font-black uppercase tracking-widest hover:bg-muted transition-all">
                        Book A Demo
                    </button>
                </div>
            </motion.div>
            {/* Background Effects */}
            <div className="absolute top-[20%] -left-[10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
            <div className="absolute bottom-[10%] -right-[10%] w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[140px] pointer-events-none animate-pulse" style={{ animationDelay: "2s" }} />
          </div>

          {/* Slide 2: Features */}
          <div className="h-screen w-screen flex items-center justify-center overflow-hidden relative">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="w-full max-w-7xl px-6 py-20"
            >
              <div className="mb-14 text-center">
                <span className="text-primary text-[10px] font-black uppercase tracking-[0.4em]">Stop Leaking Profits</span>
                <h2 className="text-4xl md:text-6xl font-black text-foreground mt-4 tracking-tight uppercase leading-none italic">Protect Your Inventory.</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                  { title: "Never Lose Stock", desc: "Track every IMEI. Stop theft with serial-perfect accuracy.", icon: <InventoryIcon /> },
                  { title: "Control Repairs", desc: "Track technician parts. Stop disputes with digital proof.", icon: <InventoryIcon /> },
                  { title: "Instant GST Build", desc: "Generate professional bills in 5 seconds. Look premium.", icon: <InventoryIcon /> },
                  { title: "WhatsApp Marketing", desc: "Auto-send reminders. Get paid faster and sell accessories.", icon: <InventoryIcon /> },
                ].map((feat, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                    className="p-10 rounded-[2.5rem] bg-muted/20 border border-border hover:border-primary/50 transition-all duration-500 group"
                  >
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-8 border border-primary/20 group-hover:bg-primary transition-colors">
                          {feat.icon}
                      </div>
                      <h3 className="text-xl font-black mb-4 uppercase tracking-tight">{feat.title}</h3>
                      <p className="text-muted-foreground font-bold text-sm leading-relaxed">{feat.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Slide 3: Stats */}
          <div className="h-screen w-screen flex items-center justify-center overflow-hidden relative">
            <motion.div 
               initial={{ opacity: 0, x: -50 }}
               whileInView={{ opacity: 1, x: 0 }}
               transition={{ duration: 0.8 }}
               className="w-full max-w-7xl px-6 py-20"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                <div>
                    <span className="text-primary text-[10px] font-black uppercase tracking-[0.4em]">Proven Impact</span>
                    <h2 className="text-5xl md:text-7xl font-black text-foreground mt-6 mb-8 tracking-tighter leading-tight uppercase">Build A Retail <br />Empire.</h2>
                    <p className="text-muted-foreground text-lg font-bold mb-12 max-w-lg">Indian shop owners using MobiBix report a 3x increase in repair turnaround and zero lost inventory.</p>
                    <div className="grid grid-cols-2 gap-8">
                        <StatItem value="5" unit="min" label="Setup Time" />
                        <StatItem value="3x" unit="" label="Efficiency" />
                        <StatItem value="0" unit="₹" label="Initial Cost" />
                        <StatItem value="24/7" unit="" label="Support" />
                    </div>
                </div>
                <motion.div 
                  initial={{ opacity: 0, x: 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="relative group"
                >
                    <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-[3rem] blur-3xl opacity-50 group-hover:opacity-100 transition duration-1000" />
                    <div className="relative p-10 rounded-[3rem] border border-border bg-card/50 backdrop-blur-3xl">
                        <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-8 border-b border-border pb-4 font-mono">Inventory Report</h4>
                        <div className="space-y-6">
                            {[
                                { l: "iPhone 15 Pro", v: "85%", c: "bg-primary" },
                                { l: "S24 Ultra", v: "45%", c: "bg-blue-500" },
                                { l: "Pixel 8 Pro", v: "65%", c: "bg-indigo-500" }
                            ].map((row, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                        <span>{row.l}</span>
                                        <span>{row.v}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-muted rounded-full">
                                        <div className={`h-full ${row.c} rounded-full`} style={{ width: row.v }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
              </div>
            </motion.div>
          </div>

          {/* Slide 4: Testimonials */}
          <div className="h-screen w-screen flex items-center justify-center overflow-hidden relative">
             <TestimonialsSection />
          </div>

          {/* Slide 5: CTA */}
          <div className="h-screen w-screen flex items-center justify-center overflow-hidden relative">
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col items-center justify-center w-full max-w-5xl px-6 pt-10 pb-96"
            >
              <h2 className="text-5xl md:text-8xl font-black text-foreground mb-10 tracking-tighter leading-tight uppercase italic">
                Stop Losing <br />Profits.
              </h2>
              <p className="text-muted-foreground text-lg md:text-xl font-bold max-w-xl mx-auto mb-12">
                Join 500+ successful shop owners across India. Set up your digital store in exactly 5 minutes.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-8">
                <Link href="/auth" className="w-full sm:w-auto px-12 py-5 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-2xl shadow-primary/20">
                    Get Started Free
                </Link>
                <Link href="/pricing" className="w-full sm:w-auto px-12 py-5 rounded-2xl border border-border text-foreground font-black uppercase tracking-widest hover:bg-muted transition-all">
                    View Pricing
                </Link>
              </div>
              <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">No credit card required · 14-day free trial</p>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Slide Navigation Dots */}
      <div className={`fixed left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-6 transition-all duration-1000 ${currentSlide === 4 ? "bottom-[420px] md:bottom-[280px]" : "bottom-12"}`}>
        <div className="flex gap-3 bg-muted/20 backdrop-blur-3xl p-2.5 rounded-full border border-border/50 shadow-2xl">
          {slides.map((slide) => (
            <button key={slide} onClick={() => setCurrentSlide(slide)}
              className={`h-2 rounded-full transition-all duration-700 ${currentSlide === slide ? "bg-primary w-14 shadow-[0_0_20px_rgba(20,184,166,0.6)]" : "bg-foreground/20 w-3 hover:bg-foreground/40"}`}
              aria-label={`Go to slide ${slide + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Footer appearing on last slide */}
      <AnimatePresence>
        {currentSlide === 4 && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-0 left-0 w-full z-50 transform translate-y-0 shadow-2xl"
          >
            <Footer compact={true} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
