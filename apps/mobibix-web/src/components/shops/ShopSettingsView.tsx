"use client";

import { useState, useEffect } from "react";
import {
  getShopSettings,
  updateShopSettings,
  updateNicCredentials,
  type Shop,
  type UpdateShopSettingsDto,
  RepairInvoiceNumberingMode,
} from "@/services/shops.api";
import { ShopDocumentSettings } from "@/components/shops/ShopDocumentSettings";
import { ShopPrintSettings } from "@/components/shops/ShopPrintSettings";
import { StaffList } from "@/components/staff/StaffList";
import { useRouter } from "next/navigation";

function NicCredentialsTab({
  shopId,
  initialAutoGenerate,
  initialNicUsername,
  onAutoGenerateChange,
}: {
  shopId: string;
  initialAutoGenerate: boolean;
  initialNicUsername?: string;
  onAutoGenerateChange: (val: boolean) => void;
}) {
  const [nicUsername, setNicUsername] = useState(initialNicUsername || "");
  const [nicPassword, setNicPassword] = useState("");
  const [autoGenerate, setAutoGenerate] = useState(initialAutoGenerate);
  const [saving, setSaving] = useState(false);
  const [savingToggle, setSavingToggle] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleToggle = async (val: boolean) => {
    setAutoGenerate(val);
    setSavingToggle(true);
    try {
      await updateShopSettings(shopId, { autoGenerateEwayBill: val });
      onAutoGenerateChange(val);
    } catch {
      setAutoGenerate(!val); // revert on failure
    } finally {
      setSavingToggle(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nicUsername.trim() || !nicPassword.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      await updateNicCredentials(shopId, nicUsername.trim(), nicPassword.trim());
      setMessage({ type: "success", text: "NIC credentials saved successfully." });
      setNicPassword(""); // clear password field after save
    } catch (err: unknown) {
      setMessage({ type: "error", text: (err as any)?.message || "Failed to save credentials" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Auto-generate toggle */}
      <div className="bg-white dark:bg-stone-900/50 border border-gray-200 dark:border-white/5 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Auto-Generate E-Way Bill</h3>
            <p className="text-sm text-gray-500 dark:text-stone-400 mt-0.5">
              When enabled, the E-Way Bill form will be shown automatically on qualifying B2B invoices (above ₹50,000).
              When disabled, you can generate it manually from the invoice detail page.
            </p>
          </div>
          <button
            type="button"
            disabled={savingToggle}
            onClick={() => handleToggle(!autoGenerate)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
              autoGenerate ? "bg-teal-500" : "bg-gray-300 dark:bg-white/10"
            }`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${autoGenerate ? "translate-x-5" : "translate-x-0"}`} />
          </button>
        </div>
      </div>

      {/* NIC Credentials */}
    <div className="bg-white dark:bg-stone-900/50 border border-gray-200 dark:border-white/5 rounded-xl p-8 shadow-sm">
      <form onSubmit={handleSave} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              NIC E-Way Bill Credentials
            </h3>
            <p className="text-sm text-gray-500 dark:text-stone-400">
              Your credentials for the GST E-Way Bill portal. Required to generate e-way bills for
              invoices above ₹50,000.
            </p>
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg">
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mb-1">Where to get these?</p>
              <p className="text-xs text-amber-600 dark:text-amber-500">
                Register at <span className="font-mono">ewaybillgst.gov.in</span> using your GSTIN.
                Username = your GSTIN. Password = the one you set on the NIC portal.
              </p>
            </div>
          </div>
          <div className="md:col-span-2 space-y-4">
            {message && (
              <div className={`px-4 py-3 rounded-lg text-sm ${
                message.type === "success"
                  ? "bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400"
                  : "bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400"
              }`}>
                {message.text}
              </div>
            )}
            <div>
              <label className="block text-sm text-gray-600 dark:text-stone-400 mb-1">
                NIC Username <span className="text-xs text-gray-400">(your GSTIN)</span>
              </label>
              <input
                type="text"
                value={nicUsername}
                onChange={(e) => setNicUsername(e.target.value.toUpperCase())}
                placeholder="e.g. 29ABCDE1234F1Z5"
                maxLength={15}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white font-mono focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-stone-400 mb-1">
                NIC Password <span className="text-xs text-gray-400">(stored encrypted)</span>
              </label>
              <input
                type="password"
                value={nicPassword}
                onChange={(e) => setNicPassword(e.target.value)}
                placeholder="Enter your NIC portal password"
                className="w-full px-4 py-2 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
              />
            </div>
            <p className="text-xs text-gray-400 dark:text-stone-500">
              Password is encrypted with AES-256 before storage. It is never shown again after saving.
            </p>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={saving || !nicUsername.trim() || !nicPassword.trim()}
            className="px-8 py-2 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white font-medium rounded-lg transition shadow-lg shadow-teal-500/20"
          >
            {saving ? "Saving..." : "Save Credentials"}
          </button>
        </div>
      </form>
    </div>
    </div>
  );
}

interface ShopSettingsViewProps {
  shopId: string;
}

export function ShopSettingsView({ shopId }: ShopSettingsViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "GENERAL" | "PRINT" | "BANK" | "DOCUMENT" | "STAFF" | "EWAYBILL"
  >("GENERAL");
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
    currency: "INR",

    // Bank Details
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    branchName: "",

    // Repair Config
    repairInvoiceNumberingMode: RepairInvoiceNumberingMode.SHARED,
    repairGstDefault: false,
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
          currency: settings.currency || "INR",

          // Bank Details
          bankName: settings.bankName || "",
          accountNumber: settings.accountNumber || "",
          ifscCode: settings.ifscCode || "",
          branchName: settings.branchName || "",

          // Repair Config
          repairInvoiceNumberingMode:
            settings.repairInvoiceNumberingMode ||
            RepairInvoiceNumberingMode.SHARED,
          repairGstDefault: settings.repairGstDefault || false,
        });
      } catch (err: unknown) {
        setError((err as any)?.message || "Failed to load settings");
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

        // Bank Details
        bankName: formData.bankName || undefined,
        accountNumber: formData.accountNumber || undefined,
        ifscCode: formData.ifscCode || undefined,
        branchName: formData.branchName || undefined,

        repairInvoiceNumberingMode: formData.repairInvoiceNumberingMode,
        repairGstDefault: formData.repairGstDefault,
      };

      await updateShopSettings(shopId, payload);

      // Notify other components about shop update
      window.dispatchEvent(new CustomEvent("shopUpdated"));

      alert("Settings updated successfully!");
    } catch (err: unknown) {
      setError((err as any)?.message || "Failed to save settings");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-stone-400">Loading settings...</div>
    );
  }

  if (error || !shop) {
    return (
      <div className="p-8 text-center text-red-400">
        {error || "Shop not found"}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="p-2 bg-gray-100 dark:bg-white/5 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition"
        >
          ⬅️
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Shop Configuration
          </h1>
          <p className="text-gray-500 dark:text-stone-400 text-sm">
            Manage settings for{" "}
            <span className="text-gray-900 dark:text-white font-medium">
              {shop.name}
            </span>
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-white/10 mb-8 overflow-x-auto">
        <button
          onClick={() => setActiveTab("GENERAL")}
          className={`py-3 px-6 text-sm font-medium border-b-2 transition whitespace-nowrap ${
            activeTab === "GENERAL"
              ? "border-teal-500 text-teal-600 dark:text-teal-400"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          General Information
        </button>
        <button
          onClick={() => setActiveTab("BANK")}
          className={`py-3 px-6 text-sm font-medium border-b-2 transition whitespace-nowrap ${
            activeTab === "BANK"
              ? "border-teal-500 text-teal-600 dark:text-teal-400"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          Bank Details
        </button>
        <button
          onClick={() => setActiveTab("PRINT")}
          className={`py-3 px-6 text-sm font-medium border-b-2 transition whitespace-nowrap ${
            activeTab === "PRINT"
              ? "border-teal-500 text-teal-600 dark:text-teal-400"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          Print Configuration
        </button>
        <button
          onClick={() => setActiveTab("DOCUMENT")}
          className={`py-3 px-6 text-sm font-medium border-b-2 transition whitespace-nowrap ${
            activeTab === "DOCUMENT"
              ? "border-teal-500 text-teal-600 dark:text-teal-400"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          Document Numbering
        </button>
        <button
          onClick={() => setActiveTab("STAFF")}
          className={`py-3 px-6 text-sm font-medium border-b-2 transition whitespace-nowrap ${
            activeTab === "STAFF"
              ? "border-teal-500 text-teal-600 dark:text-teal-400"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          Staff Management
        </button>
        <button
          onClick={() => setActiveTab("EWAYBILL")}
          className={`py-3 px-6 text-sm font-medium border-b-2 transition whitespace-nowrap ${
            activeTab === "EWAYBILL"
              ? "border-teal-500 text-teal-600 dark:text-teal-400"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          E-Way Bill
        </button>
      </div>

      {/* Content Area */}
      {activeTab === "EWAYBILL" ? (
        <NicCredentialsTab
          shopId={shopId}
          initialAutoGenerate={shop?.autoGenerateEwayBill ?? false}
          initialNicUsername={shop?.nicUsername ?? ""}
          onAutoGenerateChange={(val) => setShop((s) => s ? { ...s, autoGenerateEwayBill: val } : s)}
        />
      ) : activeTab === "PRINT" ? (
        <div className="animate-fade-in">
          <ShopPrintSettings
            shop={shop}
            onUpdate={async () => {
              // Re-fetch the shop settings so the prop stays fresh after save
              try {
                const fresh = await getShopSettings(shopId);
                setShop(fresh);
              } catch (_) { /* silent refresh failure is ok */ }
              window.dispatchEvent(new CustomEvent("shopUpdated"));
            }}
          />
        </div>
      ) : activeTab === "DOCUMENT" ? (
        <ShopDocumentSettings shopId={shopId} />
      ) : activeTab === "STAFF" ? (
        <StaffList />
      ) : activeTab === "BANK" ? (
        <div className="bg-white dark:bg-stone-900/50 border border-gray-200 dark:border-white/5 rounded-xl p-8 animate-fade-in shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Section: Bank Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Banking Information
                </h3>
                <p className="text-sm text-gray-500 dark:text-stone-400">
                  Enter your bank details to be displayed on invoices.
                </p>
              </div>
              <div className="md:col-span-2 space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-stone-400 mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleChange}
                    placeholder="e.g. HDFC Bank"
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-stone-400 mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    name="accountNumber"
                    value={formData.accountNumber}
                    onChange={handleChange}
                    placeholder="e.g. 1234567890"
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-stone-400 mb-1">
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      name="ifscCode"
                      value={formData.ifscCode}
                      onChange={handleChange}
                      placeholder="e.g. HDFC0001234"
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-stone-400 mb-1">
                      Branch Name
                    </label>
                    <input
                      type="text"
                      name="branchName"
                      value={formData.branchName}
                      onChange={handleChange}
                      placeholder="e.g. Koramangala"
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-stone-400 mb-1">
                      UPI ID <span className="text-xs text-teal-500">(for invoice QR payments)</span>
                    </label>
                    <input
                      type="text"
                      name="upiId"
                      value={(formData as any).upiId || ""}
                      onChange={handleChange}
                      placeholder="e.g. shopname@ybl"
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 flex justify-end gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-white rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-2 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white font-medium rounded-lg transition shadow-lg shadow-teal-500/20"
              >
                {isSubmitting ? "Saving Changes..." : "Save Bank Details"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white dark:bg-stone-900/50 border border-gray-200 dark:border-white/5 rounded-xl p-8 animate-fade-in shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Section: Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Basic Details
                </h3>
                <p className="text-sm text-gray-500 dark:text-stone-400">
                  Essential contact information for your business.
                </p>
              </div>
              <div className="md:col-span-2 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-stone-400 mb-1">
                      Shop Name{" "}
                      <span className="text-red-500 dark:text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-stone-400 mb-1">
                      Phone{" "}
                      <span className="text-red-500 dark:text-red-400">*</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-stone-400 mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-white/10 pt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Location
                </h3>
                <p className="text-sm text-gray-500 dark:text-stone-400">
                  Where is your shop located? This appears on invoices.
                </p>
              </div>
              <div className="md:col-span-2 space-y-4">
                <div className="space-y-3">
                  <input
                    type="text"
                    name="addressLine1"
                    value={formData.addressLine1}
                    onChange={handleChange}
                    required
                    placeholder="Address Line 1"
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                  <input
                    type="text"
                    name="addressLine2"
                    value={formData.addressLine2}
                    onChange={handleChange}
                    placeholder="Address Line 2 (Optional)"
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      required
                      placeholder="City"
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                    />
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      required
                      placeholder="State"
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                    />
                    <input
                      type="text"
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleChange}
                      required
                      placeholder="Pincode"
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-white/10 pt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Tax & Branding
                </h3>
                <p className="text-sm text-gray-500 dark:text-stone-400">
                  Configure GST details and invoice customization.
                </p>
              </div>
              <div className="md:col-span-2 space-y-6">
                {/* GST */}
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="gstEnabled"
                      checked={formData.gstEnabled}
                      onChange={handleChange}
                      className="w-5 h-5 rounded bg-gray-100 dark:bg-white/10 border border-gray-300 dark:border-white/20"
                    />
                    <span className="text-gray-900 dark:text-white font-medium">
                      Enable GST Billing
                    </span>
                  </label>
                  {formData.gstEnabled && (
                    <input
                      type="text"
                      name="gstNumber"
                      value={formData.gstNumber}
                      onChange={handleChange}
                      placeholder="Enter GSTIN Number"
                      required
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                    />
                  )}
                </div>

                {/* Branding */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-stone-400 mb-1">
                      Logo URL
                    </label>
                    <input
                      type="url"
                      name="logoUrl"
                      value={formData.logoUrl}
                      onChange={handleChange}
                      placeholder="https://..."
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-stone-400 mb-1">
                      Invoice Footer Text
                    </label>
                    <input
                      type="text"
                      name="invoiceFooter"
                      value={formData.invoiceFooter}
                      onChange={handleChange}
                      placeholder="Thank you for your business!"
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 dark:text-stone-400 mb-1">
                      Currency
                    </label>
                    <select
                      name="currency"
                      value={formData.currency}
                      onChange={handleChange}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none appearance-none"
                    >
                      <option
                        value="INR"
                        className="bg-white dark:bg-stone-900"
                      >
                        🇮🇳 INR (₹)
                      </option>
                      <option
                        value="USD"
                        className="bg-white dark:bg-stone-900"
                      >
                        🇺🇸 USD ($)
                      </option>
                      <option
                        value="EUR"
                        className="bg-white dark:bg-stone-900"
                      >
                        🇪🇺 EUR (€)
                      </option>
                      <option
                        value="GBP"
                        className="bg-white dark:bg-stone-900"
                      >
                        🇬🇧 GBP (£)
                      </option>
                      <option
                        value="AED"
                        className="bg-white dark:bg-stone-900"
                      >
                        🇦🇪 AED (د.إ)
                      </option>
                    </select>
                    <p className="text-xs text-gray-500 dark:text-stone-500 mt-1">
                      Currency symbol used for invoices and receipts.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-stone-400 mb-1">
                      Terms & Conditions
                    </label>
                    <textarea
                      name="terms"
                      value={formData.terms}
                      onChange={handleChange}
                      rows={4}
                      placeholder="Terms..."
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 flex justify-end gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-white rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-2 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white font-medium rounded-lg transition shadow-lg shadow-teal-500/20"
              >
                {isSubmitting ? "Saving Changes..." : "Save Configuration"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
