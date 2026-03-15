"use client";

import { useState, useEffect } from "react";
import {
  createCustomer,
  updateCustomer,
  getCustomerByPhone,
  type Customer,
  type BusinessType,
  type PartyType,
} from "@/services/customers.api";
import { useTheme } from "@/context/ThemeContext";

interface CustomerFormProps {
  customer?: Customer | null;
  onClose: () => void;
}

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
  "Ladakh",
  "Jammu and Kashmir",
  "Puducherry",
  "Lakshadweep",
  "Andaman and Nicobar Islands",
  "Dadar and Nagar Haveli and Daman and Diu",
];

// GSTIN validation regex (Indian GST format)
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

function validateGSTIN(gstin: string): boolean {
  if (!gstin) return false;
  return GSTIN_REGEX.test(gstin.toUpperCase());
}

export function CustomerForm({ customer, onClose }: CustomerFormProps) {
  const { theme } = useTheme();
  const isEditing = !!customer;
  const [formData, setFormData] = useState({
    name: customer?.name || "",
    phone: customer?.phone || "",
    email: customer?.email || "",
    state: customer?.state || "",
    businessType: (customer?.businessType || "B2C") as BusinessType,
    partyType: (customer?.partyType || "CUSTOMER") as PartyType,
    gstNumber: customer?.gstNumber || "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gstinError, setGstinError] = useState<string | null>(null);
  const [phoneExistingCustomer, setPhoneExistingCustomer] =
    useState<Customer | null>(null);

  // Validate phone lookup for add mode
  useEffect(() => {
    // Clear immediately on every phone change to avoid stale matches
    setPhoneExistingCustomer(null);

    if (!isEditing && formData.phone.trim().length >= 10) {
      const currentPhone = formData.phone.trim();
      const validatePhone = async () => {
        try {
          const existing = await getCustomerByPhone(currentPhone);
          // Only set if the phone still matches (user hasn't typed further)
          if (existing && existing.phone === currentPhone) {
            setPhoneExistingCustomer(existing);
          }
        } catch {
          // Ignore errors during lookup
        }
      };

      const timeoutId = setTimeout(validatePhone, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [formData.phone, isEditing]);

  // Validate GSTIN on change
  useEffect(() => {
    if (formData.businessType === "B2B") {
      if (!formData.gstNumber.trim()) {
        setGstinError("GSTIN is required for B2B customers");
      } else if (!validateGSTIN(formData.gstNumber)) {
        setGstinError(
          "Invalid GSTIN format. Expected: 22AAAAA0000A1Z5 (15 chars)",
        );
      } else {
        setGstinError(null);
      }
    } else {
      setGstinError(null);
    }
  }, [formData.gstNumber, formData.businessType]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    // Clear GSTIN when switching from B2B to B2C
    if (name === "businessType" && value === "B2C") {
      setFormData((prev) => ({ ...prev, [name]: value, gstNumber: "" }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError("Customer name is required");
      return;
    }

    if (!formData.phone.trim()) {
      setError("Phone number is required");
      return;
    }

    if (!formData.state.trim()) {
      setError("State is required");
      return;
    }

    // B2B GSTIN validation
    if (formData.businessType === "B2B") {
      if (!formData.gstNumber.trim()) {
        setError("GSTIN is required for B2B customers");
        return;
      }
      if (!validateGSTIN(formData.gstNumber)) {
        setError("Invalid GSTIN format. Please check and try again.");
        return;
      }
    }

    // If adding new customer, phone must not exist (exact match only)
    if (!isEditing && phoneExistingCustomer && phoneExistingCustomer.phone === formData.phone.trim()) {
      setError(
        `A customer with phone ${formData.phone} already exists: ${phoneExistingCustomer.name}`,
      );
      return;
    }

    try {
      setIsSaving(true);

      if (isEditing && customer) {
        // Update - phone is not editable
        await updateCustomer(customer.id, {
          name: formData.name.trim(),
          email: formData.email.trim() || undefined,
          state: formData.state.trim(),
          businessType: formData.businessType,
          partyType: formData.partyType,
          gstNumber: formData.gstNumber.trim().toUpperCase() || undefined,
        });
      } else {
        // Create
        await createCustomer({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || undefined,
          state: formData.state.trim(),
          businessType: formData.businessType,
          partyType: formData.partyType,
          gstNumber: formData.gstNumber.trim().toUpperCase() || undefined,
        });
      }

      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save customer");
    } finally {
      setIsSaving(false);
    }
  };

  const isB2B = formData.businessType === "B2B";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-lg border w-full max-w-2xl max-h-[90vh] overflow-y-auto ${
        theme === "dark"
          ? "bg-stone-900 border-white/10"
          : "bg-white border-gray-200"
      }`}>
        {/* Header */}
        <div className={`sticky top-0 border-b px-6 py-4 flex items-center justify-between ${
          theme === "dark"
            ? "bg-stone-900 border-white/10"
            : "bg-white border-gray-200"
        }`}>
          <h2 className={`text-xl font-semibold ${
            theme === "dark" ? "text-white" : "text-gray-900"
          }`}>
            {isEditing ? `Edit Customer` : "Add New Customer"}
          </h2>
          <button
            onClick={onClose}
            className={`text-2xl leading-none ${
              theme === "dark"
                ? "text-stone-400 hover:text-white"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className={`px-4 py-3 rounded-lg text-sm ${
              theme === "dark"
                ? "bg-red-500/20 border border-red-500/50 text-red-300"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}>
              {error}
            </div>
          )}

          {/* Phone Existing Customer Info */}
          {!isEditing && phoneExistingCustomer && (
            <div className={`px-4 py-3 rounded-lg text-sm ${
              theme === "dark"
                ? "bg-teal-500/10 border border-teal-500/30 text-teal-300"
                : "bg-teal-50 border border-teal-200 text-teal-700"
            }`}>
              <div className="font-semibold mb-1">Customer exists!</div>
              <div className="text-xs">
                Phone {phoneExistingCustomer.phone} is already registered to{" "}
                <strong>{phoneExistingCustomer.name}</strong>
              </div>
              <div className="text-xs mt-1">
                Consider using the existing customer instead of creating a
                duplicate.
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Customer Name */}
            <div className="col-span-2">
              <label className={`block text-sm mb-2 ${
                theme === "dark" ? "text-stone-300" : "text-gray-700"
              }`}>
                Customer Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter customer name"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-teal-500 ${
                  theme === "dark"
                    ? "bg-white/10 border-white/20 text-white placeholder-stone-400"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                }`}
                required
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className={`block text-sm mb-2 ${
                theme === "dark" ? "text-stone-300" : "text-gray-700"
              }`}>
                Phone Number <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter 10-digit phone"
                disabled={isEditing}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-teal-500 ${
                  theme === "dark"
                    ? "bg-white/10 border-white/20 text-white placeholder-stone-400"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                } ${isEditing ? "opacity-60 cursor-not-allowed" : ""}`}
                required
              />
              {isEditing && (
                <p className={`text-xs mt-1 ${
                  theme === "dark" ? "text-stone-400" : "text-gray-500"
                }`}>
                  Phone number cannot be changed after creation
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className={`block text-sm mb-2 ${
                theme === "dark" ? "text-stone-300" : "text-gray-700"
              }`}>
                Email (Optional)
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="customer@example.com"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-teal-500 ${
                  theme === "dark"
                    ? "bg-white/10 border-white/20 text-white placeholder-stone-400"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                }`}
              />
            </div>

            {/* State */}
            <div className="col-span-2">
              <label className={`block text-sm mb-2 ${
                theme === "dark" ? "text-stone-300" : "text-gray-700"
              }`}>
                State <span className="text-red-400">*</span>
              </label>
              <select
                name="state"
                value={formData.state}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-teal-500 ${
                  theme === "dark"
                    ? "bg-white/10 border-white/20 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
                required
              >
                <option value="" className={theme === "dark" ? "bg-stone-900" : "bg-white"}>
                  -- Select State --
                </option>
                {INDIAN_STATES.map((state) => (
                  <option key={state} value={state} className={theme === "dark" ? "bg-stone-900" : "bg-white"}>
                    {state}
                  </option>
                ))}
              </select>
            </div>

            {/* Business Type */}
            <div>
              <label className={`block text-sm mb-2 ${
                theme === "dark" ? "text-stone-300" : "text-gray-700"
              }`}>
                Business Type <span className="text-red-400">*</span>
              </label>
              <select
                name="businessType"
                value={formData.businessType}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-teal-500 ${
                  theme === "dark"
                    ? "bg-white/10 border-white/20 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
                required
              >
                <option value="B2C" className={theme === "dark" ? "bg-stone-900" : "bg-white"}>
                  B2C (Business to Consumer)
                </option>
                <option value="B2B" className={theme === "dark" ? "bg-stone-900" : "bg-white"}>
                  B2B (Business to Business)
                </option>
              </select>
            </div>

            {/* Party Type */}
            <div>
              <label className={`block text-sm mb-2 ${
                theme === "dark" ? "text-stone-300" : "text-gray-700"
              }`}>
                Party Type <span className="text-red-400">*</span>
              </label>
              <select
                name="partyType"
                value={formData.partyType}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-teal-500 ${
                  theme === "dark"
                    ? "bg-white/10 border-white/20 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
                required
              >
                <option value="CUSTOMER" className={theme === "dark" ? "bg-stone-900" : "bg-white"}>
                  Customer
                </option>
                <option value="VENDOR" className={theme === "dark" ? "bg-stone-900" : "bg-white"}>
                  Vendor
                </option>
                <option value="BOTH" className={theme === "dark" ? "bg-stone-900" : "bg-white"}>
                  Both
                </option>
              </select>
            </div>

            {/* GSTIN (conditional based on businessType) */}
            {isB2B && (
              <div className="col-span-2">
                <label className={`block text-sm mb-2 ${
                  theme === "dark" ? "text-stone-300" : "text-gray-700"
                }`}>
                  GSTIN <span className="text-red-400">*</span>
                  <span className={`text-xs ml-2 ${
                    theme === "dark" ? "text-stone-400" : "text-gray-500"
                  }`}>
                    (Required for B2B customers)
                  </span>
                </label>
                <input
                  type="text"
                  name="gstNumber"
                  value={formData.gstNumber}
                  onChange={handleChange}
                  placeholder="22AAAAA0000A1Z5 (15 characters)"
                  maxLength={15}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none ${
                    theme === "dark"
                      ? "bg-white/10 text-white placeholder-stone-400"
                      : "bg-white text-gray-900 placeholder-gray-500"
                  } ${
                    gstinError
                      ? "border-red-500 focus:border-red-500"
                      : theme === "dark"
                        ? "border-white/20 focus:border-teal-500"
                        : "border-gray-300 focus:border-teal-500"
                  }`}
                  required={isB2B}
                />
                {gstinError && (
                  <p className={`text-xs mt-1 ${
                    theme === "dark" ? "text-red-400" : "text-red-600"
                  }`}>
                    {gstinError}
                  </p>
                )}
                {!gstinError && formData.gstNumber && (
                  <p className={`text-xs mt-1 ${
                    theme === "dark" ? "text-green-400" : "text-green-600"
                  }`}>
                    ✓ Valid GSTIN format
                  </p>
                )}
                <p className={`text-xs mt-1 ${
                  theme === "dark" ? "text-stone-400" : "text-gray-500"
                }`}>
                  Format: 2 digits (state code) + 10 chars (PAN) + 1 char
                  (entity) + 1 char (default Z) + 1 checksum digit
                </p>
              </div>
            )}

            {!isB2B && (
              <div className={`col-span-2 border rounded-lg px-4 py-3 ${
                theme === "dark"
                  ? "bg-stone-800/50 border-stone-700"
                  : "bg-gray-50 border-gray-200"
              }`}>
                <p className={`text-sm ${
                  theme === "dark" ? "text-stone-400" : "text-gray-600"
                }`}>
                  <span className={`font-semibold ${
                    theme === "dark" ? "text-stone-300" : "text-gray-700"
                  }`}>
                    Note:
                  </span>{" "}
                  GSTIN is not required for B2C customers. Switch to B2B if you
                  need to add GSTIN.
                </p>
              </div>
            )}
          </div>

          {/* Loyalty Points (Read-Only if editing) */}
          {isEditing && customer && (
            <div>
              <label className={`block text-sm mb-2 ${
                theme === "dark" ? "text-stone-300" : "text-gray-700"
              }`}>
                Loyalty Points (Read-Only)
              </label>
              <div className={`w-full px-4 py-2 border rounded-lg ${
                theme === "dark"
                  ? "bg-white/5 border-white/10 text-stone-300"
                  : "bg-gray-50 border-gray-200 text-gray-700"
              }`}>
                {customer.loyaltyPoints} points
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                theme === "dark"
                  ? "bg-white/10 hover:bg-white/20 text-white"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-900"
              }`}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-teal-500/50 text-white rounded-lg font-medium transition-colors"
              disabled={
                isSaving ||
                (!isEditing && phoneExistingCustomer !== null && phoneExistingCustomer.phone === formData.phone.trim()) ||
                (isB2B && !!gstinError)
              }
            >
              {isSaving ? "Saving..." : isEditing ? "Update" : "Add Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
