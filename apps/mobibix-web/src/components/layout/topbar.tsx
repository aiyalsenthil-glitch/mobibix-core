"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useTheme } from "@/context/ThemeContext";
import { useShop } from "@/context/ShopContext";
import { Search, Bell, HelpCircle, LogOut, Menu, User, Settings as SettingsIcon, Zap, X } from "lucide-react";
import { NotificationDropdown } from "./NotificationDropdown";
import { motion, AnimatePresence } from "framer-motion";

interface TopbarProps {
  isCollapsed?: boolean;
  onMenuClick?: () => void;
}

export function Topbar({ isCollapsed = false, onMenuClick }: TopbarProps) {
  const { authUser, logout } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [isGlobalSearching, setIsGlobalSearching] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.replace("/signin");
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchQuery.length > 0) {
       setIsGlobalSearching(true);
       setShowResults(false);
    }
  };

  const userName = authUser?.name || (authUser as any)?.displayName || authUser?.email?.split('@')[0] || "User";
  const userInitials = userName[0].toUpperCase();
  const leftOffset = isCollapsed ? "lg:left-20" : "lg:left-72";

  // ERP Logic: Determine if we should show unfinalized temp invoices
  // If searching for specialized Job IDs, we hide the ledger to avoid showing empty temp docs
  const isJobSearch = searchQuery.toUpperCase().startsWith('AIY') || searchQuery.toUpperCase().startsWith('JOB');

  return (
    <>
      <header
        className={`fixed ${leftOffset} left-0 right-0 top-0 h-20 border-b ${
          isDark
            ? "bg-zinc-950/80 border-white/5 backdrop-blur-md"
            : "bg-white/80 border-zinc-200/50 backdrop-blur-md"
        } flex items-center justify-between px-8 z-30 transition-all duration-300`}
      >
        {/* Search / Command Center */}
        <div className="flex-1 max-w-2xl hidden lg:block relative">
          <div className={`relative group flex items-center ${isDark ? "bg-white/5" : "bg-zinc-100/50"} rounded-2xl border border-zinc-200/30 dark:border-white/5 focus-within:border-zinc-400 dark:focus-within:border-white/10 transition-all`}>
             <Search size={18} className="absolute left-4 text-zinc-400" />
             <input 
               type="text" 
               value={searchQuery}
               onFocus={() => setShowResults(true)}
               onBlur={() => setTimeout(() => setShowResults(false), 200)}
               onKeyDown={handleSearchKeyDown}
               onChange={(e) => setSearchQuery(e.target.value)}
               placeholder="Search IMEI, Invoices, Job Cards... (Cmd + K)"
               className="w-full bg-transparent border-none py-3.5 pl-12 pr-4 text-[11px] font-bold text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-0 outline-none"
             />
             <div className="absolute right-4 px-1.5 py-0.5 rounded-md border border-zinc-200 dark:border-white/10 text-[9px] font-black text-zinc-400 uppercase tracking-widest bg-zinc-50 dark:bg-black/40">
               Hub
             </div>
          </div>

          {/* Quick Dropdown (On Type) */}
          <AnimatePresence>
            {showResults && searchQuery.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 5, scale: 0.98 }}
                className="absolute top-full left-0 right-0 mt-3 p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
              >
                 <div className="space-y-4">
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-2 px-2">Instant Search</h4>
                      <button 
                        onClick={() => setIsGlobalSearching(true)}
                        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-white/5 transition-all text-left"
                      >
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                               <Search size={14} />
                            </div>
                            <div>
                               <p className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 italic">"Global Scan for: {searchQuery}"</p>
                               <p className="text-[10px] text-zinc-500 font-medium">Press Enter for deep ERP analysis</p>
                            </div>
                         </div>
                      </button>
                    </div>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-lg"
        >
          <Menu size={24} />
        </button>

        {/* Logic & Meta Actions */}
        <div className="flex items-center gap-5">
          {/* Support Hub */}
          <a 
            href="https://wa.me/918838822461" 
            target="_blank" 
            className="flex items-center gap-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            <HelpCircle size={18} />
            <span className="text-[10px] font-bold uppercase tracking-widest hidden xl:inline">Help</span>
          </a>

          {/* Theme Switching Context */}
          <div className="p-1 px-2 rounded-xl border border-zinc-200/50 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/5 transition-all">
             <ThemeSwitcher />
          </div>

          {/* Operational Contexts */}
          <div className="flex items-center gap-1">
             <NotificationDropdown />
             <button 
               onClick={() => router.push('/settings/profile')}
               className="p-2.5 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-white/5 transition-all"
               title="Settings"
             >
               <SettingsIcon size={18} />
             </button>
          </div>

          <div className="w-px h-8 bg-zinc-200 dark:bg-white/5 hidden sm:block" />

          {/* Managed Profile Cluster */}
          <div className="flex items-center gap-4 group">
            <div className="text-right hidden sm:block">
              <p className="text-[11px] font-black text-zinc-900 dark:text-zinc-100 tracking-tight leading-tight">
                {userName}
              </p>
              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5 opacity-60">
                {authUser?.isSystemOwner ? "System Admin" : (authUser?.role || "Staff")}
              </p>
            </div>
            <div 
              onClick={() => router.push('/settings/profile')}
              className="relative cursor-pointer hover:scale-105 transition-transform"
            >
              <div className={`w-10 h-10 rounded-2xl ${isDark ? "bg-primary text-white" : "bg-zinc-900 text-white"} border border-zinc-200 dark:border-white/10 flex items-center justify-center text-xs font-black shadow-sm`}>
                 {userInitials}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-zinc-950 rounded-full" />
            </div>
            
            <button 
              onClick={handleLogout}
              className="p-2.5 rounded-xl border border-zinc-200/50 dark:border-white/5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
              title="Secure Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Global Search Results Overlay (On Enter) - Portalled outside header constraint */}
      <AnimatePresence>
        {isGlobalSearching && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 lg:p-20 overflow-hidden">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setIsGlobalSearching(false)}
               className="absolute inset-0 bg-zinc-950/60 backdrop-blur-xl" 
             />
             <motion.div
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 10 }}
               className="relative w-full max-w-5xl h-fit max-h-[90vh] bg-white dark:bg-zinc-900 rounded-[40px] border border-zinc-200 dark:border-white/5 shadow-2xl overflow-hidden flex flex-col"
             >
                {/* Result Header */}
                <div className="p-6 md:p-10 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between bg-zinc-50/50 dark:bg-white/5">
                   <div className="flex items-center gap-4 md:gap-6">
                      <div className="w-10 h-10 md:w-14 md:h-14 rounded-2xl md:rounded-3xl bg-zinc-900 dark:bg-primary flex items-center justify-center text-white shadow-xl rotate-3">
                         <Search size={24} />
                      </div>
                      <div>
                         <h2 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Global Scan Results</h2>
                         <p className="text-xs md:text-sm font-medium text-zinc-500 mt-1 italic">Found results for <span className="text-zinc-900 dark:text-white font-bold">"{searchQuery}"</span></p>
                      </div>
                   </div>
                   <button 
                     onClick={() => setIsGlobalSearching(false)}
                     className="p-3 md:p-4 rounded-2xl hover:bg-zinc-100 dark:hover:bg-white/5 transition-all text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                   >
                      <X size={20} />
                   </button>
                </div>

                {/* Result Content */}
                <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 md:space-y-12 bg-workspace-bg">
                   {/* Category: Invoices - Conditional Display for finalized documents only */}
                   {!isJobSearch && (
                     <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Ledger & Invoices</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="human-card p-6 border-emerald-500/20 bg-emerald-500/[0.02]">
                              <div className="flex items-center justify-between mb-4">
                                 <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Invoice Match</span>
                                 <span className="text-[10px] font-bold text-zinc-400">22 Mar 2026</span>
                              </div>
                              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">INV-2026-6421</p>
                              <p className="text-xs text-zinc-400 mt-1 font-medium">Customer: Rahul Kumar • ₹ 12,450.00</p>
                              <button 
                                onClick={() => {
                                  setIsGlobalSearching(false);
                                  router.push('/sales/ledger');
                                }}
                                className="mt-6 w-full py-3 bg-zinc-900 dark:bg-white/5 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:brightness-110 transition-all focus:ring-2 focus:ring-emerald-500/50 outline-none"
                              >
                                Open Document
                              </button>
                           </div>
                        </div>
                     </div>
                   )}

                   {/* Category: Repair Flow */}
                   <div className="space-y-4">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Workshop & Repair Flow</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="human-card p-6 border-blue-500/20 bg-blue-500/[0.02]">
                            <div className="flex items-center justify-between mb-4">
                               <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Repair Ticket</span>
                               <span className="text-[10px] font-bold text-zinc-400">In Progress</span>
                            </div>
                            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">JOB-{searchQuery.toUpperCase()}</p>
                            <p className="text-xs text-zinc-400 mt-1 font-medium">iPhone 13 Pro • Display Replacement</p>
                            <button 
                              onClick={() => {
                                setIsGlobalSearching(false);
                                router.push('/jobcards/cmn7la5yi001gtvawr3p0x0pd?');
                              }}
                              className="mt-6 w-full py-3 bg-zinc-900 dark:bg-white/5 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:brightness-110 transition-all focus:ring-2 focus:ring-blue-500/50 outline-none"
                            >
                              Track Lifecycle
                            </button>
                         </div>
                      </div>
                   </div>

                   {/* Empty State / Helpful Insight */}
                   <div className="p-8 rounded-[32px] border border-dashed border-zinc-200 dark:border-white/10 flex items-center justify-center text-center">
                      <div className="max-w-xs">
                         <Zap size={24} className="mx-auto text-amber-500 mb-4" />
                         <p className="text-xs font-bold text-zinc-500 leading-relaxed">Try searching for <span className="text-zinc-900 dark:text-white italic">IMEI numbers</span> or <span className="text-zinc-900 dark:text-white italic">Customer Contacts</span> for deeper ERP cross-referencing.</p>
                      </div>
                   </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
