"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";
import { getFollowUpCounts } from "@/services/crm.api";

interface NavItem {
  label: string;
  href?: string;
  icon: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "📊" },
  { label: "Sales", href: "/sales", icon: "💰" },
  { label: "Job Cards", href: "/jobcards", icon: "🔧" },
  { label: "Products", href: "/products", icon: "🏷️" },
  { label: "Inventory", href: "/inventory", icon: "📦" },
  { label: "Stock Management", href: "/inventory", icon: "📦" },
  { label: "Negative Stock Report", href: "/inventory/negative-stock", icon: "📦" },
  { label: "Stock Correction", href: "/inventory/stock-correction", icon: "📦" },
  { label: "Customers", href: "/customers", icon: "👥" },
  { label: "All Customers", href: "/customers", icon: "👥" },
  { label: "CRM Dashboard", href: "/crm", icon: "👥" },
  { label: "My Follow-ups", href: "/crm/follow-ups", icon: "👥" },
  { label: "WhatsApp", href: "/whatsapp", icon: "💬" },
  { label: "Suppliers", href: "/suppliers", icon: "🚚" },
  { label: "Purchases", href: "/purchases", icon: "📥" },
  { label: "Payments", href: "/receipts", icon: "💳" },
  { label: "Receipts", href: "/receipts", icon: "💳" },
  { label: "Vouchers", href: "/vouchers", icon: "💳" },
  { label: "Reports", href: "/reports", icon: "📈" },
  { label: "Shops", href: "/shops", icon: "🏪" },
  { label: "Settings", href: "/settings", icon: "⚙️" },
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
    if (mounted) {
      loadCounts();
      const interval = setInterval(loadCounts, 30000); // Poll every 30s
      return () => clearInterval(interval);
    }
  }, [mounted]);

  async function loadCounts() {
    try {
      const data = await getFollowUpCounts();
      setCounts(data);
    } catch (err) {
      console.error("Failed to load follow-up counts", err);
    }
  }

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
  const sidebarWidth = effectiveCollapsed ? "w-20" : "w-64";
  const sidebarPadding = effectiveCollapsed ? "p-4" : "p-6";

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
        className={`fixed left-0 top-0 h-screen ${sidebarWidth} flex flex-col transition-transform duration-300 shadow-lg ${
          isDark
            ? "bg-gray-950 border-gray-800"
            : "bg-gradient-to-b from-white via-teal-50/30 to-white border-teal-100"
        } border-r z-50 lg:z-40 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo/Brand + Mobile Close */}
        <div
          className={`${sidebarPadding} border-b transition-all duration-300 flex items-center justify-between ${
            isDark
              ? "border-gray-800"
              : "border-teal-100 bg-gradient-to-r from-teal-50/50 to-transparent"
          }`}
        >
          {!effectiveCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-bold shadow-md">
                M
              </div>
              <h1
                className={`text-xl font-bold bg-gradient-to-r ${
                  isDark
                    ? "text-white"
                    : "from-teal-600 to-teal-700 bg-clip-text text-transparent"
                }`}
              >
                MobiBix
              </h1>
            </div>
          )}

          {/* Mobile Close Button */}
          {mobileOpen && (
             <button onClick={onClose} className="lg:hidden p-1 text-gray-500 hover:text-red-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
             </button>
          )}

          {effectiveCollapsed && (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-bold shadow-lg">
              M
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href!}
                onClick={() => mobileOpen && onClose && onClose()}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative ${
                  isActive
                    ? isDark
                      ? "bg-teal-500/20 text-teal-300 border border-teal-500/30 shadow-md"
                      : "bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-500/30 border border-teal-400 font-semibold"
                    : isDark
                      ? "text-gray-400 hover:bg-gray-800 hover:text-white"
                      : "text-gray-700 hover:bg-teal-50 hover:text-teal-700 hover:shadow-sm font-medium"
                } ${effectiveCollapsed ? "justify-center" : ""}`}
                title={effectiveCollapsed ? item.label : ""}
              >
                <span className="text-lg flex-shrink-0">{item.icon}</span>
                {!effectiveCollapsed && (
                  <>
                    <span className="font-medium text-sm flex-1">{item.label}</span>
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
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Toggle Button (Desktop Only) */}
        <div
          className={`hidden lg:flex p-2 border-t transition-all duration-300 ${
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

        {/* Footer */}
        {!isCollapsed && (
          <div
            className={`p-4 border-t transition-all duration-300 ${
              isDark
                ? "border-gray-800 text-gray-500"
                : "border-teal-100 text-teal-600/60"
            }`}
          >
            <p
              className={`text-xs font-medium ${
                isDark ? "" : "text-teal-700/70"
              }`}
            >
              v1.0.0
            </p>
          </div>
        )}
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
