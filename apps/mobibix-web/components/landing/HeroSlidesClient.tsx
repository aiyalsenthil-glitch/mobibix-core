"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { Header } from "../layout/Header";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";

const Footer = dynamic(() => import("../layout/Footer").then((m) => m.Footer));
const BlogSection = dynamic(() => import("./BlogSection").then((m) => m.BlogSection));
const TestimonialsSection = dynamic(() => import("./TestimonialsSection").then((m) => m.TestimonialsSection));

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
  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const scrollCooldown = useRef(0);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);

  const sections = [
    { id: "hero", label: "Hero" },
    { id: "problem", label: "The Problem" },
    { id: "features", label: "Solution" },
    { id: "stats", label: "Showcase" },
    { id: "blog", label: "Insights" },
    { id: "testimonials", label: "Trust" },
    { id: "pricing", label: "Pricing" },
    { id: "faq", label: "FAQ" },
    { id: "cta", label: "Start" },
    { id: "footer", label: "Links" },
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

  if (!mounted) {
    return (
      <div className="bg-background text-foreground h-svh w-screen overflow-hidden">
        <Header />
         {/* Placeholder to match structure but avoid interactive mismatch */}
        <div className="h-svh w-screen flex flex-col items-center justify-center p-5">
           <div className="w-16 h-16 animate-pulse bg-muted rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground selection:bg-primary/30 h-svh w-screen overflow-hidden transition-colors duration-500">
      <Header />

      <div
        className="h-full w-full flex flex-col transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{ transform: `translateY(-${activeSection * 100}svh)` }}
      >
        {/* ── Section 1: Hero ── */}
        <div className="h-svh w-screen flex flex-col items-center justify-center relative pt-20 px-5 shrink-0 overflow-hidden">
          <motion.div
            initial={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
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

            <h2 className="text-4xl sm:text-6xl md:text-[8rem] font-black mb-6 md:mb-10 tracking-tighter leading-[0.85] md:leading-[0.8] text-foreground uppercase italic text-glow-indigo">
              All-in-One <br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-primary via-blue-500 to-indigo-500 drop-shadow-2xl">
                POS for Mobile Shops.
              </span>
            </h2>

            <p className="text-muted-foreground text-base md:text-xl lg:text-2xl font-bold max-w-2xl mx-auto mb-8 md:mb-16 leading-relaxed italic opacity-80">
              Manage sales, repairs, IMEI tracking, and customers in one place.
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

        {/* ── Section 2: Problem ── */}
        <div className="h-svh w-screen flex flex-col items-center justify-center px-5 md:px-6 shrink-0 bg-background relative overflow-hidden transition-colors duration-500">
          <motion.div
            animate={activeSection === 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
            className="w-full max-w-5xl text-center z-10"
          >
            <span className="text-red-500 text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] mb-4 block">
              The Reality
            </span>
            <h2 className="text-4xl sm:text-6xl md:text-[7rem] font-black text-foreground mb-8 md:mb-12 tracking-tighter leading-[0.85] uppercase italic">
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

        {/* ── Section 3: Features (Solution) ── */}
        <div className="h-svh w-screen flex flex-col items-center justify-center px-4 md:px-6 shrink-0 bg-background relative overflow-hidden transition-colors duration-500">
          <motion.div
            animate={activeSection === 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
            className="w-full max-w-7xl relative z-10"
          >
            <div className="mb-8 md:mb-16 lg:mb-20 text-center">
              <span className="text-primary text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] md:tracking-[0.6em] mb-3 block">
                The Solution
              </span>
              <h2 className="text-3xl sm:text-5xl md:text-[7rem] font-black text-foreground tracking-tighter uppercase italic leading-[0.85] md:leading-[0.8]">
                Everything your <br className="hidden md:block" />shop needs.
              </h2>
            </div>

            <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-none lg:grid lg:grid-cols-5 lg:gap-6 lg:overflow-visible lg:pb-0">
              {[
                { title: "IMEI TRACKING", desc: "Track every device serial-perfect.", icon: "/assets/landing/inventory-icon.png" },
                { title: "REPAIR HUB", desc: "Manage jobs, status & delivery.", icon: "/assets/landing/repairs-icon.png" },
                { title: "BILLING & GST", desc: "Generate GST bills in 5 seconds.", icon: "/assets/landing/billing-icon.png" },
                { title: "HYPER CRM", desc: "Automatic WhatsApp follow-ups.", icon: "/assets/landing/marketing-icon.png" },
                { title: "DASHBOARD", desc: "Daily profit & sales at a glance.", icon: "/assets/landing/inventory-icon.png" },
              ].map((feat, i) => (
                <motion.div
                  key={i}
                  animate={activeSection === 2
                    ? { opacity: 1, y: 0, scale: 1 }
                    : { opacity: 0, y: 30, scale: 0.9 }}
                  transition={{ delay: i * 0.1 }}
                  className="shrink-0 snap-center w-52 sm:w-64 lg:w-auto p-6 md:p-10 rounded-4xl bg-card border border-border/50 hover:border-primary/50 transition-all duration-500 group text-center shadow-sm"
                >
                  <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 md:mb-8 mx-auto border border-primary/20 p-3 md:p-4 group-hover:scale-110 transition-transform">
                    <NextImage src={feat.icon} alt={feat.title} width={80} height={80} className="object-contain" />
                  </div>
                  <h3 className="text-sm md:text-lg font-black uppercase tracking-tight mb-2 leading-none">{feat.title}</h3>
                  <p className="text-muted-foreground font-bold text-[9px] md:text-[10px] uppercase tracking-widest opacity-60 leading-relaxed">{feat.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ── Section 4: Showcase ── */}
        <div className="h-svh w-screen flex items-center justify-center px-5 md:px-6 shrink-0 bg-background transition-colors duration-500">
          <motion.div
            animate={activeSection === 3 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
            className="w-full max-w-7xl"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 lg:gap-32 items-center">
              <div>
                <span className="text-primary text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] md:tracking-[0.6em] mb-4 md:mb-6 block">
                  Built for Reality
                </span>
                <h2 className="text-4xl sm:text-6xl md:text-[8rem] font-black text-foreground mb-8 md:mb-12 tracking-tighter leading-[0.85] md:leading-[0.8] uppercase italic">
                  Visual <br />Profit.
                </h2>
                <div className="grid grid-cols-2 gap-6 md:gap-12">
                  <StatItem value="10" unit="sec" label="Billing" />
                  <StatItem value="100" unit="%" label="IMEI Safe" />
                  <StatItem value="50" unit="+" label="Daily Jobs" />
                  <StatItem value="0" unit="₹" label="Loss" />
                </div>
              </div>

              <div className="relative p-6 md:p-8 rounded-4xl border border-border/60 bg-muted/20 shadow-2xl">
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

        {/* ── Section 5: Insights (Blog) ── */}
        <div className="h-svh w-screen flex flex-col items-center justify-center px-4 md:px-6 shrink-0 bg-background relative overflow-hidden">
          <motion.div
            animate={activeSection === 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            className="w-full max-w-7xl pt-20 pb-10 overflow-y-auto scrollbar-none"
          >
             <BlogSection posts={posts} />
          </motion.div>
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        </div>

        {/* ── Section 6: Trust ── */}
        <div className="h-svh w-screen flex items-start justify-center shrink-0 bg-background transition-colors duration-500 overflow-y-auto pt-4">
          <motion.div
            animate={activeSection === 5 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            className="w-full flex flex-col items-center"
          >
            <TestimonialsSection />
          </motion.div>
        </div>

        {/* ── Section 7: Pricing ── */}
        <div className="h-svh w-screen flex flex-col items-center justify-center px-5 md:px-6 shrink-0 bg-background relative overflow-hidden transition-colors duration-500">
          <motion.div
            animate={activeSection === 6 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
            className="w-full max-w-5xl z-10"
          >
            <div className="text-center mb-12 md:mb-20">
               <span className="text-primary text-[9px] font-black uppercase tracking-[0.4em] mb-4 block">Fair & Simple</span>
               <h2 className="text-4xl sm:text-6xl md:text-[7rem] font-black text-foreground tracking-tighter uppercase italic leading-none">Starting at ₹ 299</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
               <div className="p-10 rounded-4xl bg-card border border-border shadow-2xl text-center">
                  <h3 className="text-xl font-black uppercase mb-2">Basic</h3>
                  <p className="text-4xl font-black text-foreground mb-6">₹ 299<span className="text-xs text-muted-foreground">/mo</span></p>
                  <ul className="text-left space-y-4 mb-10 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                     <li>• Full Inventory & IMEI</li>
                     <li>• Repair Job Manager</li>
                     <li>• Professional GST Billing</li>
                  </ul>
                  <Link href="/auth" className="block w-full py-4 rounded-2xl bg-muted hover:bg-muted font-black uppercase tracking-widest transition-all">Start Trial</Link>
               </div>
               <div className="p-10 rounded-4xl bg-primary text-white text-center shadow-2xl shadow-primary/20">
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

        {/* ── Section 8: FAQ ── */}
        <div className="h-svh w-screen flex flex-col items-center justify-center px-5 md:px-6 shrink-0 bg-background relative overflow-hidden transition-colors duration-500">
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
                { q: "Is this built for mobile shops?", a: "Yes, specifically. We have native support for IMEI tracking and repair job-cards which generic billing apps lack." },
                { q: "Can I track repairs and pending jobs?", a: "Absolutely. You can see live status of every repair and even send automatic updates to customers on WhatsApp." },
                { q: "Is it easy to use for shop managers?", a: "MobiBix is built with a focus on speed. Generating a full GST-compliant invoice takes only 5-10 seconds." },
                { q: "Can I import my existing product data?", a: "Yes. You can upload your current stock via Excel and start your first sale within 5 minutes of setup." },
              ].map((faq, i) => (
                <motion.div
                  key={i}
                  animate={activeSection === 7 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
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

        {/* ── Section 9: CTA ── */}
        <div className="h-svh w-screen flex flex-col items-center justify-center relative shrink-0 bg-background overflow-hidden px-5 transition-colors duration-500">
          <motion.div
            animate={activeSection === 8
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
        <div className="h-svh w-screen flex flex-col relative shrink-0 bg-background overflow-y-auto">
          <div className="mt-auto mb-auto w-full py-6 md:py-10">
            <Footer compact={false} />
          </div>
        </div>
      </div>

      {/* Section Rail — Desktop only */}
      <div className="fixed right-6 lg:right-10 top-1/2 -translate-y-1/2 z-100 hidden lg:flex flex-col items-center gap-5">
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
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-100 lg:hidden flex items-center px-3 py-1 rounded-full bg-background/60 backdrop-blur-3xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
        <div className="flex gap-1">
          {sections.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveSection(index)}
              aria-label={`Go to section ${index + 1}`}
              className="px-2 py-4"
            >
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${activeSection === index ? "w-8 bg-primary" : "w-2 bg-foreground/20"}`}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
