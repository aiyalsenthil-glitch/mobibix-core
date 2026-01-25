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
    if (!isEditing && formData.phone.trim()) {
      const validatePhone = async () => {
        try {
          const existing = await getCustomerByPhone(formData.phone);
          setPhoneExistingCustomer(existing);
        } catch {
          // Ignore errors during lookup
          setPhoneExistingCustomer(null);
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

    // If adding new customer, phone must not exist
    if (!isEditing && phoneExistingCustomer) {
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
    } catch (err: any) {
      setError(err.message || "Failed to save customer");
    } finally {
      setIsSaving(false);
    }
  };

  const isB2B = formData.businessType === "B2B";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-stone-900 rounded-lg border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-stone-900 border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">
            {isEditing ? `Edit Customer` : "Add New Customer"}
          </h2>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white text-2xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Phone Existing Customer Info */}
          {!isEditing && phoneExistingCustomer && (
            <div className="bg-teal-500/10 border border-teal-500/30 text-teal-300 px-4 py-3 rounded-lg text-sm">
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
              <label className="block text-sm text-stone-300 mb-2">
                Customer Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter customer name"
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-stone-400 focus:outline-none focus:border-teal-500"
                required
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm text-stone-300 mb-2">
                Phone Number <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter 10-digit phone"
                disabled={isEditing}
                className={`w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-stone-400 focus:outline-none focus:border-teal-500 ${
                  isEditing ? "opacity-60 cursor-not-allowed" : ""
                }`}
                required
              />
              {isEditing && (
                <p className="text-xs text-stone-400 mt-1">
                  Phone number cannot be changed after creation
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm text-stone-300 mb-2">
                Email (Optional)
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="customer@example.com"
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-stone-400 focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* State */}
            <div className="col-span-2">
              <label className="block text-sm text-stone-300 mb-2">
                State <span className="text-red-400">*</span>
              </label>
              <select
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-teal-500"
                required
              >
                <option value="" className="bg-stone-900">
                  -- Select State --
                </option>
                {INDIAN_STATES.map((state) => (
                  <option key={state} value={state} className="bg-stone-900">
                    {state}
                  </option>
                ))}
              </select>
            </div>

            {/* Business Type */}
            <div>
              <label className="block text-sm text-stone-300 mb-2">
                Business Type <span className="text-red-400">*</span>
              </label>
              <select
                name="businessType"
                value={formData.businessType}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-teal-500"
                required
              >
                <option value="B2C" className="bg-stone-900">
                  B2C (Business to Consumer)
                </option>
                <option value="B2B" className="bg-stone-900">
                  B2B (Business to Business)
                </option>
              </select>
            </div>

            {/* Party Type */}
            <div>
              <label className="block text-sm text-stone-300 mb-2">
                Party Type <span className="text-red-400">*</span>
              </label>
              <select
                name="partyType"
                value={formData.partyType}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-teal-500"
                required
              >
                <option value="CUSTOMER" className="bg-stone-900">
                  Customer
                </option>
                <option value="VENDOR" className="bg-stone-900">
                  Vendor
                </option>
                <option value="BOTH" className="bg-stone-900">
                  Both
                </option>
              </select>
            </div>

            {/* GSTIN (conditional based on businessType) */}
            {isB2B && (
              <div className="col-span-2">
                <label className="block text-sm text-stone-300 mb-2">
                  GSTIN <span className="text-red-400">*</span>
                  <span className="text-xs text-stone-400 ml-2">
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
                  className={`w-full px-4 py-2 bg-white/10 border rounded-lg text-white placeholder-stone-400 focus:outline-none ${
                    gstinError
                      ? "border-red-500 focus:border-red-500"
                      : "border-white/20 focus:border-teal-500"
                  }`}
                  required={isB2B}
                />
                {gstinError && (
                  <p className="text-xs text-red-400 mt-1">{gstinError}</p>
                )}
                {!gstinError && formData.gstNumber && (
                  <p className="text-xs text-green-400 mt-1">
                    ✓ Valid GSTIN format
                  </p>
                )}
                <p className="text-xs text-stone-400 mt-1">
                  Format: 2 digits (state code) + 10 chars (PAN) + 1 char
                  (entity) + 1 char (default Z) + 1 checksum digit
                </p>
              </div>
            )}

            {!isB2B && (
              <div className="col-span-2 bg-stone-800/50 border border-stone-700 rounded-lg px-4 py-3">
                <p className="text-sm text-stone-400">
                  <span className="font-semibold text-stone-300">Note:</span>{" "}
                  GSTIN is not required for B2C customers. Switch to B2B if you
                  need to add GSTIN.
                </p>
              </div>
            )}
          </div>

          {/* Loyalty Points (Read-Only if editing) */}
          {isEditing && customer && (
            <div>
              <label className="block text-sm text-stone-300 mb-2">
                Loyalty Points (Read-Only)
              </label>
              <div className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-stone-300">
                {customer.loyaltyPoints} points
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-teal-500/50 text-white rounded-lg font-medium transition-colors"
              disabled={
                isSaving ||
                (!isEditing && phoneExistingCustomer !== null) ||
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
