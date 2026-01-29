"use client";

import { useState, useEffect } from "react";
import {
  getShopSettings,
  updateShopSettings,
  type Shop,
  type UpdateShopSettingsDto,
} from "@/services/shops.api";
import { ShopPrintSettings } from "@/components/shops/ShopPrintSettings";
import { useRouter } from "next/navigation";

interface ShopSettingsViewProps {
  shopId: string;
}

export function ShopSettingsView({ shopId }: ShopSettingsViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"GENERAL" | "PRINT">("GENERAL");
  const [isLoading, setIsLoading] = useState(true);
  
  const [shop, setShop] = useState<Shop | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
    website: "",
    gstEnabled: false,
    gstNumber: "",
    invoiceFooter: "",
    logoUrl: "",
    terms: "",
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const settings = await getShopSettings(shopId);
        setShop(settings);
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
  }, [shopId]);

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

      await updateShopSettings(shopId, payload);

      // Notify other components about shop update
      window.dispatchEvent(new CustomEvent("shopUpdated"));
      
      alert("Settings updated successfully!");
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
    return <div className="p-8 text-center text-stone-400">Loading settings...</div>;
  }

  if (error || !shop) {
    return <div className="p-8 text-center text-red-400">{error || "Shop not found"}</div>;
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4 mb-8">
            <button 
                onClick={() => router.back()}
                className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition"
            >
                ⬅️
            </button>
            <div>
                <h1 className="text-2xl font-bold text-white">Shop Configuration</h1>
                <p className="text-stone-400 text-sm">Manage settings for <span className="text-white font-medium">{shop.name}</span></p>
            </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 mb-8">
            <button
                onClick={() => setActiveTab("GENERAL")}
                className={`py-3 px-6 text-sm font-medium border-b-2 transition ${
                    activeTab === "GENERAL" 
                    ? "border-teal-500 text-teal-400" 
                    : "border-transparent text-gray-400 hover:text-white"
                }`}
            >
                General Information
            </button>
            <button
                onClick={() => setActiveTab("PRINT")}
                className={`py-3 px-6 text-sm font-medium border-b-2 transition ${
                    activeTab === "PRINT" 
                    ? "border-teal-500 text-teal-400" 
                    : "border-transparent text-gray-400 hover:text-white"
                }`}
            >
                Print Configuration
            </button>
        </div>

        {/* Content Area */}
        {activeTab === "PRINT" ? (
            <div className="animate-fade-in">
                <ShopPrintSettings shop={shop} onUpdate={() => window.dispatchEvent(new CustomEvent("shopUpdated"))} />
            </div>
        ) : (
        <div className="bg-stone-900/50 border border-white/5 rounded-xl p-8 animate-fade-in">
             <form onSubmit={handleSubmit} className="space-y-8">
                {error && (
                    <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg">
                    {error}
                    </div>
                )}

                {/* Section: Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-1">
                        <h3 className="text-lg font-semibold text-white mb-2">Basic Details</h3>
                        <p className="text-sm text-stone-400">Essential contact information for your business.</p>
                    </div>
                    <div className="md:col-span-2 space-y-4">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-stone-400 mb-1">Shop Name <span className="text-red-400">*</span></label>
                                <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:border-teal-500" />
                            </div>
                            <div>
                                <label className="block text-sm text-stone-400 mb-1">Phone <span className="text-red-400">*</span></label>
                                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:border-teal-500" />
                            </div>
                         </div>
                         <div>
                            <label className="block text-sm text-stone-400 mb-1">Website</label>
                            <input type="url" name="website" value={formData.website} onChange={handleChange} className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:border-teal-500" />
                         </div>
                    </div>
                </div>

                <div className="border-t border-white/10 pt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-1">
                        <h3 className="text-lg font-semibold text-white mb-2">Location</h3>
                        <p className="text-sm text-stone-400">Where is your shop located? This appears on invoices.</p>
                    </div>
                    <div className="md:col-span-2 space-y-4">
                         <div className="space-y-3">
                            <input type="text" name="addressLine1" value={formData.addressLine1} onChange={handleChange} required placeholder="Address Line 1" className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:border-teal-500" />
                            <input type="text" name="addressLine2" value={formData.addressLine2} onChange={handleChange} placeholder="Address Line 2 (Optional)" className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:border-teal-500" />
                            <div className="grid grid-cols-3 gap-3">
                                <input type="text" name="city" value={formData.city} onChange={handleChange} required placeholder="City" className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:border-teal-500" />
                                <input type="text" name="state" value={formData.state} onChange={handleChange} required placeholder="State" className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:border-teal-500" />
                                <input type="text" name="pincode" value={formData.pincode} onChange={handleChange} required placeholder="Pincode" className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:border-teal-500" />
                            </div>
                         </div>
                    </div>
                </div>

                <div className="border-t border-white/10 pt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-1">
                        <h3 className="text-lg font-semibold text-white mb-2">Tax & Branding</h3>
                        <p className="text-sm text-stone-400">Configure GST details and invoice customization.</p>
                    </div>
                    <div className="md:col-span-2 space-y-6">
                        {/* GST */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" name="gstEnabled" checked={formData.gstEnabled} onChange={handleChange} className="w-5 h-5 rounded bg-white/10 border border-white/20" />
                                <span className="text-white font-medium">Enable GST Billing</span>
                            </label>
                            {formData.gstEnabled && (
                                <input type="text" name="gstNumber" value={formData.gstNumber} onChange={handleChange} placeholder="Enter GSTIN Number" required className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:border-teal-500" />
                            )}
                        </div>

                        {/* Branding */}
                         <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-stone-400 mb-1">Logo URL</label>
                                <input type="url" name="logoUrl" value={formData.logoUrl} onChange={handleChange} placeholder="https://..." className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:border-teal-500" />
                            </div>
                            <div>
                                <label className="block text-sm text-stone-400 mb-1">Invoice Footer Text</label>
                                <input type="text" name="invoiceFooter" value={formData.invoiceFooter} onChange={handleChange} placeholder="Thank you for your business!" className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:border-teal-500" />
                            </div>
                            <div>
                                <label className="block text-sm text-stone-400 mb-1">Terms & Conditions</label>
                                <textarea name="terms" value={formData.terms} onChange={handleChange} rows={4} placeholder="Terms..." className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:border-teal-500 resize-none" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-6 flex justify-end gap-4">
                    <button type="button" onClick={() => router.back()} className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-8 py-2 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white font-medium rounded-lg transition shadow-lg shadow-teal-500/20">
                        {isSubmitting ? "Saving Changes..." : "Save Configuration"}
                    </button>
                </div>
             </form>
        </div>
        )}
    </div>
  );
}
