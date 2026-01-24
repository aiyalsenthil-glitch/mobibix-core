"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [openMore, setOpenMore] = useState(false);
  const pathname = usePathname();

  const isActive = (path: string) => pathname.startsWith(path);

  return (
    <div className="flex h-screen bg-black text-white">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-black/50 backdrop-blur flex flex-col p-4 fixed h-screen overflow-y-auto">
        <div className="flex items-center gap-2 mb-8 pt-2">
          <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
          <span className="text-lg font-bold">ShopFlow</span>
        </div>

        <nav className="space-y-2 flex-1">
          <Link
            href="/dashboard/sales"
            className={`block px-4 py-3 rounded-lg transition-all ${
              isActive("/dashboard/sales")
                ? "bg-teal-500/20 border border-teal-500/50 text-teal-300 font-semibold"
                : "hover:bg-white/5 text-stone-400 hover:text-white"
            }`}
          >
            💰 Sales
          </Link>
          <Link
            href="/dashboard/repair"
            className={`block px-4 py-3 rounded-lg transition-all ${
              isActive("/dashboard/repair")
                ? "bg-teal-500/20 border border-teal-500/50 text-teal-300 font-semibold"
                : "hover:bg-white/5 text-stone-400 hover:text-white"
            }`}
          >
            🔧 Repair
          </Link>
          <Link
            href="/dashboard/inventory"
            className={`block px-4 py-3 rounded-lg transition-all ${
              isActive("/dashboard/inventory")
                ? "bg-teal-500/20 border border-teal-500/50 text-teal-300 font-semibold"
                : "hover:bg-white/5 text-stone-400 hover:text-white"
            }`}
          >
            📦 Inventory
          </Link>

          {/* More Menu */}
          <div>
            <button
              onClick={() => setOpenMore(!openMore)}
              className="w-full text-left px-4 py-3 rounded-lg transition-all hover:bg-white/5 text-stone-400 hover:text-white flex items-center justify-between"
            >
              <span>⋯ More</span>
              <span className={`transition-transform ${openMore ? "rotate-180" : ""}`}>
                ▼
              </span>
            </button>
            {openMore && (
              <div className="ml-2 mt-1 space-y-1 border-l border-white/10 pl-3">
                <Link
                  href="/dashboard/staff"
                  className={`block px-4 py-2 rounded-lg transition-all text-sm ${
                    isActive("/dashboard/staff")
                      ? "bg-teal-500/20 text-teal-300 font-semibold"
                      : "hover:bg-white/5 text-stone-400 hover:text-white"
                  }`}
                >
                  👥 Staff
                </Link>
                <Link
                  href="/dashboard/reports"
                  className={`block px-4 py-2 rounded-lg transition-all text-sm ${
                    isActive("/dashboard/reports")
                      ? "bg-teal-500/20 text-teal-300 font-semibold"
                      : "hover:bg-white/5 text-stone-400 hover:text-white"
                  }`}
                >
                  📊 Reports
                </Link>
                <Link
                  href="/dashboard/settings"
                  className={`block px-4 py-2 rounded-lg transition-all text-sm ${
                    isActive("/dashboard/settings")
                      ? "bg-teal-500/20 text-teal-300 font-semibold"
                      : "hover:bg-white/5 text-stone-400 hover:text-white"
                  }`}
                >
                  ⚙️ Settings
                </Link>
              </div>
            )}
          </div>
        </nav>

        {/* User Footer */}
        <div className="border-t border-white/10 pt-4">
          <Link
            href="/"
            className="block px-4 py-2 rounded-lg text-sm text-stone-400 hover:text-white hover:bg-white/5 transition-all"
          >
            ← Back to Home
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 overflow-y-auto">
        <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-black">
          {children}
        </div>
      </main>
    </div>
  );
}
