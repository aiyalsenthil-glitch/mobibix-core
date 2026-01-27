"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useTheme } from "@/context/ThemeContext";

interface TopbarProps {
  isCollapsed?: boolean;
}

export function Topbar({ isCollapsed = false }: TopbarProps) {
  const { authUser, logout } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const handleLogout = async () => {
    await logout();
    router.replace("/signin");
  };

  const leftOffset = isCollapsed ? "left-20" : "left-60";

  return (
    <header
      className={`fixed ${leftOffset} right-0 top-0 h-16 border-b ${
        isDark
          ? "bg-gray-950 border-gray-800 text-white"
          : "bg-gradient-to-r from-white via-teal-50/40 to-white border-teal-100 text-black shadow-md shadow-teal-500/5"
      } flex items-center justify-between px-6 z-10 transition-all duration-300`}
    >
      {/* Business/Tenant Name */}
      <div className="min-w-0">
        <p
          className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-teal-600/70"} whitespace-nowrap uppercase tracking-wide`}
        >
          Business
        </p>
        <p
          className={`text-lg font-bold bg-gradient-to-r ${
            isDark
              ? "text-white"
              : "from-teal-700 to-teal-600 bg-clip-text text-transparent"
          } whitespace-nowrap truncate`}
        >
          {authUser?.name || "Shop Name"}
        </p>
      </div>

      {/* User Info + Logout + Theme Switcher */}
      <div className="flex items-center gap-3 sm:gap-6">
        <div className="text-right text-xs sm:text-sm">
          <p
            className={`font-semibold ${
              isDark ? "text-white" : "text-teal-900"
            }`}
          >
            {authUser?.email || "User"}
          </p>
          <p
            className={`capitalize ${
              isDark ? "text-gray-400" : "text-teal-600/70 font-medium"
            }`}
          >
            {authUser?.role || "member"}
          </p>
        </div>

        {/* Theme Switcher - Improved Clickable Area */}
        <div
          className={`px-2 py-2 rounded-xl transition-all duration-200 ${
            isDark
              ? "hover:bg-gray-800"
              : "hover:bg-teal-100 hover:shadow-sm border border-transparent hover:border-teal-200"
          }`}
        >
          <ThemeSwitcher />
        </div>

        {/* Logout Button - More Prominent */}
        <button
          onClick={handleLogout}
          className="px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold bg-gradient-to-r from-teal-600 via-teal-500 to-teal-600 hover:from-teal-700 hover:via-teal-600 hover:to-teal-700 text-white dark:from-cyan-400 dark:to-teal-400 dark:hover:from-cyan-300 dark:hover:to-teal-300 dark:text-gray-900 rounded-xl transition-all duration-200 hover:shadow-xl hover:shadow-teal-500/30 hover:scale-105 whitespace-nowrap shadow-lg shadow-teal-500/20"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
