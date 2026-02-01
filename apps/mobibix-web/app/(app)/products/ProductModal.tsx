"use client";

import { useState } from "react";
import {
  createProduct,
  ProductType,
  type ShopProduct,
} from "@/services/products.api";
import { searchHsn, type HSNCode } from "@/services/hsn.api";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import { stockIn } from "@/services/inventory.api";
import { StockCorrectionForm } from "@/components/inventory/StockCorrectionForm";

interface ProductModalProps {
  shopId: string;
  onClose: () => void;
  onProductCreated?: (product: ShopProduct) => void;
}

enum ModalStep {
  FORM = "FORM",
  SUCCESS_CHOICE = "SUCCESS_CHOICE",
  STOCK_INIT = "STOCK_INIT",
}

const GST_OPTIONS = [0, 5, 12, 18, 28];

export function ProductModal({
  shopId,
  onClose,
  onProductCreated,
}: ProductModalProps) {
  const { theme } = useTheme();
  const { authUser } = useAuth();
  const [step, setStep] = useState<ModalStep>(ModalStep.FORM);
  const [createdProduct, setCreatedProduct] = useState<ShopProduct | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: ProductType.GOODS,
    category: "",
    hsnSac: "",
    salePrice: "",
    gstRate: "18",
    isSerialized: false,
    openingStock: "",
    openingCost: "",
    openingImeis: "",
  });

  const isOwnerOrManager =
    authUser?.role === "owner" || authUser?.role === "admin";

  const [hsnResults, setHsnResults] = useState<HSNCode[]>([]);
  const [showHsnDropdown, setShowHsnDropdown] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    let { name, value } = e.target;

    // Prevent leading whitespace for specific text fields
    if (["name", "category"].includes(name)) {
      value = value.replace(/^\s+/, "");
    }

    // Remove ALL whitespace for HSN/SAC
    if (name === "hsnSac") {
      value = value.replace(/\s+/g, "");
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleHsnSearch = async (value: string) => {
    // Remove ALL whitespace for HSN/SAC
    const cleanValue = value.replace(/\s+/g, "");
    setFormData((prev) => ({ ...prev, hsnSac: cleanValue }));

    const searchTerm = cleanValue;
    if (searchTerm.length >= 2) {
      try {
        const results = await searchHsn(searchTerm);
        setHsnResults(results);
        setShowHsnDropdown(true);
      } catch (err) {
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
        isSerialized: formData.isSerialized,
      });

      // Handle Immediate Stock Initialization if provided
      const imeis = formData.openingImeis
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      const stockQty = formData.isSerialized
        ? imeis.length
        : parseFloat(formData.openingStock) || 0;

      if (stockQty > 0) {
        try {
          await stockIn(shopId, {
            shopProductId: newProduct.id,
            quantity: stockQty,
            costPrice: parseFloat(formData.openingCost) || 0,
            imeis: formData.isSerialized ? imeis : undefined,
            type: formData.isSerialized ? "GOODS" : undefined,
          });
        } catch (stockErr: any) {
          console.error("Stock in failed:", stockErr);
          alert(
            `Product created, but stock initialization failed: ${stockErr.message}`,
          );
        }
      }

      // Update the product object with its balance before notifying the parent
      const productWithStock = {
        ...newProduct,
        stockQty,
        costPrice: parseFloat(formData.openingCost) || newProduct.costPrice,
      };

      setCreatedProduct(productWithStock);
      onProductCreated?.(productWithStock);
      setStep(ModalStep.SUCCESS_CHOICE);
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
              {step === ModalStep.FORM
                ? "Create New Product"
                : step === ModalStep.SUCCESS_CHOICE
                  ? "Product Created!"
                  : "Stock Initialization"}
            </h2>
            <p
              className={`text-sm mt-1 ${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}
            >
              {step === ModalStep.FORM
                ? "Add a new product to your inventory."
                : step === ModalStep.SUCCESS_CHOICE
                  ? "What would you like to do next?"
                  : `Set opening stock for ${createdProduct?.name}`}
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

        {step === ModalStep.FORM && (
          <>
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
                    This product will be created in your inventory immediately.
                    You can modify it later from the Products page.
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
                    value={
                      formData.type === ProductType.GOODS
                        ? formData.isSerialized
                          ? "MOBILE"
                          : "ACCESSORY"
                        : formData.type
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "MOBILE") {
                        setFormData((prev) => ({
                          ...prev,
                          type: ProductType.GOODS,
                          isSerialized: true,
                        }));
                      } else if (val === "ACCESSORY") {
                        setFormData((prev) => ({
                          ...prev,
                          type: ProductType.GOODS,
                          isSerialized: false,
                        }));
                      } else {
                        setFormData((prev) => ({
                          ...prev,
                          type: val as ProductType,
                          isSerialized: false,
                        }));
                      }
                    }}
                    required
                    className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      theme === "dark"
                        ? "bg-gray-800 border-white/20 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  >
                    <option value="MOBILE">Mobile Phone / Laptop (IMEI Tracking)</option>
                    <option value="ACCESSORY">General Goods / Accessory (Bulk Quantity)</option>
                    <option value={ProductType.SPARE}>Spare Part</option>
                    <option value={ProductType.SERVICE}>Service</option>
                  </select>
                </div>

                {/* Tracking Override (IMEI vs Bulk) */}
                {formData.type === ProductType.GOODS && (
                  <div className="md:col-span-2 flex items-center gap-2 py-2">
                    <input
                      type="checkbox"
                      id="isSerialized"
                      name="isSerialized"
                      checked={formData.isSerialized}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          isSerialized: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                    />
                    <label
                      htmlFor="isSerialized"
                      className={`text-sm font-medium ${
                        theme === "dark" ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Track by IMEI / Serial Number (Mandatory for Phones/Laptops)
                    </label>
                  </div>
                )}

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
                    value={formData.category}
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
                    onBlur={() =>
                      setTimeout(() => setShowHsnDropdown(false), 200)
                    }
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
                            className={`text-xs ${
                              theme === "dark"
                                ? "text-gray-400"
                                : "text-gray-500"
                            }`}
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
                      .filter((v, i, a) => a.indexOf(v) === i && !isNaN(v))
                      .sort((a, b) => a - b)
                      .map((rate) => (
                        <option
                          key={rate}
                          value={rate}
                          className={
                            theme === "dark" ? "bg-gray-900" : "bg-white"
                          }
                        >
                          {rate}%
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Initial Stock Section */}
              <div
                className={`mt-6 p-4 rounded-xl border ${
                  theme === "dark"
                    ? "bg-stone-900/40 border-white/10"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <h3
                  className={`text-sm font-bold uppercase tracking-wider mb-4 ${
                    theme === "dark" ? "text-stone-400" : "text-gray-500"
                  }`}
                >
                  Opening Stock (Optional)
                </h3>

                {formData.isSerialized ? (
                  <div className="space-y-4">
                    <div>
                      <label
                        className={`block text-sm font-medium mb-2 ${
                          theme === "dark" ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        IMEIs / Serial Numbers{" "}
                        <span className="text-xs font-normal text-gray-500">
                          (One per line)
                        </span>
                      </label>
                      <textarea
                        name="openingImeis"
                        value={formData.openingImeis}
                        onChange={handleChange}
                        placeholder="Paste IMEIs here..."
                        rows={4}
                        className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono text-sm ${
                          theme === "dark"
                            ? "bg-gray-800 border-white/20 text-white"
                            : "bg-white border-gray-300 text-gray-900"
                        }`}
                      />
                      <p className="text-xs mt-1 text-teal-600 font-medium">
                        Total Quantity:{" "}
                        {
                          formData.openingImeis
                            .split(/\r?\n/)
                            .filter((s) => s.trim()).length
                        }{" "}
                        units
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        className={`block text-sm font-medium mb-2 ${
                          theme === "dark" ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Quantity on Hand
                      </label>
                      <input
                        type="number"
                        name="openingStock"
                        value={formData.openingStock}
                        onChange={handleChange}
                        placeholder="0"
                        min="0"
                        className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                          theme === "dark"
                            ? "bg-gray-800 border-white/20 text-white"
                            : "bg-white border-gray-300 text-gray-900"
                        }`}
                      />
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Cost Price per Unit (Initial Value)
                  </label>
                  <input
                    type="number"
                    name="openingCost"
                    value={formData.openingCost}
                    onChange={handleChange}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      theme === "dark"
                        ? "bg-gray-800 border-white/20 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  />
                  <p className="text-[10px] mt-1 text-gray-500 italic">
                    Note: Initial stock setup is typically for opening balance.
                    For ongoing inventory, use "New Purchase" for proper
                    accounting.
                  </p>
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
          </>
        )}

        {step === ModalStep.SUCCESS_CHOICE && (
          <div className="p-10 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
              ✓
            </div>
            <h3
              className={`text-2xl font-bold mb-2 ${
                theme === "dark" ? "text-white" : "text-gray-900"
              }`}
            >
              {createdProduct?.name} Created!
            </h3>
            <p
              className={`mb-8 ${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Product {createdProduct?.name} has been added.
              {parseFloat(formData.openingStock) > 0 ||
              formData.openingImeis.trim() !== ""
                ? " Opening stock was also successfully initialized."
                : " You can set initial stock now or skip."}
            </p>

            <div className="flex flex-col gap-3">
              {isOwnerOrManager ? (
                !(
                  parseFloat(formData.openingStock) > 0 ||
                  formData.openingImeis.trim() !== ""
                ) && (
                  <button
                    onClick={() => setStep(ModalStep.STOCK_INIT)}
                    className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition shadow-lg shadow-teal-500/20"
                  >
                    Set Initial Stock Quantity
                  </button>
                )
              ) : (
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl text-sm italic text-gray-500 mb-2">
                  Stock can be initialized by the owner later via Inventory
                  Management.
                </div>
              )}
              <button
                onClick={onClose}
                className={`w-full py-3 rounded-xl font-semibold transition ${
                  theme === "dark"
                    ? "bg-gray-800 hover:bg-gray-700 text-white"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                }`}
              >
                Done (Skip Stock for Now)
              </button>
            </div>
          </div>
        )}

        {step === ModalStep.STOCK_INIT && createdProduct && (
          <div className="p-6">
            <StockCorrectionForm
              shopId={shopId}
              preSelectedProductId={createdProduct.id}
              source="PRODUCT_CREATE"
              onSuccess={() => onClose()}
              onCancel={() => setStep(ModalStep.SUCCESS_CHOICE)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
