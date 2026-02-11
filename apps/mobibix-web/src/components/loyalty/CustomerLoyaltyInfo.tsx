"use client";

import { useState, useEffect } from "react";
import { getCustomerLoyaltyBalance } from "@/services/loyalty.api";
import { useTheme } from "@/context/ThemeContext";

interface CustomerLoyaltyInfoProps {
  customerId: string | undefined;
  isLoading?: boolean;
}

export function CustomerLoyaltyInfo({
  customerId,
  isLoading: externalLoading = false,
}: CustomerLoyaltyInfoProps) {
  const { theme } = useTheme();
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch balance when customerId changes
  useEffect(() => {
    if (!customerId) {
      setBalance(null);
      setError(null);
      return;
    }

    const fetchBalance = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getCustomerLoyaltyBalance(customerId);
        setBalance(result);
      } catch (err) {
        console.error("Failed to fetch loyalty balance:", err);
        setError("Failed to load loyalty balance");
        setBalance(null);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce the fetch by 300ms to avoid too many requests
    const timer = setTimeout(fetchBalance, 300);
    return () => clearTimeout(timer);
  }, [customerId]);

  // If no customer selected, don't show anything
  if (!customerId) {
    return null;
  }

  // Show loading skeleton
  if (isLoading || externalLoading) {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${
          theme === "dark"
            ? "bg-gray-700 text-gray-300"
            : "bg-gray-200 text-gray-600"
        }`}
      >
        <span className="text-xs font-medium">Loading balance...</span>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${
          theme === "dark"
            ? "bg-red-900 text-red-200"
            : "bg-red-100 text-red-800"
        }`}
      >
        <span className="text-xs font-medium">⚠️ {error}</span>
      </div>
    );
  }

  // Show balance (default to 0 if null)
  const points = balance ?? 0;
  const rupees = points * 1.0; // 1 point = ₹1 (we could make this configurable later)

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full font-medium text-sm ${
        theme === "dark"
          ? "bg-green-900 text-green-200"
          : "bg-green-100 text-green-800"
      }`}
    >
      <span>💳</span>
      <span>
        {points} points {points > 0 && `(₹${rupees.toFixed(2)})`}
      </span>
    </div>
  );
}
