"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useTheme } from "@/context/ThemeContext";

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
}

export default function HomePage() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && theme === 'dark';

  const scrollCooldown = useRef(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" && currentSlide < 4) {
        setCurrentSlide(currentSlide + 1);
      } else if (e.key === "ArrowUp" && currentSlide > 0) {
        setCurrentSlide(currentSlide - 1);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      const now = Date.now();
      if (now - scrollCooldown.current < 800) return;

      if (e.deltaY > 30 && currentSlide < 4) { // sensitivity 30
        setCurrentSlide(prev => prev + 1);
        scrollCooldown.current = now;
      } else if (e.deltaY < -30 && currentSlide > 0) {
        setCurrentSlide(prev => prev - 1);
        scrollCooldown.current = now;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wheel", handleWheel);
    };
  }, [currentSlide]);

  if (!mounted) return null;

  return (
    <div className="bg-background text-foreground overflow-x-hidden w-screen transition-colors duration-300">
      <style>{`
        .slide {
          transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1);
          flex-shrink: 0;
        }
        .slide-container {
          overflow: hidden;
          height: 100vh;
          position: relative;
        }
      `}</style>
      {/* Header - Modern Design */}
      <header className="fixed top-0 z-50 w-full backdrop-blur-xl bg-gradient-to-b from-background/80 to-transparent border-b border-border/40">
        <nav className="max-w-7xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-400 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
              <span className="text-white font-bold text-sm">M</span>
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-300 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold uppercase tracking-widest text-foreground">
                MobiBix
              </span>
              <span className="text-[10px] text-muted-foreground font-medium">
                Digital Retail Platform
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8 text-xs font-normal text-muted-foreground hover:text-foreground transition-colors tracking-wide">
            <NavLink href="#features">Features</NavLink>
            <NavLink href="/pricing">Pricing</NavLink>
            <NavLink href="#testimonials">Customers</NavLink>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-muted transition-all duration-300 text-muted-foreground hover:text-foreground"
              aria-label="Toggle theme"
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>

            {/* Sign In Link */}
            <Link
              href="/auth"
              className="text-xs font-medium px-3.5 py-1.5 rounded-lg border border-border text-foreground hover:border-border/80 hover:bg-muted transition-all duration-300"
            >
              Sign In
            </Link>

            {/* CTA Button - Modern gradient with glow */}
            <Link
              href="/auth"
              className="relative inline-flex items-center justify-center text-xs font-semibold px-4 py-1.5 rounded-lg overflow-hidden group"
            >
              {/* Animated background */}
              <div className="absolute inset-0 bg-gradient-to-r from-teal-500 via-cyan-400 to-teal-500 rounded-lg opacity-100 group-hover:opacity-90 transition-opacity duration-300"></div>
              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-teal-600 via-cyan-500 to-teal-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

              {/* Text */}
              <span className="relative z-10 text-white font-medium">
                Free Trial
              </span>
            </Link>
          </div>
        </nav>
      </header>

      {/* Slide Container */}
      <div className="slide-container w-screen h-screen overflow-hidden fixed top-0 left-0">
        {/* Slide 1: Hero */}
        <div
          className="slide w-screen h-screen"
          style={{
            transform: `translateY(${-currentSlide * 100}%)`,
          }}
        >
          <main className="relative h-screen w-full overflow-hidden flex flex-col justify-center items-center border-b border-border">
            <div className="absolute inset-0 z-0">
              <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background"></div>
              <div className="absolute top-[15%] -left-[10%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[140px] pointer-events-none animate-pulse"></div>
              <div
                className="absolute bottom-[10%] -right-[10%] w-[500px] h-[500px] bg-purple-500/15 rounded-full blur-[140px] pointer-events-none animate-pulse"
                style={{ animationDelay: "1.5s" }}
              ></div>
              <div
                className="absolute inset-0 opacity-[0.02] pointer-events-none"
                style={{
                  backgroundImage: `url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')`,
                }}
              ></div>
            </div>

            <div className="relative z-10 w-full max-w-4xl px-4 sm:px-6 md:px-8 text-center mx-auto">
              {/* Status Badge */}
              <div className="mb-4 inline-flex items-center gap-2 px-3 py-0.5 rounded-full border border-border bg-card/30 backdrop-blur-md mx-auto shadow-sm">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
                </span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium whitespace-nowrap">
                  Now Live
                </span>
              </div>

              {/* Main Heading - modern, short and bold */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-tight tracking-tight text-foreground mb-3 font-extrabold">
                <span className="inline-block">Run Your Digital Retail &</span>
                <span className="inline-block ml-2 text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-pink-400">
                  Service Business Smarter
                </span>
              </h1>

              {/* Subheading - concise, visible on md+ */}
              <p className="hidden md:block text-sm text-stone-400 mb-6 max-w-2xl mx-auto">
                Sell digital products, manage customer services, and scale your
                business with one elegant platform built for modern retailers.
              </p>

              {/* CTA Buttons - large, modern */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                <Link
                  href="/auth"
                  className="relative inline-flex items-center justify-center px-8 py-3 rounded-full text-base font-semibold text-white shadow-xl overflow-hidden w-full sm:w-auto hover:shadow-2xl hover:shadow-primary/20 transition-all"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary to-purple-500 rounded-full transform scale-100 transition-transform duration-300" />
                  <span className="relative z-10 flex items-center gap-2">
                    Start Free Trial <ArrowIcon />
                  </span>
                </Link>

                <Link
                  href="/dashboard"
                  className="relative inline-flex items-center justify-center px-8 py-3 rounded-full text-base font-semibold text-white shadow-xl overflow-hidden w-full sm:w-auto hover:shadow-2xl hover:shadow-secondary/20 transition-all"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary to-purple-500 rounded-full transform scale-100 transition-transform duration-300" />
                  <span className="relative z-10 flex items-center gap-2">
                    Get Started for Free <ArrowIcon />
                  </span>
                </Link>

                <button
                  onClick={() => setCurrentSlide(1)}
                  className="w-full sm:w-auto px-6 py-3 rounded-full border border-border text-foreground font-semibold text-sm hover:bg-muted transition-all"
                >
                  See Features
                </button>
              </div>

              {/* Feature teaser row - small icons + labels */}
              <div className="hidden lg:flex items-center justify-center gap-8 mt-2 text-stone-400 text-sm">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-white/6 rounded-md">
                    <InventoryIcon />
                  </span>
                  <span>Inventory</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-white/6 rounded-md">
                    <UsersIcon />
                  </span>
                  <span>Team</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-white/6 rounded-md">
                    <AnalyticsIcon />
                  </span>
                  <span>Analytics</span>
                </div>
              </div>

              {/* Floating Mobile Mockup with KPI Dashboard */}
              <div className="mt-12 hidden lg:flex justify-center">
                <div className="relative">
                  {/* Phone Frame */}
                  <div className="relative w-80 h-96 rounded-3xl border-8 border-gray-800 bg-black shadow-2xl">
                    {/* Phone Notch */}
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-6 bg-black rounded-b-3xl z-10"></div>
                    {/* Screen Content */}
                    <div className="absolute inset-2 rounded-2xl overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950">
                      {/* Header */}
                      <div className="p-4 border-b border-white/10">
                        <p className="text-white text-xs font-semibold">
                          Seller Dashboard
                        </p>
                        <p className="text-stone-400 text-xs mt-1">
                          Today's Sales
                        </p>
                      </div>
                      {/* KPI Cards */}
                      <div className="p-3 space-y-2">
                        {/* Orders */}
                        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-lg p-3">
                          <p className="text-stone-400 text-xs">Orders</p>
                          <div className="flex items-baseline gap-2 mt-1">
                            <p className="text-white text-lg font-bold">34</p>
                            <p className="text-emerald-400 text-xs">+8 today</p>
                          </div>
                        </div>
                        {/* Revenue */}
                        <div className="bg-gradient-to-br from-teal-500/10 to-teal-600/5 border border-teal-500/20 rounded-lg p-3">
                          <p className="text-stone-400 text-xs">Revenue</p>
                          <div className="flex items-baseline gap-2 mt-1">
                            <p className="text-white text-lg font-bold">
                              $4.8K
                            </p>
                            <p className="text-teal-400 text-xs">+32%</p>
                          </div>
                        </div>
                        {/* Services */}
                        <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-lg p-3">
                          <p className="text-stone-400 text-xs">
                            Active Services
                          </p>
                          <div className="flex items-baseline gap-2 mt-1">
                            <p className="text-white text-lg font-bold">12</p>
                            <p className="text-orange-400 text-xs">
                              In progress
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Glow Effect */}
                  <div className="absolute -inset-20 bg-gradient-to-r from-teal-500/20 to-teal-500/20 rounded-full blur-3xl opacity-30 pointer-events-none"></div>
                </div>
              </div>
            </div>
          </main>
        </div>

        {/* Slide 2: Features */}
        <div
          className="slide w-screen h-screen"
          style={{
            transform: `translateY(${-currentSlide * 100}%)`,
          }}
        >
          <section className="h-screen py-24 px-6 md:px-12 bg-background relative overflow-hidden flex flex-col justify-center border-b border-border">
            <div className="absolute top-[40%] right-[10%] w-96 h-96 bg-primary/5 rounded-full blur-[128px] pointer-events-none animate-pulse"></div>

            <div className="max-w-7xl mx-auto w-full">
              <div className="mb-16 text-center">
                <span className="inline-block py-1 px-3 rounded-full border border-border bg-muted/50 text-[10px] uppercase tracking-widest text-muted-foreground mb-6">
                  Everything You Need
                </span>
                <h2 className="text-3xl md:text-5xl text-foreground mb-4">
                  All-in-One Commerce Platform
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto font-light text-sm">
                  Manage product sales, service orders, and customer
                  relationships with real-time visibility that keeps your team
                  aligned.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 auto-rows-max">
                {/* Main Feature */}
                <div className="md:col-span-2 lg:col-span-2 lg:row-span-2 relative overflow-hidden rounded-2xl border border-border bg-card/40 p-8 flex flex-col justify-between group hover:border-primary/20 transition-all duration-500 shadow-sm hover:shadow-xl backdrop-blur-sm">
                  <div
                    className="absolute inset-0 opacity-[0.05]"
                    style={{
                      backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
                      backgroundSize: "20px 20px",
                    }}
                  ></div>
                  <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-teal-900/20 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>

                  <div className="relative z-10">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-4 ring-1 ring-border group-hover:ring-primary/30 transition-all">
                      <CheckIcon />
                    </div>
                    <h3 className="text-2xl font-medium mb-2 text-foreground">
                      Unified Sales & Service Hub
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
                      Manage product sales, process orders, and deliver customer
                      services with real-time visibility that keeps your team
                      aligned.
                    </p>
                  </div>

                  {/* Real Feature Benefits */}
                  <div className="mt-8 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-primary font-bold text-xs">
                          ✓
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          One platform, infinite possibilities
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Sell, service, and scale simultaneously
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-primary font-bold text-xs">
                          ✓
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Instant order & service sync
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Everything updates in real-time
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-primary font-bold text-xs">
                          ✓
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Complete customer lifecycle
                        </p>
                        <p className="text-xs text-muted-foreground">
                          From discovery to support, all integrated
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Inventory Feature */}
                <div className="md:col-span-1 lg:col-span-1 lg:row-span-2 relative overflow-hidden rounded-2xl border border-border bg-card/40 p-8 flex flex-col group hover:border-primary/20 transition-all duration-500 shadow-sm hover:shadow-xl backdrop-blur-sm">
                  <div
                    className="absolute inset-0 opacity-[0.05]"
                    style={{
                      backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
                      backgroundSize: "20px 20px",
                    }}
                  ></div>

                  <div className="mb-auto relative z-10">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-4 ring-1 ring-border group-hover:ring-primary/20 transition-all">
                      <InventoryIcon />
                    </div>
                    <h3 className="text-lg font-medium mb-2 text-foreground">
                      Dynamic Pricing & Bundling
                    </h3>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      Create smart product bundles and adjust pricing in
                      real-time based on demand and inventory.
                    </p>
                  </div>

                  <div className="mt-8 space-y-3">
                    <InventoryItem
                      label="Standard Plan"
                      value="45%"
                      percentage={45}
                    />
                    <InventoryItem
                      label="Premium Add-ons"
                      value="38%"
                      percentage={38}
                    />
                    <InventoryItem
                      label="Service Packages"
                      value="82%"
                      percentage={82}
                    />
                  </div>
                </div>

                {/* Customer Portal */}
                <div className="md:col-span-1 lg:col-span-1 relative overflow-hidden rounded-2xl border border-border bg-card/40 p-6 flex flex-col justify-center group hover:bg-muted/50 transition-all duration-500 backdrop-blur-sm">
                  <div className="absolute right-0 top-0 p-32 bg-purple-500/5 blur-3xl rounded-full translate-x-10 -translate-y-10 group-hover:bg-purple-500/10 transition-colors"></div>
                  <UsersIcon />
                  <h3 className="text-base font-medium mb-1 text-foreground relative z-10">
                    White-Label Portal
                  </h3>
                  <p className="text-muted-foreground text-xs relative z-10">
                    Branded customer experience with account management and
                    support.
                  </p>
                </div>

                {/* Analytics */}
                <div className="md:col-span-1 lg:col-span-1 relative overflow-hidden rounded-2xl border border-border bg-card/40 p-6 flex flex-col justify-center group hover:bg-muted/50 transition-all duration-500 backdrop-blur-sm">
                  <div className="absolute right-0 top-0 p-32 bg-primary/5 blur-3xl rounded-full translate-x-10 -translate-y-10 group-hover:bg-primary/10 transition-colors"></div>
                  <AnalyticsIcon />
                  <h3 className="text-base font-medium mb-1 text-foreground relative z-10">
                    Revenue Intelligence
                  </h3>
                  <p className="text-muted-foreground text-xs relative z-10">
                    Detailed sales, service, and customer lifetime value
                    analytics.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Slide 3: Stats */}
        <div
          className="slide w-screen h-screen"
          style={{
            transform: `translateY(${-currentSlide * 100}%)`,
          }}
        >
          <section className="h-screen px-6 md:px-12 border-b border-border bg-background flex flex-col justify-center overflow-hidden">
            <div className="max-w-7xl mx-auto w-full">
              <div className="mb-16 text-center">
                <span className="inline-block py-1 px-3 rounded-full border border-border bg-muted/50 text-[10px] uppercase tracking-widest text-muted-foreground mb-6">
                  Real Results
                </span>
                <h2 className="text-3xl md:text-5xl text-foreground mb-6">
                  The Numbers Speak
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto font-light text-base">
                  See how MobiBix transforms digital retail operations
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-12 lg:gap-16">
                <StatItem value="3x" unit="" label="Faster Order Processing" />
                <StatItem value="45" unit="%" label="Higher Digital Sales" />
                <StatItem value="99" unit="%" label="Uptime Guaranteed" />
                <StatItem value="5" unit="min" label="Setup Time" />
              </div>
            </div>
          </section>
        </div>

        {/* Slide 4: Testimonials */}
        <div
          className="slide w-screen h-screen"
          style={{
            transform: `translateY(${-currentSlide * 100}%)`,
          }}
        >
          <section className="h-screen py-24 px-6 md:px-12 bg-background/50 border-b border-border flex flex-col justify-center overflow-hidden">
            <div className="max-w-7xl mx-auto w-full">
              <h2 className="text-3xl md:text-5xl mb-16 text-center text-foreground">
                Loved by Digital Retailers
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <TestimonialCard
                  name="Rajesh Patel"
                  role="Digital Store Owner"
                  text="MobiBix doubled our digital product sales in 3 months. The unified platform lets us sell and service simultaneously without operational chaos."
                />
                <TestimonialCard
                  name="Anjali Sharma"
                  role="E-commerce Manager"
                  text="We process 200+ orders daily across sales and services. MobiBix's automation saved us from hiring 2 more staff members. Pure game-changer."
                />
                <TestimonialCard
                  name="Vikram Singh"
                  role="Digital Retail Founder"
                  text="The customer portal is exceptional. Our clients can buy, track delivery, and access support without ever calling us. That's the future."
                />
              </div>
            </div>
          </section>
        </div>

        {/* Slide 5: CTA */}
        <div
          className="slide w-screen h-screen"
          style={{
            transform: `translateY(${-currentSlide * 100}%)`,
          }}
        >
          <section className="h-screen px-6 md:px-12 relative overflow-hidden border-b border-border flex flex-col justify-center">
            <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background"></div>
            <div
              className="absolute inset-0 z-0 opacity-20"
              style={{
                backgroundImage: `radial-gradient(var(--foreground) 1px, transparent 1px)`,
                backgroundSize: "50px 50px",
              }}
            ></div>

            <div className="relative z-10 max-w-5xl mx-auto text-center w-full">
              <span className="inline-block py-1 px-3 rounded-full border border-border bg-muted/50 text-[10px] uppercase tracking-widest text-muted-foreground mb-6">
                Start Today
              </span>

              <h2 className="text-4xl md:text-6xl mb-8 text-foreground">
                Scale your digital retail.
                <br />
                Without the chaos.
              </h2>

              <p className="text-lg text-muted-foreground font-light mb-10 max-w-2xl mx-auto">
                Join digital retailers and service providers transforming
                complexity into streamlined operations with MobiBix.
              </p>

              <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                <Link
                  href="/login"
                  className="group relative w-full md:w-auto px-8 py-4 rounded overflow-hidden text-primary-foreground font-medium text-sm transition-all duration-300 transform hover:scale-[1.02]"
                >
                  <div className="absolute inset-0 bg-primary z-0"></div>
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    Start Free Trial
                    <ArrowIcon />
                  </span>
                </Link>
                <a
                  href="#"
                  className="w-full md:w-auto px-8 py-4 rounded border border-border text-foreground font-medium text-sm hover:bg-muted transition-all duration-300 hover:border-border/80 text-center"
                >
                  Schedule Demo
                </a>
              </div>

              <p className="mt-8 text-xs text-muted-foreground">
                14-day free trial · No credit card required · Cancel anytime
              </p>
            </div>
          </section>
        </div>
      </div>

      {/* Navigation Arrows */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-4">
        {/* Current Slide Indicator */}
        <div className="flex gap-2">
          {[0, 1, 2, 3, 4].map((slide) => (
            <button
              key={slide}
              onClick={() => setCurrentSlide(slide)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                currentSlide === slide
                  ? "bg-teal-500 w-8"
                  : "bg-white/20 hover:bg-white/40"
              }`}
              aria-label={`Go to slide ${slide + 1}`}
            />
          ))}
        </div>

        {/* Up Arrow */}
        {currentSlide > 0 && (
          <button
            onClick={() => setCurrentSlide(currentSlide - 1)}
            className="p-2 rounded-lg hover:bg-muted transition-all duration-300 text-muted-foreground hover:text-foreground"
            aria-label="Previous slide"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="18 15 12 9 6 15"></polyline>
            </svg>
          </button>
        )}

        {/* Down Arrow */}
        {currentSlide < 4 && (
          <button
            onClick={() => setCurrentSlide(currentSlide + 1)}
            className="p-2 rounded-lg hover:bg-muted transition-all duration-300 text-muted-foreground hover:text-foreground animate-bounce"
            aria-label="Next slide"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        )}
      </div>

      {/* Footer - Only on last slide */}
      {currentSlide === 4 && (
        <footer className="fixed bottom-0 w-full border-t border-border bg-background py-6 px-6 md:px-12 text-sm z-30">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-border to-transparent"></div>

          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <span className="text-sm font-medium uppercase tracking-[0.25em] text-foreground">
                  MobiBix
                </span>
              </div>

              <div className="flex flex-wrap justify-center gap-6 text-xs text-muted-foreground">
                <a href="#" className="hover:text-foreground transition-colors">
                  Privacy
                </a>
                <a href="#" className="hover:text-foreground transition-colors">
                  Terms
                </a>
                <a href="#" className="hover:text-foreground transition-colors">
                  Support
                </a>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border/50 text-center text-muted-foreground text-[10px] uppercase tracking-widest">
              <p>© 2026 MobiBix · All Systems Operational</p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

// Navigation Link Component
function NavLink({ href, children }: NavLinkProps) {
  return (
    <a
      href={href}
      className="relative group hover:text-foreground transition-colors"
    >
      <span className="relative z-10">{children}</span>
      <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-foreground transition-all duration-300 group-hover:w-full"></span>
    </a>
  );
}

// Stat Item Component
function StatItem({
  value,
  unit,
  label,
}: {
  value: string;
  unit: string;
  label: string;
}) {
  return (
    <div className="border-l border-border pl-6 hover:border-primary/40 transition-colors duration-500">
      <p className="text-4xl md:text-5xl font-light text-foreground mb-2">
        {value}
        <span className="text-xl text-muted-foreground font-normal align-top ml-1">
          {unit}
        </span>
      </p>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

// Testimonial Card Component
function TestimonialCard({
  name,
  role,
  text,
}: {
  name: string;
  role: string;
  text: string;
}) {
  return (
    <div className="p-8 rounded-xl bg-card/40 border border-border hover:border-primary/20 hover:bg-card/60 transition-all duration-300 group cursor-pointer backdrop-blur-sm shadow-sm">
      <div className="mb-6 text-muted-foreground group-hover:text-primary transition-colors">
        <QuoteIcon />
      </div>
      <p className="text-foreground font-light italic mb-8 leading-relaxed text-sm">
        "{text}"
      </p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xs text-foreground ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
          {name.charAt(0)}
        </div>
        <div>
          <div className="font-semibold text-sm text-foreground">{name}</div>
          <div className="text-xs text-muted-foreground">{role}</div>
        </div>
      </div>
    </div>
  );
}

// Inventory Item Component
function InventoryItem({
  label,
  value,
  percentage,
}: {
  label: string;
  value: string;
  percentage: number;
}) {
  return (
    <div className="relative z-10">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-medium text-foreground">{value}</span>
      </div>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-purple-400 rounded-full"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}

// SVG Icons
function SunIcon() {
  return (
    <svg
      className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="transition-transform group-hover:translate-x-1"
    >
      <path d="M5 12h14M12 5l7 7-7 7"></path>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-6 h-6 text-primary"
    >
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  );
}

function InventoryIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-6 h-6 text-muted-foreground"
    >
      <line x1="8" y1="6" x2="21" y2="6"></line>
      <line x1="8" y1="12" x2="21" y2="12"></line>
      <line x1="8" y1="18" x2="21" y2="18"></line>
      <line x1="3" y1="6" x2="3.01" y2="6"></line>
      <line x1="3" y1="12" x2="3.01" y2="12"></line>
      <line x1="3" y1="18" x2="3.01" y2="18"></line>
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-6 h-6 text-muted-foreground mb-3 group-hover:text-purple-400 transition-colors relative z-10"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  );
}

function AnalyticsIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-6 h-6 text-muted-foreground mb-3 group-hover:text-primary transition-colors relative z-10"
    >
      <path d="M3 3v18h18"></path>
      <path d="m19 9-5 5-4-4-3 3"></path>
    </svg>
  );
}

function QuoteIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      className="w-8 h-8 opacity-50"
    >
      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-4.5-5-7-5"></path>
      <path d="M15 21c3 0 7-1 7-8V5c0-1.25-4.5-5-7-5"></path>
    </svg>
  );
}
