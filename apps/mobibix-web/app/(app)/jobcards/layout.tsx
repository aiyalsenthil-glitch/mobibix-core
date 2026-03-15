"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";

export default function JobCardsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { theme } = useTheme();

  const isBillsActive = pathname.includes("/bills");
  const isListActive = !isBillsActive; // Default to list if not bills

  return (
    <div className="flex flex-col h-full">
      {/* Sub Navigation Tabs */}
      <div className="flex space-x-6 border-b border-gray-200 dark:border-white/10 mb-6 pb-1">
        <Link
          href="/jobcards"
          className={`pb-3 text-sm font-medium transition-colors relative ${
            isListActive
              ? "text-teal-600 dark:text-teal-400"
              : "text-gray-500 dark:text-stone-400 hover:text-gray-700 dark:hover:text-stone-200"
          }`}
        >
          Job Cards
          {isListActive && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-teal-600 dark:bg-teal-400 rounded-t-full" />
          )}
        </Link>

        <Link
          href="/jobcards/bills"
          className={`pb-3 text-sm font-medium transition-colors relative ${
            isBillsActive
              ? "text-teal-600 dark:text-teal-400"
              : "text-gray-500 dark:text-stone-400 hover:text-gray-700 dark:hover:text-stone-200"
          }`}
        >
          Job Card Bills
          {isBillsActive && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-teal-600 dark:bg-teal-400 rounded-t-full" />
          )}
        </Link>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {children}
      </div>
    </div>
  );
}
