"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import { getFollowUpCounts } from "@/services/crm.api";
import {
  LayoutDashboard,
  Banknote,
  Wrench,
  Tags,
  PackageSearch,
  Users,
  MessageSquareShare,
  Truck,
  Inbox,
  CreditCard,
  LineChart,
  Store,
  ShieldCheck,
  Settings,
  Gift,
  ShoppingBag,
  FileText,
  ClipboardList,
  FileMinus,
  Sparkles,
} from "lucide-react";
import { AiQuotaBadge } from "@/components/common/AiQuotaBadge";

interface NavItem {
  label: string;
  href?: string;
  icon: React.ElementType;
  requiredPermission?: string;
  category?: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, requiredPermission: "DASHBOARD_VIEW", category: "Core" },
  { label: "Sales", href: "/sales", icon: Banknote, requiredPermission: "SALES_VIEW", category: "Transactions" },
  { label: "Job Cards", href: "/jobcards", icon: Wrench, requiredPermission: "REPAIR_MANAGE", category: "Transactions" },
  { label: "Quotations", href: "/quotations", icon: ClipboardList, requiredPermission: "SALES_VIEW", category: "Transactions" },
  { label: "Credit Notes", href: "/credit-notes", icon: FileMinus, requiredPermission: "SALES_VIEW", category: "Transactions" },
  { label: "Sales Receipts", href: "/receipts", icon: CreditCard, requiredPermission: "SALES_VIEW", category: "Transactions" },
  { label: "Customers", href: "/customers", icon: Users, requiredPermission: "MEMBER_VIEW", category: "CRM & Marketing" },
  { label: "WhatsApp", href: "/whatsapp", icon: MessageSquareShare, requiredPermission: "MEMBER_VIEW", category: "CRM & Marketing" },
  { label: "Loyalty Program", href: "/settings?tab=loyalty", icon: Gift, requiredPermission: "SHOP_MANAGE", category: "CRM & Marketing" },
  { label: "Products", href: "/products", icon: Tags, requiredPermission: "INVENTORY_VIEW", category: "Inventory" },
  { label: "Inventory", href: "/inventory", icon: PackageSearch, requiredPermission: "INVENTORY_VIEW", category: "Inventory" },
  ...(process.env.NEXT_PUBLIC_ENABLE_RESTOCK === 'true'
    ? [{ label: "Restock", href: "/restock", icon: ShoppingBag, requiredPermission: "INVENTORY_VIEW", category: "Inventory" }]
    : []),
  { label: "Suppliers", href: "/suppliers", icon: Truck, requiredPermission: "INVENTORY_VIEW", category: "Inventory" },
  { label: "Purchase Orders", href: "/purchase-orders", icon: FileText, requiredPermission: "INVENTORY_VIEW", category: "Inventory" },
  { label: "Supplier Invoices", href: "/purchases", icon: Inbox, requiredPermission: "INVENTORY_VIEW", category: "Inventory" },
  { label: "Reports", href: "/reports", icon: LineChart, requiredPermission: "SALES_VIEW", category: "Management" },
  { label: "Shops", href: "/shops", icon: Store, requiredPermission: "SHOP_MANAGE", category: "Management" },
  { label: "Staff Management", href: "/staff-management", icon: ShieldCheck, requiredPermission: "STAFF_MANAGE", category: "Management" },
  { label: "Settings", href: "/settings", icon: Settings, requiredPermission: "SHOP_MANAGE", category: "Management" },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { theme } = useTheme();
  const { authUser } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [counts, setCounts] = useState<{ total: number } | null>(null);
  const isDark = mounted && theme === "dark";

  const visibleItems = useMemo(() => {
    if (!authUser) return [];
    if (authUser.isSystemOwner) return navItems;

    return navItems.filter((item) => {
      if (!item.requiredPermission) return true;
      return (
        authUser.permissions?.includes("*") ||
        authUser.permissions?.includes(item.requiredPermission)
      );
    });
  }, [authUser]);

  const groupedItems = useMemo(() => {
    return visibleItems.reduce((acc, item) => {
      const category = item.category || "General";
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    }, {} as Record<string, NavItem[]>);
  }, [visibleItems]);

  useEffect(() => {
    async function loadCounts() {
      try {
        const data = await getFollowUpCounts();
        setCounts(data);
      } catch (err) {
        console.error("Failed to load follow-up counts", err);
      }
    }

    if (mounted) {
      loadCounts();
      const interval = setInterval(loadCounts, 30000);
      return () => clearInterval(interval);
    }
  }, [mounted]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const effectiveCollapsed = false;
  const sidebarWidth = "w-64";
  const sidebarPadding = "py-4 px-4";

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-screen ${sidebarWidth} flex flex-col transition-all duration-300 shadow-lg group/sidebar ${
          isDark
            ? "bg-[#0f172a] border-slate-800"
            : "bg-white border-slate-200"
        } border-r z-50 lg:z-40 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div
          className={`${sidebarPadding} border-b transition-all duration-300 flex items-center justify-center ${
            isDark ? "border-slate-800" : "border-slate-100 bg-slate-50/50"
          }`}
        >
          {!effectiveCollapsed && (
            <img
              src="/assets/mobibix-main-logo.png"
              alt="MobiBix Logo"
              className="h-14 w-auto object-contain py-1"
            />
          )}

          {mobileOpen && (
            <button
              onClick={onClose}
              className="absolute right-4 top-4 lg:hidden p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {effectiveCollapsed && (
            <img
              src="/assets/mobibix-app-icon.png"
              alt="MobiBix Icon"
              className="w-10 h-10 object-contain"
            />
          )}
        </div>

        <nav className={`flex-1 overflow-y-auto py-6 px-3 space-y-7 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700/50 [&::-webkit-scrollbar-thumb]:rounded-full ${effectiveCollapsed ? 'overflow-x-hidden' : ''}`}>
          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category} className="space-y-1">
              {!effectiveCollapsed && (
                <div className="px-3 mb-2.5 text-[10px] font-bold tracking-[0.1em] uppercase text-slate-400/80 dark:text-slate-500/80 pointer-events-none">
                  {category}
                </div>
              )}
              {items.map((item) => {
                const isActive = pathname === item.href || (item.label === "Loyalty Program" && pathname === "/settings" && typeof window !== "undefined" && window.location.search.includes("tab=loyalty"));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href!}
                    onClick={() => mobileOpen && onClose && onClose()}
                    className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all duration-200 group relative ${
                      isActive
                        ? isDark
                          ? "bg-indigo-500/10 text-white font-medium before:absolute before:left-0 before:w-[3px] before:h-5 before:bg-indigo-500 before:rounded-r-full shadow-sm shadow-indigo-500/5"
                          : "bg-indigo-50 text-indigo-700 font-medium before:absolute before:left-0 before:w-[3px] before:h-5 before:bg-indigo-600 before:rounded-r-full"
                        : isDark
                          ? "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    } ${effectiveCollapsed ? "justify-center px-0 before:hidden" : ""}`}
                    title={effectiveCollapsed ? item.label : ""}
                  >
                    <div className={`flex-shrink-0 ${effectiveCollapsed ? 'mx-auto' : ''}`}>
                       <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className={isActive ? (isDark ? "text-indigo-400" : "text-indigo-600") : "text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors"} />
                    </div>
                    {!effectiveCollapsed && (
                      <>
                        <span className="text-[14px] flex-1">
                          {item.label}
                        </span>
                        {item.label === "Customers" && counts && counts.total > 0 && (
                          <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-sm whitespace-nowrap">
                            {counts.total}
                          </span>
                        )}
                      </>
                    )}

                    {effectiveCollapsed && (
                      <div className="absolute left-[calc(100%+8px)] px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl pointer-events-none z-50">
                        {item.label}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className={`px-4 mt-auto space-y-3 pb-4 pt-2 border-t mt-4 ${isDark ? 'border-slate-800/50' : 'border-slate-100'} ${effectiveCollapsed ? 'flex flex-col items-center px-2 space-y-2' : ''}`}>

          <button
            onClick={() => window.dispatchEvent(new CustomEvent("open-ai-chat", { detail: { prompt: "" } }))}
             className={`flex items-center justify-center gap-2 py-2 rounded-lg transition-all duration-200 w-full font-medium ${isDark ? 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/10' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'}`}
            title={effectiveCollapsed ? "MobiBix AI Assistant" : ""}
          >
            <Sparkles size={15} />
            {!effectiveCollapsed && <span className="text-[13px] tracking-wide">MobiBix AI</span>}
          </button>
        </div>

        {/* AI Token Quota — only visible when sidebar is expanded */}
        {!effectiveCollapsed && (
          <div className="px-3 pb-3">
             <AiQuotaBadge />
          </div>
        )}

      </aside>

      {/* Content Shift */}
      <div
        className="ml-60 transition-all duration-300"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          left: "240px",
        }}
      />
    </>
  );
}
