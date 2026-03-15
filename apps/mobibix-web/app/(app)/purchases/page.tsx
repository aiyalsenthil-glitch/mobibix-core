"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  listPurchases,
  createPurchase,
  recordPayment,
//   cancelPurchase,
  type Purchase,
  type CreatePurchaseDto,
  type PurchaseItemDto,
  type PurchaseStatus,
  type PaymentMode,
  type RecordPaymentDto,
} from "@/services/purchases.api";
import { listSuppliers, type Supplier } from "@/services/suppliers.api";
// import { authenticatedFetch } from "@/services/auth.api";
import { useTheme } from "@/context/ThemeContext";
import { useShop } from "@/context/ShopContext";
import { NoShopsAlert } from "../components/NoShopsAlert";

const STATUS_COLORS: Record<PurchaseStatus, string> = {
  DRAFT: "bg-gray-500/15 text-gray-400",
  SUBMITTED: "bg-teal-500/15 text-teal-400",
  PARTIALLY_PAID: "bg-amber-500/15 text-amber-400",
  PAID: "bg-green-500/15 text-green-400",
  CANCELLED: "bg-red-500/15 text-red-400",
};

const PAYMENT_BADGES: Record<PaymentMode, string> = {
  CASH: "bg-gray-500/15 text-gray-200",
  UPI: "bg-purple-500/15 text-purple-300",
  CARD: "bg-teal-500/15 text-teal-300",
  BANK: "bg-amber-500/15 text-amber-300",
};

import { CancelPurchaseModal } from "@/components/purchases/CancelPurchaseModal";

export default function PurchasesPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const {
    shops,
    selectedShopId: contextSelectedShopId,
    selectShop: _selectShop,
    isLoadingShops,
  } = useShop();
  const [selectedShopId, setSelectedShopId] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedPurchaseForCancel, setSelectedPurchaseForCancel] = useState<Purchase | null>(null);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(
    null,
  );

  // Form state
  const [formData, setFormData] = useState<CreatePurchaseDto>({
    shopId: "",
    globalSupplierId: "",
    supplierName: "",
    invoiceNumber: "",
    invoiceDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    paymentMethod: "CASH",
    items: [],
  });

  // Payment form state
  const [paymentData, setPaymentData] = useState<RecordPaymentDto>({
    amount: 0,
    paymentMethod: "CASH",
    paymentReference: "",
    notes: "",
  });

  // Current item being added
  const [currentItem, setCurrentItem] = useState<PurchaseItemDto>({
    description: "",
    quantity: 1,
    purchasePrice: 0,
    gstRate: 18,
  });

  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        setError(null);
        // console.log("Loading suppliers...");

        const suppliersData = await listSuppliers();
        // console.log("Suppliers loaded:", suppliersData);
        setSuppliers(suppliersData);
      } catch (err: unknown) {
        console.error("Error loading suppliers:", err);
        setError(err instanceof Error ? err.message : "Failed to load suppliers");
        setSuppliers([]);
      }
    };

    loadSuppliers();
  }, []);

  // Sync context selectedShopId to local state
  useEffect(() => {
    setSelectedShopId(contextSelectedShopId);
  }, [contextSelectedShopId]);

  const loadPurchases = async () => {
    if (!selectedShopId) {
      setError("Please select a shop first");
      setPurchases([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await listPurchases({ shopId: selectedShopId });
      setPurchases(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load purchases");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedShopId) {
      loadPurchases();
    }
  }, [selectedShopId]);

  const handleAddItem = () => {
    if (
      !currentItem.description ||
      currentItem.quantity <= 0 ||
      currentItem.purchasePrice <= 0
    ) {
      alert("Please fill in all item details");
      return;
    }

    setFormData({
      ...formData,
      items: [...formData.items, { ...currentItem }],
    });

    setCurrentItem({
      description: "",
      quantity: 1,
      purchasePrice: 0,
      gstRate: 18,
    });
  };

  const handleRemoveItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const calculateItemTotal = (item: PurchaseItemDto) => {
    const subTotal = item.quantity * item.purchasePrice;
    const gst = (subTotal * (item.gstRate || 0)) / 100;
    return subTotal + gst;
  };

  const calculateTotals = () => {
    const subTotal = formData.items.reduce(
      (sum, item) => sum + item.quantity * item.purchasePrice,
      0,
    );
    const totalGst = formData.items.reduce(
      (sum, item) =>
        sum + (item.quantity * item.purchasePrice * (item.gstRate || 0)) / 100,
      0,
    );
    return {
      subTotal,
      totalGst,
      grandTotal: subTotal + totalGst,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.items.length === 0) {
      alert("Please add at least one item");
      return;
    }

    try {
      await createPurchase({
        ...formData,
        shopId: selectedShopId,
      });
      setShowForm(false);
      resetForm();
      loadPurchases();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to create purchase");
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPurchase) return;

    try {
      await recordPayment(selectedPurchase.id, paymentData);
      setShowPaymentModal(false);
      setSelectedPurchase(null);
      resetPaymentForm();
      loadPurchases();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to record payment");
    }
  };

  /* 
   * Replaced by CancelPurchaseModal
   * 
  const handleCancel = async (purchaseId: string) => {
    if (!confirm("Are you sure you want to cancel this purchase?")) return;

    try {
      await cancelPurchase(purchaseId);
      loadPurchases();
    } catch (err: any) {
      alert(err.message || "Failed to cancel purchase");
    }
  }; 
  */
 
  const openCancelModal = (purchase: Purchase) => {
    setSelectedPurchaseForCancel(purchase);
    setShowCancelModal(true);
  };

  const resetForm = () => {
    setFormData({
      shopId: selectedShopId,
      globalSupplierId: "",
      supplierName: "",
      invoiceNumber: "",
      invoiceDate: new Date().toISOString().split("T")[0],
      dueDate: "",
      paymentMethod: "CASH",
      items: [],
    });
    setCurrentItem({
      description: "",
      quantity: 1,
      purchasePrice: 0,
      gstRate: 18,
    });
  };

  const resetPaymentForm = () => {
    setPaymentData({
      amount: 0,
      paymentMethod: "CASH",
      paymentReference: "",
      notes: "",
    });
  };

  const openPaymentModal = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setPaymentData({
      amount: purchase.outstandingAmount,
      paymentMethod: "CASH",
      paymentReference: "",
      notes: "",
    });
    setShowPaymentModal(true);
  };

  const handleSupplierChange = (supplierId: string) => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    setFormData({
      ...formData,
      globalSupplierId: supplierId,
      supplierName: supplier?.name || "",
    });
  };

  const totals = calculateTotals();

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1
              className={`text-2xl font-bold ${
                theme === "dark" ? "text-white" : "text-gray-900"
              }`}
            >
              Supplier Invoices
            </h1>
            <p
              className={`text-sm ${
                theme === "dark" ? "text-stone-400" : "text-gray-600"
              }`}
            >
              Manage financial records and payables
            </p>
          </div>
            <button
              onClick={() => router.push("/purchases/new")}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors font-medium"
            >
              + Record Invoice
            </button>
        </div>

        {/* Shop Selector */}
        <div className="mb-6">
          <label
            className={`block text-sm font-medium mb-2 ${
              theme === "dark" ? "text-gray-300" : "text-gray-700"
            }`}
          >
            Select Shop{" "}
            {isLoadingShops && (
              <span className="text-xs text-gray-400">(Loading...)</span>
            )}
          </label>
          {isLoadingShops ? (
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-500"></div>
              <span
                className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
              >
                Loading shops...
              </span>
            </div>
          ) : shops.length === 0 ? null : (
            <select
              value={selectedShopId}
              onChange={(e) => setSelectedShopId(e.target.value)}
              className={`w-full max-w-md px-3 py-2 rounded-lg border ${
                theme === "dark"
                  ? "bg-gray-800 border-gray-700 text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            >
              <option value="">-- Select a shop --</option>
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Purchase Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div
              className={`${
                theme === "dark" ? "bg-gray-900" : "bg-white"
              } rounded-lg p-6 max-w-4xl w-full my-8`}
            >
              <h2
                className={`text-xl font-bold mb-4 ${
                  theme === "dark" ? "text-white" : "text-gray-900"
                }`}
              >
                New Purchase Invoice
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Supplier & Invoice Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      className={`block text-sm font-medium mb-1 ${
                        theme === "dark" ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Supplier
                    </label>
                    <select
                      value={formData.globalSupplierId}
                      onChange={(e) => handleSupplierChange(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        theme === "dark"
                          ? "bg-gray-800 border-gray-700 text-white"
                          : "bg-white border-gray-300 text-gray-900"
                      }`}
                    >
                      <option value="">-- Select or enter manually --</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-medium mb-1 ${
                        theme === "dark" ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Supplier Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.supplierName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          supplierName: e.target.value,
                        })
                      }
                      className={`w-full px-3 py-2 rounded-lg border ${
                        theme === "dark"
                          ? "bg-gray-800 border-gray-700 text-white"
                          : "bg-white border-gray-300 text-gray-900"
                      }`}
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-medium mb-1 ${
                        theme === "dark" ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Invoice Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.invoiceNumber}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          invoiceNumber: e.target.value,
                        })
                      }
                      className={`w-full px-3 py-2 rounded-lg border ${
                        theme === "dark"
                          ? "bg-gray-800 border-gray-700 text-white"
                          : "bg-white border-gray-300 text-gray-900"
                      }`}
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-medium mb-1 ${
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

                  <div>
                    <label
                      className={`block text-sm font-medium mb-1 ${
                        theme === "dark" ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Invoice Date
                    </label>
                    <input
                      type="date"
                      value={formData.invoiceDate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          invoiceDate: e.target.value,
                        })
                      }
                      className={`w-full px-3 py-2 rounded-lg border ${
                        theme === "dark"
                          ? "bg-gray-800 border-gray-700 text-white"
                          : "bg-white border-gray-300 text-gray-900"
                      }`}
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-medium mb-1 ${
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

                {/* Items Section */}
                <div>
                  <h3
                    className={`font-semibold mb-3 ${
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Purchase Items
                  </h3>

                  {/* Add Item Form */}
                  <div
                    className={`p-4 rounded-lg border mb-4 ${
                      theme === "dark"
                        ? "bg-gray-800 border-gray-700"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      <div className="md:col-span-2">
                        <input
                          type="text"
                          placeholder="Description *"
                          value={currentItem.description}
                          onChange={(e) =>
                            setCurrentItem({
                              ...currentItem,
                              description: e.target.value,
                            })
                          }
                          className={`w-full px-3 py-2 rounded-lg border ${
                            theme === "dark"
                              ? "bg-gray-900 border-gray-700 text-white"
                              : "bg-white border-gray-300 text-gray-900"
                          }`}
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          placeholder="Qty"
                          min="1"
                          value={currentItem.quantity}
                          onChange={(e) =>
                            setCurrentItem({
                              ...currentItem,
                              quantity: parseFloat(e.target.value) || 0,
                            })
                          }
                          className={`w-full px-3 py-2 rounded-lg border ${
                            theme === "dark"
                              ? "bg-gray-900 border-gray-700 text-white"
                              : "bg-white border-gray-300 text-gray-900"
                          }`}
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          placeholder="Price"
                          min="0"
                          step="0.01"
                          value={currentItem.purchasePrice}
                          onChange={(e) =>
                            setCurrentItem({
                              ...currentItem,
                              purchasePrice: parseFloat(e.target.value) || 0,
                            })
                          }
                          className={`w-full px-3 py-2 rounded-lg border ${
                            theme === "dark"
                              ? "bg-gray-900 border-gray-700 text-white"
                              : "bg-white border-gray-300 text-gray-900"
                          }`}
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          placeholder="GST %"
                          min="0"
                          max="100"
                          value={currentItem.gstRate}
                          onChange={(e) =>
                            setCurrentItem({
                              ...currentItem,
                              gstRate: parseFloat(e.target.value) || 0,
                            })
                          }
                          className={`w-full px-3 py-2 rounded-lg border ${
                            theme === "dark"
                              ? "bg-gray-900 border-gray-700 text-white"
                              : "bg-white border-gray-300 text-gray-900"
                          }`}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="mt-3 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors text-sm"
                    >
                      + Add Item
                    </button>
                  </div>

                  {/* Items List */}
                  {formData.items.length > 0 && (
                    <div className="space-y-2">
                      {formData.items.map((item, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg border flex items-center justify-between ${
                            theme === "dark"
                              ? "bg-gray-800 border-gray-700"
                              : "bg-white border-gray-200"
                          }`}
                        >
                          <div className="flex-1">
                            <div
                              className={`font-medium ${
                                theme === "dark"
                                  ? "text-white"
                                  : "text-gray-900"
                              }`}
                            >
                              {item.description}
                            </div>
                            <div
                              className={`text-sm ${
                                theme === "dark"
                                  ? "text-gray-400"
                                  : "text-gray-600"
                              }`}
                            >
                              Qty: {item.quantity} × ₹{item.purchasePrice} (GST:{" "}
                              {item.gstRate}%)
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div
                              className={`font-semibold ${
                                theme === "dark"
                                  ? "text-white"
                                  : "text-gray-900"
                              }`}
                            >
                              ₹{calculateItemTotal(item).toFixed(2)}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="text-red-400 hover:text-red-300"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Totals */}
                  {formData.items.length > 0 && (
                    <div
                      className={`mt-4 p-4 rounded-lg border ${
                        theme === "dark"
                          ? "bg-gray-800 border-gray-700"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className="flex justify-between mb-2">
                        <span
                          className={
                            theme === "dark" ? "text-gray-400" : "text-gray-600"
                          }
                        >
                          Subtotal:
                        </span>
                        <span
                          className={
                            theme === "dark" ? "text-white" : "text-gray-900"
                          }
                        >
                          ₹{totals.subTotal.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span
                          className={
                            theme === "dark" ? "text-gray-400" : "text-gray-600"
                          }
                        >
                          Total GST:
                        </span>
                        <span
                          className={
                            theme === "dark" ? "text-white" : "text-gray-900"
                          }
                        >
                          ₹{totals.totalGst.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-600">
                        <span
                          className={
                            theme === "dark" ? "text-white" : "text-gray-900"
                          }
                        >
                          Grand Total:
                        </span>
                        <span className="text-teal-400">
                          ₹{totals.grandTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Form Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors font-medium"
                  >
                    Create Purchase
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                    className={`flex-1 px-4 py-2 rounded-lg transition-colors font-medium ${
                      theme === "dark"
                        ? "bg-gray-800 hover:bg-gray-700 text-white"
                        : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && selectedPurchase && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div
              className={`${
                theme === "dark" ? "bg-gray-900" : "bg-white"
              } rounded-lg p-6 max-w-md w-full`}
            >
              <h2
                className={`text-xl font-bold mb-4 ${
                  theme === "dark" ? "text-white" : "text-gray-900"
                }`}
              >
                Record Payment
              </h2>

              <div className="mb-4 p-3 bg-teal-500/10 border border-teal-500/30 rounded-lg">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Invoice:</span>
                  <span
                    className={
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }
                  >
                    {selectedPurchase.invoiceNumber}
                  </span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Grand Total:</span>
                  <span
                    className={
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }
                  >
                    ₹{selectedPurchase.grandTotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Paid:</span>
                  <span
                    className={
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }
                  >
                    ₹{selectedPurchase.paidAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between font-bold pt-2 border-t border-teal-500/30">
                  <span className="text-teal-400">Outstanding:</span>
                  <span className="text-teal-400">
                    ₹{selectedPurchase.outstandingAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              <form onSubmit={handleRecordPayment} className="space-y-4">
                <div>
                  <label
                    className={`block text-sm font-medium mb-1 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Payment Amount *
                  </label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    max={selectedPurchase.outstandingAmount}
                    step="0.01"
                    value={paymentData.amount}
                    onChange={(e) =>
                      setPaymentData({
                        ...paymentData,
                        amount: parseFloat(e.target.value) || 0,
                      })
                    }
                    className={`w-full px-3 py-2 rounded-lg border ${
                      theme === "dark"
                        ? "bg-gray-800 border-gray-700 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  />
                </div>

                <div>
                  <label
                    className={`block text-sm font-medium mb-1 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Payment Method
                  </label>
                  <select
                    value={paymentData.paymentMethod}
                    onChange={(e) =>
                      setPaymentData({
                        ...paymentData,
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

                <div>
                  <label
                    className={`block text-sm font-medium mb-1 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Reference Number
                  </label>
                  <input
                    type="text"
                    value={paymentData.paymentReference}
                    onChange={(e) =>
                      setPaymentData({
                        ...paymentData,
                        paymentReference: e.target.value,
                      })
                    }
                    className={`w-full px-3 py-2 rounded-lg border ${
                      theme === "dark"
                        ? "bg-gray-800 border-gray-700 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  />
                </div>

                <div>
                  <label
                    className={`block text-sm font-medium mb-1 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Notes
                  </label>
                  <textarea
                    value={paymentData.notes}
                    onChange={(e) =>
                      setPaymentData({ ...paymentData, notes: e.target.value })
                    }
                    rows={3}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      theme === "dark"
                        ? "bg-gray-800 border-gray-700 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors font-medium"
                  >
                    Record Payment
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPaymentModal(false);
                      setSelectedPurchase(null);
                      resetPaymentForm();
                    }}
                    className={`flex-1 px-4 py-2 rounded-lg transition-colors font-medium ${
                      theme === "dark"
                        ? "bg-gray-800 hover:bg-gray-700 text-white"
                        : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Purchases List */}
        {shops.length === 0 ? (
          <NoShopsAlert variant="compact" />
        ) : isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
            <p
              className={`mt-4 ${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Loading purchases...
            </p>
          </div>
        ) : !selectedShopId ? (
          <div
            className={`text-center py-12 ${
              theme === "dark"
                ? "bg-gray-900 border-gray-800"
                : "bg-white border-gray-200"
            } rounded-lg border`}
          >
            <p
              className={`${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Please select a shop to view purchases
            </p>
          </div>
        ) : purchases.length === 0 ? (
          <div
            className={`text-center py-12 ${
              theme === "dark"
                ? "bg-gray-900 border-gray-800"
                : "bg-white border-gray-200"
            } rounded-lg border`}
          >
            <p
              className={`${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}
            >
              No purchases yet. Click &quot;New Purchase&quot; to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {purchases.map((purchase) => (
              <div
                key={purchase.id}
                className={`p-4 rounded-lg border ${
                  theme === "dark"
                    ? "bg-gray-900 border-gray-800"
                    : "bg-white border-gray-200"
                } hover:shadow-lg transition-shadow`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3
                      className={`font-semibold ${
                        theme === "dark" ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {purchase.supplierName}
                    </h3>
                    <p
                      className={`text-sm ${
                        theme === "dark" ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      Invoice: {purchase.invoiceNumber}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span
                      className={`px-2 py-1 text-xs rounded ${STATUS_COLORS[purchase.status]}`}
                    >
                      {purchase.status}
                    </span>
                    <span
                      className={`px-2 py-1 text-xs rounded ${PAYMENT_BADGES[purchase.paymentMethod]}`}
                    >
                      {purchase.paymentMethod}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                  <div>
                    <div
                      className={`text-xs ${
                        theme === "dark" ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      Grand Total
                    </div>
                    <div
                      className={`font-semibold ${
                        theme === "dark" ? "text-white" : "text-gray-900"
                      }`}
                    >
                      ₹{purchase.grandTotal.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div
                      className={`text-xs ${
                        theme === "dark" ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      Paid
                    </div>
                    <div className="font-semibold text-green-400">
                      ₹{purchase.paidAmount.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div
                      className={`text-xs ${
                        theme === "dark" ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      Outstanding
                    </div>
                    <div className="font-semibold text-amber-400">
                      ₹{purchase.outstandingAmount.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div
                      className={`text-xs ${
                        theme === "dark" ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      Items
                    </div>
                    <div
                      className={`font-semibold ${
                        theme === "dark" ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {purchase.items.length}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {purchase.outstandingAmount > 0 &&
                    purchase.status !== "CANCELLED" && (
                      <button
                        onClick={() => openPaymentModal(purchase)}
                        className="px-3 py-1.5 bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 rounded text-sm transition-colors"
                      >
                        Record Payment
                      </button>
                    )}
                  {purchase.status !== "PAID" && purchase.status !== "CANCELLED" && (
                    <button
                      onClick={() => openCancelModal(purchase)}
                      className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedPurchaseForCancel && (
          <CancelPurchaseModal
            purchaseId={selectedPurchaseForCancel.id}
            invoiceNumber={selectedPurchaseForCancel.invoiceNumber}
            isOpen={showCancelModal}
            onClose={() => {
              setShowCancelModal(false);
              setSelectedPurchaseForCancel(null);
            }}
            onSuccess={() => {
              loadPurchases();
            }}
          />
        )}
      </div>
    </div>
  );
}
