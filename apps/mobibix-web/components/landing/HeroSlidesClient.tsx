"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { useTheme } from "@/context/ThemeContext";
import { Header } from "../layout/Header";
import { Footer } from "../layout/Footer";
import { motion, AnimatePresence } from "framer-motion";
import { BlogSection } from "./BlogSection";
import { TestimonialsSection } from "./TestimonialsSection";

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

export function HeroSlidesClient({ posts }: { posts: any[] }) {
  const { theme: _theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollCooldown = useRef(0);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);

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

  const goNext = () => setActiveSection(prev => Math.min(prev + 1, sections.length - 1));
  const goPrev = () => setActiveSection(prev => Math.max(prev - 1, 0));

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const now = Date.now();
      if (now - scrollCooldown.current < 900) return;
      if (e.deltaY > 50 && activeSection < sections.length - 1) {
        goNext();
        scrollCooldown.current = now;
      } else if (e.deltaY < -50 && activeSection > 0) {
        goPrev();
        scrollCooldown.current = now;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") goNext();
      else if (e.key === "ArrowUp") goPrev();
    };

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
      touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const now = Date.now();
      if (now - scrollCooldown.current < 700) return;
      const dy = touchStartY.current - e.changedTouches[0].clientY;
      const dx = Math.abs(touchStartX.current - e.changedTouches[0].clientX);
      // Only trigger if primarily vertical swipe and large enough
      if (Math.abs(dy) < 50 || dx > Math.abs(dy)) return;
      if (dy > 0) {
        goNext();
      } else {
        goPrev();
      }
      scrollCooldown.current = now;
    };

    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [activeSection, sections.length]);

  if (!mounted) return null;

  return (
    <div className="bg-background text-foreground selection:bg-primary/30 h-[100svh] w-screen overflow-hidden transition-colors duration-500">
      <Header />

      <motion.div
        className="h-full w-full flex flex-col"
        animate={{ y: `-${activeSection * 100}svh` }}
        transition={{ type: "spring", stiffness: 70, damping: 20, mass: 1 }}
        onAnimationStart={() => setIsScrolling(true)}
        onAnimationComplete={() => setIsScrolling(false)}
      >
        {/* ── Section 1: Hero ── */}
        <div className="h-[100svh] w-screen flex flex-col items-center justify-center relative pt-20 px-5 shrink-0 overflow-hidden">
          <motion.div
            animate={activeSection === 0
              ? { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }
              : { opacity: 0, scale: 0.9, y: 50, filter: "blur(10px)" }}
            transition={{ duration: 0.8 }}
            className="relative z-10 w-full max-w-5xl text-center"
          >
            <div className="mb-6 md:mb-10 inline-flex items-center gap-3 px-4 md:px-5 py-2 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-3xl shadow-2xl shadow-primary/10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.25em] md:tracking-[0.3em] text-primary">
                Trusted by 500+ Mobile Retailers
              </span>
            </div>

            <h1 className="text-4xl sm:text-6xl md:text-[8rem] font-black mb-6 md:mb-10 tracking-tighter leading-[0.85] md:leading-[0.8] text-foreground uppercase italic text-glow-indigo">
              Run Your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-500 to-indigo-500 drop-shadow-2xl">
                Mobile Shop.
              </span>
            </h1>

            <p className="text-muted-foreground text-base md:text-xl lg:text-2xl font-bold max-w-2xl mx-auto mb-8 md:mb-16 leading-relaxed italic opacity-80">
              The SaaS-grade Retail OS. Stop losing track of IMEIs, repairs, and stock.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-8">
              <Link
                href="/auth"
                className="group relative w-full sm:w-auto px-8 md:px-12 py-4 md:py-6 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest transition-all shadow-2xl shadow-primary/20 overflow-hidden text-sm md:text-base"
              >
                <span className="relative z-10">Start Free Trial</span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </Link>
              <Link
                href="/pricing"
                className="w-full sm:w-auto px-8 md:px-12 py-4 md:py-6 rounded-2xl border-2 border-border text-foreground text-center font-black uppercase tracking-widest hover:bg-muted transition-all backdrop-blur-md text-sm md:text-base"
              >
                Pricing Plans
              </Link>
            </div>
          </motion.div>

          <div className="absolute top-[20%] -left-[10%] w-[400px] md:w-[600px] h-[400px] md:h-[600px] bg-primary/20 rounded-full blur-[150px] animate-pulse pointer-events-none" />
          <div className="absolute bottom-[10%] -right-[10%] w-[500px] md:w-[700px] h-[500px] md:h-[700px] bg-blue-500/20 rounded-full blur-[180px] animate-pulse pointer-events-none delay-1000" />
        </div>

        {/* ── Section 2: Features ── */}
        <div className="h-[100svh] w-screen flex flex-col items-center justify-center px-4 md:px-6 shrink-0 bg-muted/5 relative overflow-hidden">
          <motion.div
            animate={activeSection === 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
            className="w-full max-w-7xl relative z-10"
          >
            <div className="mb-8 md:mb-16 lg:mb-20 text-center">
              <span className="text-primary text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] md:tracking-[0.6em] mb-3 block">
                Engineered for Growth
              </span>
              <h2 className="text-3xl sm:text-5xl md:text-[7rem] font-black text-foreground tracking-tighter uppercase italic leading-[0.85] md:leading-[0.8]">
                Protect <br className="hidden md:block" />Inventory.
              </h2>
            </div>

            {/* Mobile: horizontal scroll carousel | Desktop: 5-col grid */}
            <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-none lg:grid lg:grid-cols-5 lg:gap-6 lg:overflow-visible lg:pb-0">
              {[
                { title: "IMEI TRACK", desc: "Digital ownership.", icon: "/assets/landing/inventory-icon.png" },
                { title: "REPAIR HUB", desc: "Live job tracking.", icon: "/assets/landing/repairs-icon.png" },
                { title: "GST READY", desc: "Auto-tax calc.", icon: "/assets/landing/billing-icon.png" },
                { title: "HYPER CRM", desc: "WhatsApp reach.", icon: "/assets/landing/marketing-icon.png" },
                { title: "B2B SYNC", desc: "Stock sharing.", icon: "/assets/landing/inventory-icon.png" },
              ].map((feat, i) => (
                <motion.div
                  key={i}
                  animate={activeSection === 1
                    ? { opacity: 1, y: 0, scale: 1 }
                    : { opacity: 0, y: 30, scale: 0.9 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex-shrink-0 snap-center w-48 sm:w-56 lg:w-auto p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] bg-card/40 backdrop-blur-2xl border border-border/50 hover:border-primary/50 transition-all duration-500 group text-center"
                >
                  <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl md:rounded-3xl bg-primary/10 flex items-center justify-center mb-4 md:mb-8 mx-auto border border-primary/20 overflow-hidden p-3 md:p-4 group-hover:scale-110 transition-transform">
                    <NextImage src={feat.icon} alt={feat.title} width={80} height={80} className="object-contain filter drop-shadow-xl" />
                  </div>
                  <h3 className="text-sm md:text-lg font-black uppercase tracking-tight mb-1 md:mb-2 leading-none">{feat.title}</h3>
                  <p className="text-muted-foreground font-bold text-[8px] md:text-[9px] uppercase tracking-widest opacity-60 leading-relaxed">{feat.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ── Section 3: Stats ── */}
        <div className="h-[100svh] w-screen flex items-center justify-center px-5 md:px-6 shrink-0 bg-background">
          <motion.div
            animate={activeSection === 2 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
            className="w-full max-w-7xl"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 lg:gap-32 items-center">
              <div>
                <span className="text-primary text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] md:tracking-[0.6em] mb-4 md:mb-6 block">
                  The Multiplier
                </span>
                <h2 className="text-4xl sm:text-6xl md:text-[8rem] font-black text-foreground mb-8 md:mb-12 tracking-tighter leading-[0.85] md:leading-[0.8] uppercase italic">
                  3x ROI.
                </h2>
                <div className="grid grid-cols-2 gap-6 md:gap-12">
                  <StatItem value="5" unit="min" label="Setup" />
                  <StatItem value="100" unit="%" label="Uptime" />
                  <StatItem value="3x" unit="" label="Turnover" />
                  <StatItem value="0" unit="₹" label="Leads" />
                </div>
              </div>

              <div className="relative p-6 md:p-12 rounded-[2rem] md:rounded-[4rem] border border-border/60 bg-muted/10 backdrop-blur-3xl shadow-2xl">
                <h4 className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.3em] md:tracking-[0.4em] text-primary mb-6 md:mb-10 text-center">
                  Efficiency Growth
                </h4>
                <div className="space-y-6 md:space-y-8">
                  {["Billing", "Repairs", "Inventory"].map((l, i) => (
                    <div key={i} className="space-y-2 md:space-y-3">
                      <div className="flex justify-between text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/70">
                        <span>{l}</span>
                        <span>{75 + i * 10}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                        <motion.div
                          animate={activeSection === 2 ? { width: `${75 + i * 10}%` } : { width: 0 }}
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

        {/* ── Section 4: Testimonials ── */}
        <div className="h-[100svh] w-screen flex items-start justify-center shrink-0 bg-muted/5 overflow-y-auto pt-4">
          <TestimonialsSection />
        </div>

        {/* ── Section 5: Blog ── */}
        <div className="h-[100svh] w-screen px-4 md:px-6 shrink-0 flex items-center justify-center bg-background overflow-y-auto">
          <BlogSection posts={posts} />
        </div>

        {/* ── Section 6: FAQ ── */}
        <div className="h-[100svh] w-screen flex flex-col items-center justify-center px-5 md:px-6 shrink-0 bg-muted/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
          <div className="w-full max-w-4xl relative z-10 overflow-y-auto max-h-[90svh] py-4">
            <div className="mb-8 md:mb-16 text-center">
              <span className="text-primary text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] md:tracking-[0.6em] mb-3 block">
                Operations Mastery
              </span>
              <h2 className="text-3xl sm:text-5xl md:text-[6rem] font-black text-foreground tracking-tighter uppercase italic leading-[0.85] md:leading-[0.8] mb-4 md:mb-8">
                The FAQ.
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 md:gap-x-20 gap-y-8 md:gap-y-16">
              {[
                { q: "How long does it take to setup MobiBix?", a: "You can be fully set up in under 5 minutes. We support simple data import from Excel, ensuring zero downtime for your retail operations." },
                { q: "How does MobiBix protect my inventory?", a: "MobiBix uses a serial-locked inventory system (IMEI/SN). Every device is tracked from purchase to sale, ensuring 100% accuracy and preventing stock leakage." },
                { q: "Which devices are compatible with MobiBix?", a: "MobiBix is a web-native Retail OS. It runs seamlessly on any device with a browser, including laptops, tablets, and Android smartphones." },
                { q: "How much does WhatsApp integration cost?", a: "MobiBix provides built-in WhatsApp automation at no extra cost. You can send payment reminders and repair status updates for free." },
              ].map((faq, i) => (
                <motion.div
                  key={i}
                  animate={activeSection === 5 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.1 }}
                  className="group border-l-4 border-primary/20 pl-5 md:pl-8 hover:border-primary transition-colors"
                >
                  <h3 className="text-base md:text-xl font-black text-foreground mb-2 md:mb-4 group-hover:text-primary transition-colors uppercase italic leading-tight">
                    {faq.q}
                  </h3>
                  <p className="text-muted-foreground font-bold text-[10px] md:text-xs uppercase tracking-widest leading-loose opacity-60">
                    {faq.a}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Section 7: CTA ── */}
        <div className="h-[100svh] w-screen flex flex-col items-center justify-center relative shrink-0 overflow-hidden px-5">
          <motion.div
            animate={activeSection === 6
              ? { opacity: 1, scale: 1, y: 0 }
              : { opacity: 0, scale: 1.1, y: 50 }}
            className="flex flex-col items-center justify-center text-center relative z-10 w-full"
          >
            <h2 className="text-4xl sm:text-6xl md:text-[9rem] lg:text-[11rem] font-black text-foreground mb-10 md:mb-16 tracking-tighter leading-[0.75] md:leading-[0.7] uppercase italic drop-shadow-2xl">
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

        {/* ── Section 8: Footer ── */}
        <div className="h-[100svh] w-screen flex flex-col relative shrink-0 bg-background overflow-y-auto">
          <div className="mt-auto mb-auto w-full py-6 md:py-10">
            <Footer compact={false} />
          </div>
        </div>
      </motion.div>

      {/* Section Rail — Desktop only */}
      <div className="fixed right-6 lg:right-10 top-1/2 -translate-y-1/2 z-[100] hidden lg:flex flex-col items-center gap-5">
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

      {/* Progress Dots — Mobile */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] lg:hidden flex items-center px-5 py-3 rounded-full bg-background/60 backdrop-blur-3xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
        <div className="flex gap-3">
          {sections.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveSection(index)}
              className={`h-2 rounded-full transition-all duration-500
                ${activeSection === index ? "w-8 bg-primary" : "w-2 bg-white/20"}
              `}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
