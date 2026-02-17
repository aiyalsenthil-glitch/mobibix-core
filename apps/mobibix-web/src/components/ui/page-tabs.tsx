"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type Tab = {
  label: string;
  href: string;
};

type PageTabsProps = {
  tabs: Tab[];
  className?: string;
};

export function PageTabs({ tabs, className }: PageTabsProps) {
  const pathname = usePathname();

  return (
    <div className={cn("hidden lg:block mb-8", className)}>
      <nav className="flex space-x-1 bg-gray-50/50 dark:bg-stone-900/50 p-1 rounded-xl w-fit border border-gray-100/50 dark:border-white/5 backdrop-blur-sm" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-teal-500",
                isActive
                  ? "bg-white dark:bg-teal-500/20 text-teal-700 dark:text-teal-400 shadow-sm border border-gray-100 dark:border-teal-500/30"
                  : "text-gray-500 dark:text-stone-500 hover:text-gray-900 dark:hover:text-stone-200 hover:bg-white/50 dark:hover:bg-white/5"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
