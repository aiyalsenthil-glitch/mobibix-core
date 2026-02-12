"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  listProducts,
  type ShopProduct,
} from "@/services/products.api";
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
    totals: {
      subtotal,
      totalGst,
      grandTotal,
    }
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
      <div className="max-w-7xl mx-auto text-center py-20">
        <div className="animate-spin text-teal-600 text-3xl mb-4">⟳</div>
        <p className="text-gray-500">Loading shop details...</p>
      </div>
    );
  }

  if (!selectedShop) {
    return (
      <div className="max-w-7xl mx-auto text-center py-20 flex flex-col items-center">
        <p className="text-red-500 mb-6 bg-red-50 px-6 py-4 rounded-xl border border-red-100">
          No shop selected or shop not found.
        </p>
        <button
          onClick={() => router.push("/sales")}
          className="px-8 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold transition"
        >
          Go Back to Sales
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto py-8 px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          Create New Sales Invoice
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Fill in the details below to generate a new GST invoice.
        </p>
      </div>

      {shopError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
          <span>⚠️</span> {shopError}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* Customer Selector */}
      <InvoiceCustomerSelector 
        selectedCustomer={selectedCustomer}
        onSelectCustomer={setSelectedCustomer}
        onClearCustomer={() => setSelectedCustomer(null)}
        onNewCustomer={() => setIsCustomerModalOpen(true)}
      />

       {/* Invoice Date & Inter-state Notice */}
       <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-8 mb-8 shadow-sm">
         <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
             Invoice Details
         </h2>
         <div className="max-w-md">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Invoice Date
            </label>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white dark:focus:bg-gray-800 transition shadow-sm"
            />
         </div>
         {isInterState && selectedShop?.gstEnabled && (
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 px-4 py-3 rounded-lg text-sm border border-blue-100 dark:border-blue-800 flex items-center gap-2">
            <span>ℹ️</span>
            <strong>Inter-State Sale:</strong> IGST will be applied as customer
            state is different from shop state.
          </div>
        )}
       </div>

      {/* Product Items Table */}
      <InvoiceProductTable 
        items={items}
        products={products}
        pricesIncludeTax={pricesIncludeTax}
        onPricesIncludeTaxChange={setPricesIncludeTax}
        onUpdateItem={updateItem}
        onAddItem={addItem}
        onRemoveItem={removeItem}
        imeiHighlight={imeiHighlight}
      />
      
      {/* Create Product Button */}
      {/* <div className="mb-8 text-right">
        <button
           onClick={() => setIsProductModalOpen(true)}
           className="text-sm text-teal-600 hover:text-teal-700 font-medium"
        >
           + Create New Product
        </button>
      </div> */}
      {/* (Optional: Add this back if we want quick product creation from invoice page) */}

      {/* Payment & Totals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Payment Mode
          </label>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {["CASH", "UPI", "CARD", "BANK", "CREDIT"].map((mode) => (
              <button
                key={mode}
                onClick={() => setPaymentMode(mode as any)}
                className={`px-4 py-3 rounded-xl text-sm font-bold transition border ${
                  paymentMode === mode
                    ? "bg-teal-600 text-white border-teal-600 shadow-teal-200 shadow-lg scale-105"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                {mode}
              </button>
            ))}
            <button
               onClick={() => setPaymentMode("MIXED")}
               className={`px-4 py-3 rounded-xl text-sm font-bold transition border ${
                 paymentMode === "MIXED"
                   ? "bg-purple-600 text-white border-purple-600 shadow-purple-200 shadow-lg scale-105"
                   : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
               }`}
            >
              SPLIT
            </button>
          </div>

          {/* Split Payment Inputs */}
          {paymentMode === "MIXED" && (
            <div className="mt-6 bg-purple-50 dark:bg-purple-900/10 p-4 rounded-xl border border-purple-100 dark:border-purple-800">
               <h4 className="text-sm font-bold text-purple-900 dark:text-purple-300 mb-3">Split Payment Details</h4>
               <div className="space-y-3">
                 {splitPayments.map((payment, idx) => (
                    <div key={payment.id} className="flex gap-2 items-center">
                       <select 
                         value={payment.mode}
                         onChange={(e) => {
                             const newSplits = [...splitPayments];
                             newSplits[idx].mode = e.target.value as any;
                             setSplitPayments(newSplits);
                         }}
                         className="px-3 py-2 rounded-lg border border-purple-200 text-sm w-32"
                       >
                          <option value="CASH">Cash</option>
                          <option value="UPI">UPI</option>
                          <option value="CARD">Card</option>
                          <option value="BANK">Bank</option>
                       </select>
                       <div className="relative flex-1">
                          <span className="absolute left-3 top-2 text-gray-500">₹</span>
                          <input 
                            type="number"
                            placeholder="Amount"
                            value={payment.amount}
                            onChange={(e) => {
                                const newSplits = [...splitPayments];
                                newSplits[idx].amount = e.target.value;
                                setSplitPayments(newSplits);
                            }}
                            className="w-full pl-7 pr-3 py-2 rounded-lg border border-purple-200 text-sm focus:ring-2 focus:ring-purple-500"
                          />
                       </div>
                       {splitPayments.length > 1 && (
                           <button 
                             onClick={() => {
                                 setSplitPayments(splitPayments.filter(p => p.id !== payment.id));
                             }}
                             className="p-2 text-red-400 hover:text-red-600"
                           >
                              <Trash2 size={16} />
                           </button>
                       )}
                    </div>
                 ))}
                 
                 <button 
                   onClick={() => setSplitPayments([...splitPayments, { id: crypto.randomUUID(), mode: "CASH", amount: "" }])}
                   className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 mt-2"
                 >
                    + Add Another Payment Method
                 </button>

                 <div className="pt-3 border-t border-purple-200 mt-2 flex justify-between text-sm">
                    <span>Total Split:</span>
                    <span className={
                        (splitPayments.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0) > grandTotal + 1) ? "text-red-600 font-bold" : "text-purple-900 font-bold"
                    }>
                        ₹{splitPayments.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0).toFixed(2)}
                    </span>
                 </div>
               </div>
            </div>
          )}
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-8 h-fit">
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            {selectedShop?.gstEnabled && (
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Total GST</span>
                <span>₹{totalGst.toFixed(2)}</span>
                </div>
            )}
          </div>
          <div className="flex justify-between items-center text-xl font-bold text-gray-900 dark:text-white pt-6 border-t border-gray-200 dark:border-gray-700">
            <span>Grand Total</span>
            <span className="text-teal-600">₹{grandTotal.toFixed(2)}</span>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full mt-8 py-4 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? "Creating Invoice..." : `Confirm & Create Invoice`}
          </button>
        </div>
      </div>

      {/* Modals */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
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
      
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={handleProductModalClose}
        onSuccess={handleProductCreated}
        shopId={selectedShop.id}
      />
    </div>
  );
}
