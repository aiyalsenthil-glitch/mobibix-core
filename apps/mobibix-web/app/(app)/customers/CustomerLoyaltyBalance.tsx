"use client";

import { useState, useEffect } from "react";
import { getCustomerLoyaltyBalance } from "@/services/loyalty.api";
import { useTheme } from "@/context/ThemeContext";
import { useShop } from "@/context/ShopContext";

interface CustomerLoyaltyBalanceProps {
  customerId: string;
  /** Called with the current balance when the badge is clicked */
  onClick?: (balance: number) => void;
}

/**
 * Dynamically fetches and displays customer's loyalty balance.
 * Optionally clickable to open the loyalty history drawer.
 */
export function CustomerLoyaltyBalance({
  customerId,
  onClick,
}: CustomerLoyaltyBalanceProps) {
  const { theme } = useTheme();
  const { selectedShopId } = useShop();
  const isDark = theme === "dark";
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!customerId) return;
    const fetchBalance = async () => {
      try {
        setIsLoading(true);
        setError(false);
        const result = await getCustomerLoyaltyBalance(customerId, selectedShopId);
        setBalance(result);
      } catch (err) {
        console.error("Failed to fetch loyalty balance:", err);
        setError(true);
        setBalance(0);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBalance();
  }, [customerId, selectedShopId]);

  if (isLoading) {
    return (
      <span
        className={`inline-block px-3 py-1 rounded-full text-xs font-medium animate-pulse ${
          isDark ? "bg-stone-700 text-stone-700" : "bg-gray-200 text-gray-200"
        }`}
      >
        oo pts
      </span>
    );
  }

  if (error) {
    return (
      <span
        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
          isDark ? "bg-red-500/15 text-red-400" : "bg-red-100 text-red-600"
        }`}
      >
        —
      </span>
    );
  }

  const hasPoints = (balance ?? 0) > 0;

  return (
    <button
      onClick={() => onClick?.(balance ?? 0)}
      disabled={!onClick}
      title={onClick ? "Click to view loyalty history" : undefined}
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
        onClick ? "cursor-pointer hover:scale-105 active:scale-95" : "cursor-default"
      } ${
        hasPoints
          ? isDark
            ? "bg-purple-500/20 text-purple-300 hover:bg-purple-500/30"
            : "bg-purple-100 text-purple-700 hover:bg-purple-200"
          : isDark
          ? "bg-white/8 text-stone-400 hover:bg-white/12"
          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
      }`}
    >
      {balance} pts
    </button>
  );
}
