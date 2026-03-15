"use client";

import { useState, useEffect, useCallback } from "react";
import {
  validateLoyaltyRedemption,
  getLoyaltyConfig,
} from "@/services/loyalty.api";
import { useTheme } from "@/context/ThemeContext";

interface LoyaltyRedemptionInputProps {
  customerId: string | undefined;
  balance: number; // Current customer balance in points
  invoiceSubTotal: number; // In paisa
  shopId?: string;
  onRedemptionChange?: (points: number) => void;
  onDiscountChange?: (discountPaise: number) => void;
}

export function LoyaltyRedemptionInput({
  customerId,
  balance,
  invoiceSubTotal,
  shopId,
  onRedemptionChange,
  onDiscountChange,
}: LoyaltyRedemptionInputProps) {
  const { theme } = useTheme();
  const [usePoints, setUsePoints] = useState(false);
  const [points, setPoints] = useState<number>(0);
  const [maxAllowed, setMaxAllowed] = useState<number>(0);
  const [discountPaise, setDiscountPaise] = useState<number>(0);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<{
    maxRedeemPercent?: number;
  } | null>(null);

  // Load loyalty config on mount
  useEffect(() => {
    const loadConfig = async () => {
      const loyaltyConfig = await getLoyaltyConfig(shopId);
      setConfig(loyaltyConfig);
    };
    loadConfig();
  }, [shopId]);

  // Validate redemption when points or invoice subtotal changes
  const validateRedemption = useCallback(async () => {
    if (!customerId || points <= 0 || invoiceSubTotal <= 0) {
      setError(null);
      setMaxAllowed(0);
      setDiscountPaise(0);
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const response = await validateLoyaltyRedemption({
        customerId,
        points,
        invoiceSubTotal,
        shopId,
      });

      if (response.success && response.discountPaise !== undefined) {
        setDiscountPaise(response.discountPaise);
        setMaxAllowed(response.points || balance);
        setError(null);

        // Notify parent components
        onRedemptionChange?.(points);
        onDiscountChange?.(response.discountPaise);
      } else {
        setError(response.error || "Validation failed");
        setDiscountPaise(0);
      }
    } catch (err) {
      console.error("Error validating redemption:", err);
      setError("Failed to validate redemption");
      setDiscountPaise(0);
    } finally {
      setIsValidating(false);
    }
  }, [
    customerId,
    points,
    invoiceSubTotal,
    balance,
    onRedemptionChange,
    onDiscountChange,
  ]);

  // Debounce validation
  useEffect(() => {
    if (!usePoints) {
      setPoints(0);
      setDiscountPaise(0);
      return;
    }

    const timer = setTimeout(() => {
      validateRedemption();
    }, 500);

    return () => clearTimeout(timer);
  }, [usePoints, points, invoiceSubTotal, customerId, validateRedemption]);

  // If no customer or loyalty disabled, don't show
  if (!customerId) {
    return null;
  }

  const discountRupees = discountPaise / 100;
  const maxPercent = config?.maxRedeemPercent || 50;

  return (
    <div
      className={`p-4 rounded-lg border ${
        theme === "dark"
          ? "bg-gray-800 border-gray-700"
          : "bg-blue-50 border-blue-200"
      }`}
    >
      <div className="space-y-4">
        {/* Checkbox: Use Loyalty Points? */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="use-loyalty"
            checked={usePoints}
            onChange={(e) => setUsePoints(e.target.checked)}
            className="w-4 h-4 rounded cursor-pointer"
          />
          <label
            htmlFor="use-loyalty"
            className={`text-sm font-medium cursor-pointer ${
              theme === "dark" ? "text-gray-200" : "text-gray-700"
            }`}
          >
            💳 Use Loyalty Points for Discount?
          </label>
        </div>

        {/* Redemption Input - Only show if checkbox is checked */}
        {usePoints && (
          <div className="space-y-3 pl-7">
            {/* Points Input */}
            <div>
              <label
                htmlFor="points-input"
                className={`block text-sm font-medium mb-1 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Points to Redeem
              </label>
              <div className="flex gap-2">
                <input
                  id="points-input"
                  type="number"
                  min="0"
                  max={balance}
                  value={points}
                  onChange={(e) =>
                    setPoints(Math.max(0, parseInt(e.target.value) || 0))
                  }
                  disabled={isValidating}
                  className={`flex-1 px-3 py-2 rounded border text-sm ${
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  } ${error ? "border-red-500" : ""}`}
                  placeholder="Enter points to redeem"
                />
                {/* Max Button */}
                <button
                  onClick={() =>
                    setPoints(Math.min(balance, maxAllowed || balance))
                  }
                  disabled={isValidating || balance === 0}
                  className={`px-3 py-2 text-sm font-medium rounded ${
                    theme === "dark"
                      ? "bg-gray-600 hover:bg-gray-500 text-white disabled:bg-gray-700"
                      : "bg-gray-200 hover:bg-gray-300 text-gray-900 disabled:bg-gray-100"
                  }`}
                >
                  Max
                </button>
              </div>

              {/* Help Text: Balance and Max Allowed */}
              <div className="mt-1 space-y-1 text-xs">
                <p
                  className={
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  }
                >
                  Available Balance: <strong>{balance} points</strong>
                </p>
                {maxAllowed > 0 && maxAllowed < balance && (
                  <p
                    className={
                      theme === "dark" ? "text-gray-400" : "text-gray-600"
                    }
                  >
                    Max Allowed (50% of invoice):{" "}
                    <strong>{maxAllowed} points</strong>
                  </p>
                )}
              </div>
            </div>

            {/* Discount Display */}
            {points > 0 && discountPaise > 0 && !isValidating && !error && (
              <div
                className={`p-3 rounded ${
                  theme === "dark"
                    ? "bg-green-900 text-green-200"
                    : "bg-green-50 text-green-800"
                }`}
              >
                <p className="text-sm font-medium">
                  ✅ Discount:{" "}
                  <strong className="text-lg">
                    -₹{discountRupees.toFixed(2)}
                  </strong>
                </p>
                <p className="text-xs mt-1 opacity-90">
                  This will be added as a -₹{discountRupees.toFixed(2)} line
                  item before GST calculation
                </p>
              </div>
            )}

            {/* Validation Loading State */}
            {isValidating && (
              <div
                className={`p-3 rounded text-sm ${
                  theme === "dark"
                    ? "bg-blue-900 text-blue-200"
                    : "bg-blue-50 text-blue-800"
                }`}
              >
                ⏳ Validating redemption...
              </div>
            )}

            {/* Error State */}
            {error && (
              <div
                className={`p-3 rounded text-sm ${
                  theme === "dark"
                    ? "bg-red-900 text-red-200"
                    : "bg-red-50 text-red-800"
                }`}
              >
                ❌ {error}
              </div>
            )}

            {/* Info: Max Redemption % */}
            <p
              className={`text-xs ${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}
            >
              💡 Max discount: {maxPercent}% of invoice amount
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
