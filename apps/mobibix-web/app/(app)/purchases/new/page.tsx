"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listShops, type Shop } from "@/services/shops.api";
import {
  createPurchase,
  submitPurchase,
  type CreatePurchaseDto,
  type PurchaseItemDto,
  type PaymentMode,
} from "@/services/purchases.api";
import { authenticatedFetch } from "@/services/auth.api";
import { useTheme } from "@/context/ThemeContext";
import { PartySelector } from "@/components/common/PartySelector";
import { type Party } from "@/services/parties.api";

// GSTIN Regex Validation
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export default function NewPurchasePage() {
  const { theme } = useTheme();
  const router = useRouter();
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Party | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreatePurchaseDto>({
    shopId: "",
    globalSupplierId: "",
    supplierName: "",
    supplierGstin: "",
    invoiceNumber: "",
    invoiceDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    paymentMethod: "CASH",
    items: [],
  });

  // ... (existing code)



  // Current item being added
  const [currentItem, setCurrentItem] = useState<PurchaseItemDto>({
    description: "",
    quantity: 1,
    purchasePrice: 0,
    gstRate: 18,
  });

  // Load shops and suppliers
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load shops
        let shopsData: Shop[] = [];

        try {
          shopsData = await listShops();
          if (shopsData.length > 0) {
            setFormData((prev) => ({ ...prev, shopId: shopsData[0].id }));
          }
        } catch (err: any) {
          console.error("Failed to load shops:", err);
          setError("Failed to load shops");
        }

        setShops(shopsData);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleAddItem = () => {
    if (!currentItem.description || currentItem.quantity <= 0) {
      setError("Please fill in item details");
      return;
    }

    const subtotal = currentItem.quantity * currentItem.purchasePrice;
    const gstAmount = (subtotal * (currentItem.gstRate || 0)) / 100;

    const newItem: PurchaseItemDto & {
      subTotal: number;
      gstAmount: number;
      total: number;
    } = {
      ...currentItem,
      subTotal: subtotal,
      gstAmount,
      total: subtotal + gstAmount,
    };

    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, newItem as PurchaseItemDto],
    }));

    setCurrentItem({
      description: "",
      quantity: 1,
      purchasePrice: 0,
      gstRate: 18,
    });
    setError(null);
  };

  const handleRemoveItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalGst = 0;

    formData.items.forEach((item) => {
      const itemSubtotal = item.quantity * item.purchasePrice;
      const itemGst = (itemSubtotal * (item.gstRate || 0)) / 100;
      subtotal += itemSubtotal;
      totalGst += itemGst;
    });

    return {
      subtotal,
      totalGst,
      grandTotal: subtotal + totalGst,
    };
  };

  const handleSubmit = async (
    e: React.FormEvent,
    status: "DRAFT" | "SUBMITTED",
  ) => {
    e.preventDefault();

    if (!formData.shopId) {
      setError("Please select a shop");
      return;
    }

    if (!formData.supplierName) {
      setError("Please enter supplier name");
      return;
    }

    // Validate GSTIN if provided
    if (formData.supplierGstin && !GSTIN_REGEX.test(formData.supplierGstin)) {
      setError("Invalid GSTIN format (e.g., 29ABCDE1234F1Z5)");
      return;
    }

    if (!formData.invoiceNumber) {
      setError("Please enter invoice number");
      return;
    }

    if (formData.items.length === 0) {
      setError("Please add at least one item");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // 1. Always Create Purchase (Draft)
      const purchase = await createPurchase(formData);

      // 2. If 'SUBMITTED', trigger atomic approval
      if (status === "SUBMITTED") {
        await submitPurchase(purchase.id);
      }

      router.push("/purchases");
    } catch (err: any) {
      setError(err.message || "Failed to create purchase");
      console.error("Create purchase error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totals = calculateTotals();

  if (isLoading) {
    return (
      <div
        className={`flex items-center justify-center min-h-screen ${
          theme === "dark" ? "bg-gray-950" : "bg-gray-50"
        }`}
      >
        <div className="text-center">
          <div
            className={`inline-block animate-spin rounded-full h-12 w-12 border-b-2 ${
              theme === "dark" ? "border-teal-500" : "border-teal-600"
            }`}
          ></div>
          <p
            className={`mt-4 ${
              theme === "dark" ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${
        theme === "dark" ? "bg-gray-950" : "bg-gray-50"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1
            className={`text-3xl font-bold ${
              theme === "dark" ? "text-white" : "text-gray-900"
            }`}
          >
            New Purchase Invoice
          </h1>
          <p
            className={`mt-2 ${
              theme === "dark" ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Create and track supplier invoices
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/15 border border-red-500/30 rounded-lg">
            <p className="text-red-500">{error}</p>
          </div>
        )}

        <form className="space-y-8">
          {/* Supplier & Invoice Details */}
          <div
            className={`${
              theme === "dark"
                ? "bg-gray-900 border-gray-800"
                : "bg-white border-gray-200"
            } border rounded-lg p-6`}
          >
            <h2
              className={`text-lg font-semibold mb-6 ${
                theme === "dark" ? "text-white" : "text-gray-900"
              }`}
            >
              Supplier & Invoice Details
            </h2>

            <div className="grid grid-cols-3 gap-6 mb-6">
              {/* Shop */}
              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Shop
                </label>
                <select
                  value={formData.shopId}
                  onChange={(e) =>
                    setFormData({ ...formData, shopId: e.target.value })
                  }
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === "dark"
                      ? "bg-gray-800 border-gray-700 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                >
                  <option value="">Select shop...</option>
                  {shops.map((shop) => (
                    <option key={shop.id} value={shop.id}>
                      {shop.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Supplier */}
              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Supplier
                </label>
                <div className="relative">
                  {selectedSupplier ? (
                    <div className="flex items-center justify-between p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {selectedSupplier.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {selectedSupplier.phone}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSupplier(null);
                          setFormData((prev) => ({
                            ...prev,
                            globalSupplierId: "",
                            supplierName: "",
                          }));
                        }}
                        className="text-gray-400 hover:text-red-500 p-1"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <PartySelector
                      type="VENDOR"
                      onSelect={(party) => {
                        setSelectedSupplier(party);
                        setFormData((prev) => ({
                          ...prev,
                          globalSupplierId: party.id,
                          supplierName: party.name,
                        }));
                      }}
                      placeholder="Search existing supplier..."
                    />
                  )}
                </div>
              </div>

              {/* Supplier Name (Manual Entry) */}
              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Supplier Name *
                </label>
                <input
                  type="text"
                  value={formData.supplierName}
                  onChange={(e) =>
                    setFormData({ ...formData, supplierName: e.target.value })
                  }
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === "dark"
                      ? "bg-gray-800 border-gray-700 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                  placeholder="Supplier name"
                />
              </div>

              {/* Supplier GSTIN (Manual Entry) */}
              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Supplier GSTIN (Optional)
                </label>
                <input
                  type="text"
                  value={formData.supplierGstin || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      supplierGstin: e.target.value.toUpperCase(),
                    })
                  }
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === "dark"
                      ? "bg-gray-800 border-gray-700 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                  placeholder="Ex: 29ABCDE1234F1Z5"
                  maxLength={15}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 mb-6">
              {/* Invoice Number */}
              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Invoice Number *
                </label>
                <input
                  type="text"
                  value={formData.invoiceNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, invoiceNumber: e.target.value })
                  }
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === "dark"
                      ? "bg-gray-800 border-gray-700 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                  placeholder="Invoice number"
                />
              </div>

              {/* Invoice Date */}
              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Invoice Date
                </label>
                <input
                  type="date"
                  value={formData.invoiceDate}
                  onChange={(e) =>
                    setFormData({ ...formData, invoiceDate: e.target.value })
                  }
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === "dark"
                      ? "bg-gray-800 border-gray-700 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                />
              </div>

              {/* Due Date */}
              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Due Date
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) =>
                    setFormData({ ...formData, dueDate: e.target.value })
                  }
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === "dark"
                      ? "bg-gray-800 border-gray-700 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                />
              </div>
            </div>

            {/* Payment Method */}
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Payment Method
                </label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      paymentMethod: e.target.value as PaymentMode,
                    })
                  }
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === "dark"
                      ? "bg-gray-800 border-gray-700 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK">Bank Transfer</option>
                </select>
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div
            className={`${
              theme === "dark"
                ? "bg-gray-900 border-gray-800"
                : "bg-white border-gray-200"
            } border rounded-lg p-6`}
          >
            <h2
              className={`text-lg font-semibold mb-6 ${
                theme === "dark" ? "text-white" : "text-gray-900"
              }`}
            >
              Items
            </h2>

            {/* Current Item Input */}
            <div className="mb-6 p-4 bg-gray-500/10 rounded-lg">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Description
                  </label>
                  <input
                    type="text"
                    value={currentItem.description}
                    onChange={(e) =>
                      setCurrentItem({
                        ...currentItem,
                        description: e.target.value,
                      })
                    }
                    className={`w-full px-3 py-2 rounded-lg border ${
                      theme === "dark"
                        ? "bg-gray-800 border-gray-700 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                    placeholder="Item description"
                  />
                </div>

                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={currentItem.quantity}
                    onChange={(e) =>
                      setCurrentItem({
                        ...currentItem,
                        quantity: parseInt(e.target.value) || 1,
                      })
                    }
                    className={`w-full px-3 py-2 rounded-lg border ${
                      theme === "dark"
                        ? "bg-gray-800 border-gray-700 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                    min="1"
                  />
                </div>

                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Price
                  </label>
                  <input
                    type="number"
                    value={currentItem.purchasePrice}
                    onChange={(e) =>
                      setCurrentItem({
                        ...currentItem,
                        purchasePrice: parseFloat(e.target.value) || 0,
                      })
                    }
                    className={`w-full px-3 py-2 rounded-lg border ${
                      theme === "dark"
                        ? "bg-gray-800 border-gray-700 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    GST %
                  </label>
                  <input
                    type="number"
                    value={currentItem.gstRate}
                    onChange={(e) =>
                      setCurrentItem({
                        ...currentItem,
                        gstRate: parseFloat(e.target.value) || 0,
                      })
                    }
                    className={`w-full px-3 py-2 rounded-lg border ${
                      theme === "dark"
                        ? "bg-gray-800 border-gray-700 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2 rounded-lg font-medium transition-colors"
              >
                + Add Item
              </button>
            </div>

            {/* Items List */}
            {formData.items.length > 0 ? (
              <div className="overflow-x-auto mb-6">
                <table
                  className={`w-full text-sm ${
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  <thead>
                    <tr
                      className={`border-b ${
                        theme === "dark" ? "border-gray-700" : "border-gray-200"
                      }`}
                    >
                      <th className="text-left py-3 px-4">Description</th>
                      <th className="text-right py-3 px-4">Qty</th>
                      <th className="text-right py-3 px-4">Price</th>
                      <th className="text-right py-3 px-4">GST %</th>
                      <th className="text-right py-3 px-4">Subtotal</th>
                      <th className="text-right py-3 px-4">GST</th>
                      <th className="text-right py-3 px-4">Total</th>
                      <th className="text-center py-3 px-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item, index) => {
                      const subtotal = item.quantity * item.purchasePrice;
                      const gst = (subtotal * (item.gstRate || 0)) / 100;
                      const total = subtotal + gst;

                      return (
                        <tr
                          key={index}
                          className={`border-b ${
                            theme === "dark"
                              ? "border-gray-700"
                              : "border-gray-200"
                          }`}
                        >
                          <td className="py-3 px-4">{item.description}</td>
                          <td className="text-right py-3 px-4">
                            {item.quantity}
                          </td>
                          <td className="text-right py-3 px-4">
                            ₹{item.purchasePrice.toFixed(2)}
                          </td>
                          <td className="text-right py-3 px-4">
                            {item.gstRate}%
                          </td>
                          <td className="text-right py-3 px-4">
                            ₹{subtotal.toFixed(2)}
                          </td>
                          <td className="text-right py-3 px-4">
                            ₹{gst.toFixed(2)}
                          </td>
                          <td className="text-right py-3 px-4 font-medium">
                            ₹{total.toFixed(2)}
                          </td>
                          <td className="text-center py-3 px-4">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p
                className={`text-center py-6 ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}
              >
                No items added yet
              </p>
            )}
          </div>

          {/* Totals */}
          <div
            className={`${
              theme === "dark"
                ? "bg-gray-900 border-gray-800"
                : "bg-white border-gray-200"
            } border rounded-lg p-6`}
          >
            <div className="flex justify-end mb-4">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span
                    className={
                      theme === "dark" ? "text-gray-400" : "text-gray-600"
                    }
                  >
                    Subtotal:
                  </span>
                  <span className="font-medium">
                    ₹{totals.subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span
                    className={
                      theme === "dark" ? "text-gray-400" : "text-gray-600"
                    }
                  >
                    Total GST:
                  </span>
                  <span className="font-medium">
                    ₹{totals.totalGst.toFixed(2)}
                  </span>
                </div>
                <div
                  className={`border-t pt-2 flex justify-between text-lg font-bold ${
                    theme === "dark" ? "border-gray-700" : "border-gray-200"
                  }`}
                >
                  <span>Grand Total:</span>
                  <span>₹{totals.grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-end">
            <button
              type="button"
              onClick={() => router.back()}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                theme === "dark"
                  ? "bg-gray-800 hover:bg-gray-700 text-white"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-900"
              }`}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={(e) => handleSubmit(e, "DRAFT")}
              disabled={isSubmitting}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                isSubmitting
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:opacity-90"
              } ${
                theme === "dark"
                  ? "bg-gray-800 hover:bg-gray-700 text-white"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-900"
              }`}
            >
              Save as Draft
            </button>

            <button
              type="button"
              onClick={(e) => handleSubmit(e, "SUBMITTED")}
              disabled={isSubmitting}
              className={`px-6 py-3 rounded-lg font-medium text-white transition-colors ${
                isSubmitting
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:opacity-90"
              } bg-teal-600 hover:bg-teal-700`}
            >
              {isSubmitting ? "Creating..." : "Create Purchase"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
