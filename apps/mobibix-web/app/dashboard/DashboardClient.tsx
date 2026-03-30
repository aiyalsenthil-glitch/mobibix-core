"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useTheme } from "@/context/ThemeContext";
import { Topbar } from "@/components/layout/topbar";
import { SubscriptionAlert } from "@/components/subscription/SubscriptionAlert";
import { BroadcastAlert } from "@/components/notifications/BroadcastAlert";
import { WelcomeAlert } from "@/components/notifications/WelcomeAlert";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  Tag, 
  ShoppingCart, 
  Wrench, 
  Package, 
  Rocket, 
  Users, 
  FileBarChart, 
  Store, 
  MessageSquare, 
  Settings,
  MoreHorizontal,
  ChevronDown,
  ArrowLeft,
  X,
  Menu
} from "lucide-react";

export function DashboardClient({ children }: { children: React.ReactNode }) {
  const [openMore, setOpenMore] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { theme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isActive = (path: string) => pathname.startsWith(path);

  const sidebarBg =
    theme === "dark"
      ? "bg-zinc-950 border-white/5"
      : "bg-white border-zinc-200/50";
      
  const navItemActive =
    theme === "dark"
      ? "bg-white/5 text-white font-medium"
      : "bg-zinc-100/80 text-zinc-900 font-bold shadow-sm";
      
  const navItemInactive =
    theme === "dark"
      ? "text-zinc-500 hover:text-white"
      : "text-zinc-500 hover:text-zinc-900";

  if (!mounted) return <div className="h-screen w-screen bg-background" />;

  return (
    <div className="flex h-screen workspace-bg text-foreground selection:bg-primary/30 transition-colors duration-500 overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside
        className={`hidden md:flex w-72 border-r ${sidebarBg} flex-col p-8 fixed h-screen overflow-y-auto transition-all duration-300 z-[40]`}
      >
        <div className="flex items-center justify-between mb-12">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-zinc-900 dark:bg-primary flex items-center justify-center border border-zinc-200 dark:border-white/10 transition-transform duration-300 group-hover:rotate-6 shadow-sm">
                <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Mobibix</span>
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em] mt-0.5 opacity-60">
                Nexus OS
              </span>
            </div>
          </Link>
          <div className="scale-90">
             <ThemeSwitcher />
          </div>
        </div>

        <nav className="space-y-8 flex-1 overflow-y-auto scrollbar-hide py-4">
          {/* Section 1: Business Intelligence */}
          <div className="space-y-3">
            <h3 className="px-5 text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400 opacity-60">Intelligence</h3>
            <div className="space-y-1">
              <SidebarItem href="/dashboard" icon={<LayoutDashboard size={18} />} label="Performance" active={pathname === "/dashboard"} variant={pathname === "/dashboard" ? navItemActive : navItemInactive} />
              <SidebarItem href="/reports" icon={<FileBarChart size={18} />} label="Analytics" active={isActive("/reports")} variant={isActive("/reports") ? navItemActive : navItemInactive} />
            </div>
          </div>

          {/* Section 2: Core Operations */}
          <div className="space-y-3">
            <h3 className="px-5 text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400 opacity-60">Workflows</h3>
            <div className="space-y-1">
              <SidebarItem href="/jobcards" icon={<Wrench size={18} />} label="Workshop" active={isActive("/jobcards")} variant={isActive("/jobcards") ? navItemActive : navItemInactive} />
              <SidebarItem href="/sales" icon={<ShoppingCart size={18} />} label="POS Ledger" active={isActive("/sales")} variant={isActive("/sales") ? navItemActive : navItemInactive} />
              <SidebarItem href="/pricing" icon={<Tag size={18} />} label="Estimations" active={isActive("/pricing")} variant={isActive("/pricing") ? navItemActive : navItemInactive} />
            </div>
          </div>

          {/* Section 3: Logistics */}
          <div className="space-y-3">
            <h3 className="px-5 text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400 opacity-60">Logistics</h3>
            <div className="space-y-1">
              <SidebarItem href="/inventory" icon={<Package size={18} />} label="Stock Control" active={isActive("/inventory")} variant={isActive("/inventory") ? navItemActive : navItemInactive} />
              <SidebarItem href="/restock" icon={<Rocket size={18} />} label="Procurement" active={isActive("/restock")} variant={isActive("/restock") ? navItemActive : navItemInactive} />
            </div>
          </div>

          {/* Section 4: CRM & Growth */}
          <div className="space-y-3">
            <h3 className="px-5 text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400 opacity-60">CRM</h3>
            <div className="space-y-1">
              <SidebarItem href="/customers" icon={<Users size={18} />} label="Directory" active={isActive("/customers")} variant={isActive("/customers") ? navItemActive : navItemInactive} />
              <SidebarItem href="/whatsapp" icon={<MessageSquare size={18} />} label="WhatsApp Hub" active={isActive("/whatsapp")} variant={isActive("/whatsapp") ? navItemActive : navItemInactive} />
              <SidebarItem href="/settings" icon={<Settings size={18} />} label="Preferences" active={isActive("/settings")} variant={isActive("/settings") ? navItemActive : navItemInactive} />
            </div>
          </div>
        </nav>

        {/* User Footer */}
        <div className="mt-auto pt-6 border-t border-border/50">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 text-xs font-bold text-muted-foreground hover:text-primary transition-all group"
          >
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
            <span>Master Dashboard</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-0 md:ml-72 flex flex-col h-full bg-background relative">
        {/* Fixed Topbar Container */}
        <div className="sticky top-0 z-30 w-full">
            <BroadcastAlert />
            <WelcomeAlert />
            <SubscriptionAlert />
            <Topbar 
              isCollapsed={false} 
              onMenuClick={() => setIsMobileMenuOpen(true)} 
            />
        </div>
        
        {/* Page Content with Entrance Animation */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <motion.div 
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="p-4 md:p-10 max-w-[1600px] mx-auto min-h-full"
          >
            {children}
          </motion.div>
        </div>
      </main>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={`relative w-80 h-full ${sidebarBg} backdrop-blur-3xl flex flex-col p-6 shadow-2xl`}
          >
            <div className="flex items-center justify-between mb-10 pt-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                </div>
                <span className="text-xl font-black tracking-tighter uppercase leading-none">MobiBix</span>
              </div>
              <div className="flex items-center gap-2">
                <ThemeSwitcher />
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-muted-foreground hover:bg-muted rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <nav className="space-y-1.5 flex-1 overflow-y-auto scrollbar-hide">
              <SidebarItem href="/dashboard" icon={<LayoutDashboard size={18} />} label="Dashboard" active={pathname === "/dashboard"} variant={pathname === "/dashboard" ? navItemActive : navItemInactive} onClick={() => setIsMobileMenuOpen(false)} />
              <SidebarItem href="/pricing" icon={<Tag size={18} />} label="Pricing" active={isActive("/pricing")} variant={isActive("/pricing") ? navItemActive : navItemInactive} onClick={() => setIsMobileMenuOpen(false)} />
              <SidebarItem href="/sales" icon={<ShoppingCart size={18} />} label="Sales" active={isActive("/sales")} variant={isActive("/sales") ? navItemActive : navItemInactive} onClick={() => setIsMobileMenuOpen(false)} />
              <SidebarItem href="/jobcards" icon={<Wrench size={18} />} label="Job Cards" active={isActive("/jobcards")} variant={isActive("/jobcards") ? navItemActive : navItemInactive} onClick={() => setIsMobileMenuOpen(false)} />
              <SidebarItem href="/inventory" icon={<Package size={18} />} label="Inventory" active={isActive("/inventory")} variant={isActive("/inventory") ? navItemActive : navItemInactive} onClick={() => setIsMobileMenuOpen(false)} />
              <SidebarItem href="/restock" icon={<Rocket size={18} />} label="Restock" active={isActive("/restock")} variant={isActive("/restock") ? navItemActive : navItemInactive} onClick={() => setIsMobileMenuOpen(false)} />
            </nav>
          </motion.aside>
        </div>
      )}
      </AnimatePresence>
    </div>
  );
}

function SidebarItem({ href, icon, label, variant, active, onClick }: any) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`relative group flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 border border-transparent ${variant}`}
    >
      <div className={`transition-transform duration-300 ${active ? "scale-110" : "group-hover:scale-110"}`}>
        {icon}
      </div>
      <span className="text-xs font-black uppercase tracking-widest leading-none">
        {label}
      </span>
      {active && (
        <motion.div 
           layoutId="active-marker"
           className="absolute right-3 w-1.5 h-1.5 rounded-full bg-primary glow-primary"
        />
      )}
    </Link>
  );
}

function SubLink({ href, label, active, navItemActive, navItemInactive }: any) {
  return (
    <Link
      href={href}
      className={`block px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-transparent ${active ? navItemActive : navItemInactive}`}
    >
      {label}
    </Link>
  );
}
