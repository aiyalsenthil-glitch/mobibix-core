"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useTheme } from "@/context/ThemeContext";
import { useShop } from "@/context/ShopContext";
import { Bell, PhoneCall } from "lucide-react";
import { NotificationDropdown } from "./NotificationDropdown";

interface TopbarProps {
  isCollapsed?: boolean;
  onMenuClick?: () => void;
}

export function Topbar({ isCollapsed = false, onMenuClick }: TopbarProps) {
  const { authUser, REMOVED_AUTH_PROVIDERUser, logout } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const { selectedShop } = useShop();
  const isDark = theme === "dark";

  const handleLogout = async () => {
    await logout();
    router.replace("/signin");
  };

  const leftOffset = isCollapsed ? "lg:left-20" : "lg:left-60";

  return (
    <header
      className={`fixed ${leftOffset} left-0 right-0 top-0 h-16 border-b ${
        isDark
          ? "bg-gray-950 border-gray-800 text-white"
          : "bg-gradient-to-r from-white via-teal-50/40 to-white border-teal-100 text-black shadow-md shadow-teal-500/5"
      } flex items-center justify-between px-4 sm:px-6 z-30 transition-all duration-300`}
    >
      {/* Mobile Menu Button + Business Name */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 text-teal-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

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
            {selectedShop?.name || (authUser as any)?.displayName || authUser?.name || REMOVED_AUTH_PROVIDERUser?.displayName || "Shop Name"}
          </p>
        </div>
      </div>

      {/* User Info + Logout + Theme Switcher */}
      <div className="flex items-center gap-3 sm:gap-6">
        <div className="hidden sm:block text-right">
          <p className={`text-sm font-semibold truncate max-w-[160px] ${isDark ? "text-white" : "text-slate-900"}`}>
            {(authUser as any)?.displayName || authUser?.name || REMOVED_AUTH_PROVIDERUser?.displayName || authUser?.email || "User"}
          </p>
          <p className={`text-xs capitalize ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {authUser?.isSystemOwner ? "System Owner" : (authUser?.role || "Staff")}
          </p>
        </div>

        {/* Support Call/WhatsApp Button */}
        <a
          href="https://wa.me/918838822461?text=Hi%20MobiBix%20team%2C%20I%20need%20support%20with%20my%20account."
          target="_blank"
          rel="noopener noreferrer"
          className={`p-2 rounded-xl transition-all duration-200 flex items-center gap-2 ${
            isDark
              ? "text-green-400 hover:bg-green-500/10 hover:text-green-300"
              : "text-green-600 hover:bg-green-50 hover:text-green-700"
          }`}
          title="Contact Support"
        >
          <PhoneCall size={18} />
          <span className="hidden lg:inline text-xs font-bold">Support</span>
        </a>

        {/* Notifications Icon */}
        <NotificationDropdown />

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

        {/* Logout — subtle, not competing with primary CTAs */}
        <button
          onClick={handleLogout}
          className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl border transition-all duration-200 whitespace-nowrap ${
            isDark
              ? "border-slate-700 text-slate-400 hover:border-slate-600 hover:text-white hover:bg-slate-800"
              : "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 hover:bg-slate-50"
          }`}
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
