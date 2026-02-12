"use client";

import { useState, useEffect } from "react";
import {
  createCustomer,
  updateCustomer,
  type Customer,
  type CreateCustomerDto,
} from "@/services/customers.api";
import { useTheme } from "@/context/ThemeContext";

interface CustomerModalProps {
  customer?: Customer | null;
  onClose: () => void;
  onSuccess?: (customer: Customer) => void;
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
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

export function CustomerModal({
  customer,
  onClose,
  onSuccess,
}: CustomerModalProps) {
  const { theme } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: customer?.name || "",
    phone: customer?.phone || "",
    alternateNumber: "",
    email: customer?.email || "",
    address: "",
    state: customer?.state || "",
    gstNumber: customer?.gstNumber || "",
    contactPersons: "",
    businessType: customer?.businessType || ("B2C" as const),
    partyType: customer?.partyType || ("CUSTOMER" as const),
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.phone.trim() || !formData.state) {
      alert("Please fill in all required fields (Name, Mobile, State)");
      return;
    }

    // Phone validation
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(formData.phone)) {
      alert("Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    // Email validation (if provided)
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        alert("Please enter a valid email address.");
        return;
      }
    }

    try {
      setIsSubmitting(true);

      const dto: CreateCustomerDto = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        state: formData.state,
        gstNumber: formData.gstNumber.trim() || undefined,
        businessType: formData.businessType,
        partyType: formData.partyType,
      };

      let result: Customer;
      if (customer) {
        result = await updateCustomer(customer.id, dto);
      } else {
        result = await createCustomer(dto);
      }

      onSuccess?.(result);
      onClose();
    } catch (err: any) {
      alert(err.message || "Failed to save customer");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className={`w-full max-w-2xl rounded-lg shadow-xl ${
          theme === "dark"
            ? "bg-gray-900 border border-white/10"
            : "bg-white border border-gray-200"
        } max-h-[90vh] overflow-y-auto`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-6 border-b ${
            theme === "dark" ? "border-white/10" : "border-gray-200"
          }`}
        >
          <div>
            <h2
              className={`text-xl font-bold ${
                theme === "dark" ? "text-white" : "text-gray-900"
              }`}
            >
              {customer ? "Edit Customer" : "Create New Customer"}
            </h2>
            <p
              className={`text-sm mt-1 ${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}
            >
              {customer
                ? "Update customer information in your records."
                : "Add a new customer to your records. This customer can be reused for future jobs and sales."}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`text-2xl ${
              theme === "dark"
                ? "text-gray-400 hover:text-white"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  theme === "dark"
                    ? "bg-gray-800 border-white/20 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              />
            </div>

            {/* Mobile Number */}
            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                pattern="[0-9]{10}"
                title="Please enter a valid 10-digit mobile number"
                className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  theme === "dark"
                    ? "bg-gray-800 border-white/20 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              />
            </div>

            {/* Alternate Number */}
            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Alternate Number
              </label>
              <input
                type="tel"
                name="alternateNumber"
                value={formData.alternateNumber}
                onChange={handleChange}
                pattern="[0-9]{10}"
                title="Please enter a valid 10-digit mobile number"
                className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  theme === "dark"
                    ? "bg-gray-800 border-white/20 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              />
            </div>

            {/* Email */}
            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  theme === "dark"
                    ? "bg-gray-800 border-white/20 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              />
            </div>
          </div>

          {/* Address */}
          <div className="mt-4">
            <label
              className={`block text-sm font-medium mb-2 ${
                theme === "dark" ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Address
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={3}
              className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none ${
                theme === "dark"
                  ? "bg-gray-800 border-white/20 text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {/* State */}
            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}
              >
                State <span className="text-red-500">*</span>
              </label>
              <select
                name="state"
                value={formData.state}
                onChange={handleChange}
                required
                className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  theme === "dark"
                    ? "bg-gray-800 border-white/20 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              >
                <option value="">Select a state</option>
                {INDIAN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>

            {/* GSTIN */}
            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}
              >
                GSTIN
              </label>
              <input
                type="text"
                name="gstNumber"
                value={formData.gstNumber}
                onChange={handleChange}
                pattern="[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}"
                title="Please enter a valid GSTIN (e.g., 22AAAAA0000A1Z5)"
                className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  theme === "dark"
                    ? "bg-gray-800 border-white/20 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              />
            </div>
          </div>

          {/* Contact Person(s) */}
          <div className="mt-4">
            <label
              className={`block text-sm font-medium mb-2 ${
                theme === "dark" ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Contact Person(s)
            </label>
            <textarea
              name="contactPersons"
              value={formData.contactPersons}
              onChange={handleChange}
              rows={3}
              placeholder="e.g., John Doe (Manager), Jane Smith (Accounts)"
              className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none ${
                theme === "dark"
                  ? "bg-gray-800 border-white/20 text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className={`px-6 py-2 rounded-lg font-medium transition ${
                theme === "dark"
                  ? "bg-gray-700 hover:bg-gray-600 text-white"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-900"
              } disabled:opacity-50`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition disabled:opacity-50"
            >
              {isSubmitting
                ? "Saving..."
                : customer
                  ? "Update Customer"
                  : "Create Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
