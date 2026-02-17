"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { listProducts, type ShopProduct } from "@/services/products.api";
import { getStockBalances } from "@/services/stock.api";
import { createInvoice } from "@/services/sales.api";
import { useShop } from "@/context/ShopContext";
import { CustomerModal } from "../../customers/CustomerModal";
import { ProductModal } from "../../products/ProductModal";
import { useInvoiceForm } from "@/hooks/useInvoiceForm";
import { InvoiceCustomerSelector } from "@/components/sales/InvoiceCustomerSelector";
import { InvoiceProductTable } from "@/components/sales/InvoiceProductTable";
import { Trash2 } from "lucide-react";

export default function CreateInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shopIdParam = searchParams.get("shopId");

  const {
    selectedShopId,
    selectedShop,
    isLoadingShops,
    error: shopError,
    selectShop,
  } = useShop();

  // If shopId is in URL, select it
  useEffect(() => {
    if (shopIdParam && selectedShopId !== shopIdParam) {
      selectShop(shopIdParam);
    }
  }, [shopIdParam, selectedShopId, selectShop]);

  // Hook for Form Logic
  const {
    selectedCustomer,
    setSelectedCustomer,
    invoiceDate,
    setInvoiceDate,
    items,
    params: { pricesIncludeTax },
    setPricesIncludeTax,
    paymentMode,
    setPaymentMode,
    splitPayments,
    setSplitPayments,
    addItem,
    removeItem,
    updateItem,
    totals: { subtotal, totalGst, grandTotal },
  } = useInvoiceForm({ shopGstEnabled: selectedShop?.gstEnabled });

  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imeiHighlight, setImeiHighlight] = useState(false);

  // Load products when shop is selected
  useEffect(() => {
    if (selectedShopId) {
      loadProducts(selectedShopId);
    }
  }, [selectedShopId]);

  // Prevent number inputs from changing on mouse wheel scroll
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" &&
        (target as HTMLInputElement).type === "number"
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener("wheel", handleWheel, { passive: false });
    return () => document.removeEventListener("wheel", handleWheel);
  }, []);

  const loadProducts = async (shopId: string) => {
    try {
      const [productsResponse, balances] = await Promise.all([
        listProducts(shopId),
        getStockBalances(shopId),
      ]);
      // Handle paginated response
      const productList = Array.isArray(productsResponse)
        ? productsResponse
        : productsResponse.data;
      const balanceMap = new Map(balances.map((b) => [b.productId, b]));
      const merged: ShopProduct[] = productList.map((p) => {
        const b = balanceMap.get(p.id);
        const stockQty = b?.stockQty ?? p.stockQty ?? 0;
        const isNegative = b?.isNegative ?? stockQty < 0;
        return { ...p, stockQty, isNegative };
      });
      setProducts(merged);
    } catch (err: any) {
      console.error("Failed to load products:", err);
    }
  };

  const handleCustomerModalClose = () => {
    setIsCustomerModalOpen(false);
  };

  const handleProductModalClose = () => {
    setIsProductModalOpen(false);
    if (selectedShopId) loadProducts(selectedShopId);
  };

  const handleProductCreated = (product: ShopProduct) => {
    setProducts([...products, product]);
    setIsProductModalOpen(false);
    if (selectedShopId) loadProducts(selectedShopId);
  };

  const isInterState =
    selectedShop &&
    selectedCustomer &&
    selectedShop.state !== selectedCustomer.state;

  const handleSubmit = async () => {
    if (!selectedShop) {
      setError("Please select a shop");
      return;
    }
    if (!selectedCustomer) {
      setError("Please select a customer");
      return;
    }
    if (items.length === 0) {
      setError("Please add at least one product");
      return;
    }
    if (items.some((i) => !i.shopProductId || i.quantity <= 0 || i.rate < 0)) {
      setError("Please complete all product details");
      return;
    }

    // Serialized validation: IMEIs required and must match quantity
    const serializedMissing = items.some((i) => {
      const p = products.find((pp) => pp.id === i.shopProductId);
      return p?.isSerialized && (!i.imeis || i.imeis.length === 0);
    });
    if (serializedMissing) {
      setError(
        "Missing IMEIs: Please enter IMEI numbers for all serialized products",
      );
      setImeiHighlight(true);
      return;
    }

    const serializedCountMismatch = items.some((i) => {
      const p = products.find((pp) => pp.id === i.shopProductId);
      return p?.isSerialized && i.imeis && i.imeis.length !== i.quantity;
    });
    if (serializedCountMismatch) {
      setError(
        "IMEI count mismatch: Each product quantity must have matching IMEIs",
      );
      setImeiHighlight(true);
      return;
    }

    setLoading(true);
    setError(null);
    setImeiHighlight(false);

    try {
      // Validate split payments if MIXED mode
      if (paymentMode === "MIXED") {
        if (splitPayments.some((p) => !p.amount || parseFloat(p.amount) <= 0)) {
          setError("Please enter valid amounts for all payment methods");
          setLoading(false);
          return;
        }

        const splitTotal = splitPayments.reduce(
          (sum, p) => sum + parseFloat(p.amount),
          0,
        );
        if (splitTotal > grandTotal + 1) {
          setError(
            `Split payment total (₹${splitTotal.toFixed(2)}) exceeds invoice total (₹${grandTotal.toFixed(2)})`,
          );
          setLoading(false);
          return;
        }
      }

      // Prepare payload
      const payload: any = {
        shopId: selectedShop.id,
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerPhone: selectedCustomer.phone,
        customerState: selectedCustomer.state,
        customerGstin: selectedCustomer.gstNumber,
        invoiceDate, // Add invoice Date
        pricesIncludeTax,
        items: items.map((item) => ({
          shopProductId: item.shopProductId,
          quantity: item.quantity,
          rate: item.rate,
          gstRate: item.gstRate,
          gstAmount: item.gstAmount,
          imeis: item.imeis && item.imeis.length > 0 ? item.imeis : undefined,
        })),
      };

      // Handle Payment Modes
      if (paymentMode === "MIXED") {
        // Atomic creation with mixed payments
        payload.paymentMode = splitPayments[0].mode; // Default primary to first mode
        payload.paymentMethods = splitPayments.map((p) => ({
          mode: p.mode,
          amount: parseFloat(p.amount),
        }));
      } else {
        // Single mode
        payload.paymentMode = paymentMode;
      }

      await createInvoice(payload);

      // Navigate on success
      router.push(`/sales?shopId=${selectedShopId}`);
    } catch (err: any) {
      const msg = (err?.message || "Failed to create invoice") as string;

      // Handle cost-related errors with product context
      if (
        msg.includes("Cannot sell product") &&
        msg.includes("without a valid cost price")
      ) {
        // Extract product name from backend error if available
        const match = msg.match(/Cannot sell product "([^"]+)"/);
        const productName = match ? match[1] : "One or more products";
        setError(
          `${productName} cannot be sold because cost is missing. ` +
            `Please add a purchase or set the cost manually before selling.`,
        );
      } else if (msg.includes("Insufficient stock")) {
        setError("Insufficient stock. Please add purchase or reduce quantity.");
      } else if (msg.includes("Serialized products require IMEI")) {
        setError(
          "Serialized products require IMEI. Please enter IMEI numbers.",
        );
        setImeiHighlight(true);
      } else if (msg.includes("IMEI is not available")) {
        setError("One or more IMEIs are already sold or unavailable.");
        setImeiHighlight(true);
      } else {
        // Show backend message verbatim for other errors
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (isLoadingShops) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0b0f14] text-slate-700 dark:text-slate-200 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-teal-400/40 border-t-teal-400 animate-spin"></div>
          <p className="text-xs uppercase tracking-[0.35em] text-teal-600 dark:text-teal-300/70">
            Loading
          </p>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Preparing invoice workspace...
          </p>
        </div>
      </div>
    );
  }

  if (!selectedShop) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0b0f14] text-slate-700 dark:text-slate-200 flex items-center justify-center px-6">
        <div className="max-w-lg w-full rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-8 text-center shadow-lg dark:shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
          <p className="text-xs uppercase tracking-[0.35em] text-rose-600 dark:text-rose-300/80">
            Missing shop
          </p>
          <h2 className="mt-3 text-2xl font-[var(--font-playfair)] text-slate-900 dark:text-slate-100">
            No shop selected
          </h2>
          <p className="mt-3 text-slate-600 dark:text-slate-400">
            Choose a shop to create invoices and manage inventory-linked stock.
          </p>
          <button
            onClick={() => router.push("/sales")}
            className="mt-6 px-6 py-3 rounded-xl bg-teal-500/90 text-white font-semibold hover:bg-teal-600 dark:hover:bg-teal-400 transition"
          >
            Back to Sales
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0b0f14] text-slate-900 dark:text-slate-100">
      <div className="max-w-[1400px] mx-auto py-6 px-6">
        <div className="relative overflow-hidden rounded-[24px] border border-slate-200 dark:border-white/10 bg-gradient-to-br from-slate-100 via-white to-slate-50 dark:from-white/10 dark:via-white/5 dark:to-transparent p-6 shadow-xl dark:shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
          <div className="absolute -top-40 -right-24 h-72 w-72 rounded-full bg-teal-500/10 dark:bg-teal-500/20 blur-[120px]"></div>
          <div className="absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-amber-400/5 dark:bg-amber-400/10 blur-[120px]"></div>
          <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-teal-600 dark:text-teal-300/70">
                Sales Workspace
              </p>
              <h1 className="mt-2 text-2xl md:text-3xl font-[var(--font-playfair)] text-slate-900 dark:text-white">
                New Sales Invoice
              </h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 max-w-xl">
                Build a clean, GST-ready invoice with live stock, customer, and
                payment visibility in one pass.
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2.5">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Active shop
                </p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {selectedShop?.name ?? "Selected shop"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {shopError && (
          <div className="mt-4 rounded-2xl border border-rose-400 dark:border-rose-500/30 bg-rose-100 dark:bg-rose-500/10 px-4 py-2.5 text-rose-800 dark:text-rose-200">
            <span className="mr-2">⚠️</span>
            {shopError}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-2xl border border-rose-400 dark:border-rose-500/30 bg-rose-100 dark:bg-rose-500/10 px-4 py-2.5 text-rose-800 dark:text-rose-200">
            <span className="mr-2">⚠️</span>
            {error}
          </div>
        )}

        <div className="mt-6 space-y-5">
          {/* Combined Customer & Invoice Details Row */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5">
            <div className="rounded-[24px] border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 shadow-lg dark:shadow-[0_16px_50px_rgba(0,0,0,0.35)]">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Customer Details
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Search or add a new customer.
                </p>
              </div>
              <InvoiceCustomerSelector
                selectedCustomer={selectedCustomer}
                onSelectCustomer={setSelectedCustomer}
                onClearCustomer={() => setSelectedCustomer(null)}
                onNewCustomer={() => setIsCustomerModalOpen(true)}
              />
            </div>

            <div className="rounded-[24px] border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 shadow-lg dark:shadow-[0_16px_50px_rgba(0,0,0,0.35)]">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Invoice Details
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Confirm timing and tax handling.
                </p>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 mb-2">
                  Invoice Date
                </label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-400/70 transition"
                />
              </div>
              {isInterState && selectedShop?.gstEnabled && (
                <div className="mt-4 rounded-xl border border-sky-400/30 bg-sky-100 dark:bg-sky-400/10 px-4 py-2.5 text-sm text-sky-900 dark:text-sky-100">
                  <strong className="mr-2">Inter-State Sale:</strong>
                  IGST will be applied as customer state is different from shop
                  state.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 shadow-lg dark:shadow-[0_16px_50px_rgba(0,0,0,0.35)]">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Product Items
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Add products, quantities, and GST.
              </p>
            </div>
            <InvoiceProductTable
              items={items}
              products={products}
              pricesIncludeTax={pricesIncludeTax}
              onPricesIncludeTaxChange={setPricesIncludeTax}
              onUpdateItem={updateItem}
              onAddItem={addItem}
              onRemoveItem={removeItem}
              onNewProduct={() => setIsProductModalOpen(true)}
              imeiHighlight={imeiHighlight}
            />
          </div>
        </div>

        {/* Payment & Totals */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-5 mb-6">
          <div className="rounded-[24px] border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 shadow-lg dark:shadow-[0_16px_50px_rgba(0,0,0,0.35)]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Payment Mode
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Choose how the invoice is paid.
                </p>
              </div>
              <span className="rounded-full border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-slate-600 dark:text-slate-300">
                {paymentMode}
              </span>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {["CASH", "UPI", "CARD", "BANK", "CREDIT"].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setPaymentMode(mode as any)}
                  className={`px-4 py-3 rounded-2xl text-xs font-semibold tracking-[0.2em] transition border ${
                    paymentMode === mode
                      ? "bg-teal-400 text-white dark:text-slate-900 border-teal-300 shadow-[0_10px_30px_rgba(13,148,136,0.35)]"
                      : "bg-slate-100 dark:bg-black/40 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10"
                  }`}
                >
                  {mode}
                </button>
              ))}
              <button
                onClick={() => setPaymentMode("MIXED")}
                className={`px-4 py-3 rounded-2xl text-xs font-semibold tracking-[0.2em] transition border ${
                  paymentMode === "MIXED"
                    ? "bg-amber-400 text-white dark:text-slate-900 border-amber-300 shadow-[0_10px_30px_rgba(251,191,36,0.35)]"
                    : "bg-slate-100 dark:bg-black/40 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10"
                }`}
              >
                SPLIT
              </button>
            </div>

            {paymentMode === "MIXED" && (
              <div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-100 dark:bg-amber-400/10 p-4">
                <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-3">
                  Split Payment Details
                </h4>
                <div className="space-y-3">
                  {splitPayments.map((payment, idx) => (
                    <div
                      key={payment.id}
                      className="flex flex-wrap gap-2 items-center"
                    >
                      <select
                        value={payment.mode}
                        onChange={(e) => {
                          const newSplits = [...splitPayments];
                          newSplits[idx].mode = e.target.value as any;
                          setSplitPayments(newSplits);
                        }}
                        className="px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-black/40 text-xs text-slate-900 dark:text-white"
                      >
                        <option value="CASH">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="CARD">Card</option>
                        <option value="BANK">Bank</option>
                      </select>
                      <div className="relative flex-1 min-w-[180px]">
                        <span className="absolute left-3 top-2 text-slate-500 dark:text-slate-400">
                          ₹
                        </span>
                        <input
                          type="number"
                          placeholder="Amount"
                          value={payment.amount}
                          onChange={(e) => {
                            const newSplits = [...splitPayments];
                            newSplits[idx].amount = e.target.value;
                            setSplitPayments(newSplits);
                          }}
                          className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-black/40 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400/70 focus:outline-none"
                        />
                      </div>
                      {splitPayments.length > 1 && (
                        <button
                          onClick={() => {
                            setSplitPayments(
                              splitPayments.filter((p) => p.id !== payment.id),
                            );
                          }}
                          className="p-2 text-rose-600 dark:text-rose-300 hover:text-rose-700 dark:hover:text-rose-200"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    onClick={() =>
                      setSplitPayments([
                        ...splitPayments,
                        { id: crypto.randomUUID(), mode: "CASH", amount: "" },
                      ])
                    }
                    className="text-xs font-semibold text-amber-700 dark:text-amber-200 hover:text-amber-800 dark:hover:text-amber-100"
                  >
                    + Add another payment method
                  </button>

                  <div className="pt-3 border-t border-amber-300 dark:border-amber-200/20 mt-2 flex justify-between text-sm text-amber-900 dark:text-amber-100">
                    <span>Total Split</span>
                    <span
                      className={
                        splitPayments.reduce(
                          (acc, p) => acc + (parseFloat(p.amount) || 0),
                          0,
                        ) >
                        grandTotal + 1
                          ? "text-rose-700 dark:text-rose-200 font-semibold"
                          : "text-amber-900 dark:text-amber-100 font-semibold"
                      }
                    >
                      ₹
                      {splitPayments
                        .reduce(
                          (acc, p) => acc + (parseFloat(p.amount) || 0),
                          0,
                        )
                        .toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-[24px] border border-slate-200 dark:border-white/10 bg-gradient-to-br from-slate-100 via-white to-slate-50 dark:from-white/10 dark:via-white/5 dark:to-transparent p-5 shadow-lg dark:shadow-[0_20px_60px_rgba(0,0,0,0.4)] h-fit">
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              {selectedShop?.gstEnabled && (
                <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                  <span>Total GST</span>
                  <span>₹{totalGst.toFixed(2)}</span>
                </div>
              )}
            </div>
            <div className="mt-5 flex justify-between items-center text-2xl font-semibold text-slate-900 dark:text-white border-t border-slate-300 dark:border-white/10 pt-4">
              <span>Grand Total</span>
              <span className="text-teal-600 dark:text-teal-300">
                ₹{grandTotal.toFixed(2)}
              </span>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full mt-6 py-3.5 rounded-2xl bg-teal-500 text-white font-semibold text-base tracking-[0.2em] uppercase shadow-[0_12px_30px_rgba(13,148,136,0.35)] hover:bg-teal-600 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {loading ? "Creating Invoice..." : "Confirm & Create Invoice"}
            </button>
          </div>
        </div>

        {/* Modals */}
        {isCustomerModalOpen && (
          <CustomerModal
            onClose={handleCustomerModalClose}
            onSuccess={(customer) => {
              // In a clearer flow, we might want to auto-select this customer.
              // But the party selector might not have this in its local list unless we refresh/search.
              // Usually PartySelector will find it immediately by search.
              // We can also auto-select if we passed a callback to CustomerModal but it just takes onSuccess mostly for reload.
              // Let's just close it.
              handleCustomerModalClose();
              setSelectedCustomer(customer); // Optimistic select
            }}
          />
        )}

        {isProductModalOpen && (
          <ProductModal
            onClose={handleProductModalClose}
            onProductCreated={handleProductCreated}
            shopId={selectedShop.id}
          />
        )}
      </div>
    </div>
  );
}
