"use client";

import { useState, useEffect } from "react";
import { getShopSettings } from "@/services/shops.api";
import {
  getLoyaltyConfig,
  updateLoyaltyConfig,
  type LoyaltyConfig,
} from "@/services/loyalty.api";

interface ShopLoyaltySettingsProps {
  shopId: string;
  onUpdate?: () => void;
}

export function ShopLoyaltySettings({
  shopId,
  onUpdate,
}: ShopLoyaltySettingsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [shopName, setShopName] = useState<string>("");

  const [config, setConfig] = useState<Partial<LoyaltyConfig>>({
    isEnabled: true,
    earnAmountPerPoint: 100,
    pointValueInRupees: 1,
    maxRedeemPercent: 100,
    allowOnRepairs: true,
    allowOnAccessories: true,
    allowOnServices: true,
    expiryDays: 365,
    allowManualAdjustment: true,
  });

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [shopId]);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get shop name
      const shop = await getShopSettings(shopId);
      setShopName(shop.name || "Shop");

      // Get loyalty config
      const loyaltyConfig = await getLoyaltyConfig();
      if (loyaltyConfig) {
        // Convert earnAmountPerPoint from paise to rupees for display
        setConfig({
          ...loyaltyConfig,
          earnAmountPerPoint: (loyaltyConfig.earnAmountPerPoint || 10000) / 100, // Convert from paise
          minInvoiceForEarn: loyaltyConfig.minInvoiceForEarn
            ? (loyaltyConfig.minInvoiceForEarn as number) / 100
            : null, // Convert from paise if set
        });
      }
    } catch (err: any) {
      setError(err.message || "Failed to load loyalty settings");
      console.error("Error loading loyalty settings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof LoyaltyConfig, value: any) => {
    setConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      // Convert earnAmountPerPoint from rupees to paise for backend
      const configToSave = {
        ...config,
        earnAmountPerPoint: (config.earnAmountPerPoint || 100) * 100, // Convert to paise
        minInvoiceForEarn: config.minInvoiceForEarn
          ? (config.minInvoiceForEarn as number) * 100
          : null, // Convert to paise if set
      };

      await updateLoyaltyConfig(configToSave);

      setSuccess("Loyalty settings saved successfully!");
      setTimeout(() => setSuccess(null), 3000);

      if (onUpdate) {
        onUpdate();
      }
    } catch (err: any) {
      setError(err.message || "Failed to save loyalty settings");
      console.error("Error saving loyalty settings:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500 dark:text-stone-400">
          Loading loyalty settings...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
          💳 Loyalty Points
        </h3>
        <p className="text-gray-500 dark:text-stone-400 text-sm">
          Configure how customers earn and redeem loyalty points
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-lg p-4">
          <p className="text-green-600 dark:text-green-400 text-sm">
            {success}
          </p>
        </div>
      )}

      {/* Enable/Disable */}
      <div className="bg-white dark:bg-white/5 rounded-xl p-5 border border-gray-200 dark:border-white/10 shadow-sm">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <span className="block text-gray-900 dark:text-white font-medium">
              Enable Loyalty
            </span>
            <span className="block text-gray-500 dark:text-stone-400 text-sm mt-1">
              Allow customers to earn and redeem points
            </span>
          </div>
          <input
            type="checkbox"
            checked={config.isEnabled}
            onChange={(e) => handleChange("isEnabled", e.target.checked)}
            className="w-5 h-5 cursor-pointer rounded border-gray-300 dark:border-white/10"
          />
        </label>
      </div>

      {config.isEnabled && (
        <>
          {/* Earning Configuration */}
          <div className="bg-white dark:bg-white/5 rounded-xl p-5 border border-gray-200 dark:border-white/10 space-y-4 shadow-sm">
            <h4 className="text-gray-900 dark:text-white font-semibold flex items-center gap-2">
              🎯 Earning Configuration
            </h4>

            <div>
              <label className="block text-gray-600 dark:text-stone-300 font-medium text-sm mb-2">
                Earn Points Per Rupee (₹)
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                step="1"
                value={config.earnAmountPerPoint}
                onChange={(e) =>
                  handleChange("earnAmountPerPoint", parseInt(e.target.value))
                }
                className="w-full px-4 py-2 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
              />
              <p className="text-gray-500 dark:text-stone-500 text-xs mt-2">
                Customers earn 1 point for every ₹{config.earnAmountPerPoint}{" "}
                spent
              </p>
            </div>

            <div>
              <label className="block text-gray-600 dark:text-stone-300 font-medium text-sm mb-2">
                Point Value in Rupees (₹)
              </label>
              <input
                type="number"
                min="0.1"
                max="100"
                step="0.1"
                value={config.pointValueInRupees}
                onChange={(e) =>
                  handleChange("pointValueInRupees", parseFloat(e.target.value))
                }
                className="w-full px-4 py-2 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
              />
              <p className="text-gray-500 dark:text-stone-500 text-xs mt-2">
                Each point is worth ₹{config.pointValueInRupees} in discount
              </p>
            </div>

            {/* Point Calculation Example */}
            <div className="bg-gray-50 dark:bg-black/30 rounded-lg p-3 border border-teal-500/30">
              <p className="text-teal-600 dark:text-teal-300 text-sm font-medium">
                💡 Example: ₹1,000 invoice
              </p>
              <p className="text-gray-500 dark:text-stone-400 text-xs mt-1">
                Points earned:{" "}
                {Math.floor(1000 / (config.earnAmountPerPoint || 100))}
                <br />
                Points value: ₹
                {(
                  (1000 / (config.earnAmountPerPoint || 100)) *
                  (config.pointValueInRupees || 1)
                ).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Redemption Configuration */}
          <div className="bg-white dark:bg-white/5 rounded-xl p-5 border border-gray-200 dark:border-white/10 space-y-4 shadow-sm">
            <h4 className="text-gray-900 dark:text-white font-semibold flex items-center gap-2">
              🛍️ Redemption Configuration
            </h4>

            <div>
              <label className="block text-gray-600 dark:text-stone-300 font-medium text-sm mb-2">
                Max Redemption % of Invoice Subtotal
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={config.maxRedeemPercent}
                onChange={(e) =>
                  handleChange("maxRedeemPercent", parseInt(e.target.value))
                }
                className="w-full px-4 py-2 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
              />
              <p className="text-gray-500 dark:text-stone-500 text-xs mt-2">
                Customers can redeem up to {config.maxRedeemPercent}% of invoice
                value
              </p>
            </div>

            {config.expiryDays && (
              <div>
                <label className="block text-gray-600 dark:text-stone-300 font-medium text-sm mb-2">
                  Point Expiry (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="3650"
                  step="1"
                  value={config.expiryDays}
                  onChange={(e) =>
                    handleChange("expiryDays", parseInt(e.target.value))
                  }
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                />
                <p className="text-gray-500 dark:text-stone-500 text-xs mt-2">
                  Points expire after {config.expiryDays} days of earning
                </p>
              </div>
            )}
          </div>

          {/* Allow On Specific Categories */}
          <div className="bg-white dark:bg-white/5 rounded-xl p-5 border border-gray-200 dark:border-white/10 space-y-3 shadow-sm">
            <h4 className="text-gray-900 dark:text-white font-semibold flex items-center gap-2">
              ✅ Allow Points Earning On
            </h4>

            <label className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 cursor-pointer hover:bg-gray-100 dark:hover:bg-black/50 transition">
              <span className="text-gray-700 dark:text-stone-300 font-medium">
                Repairs
              </span>
              <input
                type="checkbox"
                checked={config.allowOnRepairs}
                onChange={(e) =>
                  handleChange("allowOnRepairs", e.target.checked)
                }
                className="w-5 h-5 cursor-pointer rounded border-gray-300 dark:border-white/10"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 cursor-pointer hover:bg-gray-100 dark:hover:bg-black/50 transition">
              <span className="text-gray-700 dark:text-stone-300 font-medium">
                Accessories
              </span>
              <input
                type="checkbox"
                checked={config.allowOnAccessories}
                onChange={(e) =>
                  handleChange("allowOnAccessories", e.target.checked)
                }
                className="w-5 h-5 cursor-pointer rounded border-gray-300 dark:border-white/10"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 cursor-pointer hover:bg-gray-100 dark:hover:bg-black/50 transition">
              <span className="text-gray-700 dark:text-stone-300 font-medium">
                Services
              </span>
              <input
                type="checkbox"
                checked={config.allowOnServices}
                onChange={(e) =>
                  handleChange("allowOnServices", e.target.checked)
                }
                className="w-5 h-5 cursor-pointer rounded border-gray-300 dark:border-white/10"
              />
            </label>
          </div>

          {/* Admin Adjustments */}
          <div className="bg-white dark:bg-white/5 rounded-xl p-5 border border-gray-200 dark:border-white/10 shadow-sm">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="block text-gray-900 dark:text-white font-medium">
                  Allow Manual Adjustments
                </span>
                <span className="block text-gray-500 dark:text-stone-400 text-sm mt-1">
                  Admins can manually add/remove loyalty points
                </span>
              </div>
              <input
                type="checkbox"
                checked={config.allowManualAdjustment}
                onChange={(e) =>
                  handleChange("allowManualAdjustment", e.target.checked)
                }
                className="w-5 h-5 cursor-pointer rounded border-gray-300 dark:border-white/10"
              />
            </label>
          </div>

          {/* Save Button */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 px-6 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 dark:disabled:bg-stone-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition"
            >
              {isSaving ? "Saving..." : "Save Loyalty Settings"}
            </button>
            <button
              onClick={loadSettings}
              className="px-6 py-3 bg-gray-100 dark:bg-stone-700 hover:bg-gray-200 dark:hover:bg-stone-600 text-gray-700 dark:text-white font-semibold rounded-lg transition"
            >
              Reset
            </button>
          </div>
        </>
      )}

      {!config.isEnabled && (
        <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg p-4">
          <p className="text-blue-600 dark:text-blue-400 text-sm">
            💡 Loyalty program is currently disabled. Enable it above to start
            using loyalty points.
          </p>
        </div>
      )}
    </div>
  );
}
