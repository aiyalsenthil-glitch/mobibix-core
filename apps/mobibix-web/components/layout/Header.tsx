"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "../../src/context/ThemeContext";
import { motion } from "framer-motion";

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!mounted) return <div className="h-20" />;

  const isDark = theme === "dark";

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Features", href: "/features" },
    { name: "Pricing", href: "/pricing" },
    { name: "Support", href: "/support" },
  ];

  return (
    <header 
      className={`fixed top-0 z-50 w-full transition-all duration-500 ${
        isScrolled 
          ? "backdrop-blur-2xl border-b border-border bg-background/60 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.1)]" 
          : "bg-transparent py-6"
      }`}
    >
      <div className="container mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="p-1.5 rounded-xl bg-primary/10 border border-primary/20 group-hover:border-primary/50 transition-all duration-300 transform group-hover:scale-110">
            <img 
              src="/assets/mobibix-main-logo.png" 
              alt="MobiBix" 
              className={`h-8 w-auto ${isDark ? "invert brightness-200" : ""}`} 
            />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight leading-none uppercase bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">MobiBix</span>
            <span className="text-[10px] text-primary font-bold uppercase tracking-[0.2em] mt-1">Retail OS</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav 
          className="hidden md:flex items-center gap-2 p-1.5 rounded-full bg-muted/20 border border-border/50 backdrop-blur-md"
          onMouseLeave={() => setHoveredLink(null)}
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
                onMouseEnter={() => setHoveredLink(link.name)}
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
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-full bg-muted border border-border text-foreground hover:bg-accent transition-all"
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
          
          <div className="hidden sm:flex items-center gap-4">
            <Link
              href="/auth"
              className="text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth"
              className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-lg active:scale-95"
            >
              Free Trial
            </Link>
          </div>
          
          <div className="sm:hidden flex items-center gap-3">
            <Link
              href="/auth"
              className="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
            >
              Sign In
            </Link>
            <Link
              href="/auth"
              className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest"
            >
              Start
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
