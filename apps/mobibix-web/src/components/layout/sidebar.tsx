"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: "📊" },
  { label: "Shops", href: "/shops", icon: "🏪" },
  { label: "Job Cards", href: "/jobcards", icon: "🔧" },
  { label: "Sales", href: "/sales", icon: "💰" },
  { label: "Customers", href: "/customers", icon: "👥" },
  { label: "Inventory", href: "/inventory", icon: "📦" },
  { label: "Reports", href: "/reports", icon: "📈" },
  { label: "Settings", href: "/settings", icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-stone-900 border-r border-white/10 flex flex-col">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-white/10">
        <h1 className="text-xl font-bold text-white">ShopFlow</h1>
        <p className="text-xs text-stone-400 mt-1">Business Management</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                  : "text-stone-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <p className="text-xs text-stone-500">v1.0.0</p>
      </div>
    </aside>
  );
}
