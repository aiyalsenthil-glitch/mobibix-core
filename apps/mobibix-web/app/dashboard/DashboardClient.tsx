"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useTheme } from "@/context/ThemeContext";
import { Topbar } from "@/components/layout/topbar";

export function DashboardClient({ children }: { children: React.ReactNode }) {
  const [openMore, setOpenMore] = useState(false);
  const pathname = usePathname();
  const { theme } = useTheme();

  const isActive = (path: string) => pathname.startsWith(path);

  const sidebarBg =
    theme === "dark"
      ? "bg-black/50 border-white/10"
      : "bg-white border-gray-200";
  const navItemActive =
    theme === "dark"
      ? "bg-teal-500/20 border border-teal-500/50 text-teal-300 font-semibold"
      : "bg-teal-100 border border-teal-300/50 text-teal-700 font-semibold";
  const navItemInactive =
    theme === "dark"
      ? "hover:bg-white/5 text-stone-400 hover:text-white"
      : "hover:bg-gray-100 text-gray-600 hover:text-gray-900";
  const mainBg =
    theme === "dark"
      ? "bg-gradient-to-br from-black via-slate-950 to-black"
      : "bg-gradient-to-br from-white via-gray-50 to-white";
  const footerBorder = theme === "dark" ? "border-white/10" : "border-gray-200";
  const footerText =
    theme === "dark"
      ? "text-stone-400 hover:text-white"
      : "text-gray-600 hover:text-gray-900";

  return (
    <div className="flex h-screen bg-white dark:bg-black text-black dark:text-white transition-colors duration-200">
      {/* Sidebar */}
      <aside
        className={`w-64 border-r ${sidebarBg} backdrop-blur flex flex-col p-4 fixed h-screen overflow-y-auto transition-colors duration-200 z-10`}
      >
        <div className="flex items-center justify-between mb-8 pt-2 px-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
            <div className="flex flex-col">
              <span className="text-lg font-bold">MobiBix</span>
              <span className="text-[10px] text-muted-foreground leading-none">
                Digital Retail Platform
              </span>
            </div>
          </div>
          <div className="flex-shrink-0">
            <ThemeSwitcher />
          </div>
        </div>

        <nav className="space-y-2 flex-1">
          <Link
            href="/dashboard"
            className={`block px-4 py-3 rounded-lg transition-all ${
              isActive("/dashboard") && pathname === "/dashboard"
                ? navItemActive
                : navItemInactive
            }`}
          >
            📊 Dashboard
          </Link>
          <Link
            href="/dashboard/sales"
            className={`block px-4 py-3 rounded-lg transition-all ${
              isActive("/dashboard/sales") ? navItemActive : navItemInactive
            }`}
          >
            💰 Sales
          </Link>
          <Link
            href="/dashboard/jobcards"
            className={`block px-4 py-3 rounded-lg transition-all ${
              isActive("/dashboard/jobcards") ? navItemActive : navItemInactive
            }`}
          >
            🔧 Job Cards
          </Link>
          <Link
            href="/dashboard/inventory"
            className={`block px-4 py-3 rounded-lg transition-all ${
              isActive("/dashboard/inventory") ? navItemActive : navItemInactive
            }`}
          >
            📦 Inventory
          </Link>

          {/* More Menu */}
          <div>
            <button
              onClick={() => setOpenMore(!openMore)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center justify-between ${navItemInactive}`}
            >
              <span>⋯ More</span>
              <span
                className={`transition-transform ${openMore ? "rotate-180" : ""}`}
              >
                ▼
              </span>
            </button>
            {openMore && (
              <div
                className={`ml-2 mt-1 space-y-1 pl-3 border-l ${
                  theme === "dark" ? "border-white/10" : "border-gray-300"
                }`}
              >
                <Link
                  href="/dashboard/customers"
                  className={`block px-4 py-2 rounded-lg transition-all text-sm ${
                    isActive("/dashboard/customers")
                      ? navItemActive
                      : navItemInactive
                  }`}
                >
                  👥 Customers
                </Link>
                <Link
                  href="/dashboard/reports"
                  className={`block px-4 py-2 rounded-lg transition-all text-sm ${
                    isActive("/dashboard/reports")
                      ? navItemActive
                      : navItemInactive
                  }`}
                >
                  📊 Reports
                </Link>
                <Link
                  href="/dashboard/shops"
                  className={`block px-4 py-2 rounded-lg transition-all text-sm ${
                    isActive("/dashboard/shops")
                      ? navItemActive
                      : navItemInactive
                  }`}
                >
                  🏪 Shops
                </Link>
                <Link
                  href="/dashboard/settings"
                  className={`block px-4 py-2 rounded-lg transition-all text-sm ${
                    isActive("/dashboard/settings")
                      ? navItemActive
                      : navItemInactive
                  }`}
                >
                  ⚙️ Settings
                </Link>
              </div>
            )}
          </div>
        </nav>

        {/* User Footer */}
        <div
          className={`border-t pt-4 transition-colors duration-200 ${footerBorder}`}
        >
          <Link
            href="/dashboard"
            className={`block px-4 py-2 rounded-lg text-sm transition-all ${footerText}`}
          >
            ← Back to Dashboard
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 overflow-y-auto transition-colors duration-200">
        {/* Fixed Topbar across dashboard */}
        <Topbar isCollapsed={false} />
        <div className={`min-h-screen pt-20 ${mainBg}`}>{children}</div>
      </main>
    </div>
  );
}
