"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";
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
  Wallet,
  LineChart,
  Store,
  ShieldCheck,
  Settings,
  Gift,
} from "lucide-react";

interface NavItem {
  label: string;
  href?: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Sales", href: "/sales", icon: Banknote },
  { label: "Job Cards", href: "/jobcards", icon: Wrench },
  { label: "Products", href: "/products", icon: Tags },
  { label: "Inventory", href: "/inventory", icon: PackageSearch },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "WhatsApp", href: "/whatsapp", icon: MessageSquareShare },
  { label: "Suppliers", href: "/suppliers", icon: Truck },
  { label: "Purchases", href: "/purchases", icon: Inbox },
  { label: "Sales Receipts", href: "/receipts", icon: CreditCard },
  { label: "Reports", href: "/reports", icon: LineChart },
  { label: "Shops", href: "/shops", icon: Store },
  { label: "Staff Management", href: "/staff-management", icon: ShieldCheck },
  { label: "Settings", href: "/settings", icon: Settings },
];

// ... imports

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { theme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [expandedSubmenus, setExpandedSubmenus] = useState<string[]>([]);
  const [counts, setCounts] = useState<{ total: number } | null>(null);
  const isDark = mounted && theme === "dark";

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
      const interval = setInterval(loadCounts, 30000); // Poll every 30s
      return () => clearInterval(interval);
    }
  }, [mounted]);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("sidebarCollapsed");
    if (stored) setIsCollapsed(JSON.parse(stored));
  }, []);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("sidebarCollapsed", JSON.stringify(newState));
  };

  if (!mounted) return null;

  const effectiveCollapsed = mobileOpen ? false : isCollapsed;
  const sidebarWidth = effectiveCollapsed ? "w-[72px]" : "w-64";
  const sidebarPadding = effectiveCollapsed ? "p-3" : "py-2 px-4";

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen ${sidebarWidth} flex flex-col transition-transform duration-300 shadow-lg group/sidebar ${
          isDark
            ? "bg-gray-950 border-gray-800"
            : "bg-gradient-to-b from-white via-teal-50/30 to-white border-teal-100"
        } border-r z-50 lg:z-40 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo/Brand + Mobile Close */}
        <div
          className={`${sidebarPadding} border-b transition-all duration-300 flex items-center justify-center ${
            isDark
              ? "border-gray-800"
              : "border-teal-100 bg-gradient-to-r from-teal-50/50 to-transparent"
          }`}
        >
          {!effectiveCollapsed && (
            <img
              src="/assets/mobibix-main-logo.png"
              alt="MobiBix Logo"
              className="h-24 w-auto object-contain"
            />
          )}

          {/* Mobile Close Button */}
          {mobileOpen && (
            <button
              onClick={onClose}
              className="absolute right-4 top-4 lg:hidden p-1 text-gray-500 hover:text-red-500"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}

          {effectiveCollapsed && (
            <img
              src="/assets/mobibix-app-icon.png"
              alt="MobiBix Icon"
              className="w-12 h-12 object-contain"
            />
          )}
        </div>

        {/* Navigation */}
        <nav className={`flex-1 p-2 space-y-1.5 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 dark:[&::-webkit-scrollbar-thumb]:bg-gray-700/50 [&::-webkit-scrollbar-thumb]:rounded-full ${effectiveCollapsed ? 'overflow-x-hidden' : ''}`}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href!}
                onClick={() => mobileOpen && onClose && onClose()}
                className={`flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all duration-200 group relative ${
                  isActive
                    ? isDark
                      ? "bg-teal-500/15 text-teal-400 font-semibold"
                      : "bg-teal-50 text-teal-700 font-semibold before:absolute before:left-0 before:w-1.5 before:h-8 before:bg-teal-600 before:rounded-r-full"
                    : isDark
                      ? "text-gray-400 hover:bg-gray-800/50 hover:text-white"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium"
                } ${effectiveCollapsed ? "justify-center px-0" : ""}`}
                title={effectiveCollapsed ? item.label : ""}
              >
                <div className={`flex-shrink-0 ${effectiveCollapsed ? 'mx-auto' : ''}`}>
                   <Icon size={22} strokeWidth={isActive ? 2.5 : 2} className={isActive && !isDark ? "text-teal-600" : ""} />
                </div>
                {!effectiveCollapsed && (
                  <>
                    <span className="text-[14.5px] tracking-wide flex-1">
                      {item.label}
                    </span>
                    {item.label === "Customers" &&
                      counts &&
                      counts.total > 0 && (
                        <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-sm whitespace-nowrap">
                          {counts.total}
                        </span>
                      )}
                  </>
                )}

                {effectiveCollapsed && (
                  <div className="absolute left-[calc(100%+8px)] px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl pointer-events-none z-50">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Toggle Button (Desktop Only) */}
        <div
          className={`hidden lg:flex p-2 border-t transition-all duration-300 opacity-0 group-hover/sidebar:opacity-100 ${
            isDark ? "border-gray-800" : "border-teal-100"
          }`}
        >
          <button
            onClick={toggleCollapse}
            className={`w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl transition-all duration-200 ${
              isDark
                ? "bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white"
                : "bg-teal-50 hover:bg-teal-100 text-teal-700 hover:text-teal-800 font-medium shadow-sm hover:shadow-md"
            }`}
            title={effectiveCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {effectiveCollapsed ? (
              <>
                <span>→</span>
              </>
            ) : (
              <>
                <span>←</span>
                <span className="text-sm font-medium">Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Content Shift */}
      <div
        className={`${isCollapsed ? "ml-20" : "ml-60"} transition-all duration-300`}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          left: isCollapsed ? "80px" : "240px",
        }}
      />
    </>
  );
}
