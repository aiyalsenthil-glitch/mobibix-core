"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTheme } from "../../src/context/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, Users, LogIn, BarChart3, FileText,
  Network, UserPlus, Menu, X,
} from "lucide-react";

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [partnersOpen, setPartnersOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  if (!mounted) return <div className="h-20" />;

  const isDark = theme === "dark";

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Features", href: "/features" },
    { name: "Pricing", href: "/pricing" },
    { name: "Support", href: "/support" },
  ];

  const partnerLinks = [
    { label: "Partner Program", sub: "Earn 30% commission", href: "/partner", icon: <Users className="w-3.5 h-3.5 text-primary" />, bg: "bg-primary/10" },
    { label: "Tier Structure", sub: "5% → 20% calculator", href: "/partner/tiers", icon: <BarChart3 className="w-3.5 h-3.5 text-primary" />, bg: "bg-primary/10" },
    { label: "Apply Now", sub: "Join partner network", href: "/partner/apply", icon: <FileText className="w-3.5 h-3.5 text-muted-foreground" />, bg: "bg-muted" },
    { label: "Partner Portal", sub: "View commissions", href: "/partner/login", icon: <LogIn className="w-3.5 h-3.5 text-muted-foreground" />, bg: "bg-muted" },
  ];

  const distLinks = [
    { label: "Distributor Network", sub: "B2B wholesale hub", href: "/distributor", icon: <Network className="w-3.5 h-3.5 text-indigo-500" />, bg: "bg-indigo-500/10" },
    { label: "Become a Distributor", sub: "Free account", href: "/distributor/signup", icon: <UserPlus className="w-3.5 h-3.5 text-indigo-500" />, bg: "bg-indigo-500/10" },
  ];

  return (
    <>
      <header
        className={`fixed top-0 z-50 w-full transition-all duration-500 ${
          isScrolled
            ? "backdrop-blur-2xl border-b border-border bg-background/60 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.1)]"
            : "bg-transparent py-6"
        }`}
      >
        <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="p-1.5 rounded-xl bg-primary/10 border border-primary/20 group-hover:border-primary/50 transition-all duration-300 transform group-hover:scale-110">
              <Image
                src="/assets/mobibix-main-logo.png"
                alt="MobiBix"
                width={100}
                height={32}
                className={`h-7 md:h-8 w-auto ${isDark ? "invert brightness-200" : ""}`}
              />
            </div>
            <div className="flex flex-col">
              <span className="text-lg md:text-xl font-black tracking-tight leading-none uppercase bg-clip-text text-transparent bg-linear-to-r from-foreground to-foreground/70">
                MobiBix
              </span>
              <span className="text-[9px] md:text-[10px] text-primary font-bold uppercase tracking-[0.2em] mt-1">
                Retail OS
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav
            className="hidden md:flex items-center gap-2 p-1.5 rounded-full bg-muted/20 border border-border/50 backdrop-blur-md"
            onMouseLeave={() => { setHoveredLink(null); setPartnersOpen(false); }}
          >
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`relative px-5 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-300 z-10 ${
                    isActive || hoveredLink === link.name ? "text-foreground" : "text-muted-foreground"
                  }`}
                  onMouseEnter={() => { setHoveredLink(link.name); setPartnersOpen(false); }}
                >
                  {link.name}
                  {(hoveredLink === link.name || isActive) && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 bg-primary/10 dark:bg-primary/20 rounded-full -z-10 border border-primary/20"
                      transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                    />
                  )}
                </Link>
              );
            })}

            {/* Partners dropdown */}
            <div
              className="relative"
              onMouseEnter={() => { setPartnersOpen(true); setHoveredLink("Partners"); }}
              onMouseLeave={() => { setPartnersOpen(false); setHoveredLink(null); }}
            >
              <button
                className={`relative flex items-center gap-1 px-5 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-300 z-10 ${
                  partnersOpen || pathname.startsWith("/partner") || pathname.startsWith("/distributor")
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                Network
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${partnersOpen ? "rotate-180" : ""}`} />
                {(partnersOpen || pathname.startsWith("/partner") || pathname.startsWith("/distributor")) && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 bg-primary/10 dark:bg-primary/20 rounded-full -z-10 border border-primary/20"
                    transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                  />
                )}
              </button>

              <AnimatePresence>
                {partnersOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-64 bg-background/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl p-1.5 z-50"
                  >
                    {partnerLinks.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors"
                        onClick={() => setPartnersOpen(false)}
                      >
                        <div className={`w-7 h-7 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
                          {item.icon}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">{item.label}</p>
                          <p className="text-[10px] text-muted-foreground">{item.sub}</p>
                        </div>
                      </Link>
                    ))}
                    <div className="h-px bg-border mx-3 my-1" />
                    <p className="px-4 pt-2 pb-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
                      Distributor Network
                    </p>
                    {distLinks.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                        onClick={() => setPartnersOpen(false)}
                      >
                        <div className={`w-7 h-7 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
                          {item.icon}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">{item.label}</p>
                          <p className="text-[10px] text-muted-foreground">{item.sub}</p>
                        </div>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>

          {/* Right: theme + auth + hamburger */}
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 md:p-2.5 rounded-full bg-muted border border-border text-foreground hover:bg-accent transition-all"
              aria-label="Toggle Theme"
            >
              {isDark ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.243 17.657l.707.707M7.757 6.343l.707.707M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* Desktop auth */}
            <div className="hidden md:flex items-center gap-4">
              <Link href="/auth" className="text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
                Sign In
              </Link>
              <Link href="/auth" className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-lg active:scale-95">
                Free Trial
              </Link>
            </div>

            {/* Mobile: Start CTA + hamburger */}
            <Link href="/auth" className="md:hidden px-4 py-2 rounded-full bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">
              Start
              <span className="sr-only"> Free Trial</span>
            </Link>
            <button
              onClick={() => setMobileOpen(v => !v)}
              className="md:hidden p-2 rounded-full bg-muted border border-border text-foreground"
              aria-label="Open menu"
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 z-50 h-svh w-72 bg-background border-l border-border shadow-2xl flex flex-col md:hidden overflow-y-auto"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-5 py-5 border-b border-border">
                <span className="text-sm font-black uppercase tracking-widest text-foreground">Menu</span>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-2 rounded-full bg-muted text-foreground"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Nav links */}
              <nav className="flex flex-col gap-1 p-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-colors ${
                      pathname === link.href
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {link.name}
                  </Link>
                ))}
              </nav>

              {/* Partner links */}
              <div className="px-4 pb-2">
                <p className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
                  Partner Network
                </p>
                {partnerLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors"
                  >
                    <div className={`w-7 h-7 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground">{item.sub}</p>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Distributor links */}
              <div className="px-4 pb-4">
                <div className="h-px bg-border mx-4 mb-2" />
                <p className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
                  Distributor Network
                </p>
                {distLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                  >
                    <div className={`w-7 h-7 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground">{item.sub}</p>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Auth */}
              <div className="mt-auto p-4 border-t border-border flex flex-col gap-3">
                <Link
                  href="/auth"
                  className="w-full py-3 rounded-xl border-2 border-border text-foreground text-xs font-black uppercase tracking-widest text-center hover:bg-muted transition-all"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth"
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest text-center hover:brightness-110 transition-all shadow-lg"
                >
                  Start Free Trial
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
