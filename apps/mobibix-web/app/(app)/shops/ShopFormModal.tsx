"use client";

import { useState } from "react";
import {
  createShop,
  updateShop,
  type Shop,
  type CreateShopDto,
  type UpdateShopDto,
} from "@/services/shops.api";

interface ShopFormModalProps {
  shop: Shop | null;
  onClose: () => void;
}

// Phone validation function - accepts 10 digits (Indian format)
const validatePhone = (phone: string): string | null => {
  const phoneRegex = /^[0-9]{10}$/;
  if (!phone) return "Phone number is required";
  if (!phoneRegex.test(phone.replace(/\D/g, ""))) {
    return "Phone number must be 10 digits";
  }
  return null;
};

export function ShopFormModal({ shop, onClose }: ShopFormModalProps) {
  const INDIAN_STATES = [
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chhattisgarh",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
    "Andaman and Nicobar Islands",
    "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi",
    "Jammu and Kashmir",
    "Ladakh",
    "Lakshadweep",
    "Puducherry",
  ];

  const isEdit = !!shop;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: shop?.name || "",
    phone: shop?.phone || "",
    addressLine1: shop?.addressLine1 || "",
    addressLine2: shop?.addressLine2 || "",
    city: shop?.city || "",
    state: shop?.state || "",
    pincode: shop?.pincode || "",
    invoicePrefix: shop?.invoicePrefix || "",
    gstNumber: shop?.gstNumber || "",
    website: shop?.website || "",
    logoUrl: shop?.logoUrl || "",
    invoiceFooter: shop?.invoiceFooter || "",
    terms: shop?.terms?.join("\n") || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validate phone before submission
    const phoneValidationError = validatePhone(formData.phone);
    if (phoneValidationError) {
      setPhoneError(phoneValidationError);
      setIsSubmitting(false);
      return;
    }

    try {
      if (isEdit) {
        const updatePayload: UpdateShopDto = {
          name: formData.name,
          phone: formData.phone,
          addressLine1: formData.addressLine1,
          addressLine2: formData.addressLine2 || undefined,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          gstNumber: formData.gstNumber || undefined,
          website: formData.website || undefined,
          logoUrl: formData.logoUrl || undefined,
          invoiceFooter: formData.invoiceFooter || undefined,
          terms: formData.terms
            ? formData.terms.split("\n").filter((t) => t.trim())
            : undefined,
        };
        await updateShop(shop.id, updatePayload);


      } else {
        const createPayload: CreateShopDto = {
          name: formData.name,
          phone: formData.phone,
          addressLine1: formData.addressLine1,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          invoicePrefix: formData.invoicePrefix,
          gstNumber: formData.gstNumber || undefined,
          website: formData.website || undefined,
          logoUrl: formData.logoUrl || undefined,
          invoiceFooter: formData.invoiceFooter || undefined,
        };
        await createShop(createPayload);
      }

      // Notify other components about shop update/creation
      window.dispatchEvent(new CustomEvent("shopUpdated"));

      // For cross-tab communication
      localStorage.setItem("shop_updated", Date.now().toString());
      localStorage.removeItem("shop_updated");

      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save shop");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Validate phone on change
    if (name === "phone") {
      const error = validatePhone(value);
      setPhoneError(error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-stone-900 border border-white/10 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-white">
            {isEdit ? "Edit Shop" : "Create Shop"}
          </h2>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* Form */}
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
                  placeholder="10-digit phone number"
                  required
                  className={`w-full px-4 py-2 bg-white/5 border rounded-lg text-white focus:outline-none focus:border-teal-500 ${
                    phoneError ? "border-red-500" : "border-white/10"
                  }`}
                />
                {phoneError && (
                  <p className="text-red-400 text-xs mt-1">{phoneError}</p>
                )}
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
                  <select
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="">Select a state</option>
                    {INDIAN_STATES.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
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

          {/* Business Details */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">
              Business Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-stone-400 mb-1">
                  Invoice Prefix <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="invoicePrefix"
                  value={formData.invoicePrefix}
                  onChange={handleChange}
                  required={!isEdit}
                  placeholder="e.g., INV"
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm text-stone-400 mb-1">
                  GST Number
                </label>
                <input
                  type="text"
                  name="gstNumber"
                  value={formData.gstNumber}
                  onChange={handleChange}
                  placeholder="e.g., 18AABCT1234H1Z0"
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm text-stone-400 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-teal-500"
                />
              </div>
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
            </div>
          </div>

          {/* Invoice Footer & Terms */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">
              Invoice Settings
            </h3>
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
            <div className="mt-4">
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
              {isSubmitting ? "Saving..." : isEdit ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
