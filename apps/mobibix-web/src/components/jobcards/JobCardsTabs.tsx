"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function JobCardsTabs() {
  const pathname = usePathname();

  const isBills = pathname.includes("/bills");

  return (
    <div className="flex border-b border-gray-200 dark:border-white/10 mb-6">
      <Link
        href="/jobcards"
        className={`py-3 px-6 text-sm font-medium border-b-2 transition ${
          !isBills
            ? "border-teal-500 text-teal-600 dark:text-teal-400"
            : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        }`}
      >
        All Job Cards
      </Link>
      <Link
        href="/jobcards/bills"
        className={`py-3 px-6 text-sm font-medium border-b-2 transition ${
          isBills
            ? "border-teal-500 text-teal-600 dark:text-teal-400"
            : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        }`}
      >
        Job Card Bills
      </Link>
    </div>
  );
}
