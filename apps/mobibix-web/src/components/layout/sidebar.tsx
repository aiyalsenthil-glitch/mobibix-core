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
  Receipt,
  Lock,
  WalletCards,
  ClipboardCheck,
  CalendarDays,
  Activity,
  BarChart2,
  Printer,
  ArrowLeftRight,
  Network,
  Boxes,
  ListTodo,
  ChevronLeft,
  ChevronRight,
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
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, requiredPermission: "core.dashboard.view", category: "Core" },
  { label: "Sales", href: "/sales", icon: Banknote, requiredPermission: "mobile_shop.sale.view", category: "Transactions" },
  { label: "Job Cards", href: "/jobcards", icon: Wrench, requiredPermission: "mobile_shop.jobcard.view", category: "Transactions" },
  { label: "Quotations", href: "/quotations", icon: ClipboardList, requiredPermission: "mobile_shop.quotation.view", category: "Transactions" },
  { label: "Credit Notes", href: "/credit-notes", icon: FileMinus, requiredPermission: "mobile_shop.sale.view", category: "Transactions" },
  { label: "Trade-in / Buyback", href: "/trade-in", icon: ArrowLeftRight, requiredPermission: "mobile_shop.sale.view", category: "Transactions" },
  { label: "Consumer Finance", href: "/finance", icon: WalletCards, requiredPermission: "mobile_shop.sale.view", category: "Transactions" },
  { label: "Sales Receipts", href: "/receipts", icon: CreditCard, requiredPermission: "mobile_shop.receipt.view", category: "Transactions" },
  { label: "Payment Vouchers", href: "/vouchers", icon: Receipt, requiredPermission: "mobile_shop.voucher.view", category: "Transactions" },
  { label: "Customers", href: "/customers", icon: Users, requiredPermission: "mobile_shop.customer.view", category: "CRM & Marketing" },
  { label: "WhatsApp", href: "/whatsapp", icon: MessageSquareShare, requiredPermission: "mobile_shop.whatsapp.view", category: "CRM & Marketing" },
  { label: "Loyalty Program", href: "/settings?tab=loyalty", icon: Gift, requiredPermission: "mobile_shop.loyalty.view", category: "CRM & Marketing" },
  { label: "Products", href: "/products", icon: Tags, requiredPermission: "mobile_shop.inventory.view", category: "Inventory" },
  { label: "Inventory", href: "/inventory", icon: PackageSearch, requiredPermission: "mobile_shop.inventory.view", category: "Inventory" },
  ...(process.env.NEXT_PUBLIC_ENABLE_RESTOCK === 'true'
    ? [{ label: "Restock", href: "/restock", icon: ShoppingBag, requiredPermission: "mobile_shop.inventory.view", category: "Inventory" }]
    : []),
  { label: "Suppliers", href: "/suppliers", icon: Truck, requiredPermission: "mobile_shop.supplier.view", category: "Inventory" },
  { label: "Purchase Orders", href: "/purchase-orders", icon: FileText, requiredPermission: "mobile_shop.purchase.view", category: "Inventory" },
  { label: "Supplier Invoices", href: "/purchases", icon: Inbox, requiredPermission: "mobile_shop.purchase.view", category: "Inventory" },
  { label: "Reports", href: "/reports", icon: LineChart, requiredPermission: "core.report.view", category: "Management" },
  { label: "Shops", href: "/shops", icon: Store, requiredPermission: "core.settings.manage", category: "Management" },
  { label: "Staff Management", href: "/staff-management", icon: ShieldCheck, requiredPermission: "core.staff.manage", category: "Management" },
  { label: "Settings", href: "/settings", icon: Settings, requiredPermission: "core.settings.manage", category: "Management" },
  { label: "Distributor Network", href: "/settings/distributor", icon: Network, requiredPermission: "core.settings.manage", category: "Management" },
  { label: "Inventory Intelligence", href: "/reports/inventory-intelligence", icon: BarChart2, requiredPermission: "core.report.inventory_view", category: "Management" },
  { label: "Barcode Labels", href: "/tools/barcode-labels", icon: Printer, requiredPermission: "mobile_shop.inventory.view", category: "Tools" },
  { label: "Compatibility Finder", href: "/tools/compatibility-finder", icon: Sparkles, requiredPermission: "mobile_shop.compatibility.view", category: "Tools" },
  { label: "Daily Closing", href: "/tools/daily-closing", icon: Lock, requiredPermission: "core.daily_closing.view", category: "Tools" },
  { label: "Expense Manager", href: "/tools/expenses", icon: WalletCards, requiredPermission: "core.expense.view", category: "Tools" },
  { label: "Stock Verification", href: "/tools/stock-verification", icon: ClipboardCheck, requiredPermission: "core.stock_verification.view", category: "Tools" },
  { label: "Monthly Report", href: "/tools/monthly-report", icon: CalendarDays, requiredPermission: "core.report.view", category: "Tools" },
  { label: "Shrinkage Intelligence", href: "/tools/shrinkage", icon: Activity, requiredPermission: "core.shrinkage.view", category: "Tools" },
  // Distributor
  { label: "Distributor Hub", href: "/distributor/dashboard", icon: Network, requiredPermission: "distributor.view", category: "Distributor Network" },
  { label: "Wholesale Catalog", href: "/distributor/catalog", icon: Boxes, requiredPermission: "distributor.view", category: "Distributor Network" },
  { label: "Retailer Orders", href: "/distributor/orders", icon: ListTodo, requiredPermission: "distributor.view", category: "Distributor Network" },
  { label: "My Retailers", href: "/distributor/retailers", icon: Users, requiredPermission: "distributor.view", category: "Distributor Network" },
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [counts, setCounts] = useState<{ total: number } | null>(null);
  const isDark = mounted && theme === "dark";

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("sidebarCollapsed");
    if (stored) setIsCollapsed(JSON.parse(stored));
  }, []);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem("sidebarCollapsed", JSON.stringify(next));
    // Notify layout.tsx via custom event (storage event doesn't fire same window)
    window.dispatchEvent(new CustomEvent("sidebarToggled", { detail: { collapsed: next } }));
  };

  const visibleItems = useMemo(() => {
    if (!authUser) return [];
    return navItems.filter((item) => {
      if (item.label === "Compatibility Finder") {
        const isMobibix = authUser.tenantType === 'MOBILE_SHOP' || authUser.planCode?.startsWith("MOBIBIX");
        const isAccountant = authUser.role === 'accountant' || authUser.role === 'shop_accountant';
        if (!isMobibix || isAccountant) return false;
      }
      if (authUser.isDistributor && !authUser.hasActiveERP) {
        return item.category === "Distributor Network";
      }
      if (item.category === "Distributor Network" && !authUser.isDistributor) return false;
      if (authUser.isSystemOwner || authUser.permissions?.includes("*")) return true;
      if (!item.requiredPermission) return true;
      return authUser.permissions?.includes(item.requiredPermission);
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
    if (!mounted || !authUser || !authUser.tenantId) return;
    async function loadCounts() {
      try {
        const data = await getFollowUpCounts();
        setCounts(data);
      } catch { /* silent */ }
    }
    loadCounts();
    const handleRefresh = () => loadCounts();
    window.addEventListener("refresh-followup-counts", handleRefresh);
    const interval = setInterval(loadCounts, 30000);
    return () => {
      clearInterval(interval);
      window.removeEventListener("refresh-followup-counts", handleRefresh);
    };
  }, [mounted, authUser]);

  if (!mounted) return null;

  const effectiveCollapsed = isCollapsed && !mobileOpen;
  const sidebarWidth = effectiveCollapsed ? "w-[72px]" : "w-64";

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-screen ${sidebarWidth} flex flex-col transition-all duration-300 shadow-lg ${
          isDark
            ? "bg-[#0f172a] border-slate-800"
            : "bg-white border-slate-200"
        } border-r z-50 lg:z-40 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo / Header */}
        <div
          className={`border-b transition-all duration-300 flex items-center relative ${
            effectiveCollapsed ? "justify-center py-4 px-2" : "justify-between py-3 px-4"
          } ${isDark ? "border-slate-800" : "border-slate-100 bg-slate-50/50"}`}
        >
          {!effectiveCollapsed && (
            <img
              src="/assets/mobibix-main-logo.png"
              alt="Mobibix Logo"
              className="h-12 w-auto object-contain py-0.5"
            />
          )}
          {effectiveCollapsed && (
            <img
              src="/assets/mobibix-app-icon.png"
              alt="Mobibix Icon"
              className="w-9 h-9 object-contain"
            />
          )}

          {/* Desktop collapse toggle */}
          <button
            onClick={toggleCollapse}
            className={`hidden lg:flex items-center justify-center w-6 h-6 rounded-full border transition-all duration-200 flex-shrink-0 ${
              isDark
                ? "border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                : "border-slate-200 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-700"
            } ${effectiveCollapsed ? "mt-0" : ""}`}
            title={effectiveCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {effectiveCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>

          {/* Mobile close */}
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
        </div>

        {/* Nav */}
        <nav className={`flex-1 overflow-y-auto py-4 space-y-5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700/50 [&::-webkit-scrollbar-thumb]:rounded-full ${effectiveCollapsed ? "px-2 overflow-x-hidden" : "px-3"}`}>
          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category} className="space-y-0.5">
              {!effectiveCollapsed && (
                <div className={`px-3 mb-2 text-[10px] font-black tracking-[0.15em] uppercase pointer-events-none ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  {category}
                </div>
              )}
              {effectiveCollapsed && (
                <div className={`h-px mx-2 mb-2 ${isDark ? "bg-slate-800" : "bg-slate-100"}`} />
              )}
              {items.map((item) => {
                const isActive = pathname === item.href || (item.label === "Loyalty Program" && pathname === "/settings" && typeof window !== "undefined" && window.location.search.includes("tab=loyalty"));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href!}
                    onClick={() => mobileOpen && onClose && onClose()}
                    className={`flex items-center gap-3 py-2.5 rounded-xl transition-all duration-150 group relative ${
                      effectiveCollapsed ? "justify-center px-0" : "px-3"
                    } ${
                      isActive
                        ? isDark
                          ? "bg-indigo-500/15 text-white font-semibold"
                          : "bg-indigo-50 text-indigo-700 font-semibold"
                        : isDark
                          ? "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                    title={effectiveCollapsed ? item.label : ""}
                  >
                    {/* Active indicator bar */}
                    {isActive && !effectiveCollapsed && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-indigo-500 rounded-r-full" />
                    )}
                    <div className="flex-shrink-0">
                      <Icon
                        size={17}
                        strokeWidth={isActive ? 2.5 : 1.8}
                        className={
                          isActive
                            ? isDark ? "text-indigo-400" : "text-indigo-600"
                            : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors"
                        }
                      />
                    </div>
                    {!effectiveCollapsed && (
                      <>
                        <span className="text-[13.5px] flex-1 truncate">{item.label}</span>
                        {item.label === "Customers" && counts && counts.total > 0 && (
                          <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-sm whitespace-nowrap">
                            {counts.total}
                          </span>
                        )}
                      </>
                    )}

                    {/* Collapsed tooltip */}
                    {effectiveCollapsed && (
                      <div className="absolute left-[calc(100%+10px)] px-2.5 py-1.5 bg-slate-900 dark:bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl pointer-events-none z-50 border border-slate-700/50">
                        {item.label}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom section */}
        <div className={`border-t pb-4 pt-3 ${isDark ? "border-slate-800/60" : "border-slate-100"} ${effectiveCollapsed ? "px-2 flex flex-col items-center gap-2" : "px-3 space-y-2"}`}>
          {/* Upgrade CTA */}
          {!effectiveCollapsed && authUser?.planCode && (authUser.planCode.includes('TRIAL') || authUser.planCode.includes('STARTER')) && (
            <Link
              href="/settings?tab=billing"
              className={`block w-full px-3 py-2.5 rounded-xl text-center text-xs font-bold transition-all ${
                isDark
                  ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400 hover:from-amber-500/30'
                  : 'bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 text-amber-700 hover:border-amber-300'
              }`}
            >
              ⚡ Upgrade to Pro
            </Link>
          )}

          {/* AI Button — only OWNER / MANAGER */}
          {(authUser?.role === 'OWNER' || authUser?.role === 'MANAGER') && (
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("open-ai-chat", { detail: { prompt: "" } }))}
              className={`flex items-center gap-2 py-2.5 rounded-xl transition-all duration-200 font-semibold ${
                effectiveCollapsed ? "w-10 h-10 justify-center p-0" : "w-full px-3"
              } ${isDark ? "bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30" : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200"}`}
              title={effectiveCollapsed ? "Mobibix AI Assistant" : ""}
            >
              <Sparkles size={15} className="flex-shrink-0" />
              {!effectiveCollapsed && <span className="text-[13px] tracking-wide">Mobibix AI</span>}
            </button>
          )}

          {!effectiveCollapsed && (authUser?.role === 'OWNER' || authUser?.role === 'MANAGER') && (
            <AiQuotaBadge />
          )}
        </div>
      </aside>
    </>
  );
}
