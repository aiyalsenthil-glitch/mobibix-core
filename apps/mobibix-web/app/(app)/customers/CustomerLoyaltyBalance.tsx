"use client";

import { useState, useEffect } from "react";
import { getCustomerLoyaltyBalance } from "@/services/loyalty.api";
import { useTheme } from "@/context/ThemeContext";

interface CustomerLoyaltyBalanceProps {
  customerId: string;
}

/**
 * Dynamically fetches and displays customer's loyalty balance
 * Uses loyalty transaction ledger (not direct field)
 */
export function CustomerLoyaltyBalance({
  customerId,
}: CustomerLoyaltyBalanceProps) {
  const { theme } = useTheme();
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        setIsLoading(true);
        setError(false);
        const result = await getCustomerLoyaltyBalance(customerId);
        setBalance(result);
      } catch (err) {
        console.error("Failed to fetch loyalty balance:", err);
        setError(true);
        setBalance(0);
      } finally {
        setIsLoading(false);
      }
    };

    if (customerId) {
      fetchBalance();
    }
  }, [customerId]);

  if (isLoading) {
    return (
      <span
        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
          theme === "dark"
            ? "bg-stone-500/20 text-stone-300"
            : "bg-gray-200 text-gray-600"
        }`}
      >
        Loading...
      </span>
    );
  }

  if (error) {
    return (
      <span
        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
          theme === "dark"
            ? "bg-red-500/20 text-red-300"
            : "bg-red-100 text-red-700"
        }`}
      >
        Error
      </span>
    );
  }

  return (
    <span
      className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
        theme === "dark"
          ? "bg-purple-500/20 text-purple-300"
          : "bg-purple-100 text-purple-700"
      }`}
    >
      {balance} pts
    </span>
  );
}
