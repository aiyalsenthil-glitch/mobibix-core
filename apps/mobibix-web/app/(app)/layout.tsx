"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authGuard } from "@/lib/authGuard";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/hooks/useAuth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { authUser, isLoading } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme } = useTheme();
  const isDark = mounted && theme === "dark";

  useEffect(() => {
    // Don't check guard until auth has finished loading
    if (isLoading) return;

    if (authUser) {
      // Auth resolved with a valid user — no guard check needed
      setIsReady(true);
    } else {
      // Auth finished loading but no user → check guard (may redirect to signin)
      const ok = authGuard(router);
      setIsReady(ok);
    }
  }, [router, isLoading, authUser]);

  useEffect(() => {
    if (!isReady || isLoading) return;

    if (authUser && !authUser.tenantId) {
      setIsRedirecting(true);
      router.replace("/onboarding");
    }
  }, [authUser, isLoading, isReady, router]);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("sidebarCollapsed");
    if (stored) setIsCollapsed(JSON.parse(stored));

    // Listen for storage changes from sidebar
    const handleStorageChange = () => {
      const stored = localStorage.getItem("sidebarCollapsed");
      if (stored) setIsCollapsed(JSON.parse(stored));
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [router]);

  if (!isReady || isRedirecting) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
        <p className="mt-4 text-slate-600 dark:text-slate-400 font-medium">
          Verifying access...
        </p>
      </div>
    );
  }

  const marginLeft = mounted && isCollapsed ? "lg:ml-20" : "lg:ml-60";

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors duration-300">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
      <Topbar
        isCollapsed={mounted && isCollapsed}
        onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      />
      <main
        className={`${marginLeft} pt-20 px-4 lg:px-8 py-8 transition-all duration-300 bg-white dark:bg-slate-950 min-h-screen`}
      >
        {children}
      </main>
    </div>
  );
}
