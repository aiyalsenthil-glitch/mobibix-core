"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import { getLoyaltyConfig, updateLoyaltyConfig, LoyaltyConfig } from "@/services/loyalty.api";
import { Loader2, Gift, Save, AlertCircle } from "lucide-react";

export default function LoyaltySettingsPage() {
  const { theme } = useTheme();
  const [config, setConfig] = useState<LoyaltyConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getLoyaltyConfig();
      if (data) {
        setConfig(data);
      } else {
        setError("Failed to load loyalty configuration.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      
      const updated = await updateLoyaltyConfig(config);
      if (updated) {
        setConfig(updated);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError("Failed to save changes.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save configuration.");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = <K extends keyof LoyaltyConfig>(field: K, value: LoyaltyConfig[K]) => {
    setConfig(prev => prev ? { ...prev, [field]: value } : null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="text-red-500">Failed to load configuration.</div>
      </div>
    );
  }

  const isDark = theme === "dark";

  return (
    <div className={`max-w-4xl mx-auto py-8 px-4 ${isDark ? "text-slate-50" : "text-gray-900"}`}>
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl text-purple-600 dark:text-purple-400">
          <Gift size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Loyalty Configuration</h1>
          <p className="text-gray-500 dark:text-slate-400">Configure your customer rewards setup</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-center gap-2 mb-6">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg mb-6">
          Settings saved successfully!
        </div>
      )}

      <div className={`rounded-2xl border p-6 md:p-8 space-y-8 ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200 shadow-sm"}`}>
        
        {/* Enable Toggle */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-6">
          <div>
            <h3 className="text-lg font-semibold">Enable Loyalty Program</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400">Activate point earnings for customers</p>
          </div>
          <button
            onClick={() => handleChange("isEnabled", !config.isEnabled)}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none ${
              config.isEnabled ? "bg-teal-500" : isDark ? "bg-slate-700" : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                config.isEnabled ? "translate-x-8" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <div className={`grid md:grid-cols-2 gap-8 ${!config.isEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
          
          {/* Earning Rules */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold border-b border-gray-100 dark:border-slate-800 pb-2">Earning Rules</h3>
            
            <div>
              <label className="block text-sm font-medium mb-2">Spend Amount for 1 Point (₹)</label>
              <input
                type="number"
                min="1"
                value={config.earnAmountPerPoint / 100}
                onChange={(e) => handleChange("earnAmountPerPoint", Math.max(1, Number(e.target.value)) * 100)}
                className={`w-full p-3 rounded-lg border focus:ring-2 focus:ring-teal-500 outline-none ${
                  isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-gray-50 border-gray-200"
                }`}
              />
              <p className="text-xs text-gray-500 mt-1">Example: ₹100 spent = 1 point earned</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Points Awarded per Unit</label>
              <input
                type="number"
                min="1"
                value={config.pointsPerEarnUnit}
                onChange={(e) => handleChange("pointsPerEarnUnit", Math.max(1, Number(e.target.value)))}
                className={`w-full p-3 rounded-lg border focus:ring-2 focus:ring-teal-500 outline-none ${
                  isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-gray-50 border-gray-200"
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Minimum Invoice Value (₹)</label>
              <input
                type="number"
                min="0"
                value={config.minInvoiceForEarn ? config.minInvoiceForEarn / 100 : 0}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  handleChange("minInvoiceForEarn", val > 0 ? val * 100 : null);
                }}
                className={`w-full p-3 rounded-lg border focus:ring-2 focus:ring-teal-500 outline-none ${
                  isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-gray-50 border-gray-200"
                }`}
              />
            </div>
          </div>

          {/* Redemption Rules */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold border-b border-gray-100 dark:border-slate-800 pb-2">Redemption Rules</h3>
            
            <div>
              <label className="block text-sm font-medium mb-2">Point Value (₹)</label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={config.pointValueInRupees}
                onChange={(e) => handleChange("pointValueInRupees", Math.max(0.1, Number(e.target.value)))}
                className={`w-full p-3 rounded-lg border focus:ring-2 focus:ring-teal-500 outline-none ${
                  isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-gray-50 border-gray-200"
                }`}
              />
              <p className="text-xs text-gray-500 mt-1">Example: 1 point = ₹1 offset</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Max Redemption Percentage</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={config.maxRedeemPercent}
                  onChange={(e) => handleChange("maxRedeemPercent", Number(e.target.value))}
                  className="flex-1"
                />
                <span className="w-12 text-center font-mono font-bold bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-lg py-1">
                  {config.maxRedeemPercent}%
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Percentage of invoice subtotal that points can cover</p>
            </div>
            
            <div className="pt-4 flex items-center justify-between border-t border-gray-100 dark:border-slate-800">
              <span className="text-sm font-medium">Allow Manual Points Adjustment</span>
              <button
                onClick={() => handleChange("allowManualAdjustment", !config.allowManualAdjustment)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  config.allowManualAdjustment ? "bg-teal-500" : isDark ? "bg-slate-700" : "bg-gray-200"
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    config.allowManualAdjustment ? "translate-x-6" : "translate-x-1"
                  }`} 
                />
              </button>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-xl transition-all shadow-md disabled:opacity-70"
          >
            {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            {saving ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </div>
    </div>
  );
}
