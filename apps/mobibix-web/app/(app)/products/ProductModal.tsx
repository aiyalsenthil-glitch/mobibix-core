"use client";

import { useState } from "react";
import {
  createProduct,
  ProductType,
  type ShopProduct,
} from "@/services/products.api";
import { searchHsn, type HSNCode } from "@/services/hsn.api";
import { useTheme } from "@/context/ThemeContext";

interface ProductModalProps {
  shopId: string;
  onClose: () => void;
  onProductCreated?: (product: ShopProduct) => void;
}

const GST_OPTIONS = [0, 5, 12, 18, 28];

export function ProductModal({
  shopId,
  onClose,
  onProductCreated,
}: ProductModalProps) {
  const { theme } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: ProductType.GOODS,
    category: "",
    hsnSac: "",
    salePrice: "",
    gstRate: "18",
  });

  const [hsnResults, setHsnResults] = useState<HSNCode[]>([]);
  const [showHsnDropdown, setShowHsnDropdown] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleHsnSearch = async (value: string) => {
    // Keep raw value in input
    setFormData((prev) => ({ ...prev, hsnSac: value }));

    // Trim for search
    const searchTerm = value.trim();
    if (searchTerm.length >= 2) {
      try {
        const results = await searchHsn(searchTerm);
        setHsnResults(results);
        setShowHsnDropdown(true);
      } catch (err) {
        // Silent fail - allow manual entry
        console.warn("HSN search unavailable, using manual entry");
        setShowHsnDropdown(false);
      }
    } else {
      setShowHsnDropdown(false);
    }
  };

  const selectHsn = (hsn: HSNCode) => {
    setFormData((prev) => ({
      ...prev,
      hsnSac: hsn.code,
      gstRate: hsn.taxRate.toString(),
    }));
    setShowHsnDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.salePrice) {
      alert("Please fill in all required fields (Name, Sale Price)");
      return;
    }

    try {
      setIsSubmitting(true);

      const newProduct = await createProduct(shopId, {
        name: formData.name.trim(),
        type: formData.type,
        category: formData.category.trim() || undefined,
        hsnSac: formData.hsnSac.trim() || undefined,
        salePrice: parseFloat(formData.salePrice),
        gstRate: parseFloat(formData.gstRate),
      });

      onProductCreated?.(newProduct);
      onClose();
    } catch (err: any) {
      alert(err.message || "Failed to create product");
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
              Create New Product
            </h2>
            <p
              className={`text-sm mt-1 ${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Add a new product to your inventory. It will be available for
              future invoices and sales.
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

        {/* Warning Banner */}
        <div className="p-6 bg-amber-50 dark:bg-amber-500/10 border-b border-amber-200 dark:border-amber-500/30">
          <div className="flex items-start gap-3">
            <span className="text-lg mt-0.5">⚠️</span>
            <div>
              <div
                className={`font-semibold ${
                  theme === "dark" ? "text-amber-200" : "text-amber-900"
                }`}
              >
                New Product Creation
              </div>
              <div
                className={`text-sm mt-1 ${
                  theme === "dark" ? "text-amber-100" : "text-amber-800"
                }`}
              >
                This product will be created in your inventory immediately. You
                can modify it later from the Products page.
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Product Name */}
            <div className="md:col-span-2">
              <label
                className={`block text-sm font-medium mb-2 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="e.g., iPhone 15 Pro"
                className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  theme === "dark"
                    ? "bg-gray-800 border-white/20 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              />
            </div>

            {/* Product Type */}
            <div className="md:col-span-2">
              <label
                className={`block text-sm font-medium mb-2 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Product Type <span className="text-red-500">*</span>
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
                className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  theme === "dark"
                    ? "bg-gray-800 border-white/20 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              >
                <option value={ProductType.MOBILE}>Mobile</option>
                <option value={ProductType.ACCESSORY}>Accessory</option>
                <option value={ProductType.SPARE}>Spare Part</option>
              </select>
            </div>

            {/* Category (Free text) */}
            <div className="md:col-span-2">
              <label
                className={`block text-sm font-medium mb-2 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Category{" "}
                <span className="text-xs text-gray-500 font-normal">
                  (e.g. Charger, Cover)
                </span>
              </label>
              <input
                type="text"
                name="category"
                value={formData.category} // Ensure this state exists
                onChange={handleChange}
                placeholder="Product Category/Type"
                className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  theme === "dark"
                    ? "bg-gray-800 border-white/20 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              />
            </div>

            {/* HSN/SAC Code */}
            <div className="relative">
              <label
                className={`block text-sm font-medium mb-2 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}
              >
                HSN/SAC Code
              </label>
              <input
                type="text"
                name="hsnSac"
                value={formData.hsnSac}
                onChange={(e) => handleHsnSearch(e.target.value)}
                onFocus={() =>
                  formData.hsnSac.length >= 2 && setShowHsnDropdown(true)
                }
                onBlur={() => setTimeout(() => setShowHsnDropdown(false), 200)}
                placeholder="Search HSN/SAC..."
                className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  theme === "dark"
                    ? "bg-gray-800 border-white/20 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              />
              {showHsnDropdown && hsnResults.length > 0 && (
                <div
                  className={`absolute z-10 w-full mt-1 border rounded-lg shadow-lg max-h-60 overflow-auto ${
                    theme === "dark"
                      ? "bg-gray-800 border-gray-700"
                      : "bg-white border-gray-200"
                  }`}
                >
                  {hsnResults.map((hsn) => (
                    <button
                      key={hsn.id}
                      type="button"
                      onClick={() => selectHsn(hsn)}
                      className={`w-full text-left px-4 py-2 hover:bg-teal-50 dark:hover:bg-teal-900/20 border-b last:border-0 ${
                        theme === "dark"
                          ? "border-gray-700 text-white"
                          : "border-gray-100 text-gray-900"
                      }`}
                    >
                      <div className="font-medium">{hsn.code}</div>
                      <div
                        className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                      >
                        {hsn.description} • GST: {hsn.taxRate}%
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sale Price */}
            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Sale Price (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="salePrice"
                value={formData.salePrice}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                placeholder="0.00"
                className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  theme === "dark"
                    ? "bg-gray-800 border-white/20 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              />
            </div>

            {/* GST Rate */}
            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}
              >
                GST Rate (%)
              </label>
              <select
                name="gstRate"
                value={formData.gstRate}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  theme === "dark"
                    ? "bg-gray-800 border-white/20 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              >
                {[0, 5, 12, 18, 28, parseFloat(formData.gstRate)]
                  .filter((v, i, a) => a.indexOf(v) === i && !isNaN(v)) // Unique and valid
                  .sort((a, b) => a - b)
                  .map((rate) => (
                    <option
                      key={rate}
                      value={rate}
                      className={theme === "dark" ? "bg-gray-900" : "bg-white"}
                    >
                      {rate}%
                    </option>
                  ))}
              </select>
            </div>
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
              {isSubmitting ? "Creating..." : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
