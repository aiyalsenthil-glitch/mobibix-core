"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authGuard } from "@/lib/authGuard";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { useTheme } from "@/context/ThemeContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    const ok = authGuard(router);
    setIsReady(ok);
  }, [router]);

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

  if (!isReady) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white">Checking access...</p>
      </div>
    );
  }

  const marginLeft = mounted && isCollapsed ? "ml-20" : "ml-60";

  return (
    <div
      className={`min-h-screen ${
        isDark ? "bg-gray-950 text-white" : "bg-gradient-to-br from-teal-50/30 via-white to-teal-50/20 text-black"
      } transition-colors duration-300`}
    >
      <Sidebar />
      <Topbar isCollapsed={mounted && isCollapsed} />
      <main
        className={`${marginLeft} pt-20 px-8 py-8 transition-all duration-300 ${
          isDark ? "bg-gray-950" : "bg-transparent"
        } min-h-screen`}
      >
        {children}
      </main>
    </div>
  );
}
