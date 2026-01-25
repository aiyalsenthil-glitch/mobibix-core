"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: "📊" },
  { label: "Sales", href: "/sales", icon: "💰" },
  { label: "Job Cards", href: "/jobcards", icon: "🔧" },
  { label: "Inventory", href: "/inventory", icon: "📦" },
  { label: "Customers", href: "/customers", icon: "👥" },
  { label: "Reports", href: "/reports", icon: "📈" },
  { label: "Shops", href: "/shops", icon: "🏪" },
  { label: "Settings", href: "/settings", icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

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
        className={`fixed left-0 top-0 h-screen ${sidebarWidth} flex flex-col transition-all duration-300 ${
          theme === "dark"
            ? "bg-gray-950 border-gray-800"
            : "bg-white border-gray-200"
        } border-r z-40`}
      >
        {/* Logo/Brand */}
        <div
          className={`${sidebarPadding} border-b transition-all duration-300 ${
            theme === "dark" ? "border-gray-800" : "border-gray-200"
          }`}
        >
          {!isCollapsed && (
            <>
              <h1
                className={`text-xl font-bold ${
                  theme === "dark" ? "text-white" : "text-gray-900"
                }`}
              >
                ShopFlow
              </h1>
              <p
                className={`text-xs mt-1 ${
                  theme === "dark" ? "text-stone-400" : "text-gray-500"
                }`}
              >
                Business Management
              </p>
            </>
          )}
          {isCollapsed && (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold">
              S
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
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group relative ${
                  isActive
                    ? theme === "dark"
                      ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                      : "bg-teal-100 text-teal-700 border border-teal-300"
                    : theme === "dark"
                      ? "text-gray-400 hover:bg-gray-800 hover:text-white"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
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
            theme === "dark" ? "border-gray-800" : "border-gray-200"
          }`}
        >
          <button
            onClick={toggleCollapse}
            className={`w-full flex items-center justify-center gap-2 px-3 py-3 rounded-lg transition-all duration-200 ${
              theme === "dark"
                ? "bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white"
                : "bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900"
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
              theme === "dark"
                ? "border-gray-800 text-gray-500"
                : "border-gray-200 text-gray-500"
            }`}
          >
            <p className="text-xs">v1.0.0</p>
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
