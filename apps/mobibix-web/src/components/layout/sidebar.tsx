"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: "📊" },
  { label: "Sales", href: "/sales", icon: "💰" },
  { label: "Job Cards", href: "/jobcards", icon: "🔧" },
  { label: "Products", href: "/products", icon: "🏷️" },
  { label: "Inventory", href: "/inventory", icon: "📦" },
  { label: "Customers", href: "/customers", icon: "👥" },
  { label: "Suppliers", href: "/suppliers", icon: "🚚" },
  { label: "Purchases", href: "/purchases", icon: "📥" },
  { label: "Reports", href: "/reports", icon: "📈" },
  { label: "Shops", href: "/shops", icon: "🏪" },
  { label: "Settings", href: "/settings", icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isDark = mounted && theme === "dark";

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

  const sidebarWidth = isCollapsed ? "w-20" : "w-60";
  const sidebarPadding = isCollapsed ? "p-4" : "p-6";

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen ${sidebarWidth} flex flex-col transition-all duration-300 shadow-lg ${
          isDark
            ? "bg-gray-950 border-gray-800"
            : "bg-gradient-to-b from-white via-teal-50/30 to-white border-teal-100"
        } border-r z-40`}
      >
        {/* Logo/Brand */}
        <div
          className={`${sidebarPadding} border-b transition-all duration-300 ${
            isDark
              ? "border-gray-800"
              : "border-teal-100 bg-gradient-to-r from-teal-50/50 to-transparent"
          }`}
        >
          {!isCollapsed && (
            <>
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
              <p
                className={`text-[10px] mt-1.5 leading-tight ${
                  isDark ? "text-stone-400" : "text-teal-600/70 font-medium"
                }`}
              >
                Digital Retail Platform
              </p>
            </>
          )}
          {isCollapsed && (
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
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative ${
                  isActive
                    ? isDark
                      ? "bg-teal-500/20 text-teal-300 border border-teal-500/30 shadow-md"
                      : "bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-500/30 border border-teal-400 font-semibold"
                    : isDark
                      ? "text-gray-400 hover:bg-gray-800 hover:text-white"
                      : "text-gray-700 hover:bg-teal-50 hover:text-teal-700 hover:shadow-sm font-medium"
                } ${isCollapsed ? "justify-center" : ""}`}
                title={isCollapsed ? item.label : ""}
              >
                <span className="text-lg flex-shrink-0">{item.icon}</span>
                {!isCollapsed && (
                  <span className="font-medium text-sm">{item.label}</span>
                )}

                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Toggle Button */}
          <div
            className={`p-2 border-t transition-all duration-300 ${
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
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
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
            <p className={`text-xs font-medium ${
              isDark ? "" : "text-teal-700/70"
            }`}>v1.0.0</p>
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
