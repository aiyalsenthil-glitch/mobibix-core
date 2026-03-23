"use client";

import { useState } from "react";
import {
  updateProduct,
  ProductType,
  type ShopProduct,
} from "@/services/products.api";
import { searchHsn, type HSNCode } from "@/services/hsn.api";
import { useTheme } from "@/context/ThemeContext";

interface EditProductModalProps {
  product: ShopProduct;
  shopId: string;
  onClose: () => void;
  onProductUpdated?: (product: ShopProduct) => void;
}

export function EditProductModal({
  product,
  shopId,
  onClose,
  onProductUpdated,
}: EditProductModalProps) {
  const { theme } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: product.name,
    type: (product.type as ProductType) || ProductType.GOODS,
    brand: product.brand || "",
    category: product.category || "",
    hsnSac: product.hsnCode || "",
    salePrice: ((product.salePrice || 0) / 100).toString(),
    gstRate: product.gstRate?.toString() || "18",
    reorderLevel: product.reorderLevel?.toString() || "",
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
    setFormData((prev) => ({ ...prev, hsnSac: value }));

    const searchTerm = value.trim();
    if (searchTerm.length >= 2) {
      try {
        const results = await searchHsn(searchTerm);
        setHsnResults(results);
        setShowHsnDropdown(true);
      } catch {
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

      const updatedProduct = await updateProduct(shopId, product.id, {
        name: formData.name.trim(),
        type: formData.type,
        brand: formData.brand.trim() || undefined,
        category: formData.category.trim() || undefined,
        hsnSac: formData.hsnSac.trim() || undefined,
        salePrice: parseFloat(formData.salePrice),
        gstRate: parseFloat(formData.gstRate),
        reorderLevel: formData.reorderLevel
          ? parseInt(formData.reorderLevel)
          : undefined,
      });

      onProductUpdated?.(updatedProduct);
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update product";
      alert(message);
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
              Edit Product Configuration
            </h2>
            <p
              className={`text-sm mt-1 ${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Update shop-specific pricing and settings for this product.
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
                <option value={ProductType.GOODS}>Goods</option>
                <option value={ProductType.SPARE}>Spare Part</option>
                <option value={ProductType.SERVICE}>Service</option>
              </select>
            </div>

            {/* Brand */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                Brand <span className="text-xs text-gray-500 font-normal">(e.g. Vivo, Samsung)</span>
              </label>
              <input
                type="text"
                name="brand"
                list="edit-brand-suggestions"
                value={formData.brand}
                onChange={handleChange}
                placeholder="e.g. Vivo"
                className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-teal-500 ${theme === "dark" ? "bg-gray-800 border-white/20 text-white" : "bg-white border-gray-300 text-gray-900"}`}
              />
              <datalist id="edit-brand-suggestions">
                {["Vivo","Oppo","Samsung","Apple","Xiaomi","Realme","OnePlus","Nokia","Motorola","iQOO","Poco","Infinix","Tecno"].map(b => <option key={b} value={b} />)}
              </datalist>
            </div>

            {/* Category */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                Category <span className="text-xs text-gray-500 font-normal">(e.g. Smartphone)</span>
              </label>
              <input
                type="text"
                name="category"
                list="edit-category-suggestions"
                value={formData.category}
                onChange={handleChange}
                placeholder="e.g. Smartphone"
                className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-teal-500 ${theme === "dark" ? "bg-gray-800 border-white/20 text-white" : "bg-white border-gray-300 text-gray-900"}`}
              />
              <datalist id="edit-category-suggestions">
                {["Smartphone","Earphones","Charger","Cover","Screen Guard","Battery","Spare Part","Accessory","Tablet","Laptop","Smartwatch"].map(c => <option key={c} value={c} />)}
              </datalist>
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
                <option value="0">0%</option>
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18">18%</option>
                <option value="28">28%</option>
              </select>

            </div>

            {/* Reorder Level */}
            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Low Stock Alert Level
              </label>
              <input
                type="number"
                name="reorderLevel"
                value={formData.reorderLevel}
                onChange={handleChange}
                min="0"
                placeholder="e.g. 5"
                className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  theme === "dark"
                    ? "bg-gray-800 border-white/20 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              />
              <p className="text-xs mt-1 text-gray-500">
                Alert when stock falls below this quantity.
              </p>
            </div>


            {/* Sale Price */}
            <div className="md:col-span-2">
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
                className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  theme === "dark"
                    ? "bg-gray-800 border-white/20 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition ${
                theme === "dark"
                  ? "bg-gray-700 hover:bg-gray-600 text-white"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-900"
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition"
            >
              {isSubmitting ? "Updating..." : "Update Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
