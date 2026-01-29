"use client";

import { useState, useEffect } from "react";
import {
  getShopSettings,
  updateShopSettings,
  type Shop,
  type UpdateShopSettingsDto,
} from "@/services/shops.api";
import { ShopPrintSettings } from "@/components/shops/ShopPrintSettings";

interface ShopSettingsModalProps {
  shop: Shop;
  onClose: () => void;
}

export function ShopSettingsModal({ shop, onClose }: ShopSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"GENERAL" | "PRINT">("GENERAL");
  const [isLoading, setIsLoading] = useState(true);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: shop?.name || "",
    phone: shop?.phone || "",
    addressLine1: shop?.addressLine1 || "",
    addressLine2: shop?.addressLine2 || "",
    city: shop?.city || "",
    state: shop?.state || "",
    pincode: shop?.pincode || "",
    website: shop?.website || "",
    gstEnabled: shop?.gstEnabled || false,
    gstNumber: shop?.gstNumber || "",
    invoiceFooter: shop?.invoiceFooter || "",
    logoUrl: shop?.logoUrl || "",
    terms: shop?.terms?.join("\n") || "",
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const settings = await getShopSettings(shop.id);
        setFormData({
          name: settings.name || "",
          phone: settings.phone || "",
          addressLine1: settings.addressLine1 || "",
          addressLine2: settings.addressLine2 || "",
          city: settings.city || "",
          state: settings.state || "",
          pincode: settings.pincode || "",
          website: settings.website || "",
          gstEnabled: settings.gstEnabled || false,
          gstNumber: settings.gstNumber || "",
          invoiceFooter: settings.invoiceFooter || "",
          logoUrl: settings.logoUrl || "",
          terms: settings.terms?.join("\n") || "",
        });
      } catch (err: any) {
        setError(err.message || "Failed to load settings");
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [shop.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload: UpdateShopSettingsDto = {
        name: formData.name,
        phone: formData.phone,
        addressLine1: formData.addressLine1,
        addressLine2: formData.addressLine2 || undefined,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        website: formData.website || undefined,
        gstEnabled: formData.gstEnabled,
        gstNumber: formData.gstNumber || undefined,
        invoiceFooter: formData.invoiceFooter || undefined,
        logoUrl: formData.logoUrl || undefined,
        terms: formData.terms
          ? formData.terms.split("\n").filter((t) => t.trim())
          : undefined,
      };

      await updateShopSettings(shop.id, payload);

      // Notify other components about shop update
      window.dispatchEvent(new CustomEvent("shopUpdated"));

      // For cross-tab communication
      localStorage.setItem("shop_updated", Date.now().toString());
      localStorage.removeItem("shop_updated");

      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save settings");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  if (isLoading) {
      // ... (keep loading state)
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-stone-900 border border-white/10 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-white">
            Shop Settings: {shop.name}
          </h2>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 px-6">
            <button
                onClick={() => setActiveTab("GENERAL")}
                className={`py-3 px-4 text-sm font-medium border-b-2 transition ${
                    activeTab === "GENERAL" 
                    ? "border-teal-500 text-teal-400" 
                    : "border-transparent text-gray-400 hover:text-white"
                }`}
            >
                General
            </button>
            <button
                onClick={() => setActiveTab("PRINT")}
                className={`py-3 px-4 text-sm font-medium border-b-2 transition ${
                    activeTab === "PRINT" 
                    ? "border-teal-500 text-teal-400" 
                    : "border-transparent text-gray-400 hover:text-white"
                }`}
            >
                Print Configuration
            </button>
        </div>

        {/* Content */}
        {activeTab === "PRINT" ? (
            <div className="p-6">
                <ShopPrintSettings shop={shop} onUpdate={() => window.dispatchEvent(new CustomEvent("shopUpdated"))} />
            </div>
        ) : (
        <form onSubmit={handleSubmit} className="p-6 space-y-6">

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-stone-400 mb-1">
                  Shop Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm text-stone-400 mb-1">
                  Phone <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Address</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-stone-400 mb-1">
                  Address Line 1 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="addressLine1"
                  value={formData.addressLine1}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm text-stone-400 mb-1">
                  Address Line 2
                </label>
                <input
                  type="text"
                  name="addressLine2"
                  value={formData.addressLine2}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-teal-500"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm text-stone-400 mb-1">
                    City <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-stone-400 mb-1">
                    State <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-stone-400 mb-1">
                    Pincode <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm text-stone-400 mb-1">Website</label>
            <input
              type="url"
              name="website"
              value={formData.website}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* GST Settings */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">GST</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="gstEnabled"
                  name="gstEnabled"
                  checked={formData.gstEnabled}
                  onChange={handleChange}
                  className="w-4 h-4 rounded bg-white/10 border border-white/20 cursor-pointer"
                />
                <label
                  htmlFor="gstEnabled"
                  className="text-white cursor-pointer"
                >
                  Enable GST
                </label>
              </div>
              {formData.gstEnabled && (
                <div>
                  <label className="block text-sm text-stone-400 mb-1">
                    GST Number (GSTIN) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="gstNumber"
                    value={formData.gstNumber}
                    onChange={handleChange}
                    placeholder="e.g., 18AABCT1234H1Z0"
                    required={formData.gstEnabled}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-teal-500"
                  />
                  <p className="text-xs text-stone-500 mt-1">
                    Must be valid 15-character GSTIN
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Invoice & Branding */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">
              Invoice & Branding
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-stone-400 mb-1">
                  Logo URL
                </label>
                <input
                  type="url"
                  name="logoUrl"
                  value={formData.logoUrl}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm text-stone-400 mb-1">
                  Invoice Footer
                </label>
                <textarea
                  name="invoiceFooter"
                  value={formData.invoiceFooter}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Text to appear at bottom of invoices"
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm text-stone-400 mb-1">
                  Terms & Conditions (one per line)
                </label>
                <textarea
                  name="terms"
                  value={formData.terms}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Line 1&#10;Line 2&#10;Line 3"
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-teal-500/50 text-white rounded-lg transition"
            >
              {isSubmitting ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
