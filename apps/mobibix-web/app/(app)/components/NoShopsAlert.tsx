"use client";

import Link from "next/link";
import { useTheme } from "@/context/ThemeContext";

interface NoShopsAlertProps {
  variant?: "full-page" | "compact";
}

export function NoShopsAlert({ variant = "compact" }: NoShopsAlertProps) {
  const { theme } = useTheme();

  if (variant === "full-page") {
    return (
      <div className="text-center py-12">
        <p
          className={`mb-6 text-lg font-semibold ${theme === "dark" ? "text-stone-400" : "text-gray-600"}`}
        >
          No shops found. Please create a shop to get started.
        </p>
        <Link href="/shops" className="inline-block">
          <button className="px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-lg font-bold transition shadow-lg">
            + Create Shop
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div
      className={`p-4 border rounded-lg ${
        theme === "dark"
          ? "bg-amber-500/10 border-amber-500/30"
          : "bg-amber-50 border-amber-200"
      }`}
    >
      <p
        className={`text-sm font-medium ${
          theme === "dark" ? "text-amber-300" : "text-amber-800"
        } mb-2`}
      >
        No shops available. Please create a shop first.
      </p>
      <Link href="/shops" className="inline-block">
        <span
          className={`text-sm font-semibold underline cursor-pointer ${
            theme === "dark"
              ? "text-amber-200 hover:text-amber-100"
              : "text-amber-700 hover:text-amber-900"
          }`}
        >
          Click here to create a shop
        </span>
      </Link>
    </div>
  );
}
