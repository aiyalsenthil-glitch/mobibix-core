"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { listProducts, updateProduct, type ShopProduct } from "@/services/products.api";
import { getStockBalances, getImeiDetails } from "@/services/stock.api";
import { createInvoice, type CreateInvoiceDto } from "@/services/sales.api";
import { type PaymentMode } from "@/hooks/useInvoiceForm";
import { validateVoucher, redeemVoucher, type TradeInVoucher } from "@/services/tradein.api";
import { useShop } from "@/context/ShopContext";
import { CustomerModal } from "../../customers/CustomerModal";
import { ProductModal } from "../../products/ProductModal";
import { useInvoiceForm } from "@/hooks/useInvoiceForm";
import { InvoiceCustomerSelector } from "@/components/sales/InvoiceCustomerSelector";
import { InvoiceProductTable } from "@/components/sales/InvoiceProductTable";
import { Trash2 } from "lucide-react";
import { LoyaltyRedemptionInput } from "@/components/loyalty/LoyaltyRedemptionInput";
import { getCustomerLoyaltyBalance } from "@/services/loyalty.api";
import { getQuotation } from "@/services/quotations.api";
import { getParty } from "@/services/parties.api";

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
    setItems,
    params: { pricesIncludeTax },
    setPricesIncludeTax,
    paymentMode,
    setPaymentMode,
    splitPayments,
    setSplitPayments,
    addItem,
    addItemWithDetails,
    removeItem,
    updateItem,
    totals: { subtotal, totalGst, grandTotal },
    loyalty,
    isInterState,
  } = useInvoiceForm({ 
    shopGstEnabled: selectedShop?.gstEnabled,
    shopState: selectedShop?.state 
  });

  const quotationId = searchParams.get("quotationId");

  // Load Quotation Data
  useEffect(() => {
    if (quotationId && selectedShopId) {
      const loadQuotation = async () => {
        try {
          const q = await getQuotation(selectedShopId, quotationId);
          
          // Set Customer
          if (q.customerId) {
            const customer = await getParty(q.customerId);
            setSelectedCustomer(customer);
          } else {
            // Manual customer info from quotation
            setSelectedCustomer({
              name: q.customerName,
              phone: q.customerPhone || "",
              partyType: "CUSTOMER",
              // fill defaults to satisfy types
            } as any);
          }

          // Set Items
          const invoiceItems = (q.items || []).map(qi => ({
            id: qi.id || Math.random().toString(),
            shopProductId: qi.shopProductId || "",
            productName: qi.description,
            hsnSac: qi.product?.hsnCode || "",
            quantity: qi.quantity,
            rate: qi.price,
            gstRate: qi.gstRate,
            gstAmount: qi.gstAmount,
            total: qi.totalAmount,
            imeis: [],
            serialNumbers: [],
            costPrice: null, // will be fetched or handled by createInvoice
          }));

          setItems(invoiceItems);
          setPricesIncludeTax(false); // Quotation usually shows exclusive rates in UI
        } catch (err) {
          console.error("Failed to load quotation for conversion:", err);
        }
      };
      loadQuotation();
    }
  }, [quotationId, selectedShopId]);

  const [shopProducts, setShopProducts] = useState<ShopProduct[]>([]);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imeiHighlight, setImeiHighlight] = useState(false);

  // Trade-in credit voucher (TCV payment mode)
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherLookupLoading, setVoucherLookupLoading] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState<TradeInVoucher | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [tcvBalanceMode, setTcvBalanceMode] = useState<PaymentMode>("CASH"); // payment mode for remaining balance
  const [globalScan, setGlobalScan] = useState("");
  const [isScanning, setIsScanning] = useState(false);

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
      setShopProducts(merged);
    } catch (err: unknown) {
      console.error("Failed to load products:", err);
    }
  };

  // Fetch Loyalty Balance when customer changes
  useEffect(() => {
    if (selectedCustomer?.id) {
      getCustomerLoyaltyBalance(selectedCustomer.id).then((balance) => {
        loyalty.setBalance(balance);
      });
    } else {
      loyalty.setBalance(0);
      loyalty.setPoints(0);
      loyalty.setDiscount(0);
    }
  }, [selectedCustomer?.id]);

  const handleCustomerModalClose = () => {
    setIsCustomerModalOpen(false);
  };

  const handleProductModalClose = () => {
    setIsProductModalOpen(false);
    if (selectedShopId) loadProducts(selectedShopId);
  };

  const handleProductCreated = (product: ShopProduct) => {
    setShopProducts([...shopProducts, product]);
    setIsProductModalOpen(false);
    if (selectedShopId) loadProducts(selectedShopId);
  };

  const handleVoucherLookup = async () => {
    if (!voucherCode.trim() || !selectedShopId) return;
    setVoucherLookupLoading(true);
    setVoucherError(null);
    setAppliedVoucher(null);
    try {
      const v = await validateVoucher(voucherCode.trim(), selectedShopId);
      setAppliedVoucher(v);
    } catch (err: any) {
      setVoucherError(err?.message || "Invalid or expired voucher");
    } finally {
      setVoucherLookupLoading(false);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCode("");
    setVoucherError(null);
  };

  const handleSubmit = async () => {
    const shop = selectedShop;
    const customer = selectedCustomer;

    if (!shop) {
      setError("Please select a shop");
      return;
    }
    if (!customer) {
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

    // HSN validation for GST invoices
    if (shop?.gstEnabled) {
      if (items.some((i) => !i.hsnSac || i.hsnSac.trim() === "")) {
        setError("HSN/SAC code is mandatory for all items in a GST invoice.");
        return;
      }
    }

    // Serialized validation: IMEIs required and must match quantity
    const serializedMissing = items.some((i) => {
      const p = shopProducts.find((pp) => pp.id === i.shopProductId);
      return p?.isSerialized && (!i.imeis || i.imeis.length === 0);
    });
    if (serializedMissing) {
      setError(
        "Missing Tracking: Please enter IMEI/Serial numbers for all serialized products",
      );
      setImeiHighlight(true);
      return;
    }

    const serializedCountMismatch = items.some((i) => {
      const p = shopProducts.find((pp) => pp.id === i.shopProductId);
      return p?.isSerialized && i.imeis && i.imeis.length !== i.quantity;
    });
    if (serializedCountMismatch) {
      setError(
        "Tracking mismatch: Quantity must match the number of IMEIs/Serials entered.",
      );
      setImeiHighlight(true);
      return;
    }

    // Proactive cost validation
    const itemsMissingCost = items.filter(i => i.shopProductId && (i.costPrice === null || i.costPrice <= 0));
    if (itemsMissingCost.length > 0) {
      setError(`Action Required: ${itemsMissingCost[0].productName} is missing a purchase cost. Please set it in the product table below to continue.`);
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
      const payload: CreateInvoiceDto = {
        shopId: shop.id,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerState: customer.state,
        customerGstin: customer.gstNumber,
        invoiceDate,
        pricesIncludeTax,
        items: items.map((item) => ({
          shopProductId: item.shopProductId,
          quantity: item.quantity,
          rate: item.rate,
          gstRate: item.gstRate,
          // gstAmount intentionally omitted — backend recalculates
          imeis: item.imeis && item.imeis.length > 0 ? item.imeis : undefined,
          serialNumbers: item.serialNumbers && item.serialNumbers.length > 0 ? item.serialNumbers : undefined,
          warrantyDays: item.warrantyDays,
          hsnCode: item.hsnSac,
        })),
        loyaltyPointsRedeemed: loyalty.points > 0 ? loyalty.points : undefined,
        quotationId: quotationId || undefined,
      };

      // Handle Payment Modes
      // Cast helpers: our local PaymentMode is wider than the API's narrow type
      type ApiMode = import("@/services/sales.api").PaymentMode;
      if (paymentMode === "TCV" && appliedVoucher) {
        // Trade-in Credit Voucher payment
        // GST is on full invoice value — TCV is a payment instrument, not a discount (CBIC Circular 243/2024)
        const voucherCredit = Math.min(appliedVoucher.amount, grandTotal);
        const cashBalance = Math.max(0, grandTotal - voucherCredit);
        if (cashBalance === 0) {
          // Full payment via voucher → record as CREDIT (store credit used)
          payload.paymentMode = "CREDIT";
          payload.paymentMethods = [{ mode: "CREDIT", amount: grandTotal }];
        } else {
          // Partial voucher + cash balance
          payload.paymentMode = tcvBalanceMode as ApiMode;
          payload.paymentMethods = [
            { mode: tcvBalanceMode as ApiMode, amount: cashBalance },
            { mode: "CREDIT", amount: voucherCredit },
          ];
        }
      } else if (paymentMode === "MIXED") {
        payload.paymentMode = splitPayments[0].mode as ApiMode;
        payload.paymentMethods = splitPayments.map((p) => ({
          mode: p.mode as ApiMode,
          amount: parseFloat(p.amount),
        }));
      } else {
        payload.paymentMode = paymentMode as ApiMode;
      }

      const invoice = await createInvoice(payload);

      // Redeem trade-in voucher after invoice creation
      if (paymentMode === "TCV" && appliedVoucher && invoice?.id) {
        try {
          await redeemVoucher(appliedVoucher.voucherCode, selectedShopId!, invoice.id);
        } catch {

        }
      }

      // Navigate on success
      router.push(`/sales?shopId=${selectedShopId}`);
    } catch (err: unknown) {
      const msg = (err instanceof Error ? err.message : "Failed to create invoice") as string;

      // Handle cost-related errors with product context
      if (
        msg.includes("Cannot sell product") &&
        msg.includes("without a valid cost price")
      ) {
        // Extract product name from backend error if available
        const match = msg.match(/Cannot sell product "([^"]+)"/);
        const productName = match ? match[1] : "One or more products";
        setError(
          `Action Required: ${productName} is missing a cost price. ` +
            `Please set the cost manually in the table below before confirming the invoice.`,
        );
      } else if (msg.includes("Insufficient stock")) {
        setImeiHighlight(false); // reset stale IMEI highlight — this is a stock problem
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
        // Generic backend error — reset IMEI highlight, show message verbatim
        setImeiHighlight(false);
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProductCost = async (productId: string, cost: number) => {
    if (!selectedShopId) return;
    try {
      await updateProduct(selectedShopId, productId, { costPrice: cost });
      // Update local products list so the warning disappears and other items with same product are updated
      setShopProducts(prev => prev.map(p => p.id === productId ? { ...p, costPrice: cost } : p));
      
      // Clear error if it was about this product
      if (error?.includes("missing a purchase cost") || error?.includes("missing a cost price")) {
        setError(null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to update product cost");
      throw err; // Propagate to component for loading state
    }
  };

  const handleGlobalScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalScan.trim()) return;

    try {
      setIsScanning(true);
      setError(null);
      const imeiData = await getImeiDetails(globalScan.trim());
      
      // ImeiData includes .product
      if (imeiData.product) {
        addItemWithDetails(imeiData.product, globalScan.trim());
        setGlobalScan(""); // Clear for next scan
      }
    } catch (err: any) {
      setError(err.message || "Could not find this IMEI in stock.");
    } finally {
      setIsScanning(false);
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
      <div className="max-w-[1400px] mx-auto py-4 px-4">
        {/* Compact header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">New Invoice</h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            {selectedShop?.name ?? "No shop selected"}
          </div>
        </div>

        {shopError && (
          <div className="mb-3 rounded-xl border border-rose-400 dark:border-rose-500/30 bg-rose-100 dark:bg-rose-500/10 px-4 py-2 text-sm text-rose-800 dark:text-rose-200">
            ⚠️ {shopError}
          </div>
        )}

        {error && (
          <div className="mb-3 rounded-xl border border-rose-400 dark:border-rose-500/30 bg-rose-100 dark:bg-rose-500/10 px-4 py-2 text-sm text-rose-800 dark:text-rose-200">
            ⚠️ {error}
          </div>
        )}

        <div className="space-y-3">
          {/* Combined Customer & Invoice Details Row */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-3">
            <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-4 shadow-lg dark:shadow-[0_16px_50px_rgba(0,0,0,0.35)]">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Customer Details</h2>
              <InvoiceCustomerSelector
                selectedCustomer={selectedCustomer}
                onSelectCustomer={setSelectedCustomer}
                onClearCustomer={() => setSelectedCustomer(null)}
                onNewCustomer={() => setIsCustomerModalOpen(true)}
              />
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-4 shadow-lg dark:shadow-[0_16px_50px_rgba(0,0,0,0.35)]">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Invoice Details</h2>
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

          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-4 shadow-lg dark:shadow-[0_16px_50px_rgba(0,0,0,0.35)]">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Product Items</h2>
            
            {/* Global Scan Bar */}
            <div className="mb-6">
              <form onSubmit={handleGlobalScan} className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <span className="text-xl">🔍</span>
                </div>
                <input
                  type="text"
                  placeholder="FAST SCAN: Scan IMEI or Serial Number to add product instantly..."
                  value={globalScan}
                  onChange={(e) => setGlobalScan(e.target.value)}
                  disabled={isScanning}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-teal-500/30 bg-teal-500/5 dark:bg-teal-500/10 text-slate-900 dark:text-white placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition shadow-inner"
                />
                {isScanning && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="h-5 w-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </form>
            </div>

            <InvoiceProductTable
              items={items}
              products={shopProducts}
              pricesIncludeTax={pricesIncludeTax}
              onPricesIncludeTaxChange={setPricesIncludeTax}
              onUpdateItem={updateItem}
              onAddItem={addItem}
              onRemoveItem={removeItem}
              onNewProduct={() => setIsProductModalOpen(true)}
              onUpdateProductCost={handleUpdateProductCost}
              imeiHighlight={imeiHighlight}
            />
          </div>

          {/* Loyalty Redemption */}
          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-4 shadow-lg dark:shadow-[0_16px_50px_rgba(0,0,0,0.35)]">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Loyalty Rewards</h2>
            <LoyaltyRedemptionInput
              customerId={selectedCustomer?.id}
              balance={loyalty.balance}
              invoiceSubTotal={Math.round(subtotal * 100)} // In Paisa
              onRedemptionChange={loyalty.setPoints}
              onDiscountChange={(discountPaise) => loyalty.setDiscount(discountPaise / 100)}
            />
          </div>

        </div>

        {/* Payment & Totals */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-3 mb-4">
          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-4 shadow-lg dark:shadow-[0_16px_50px_rgba(0,0,0,0.35)]">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Payment Mode</h2>
              <span className="rounded-full border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-slate-600 dark:text-slate-300">
                {paymentMode}
              </span>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-7 gap-3">
              {["CASH", "UPI", "CARD", "BANK", "CREDIT"].map((mode) => (
                <button
                  key={mode}
                  onClick={() => { setPaymentMode(mode as PaymentMode); handleRemoveVoucher(); }}
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
              <button
                onClick={() => setPaymentMode("TCV")}
                className={`px-4 py-3 rounded-2xl text-xs font-semibold tracking-[0.2em] transition border ${
                  paymentMode === "TCV"
                    ? "bg-amber-500 text-white border-amber-400 shadow-[0_10px_30px_rgba(245,158,11,0.35)]"
                    : "bg-slate-100 dark:bg-black/40 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10"
                }`}
              >
                🎟 TCV
              </button>
            </div>

            {/* TCV: Trade-in Credit Voucher inline panel */}
            {paymentMode === "TCV" && (
              <div className="mt-5 rounded-2xl border border-amber-400/40 bg-amber-50 dark:bg-amber-900/20 p-4 space-y-3">
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                  🎟 Trade-in Credit Voucher — GST on full invoice value (CBIC Circular 243/2024). Voucher reduces cash to collect only.
                </p>

                {/* Voucher code entry */}
                {!appliedVoucher ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter code e.g. TCV-0001"
                        value={voucherCode}
                        onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === "Enter" && handleVoucherLookup()}
                        className="flex-1 rounded-xl border border-amber-300 dark:border-amber-600 bg-white dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/70"
                      />
                      <button
                        type="button"
                        onClick={handleVoucherLookup}
                        disabled={voucherLookupLoading || !voucherCode.trim()}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold disabled:opacity-50 transition"
                      >
                        {voucherLookupLoading ? "Checking..." : "Validate"}
                      </button>
                    </div>
                    {voucherError && (
                      <p className="text-xs text-rose-600 dark:text-rose-400">{voucherError}</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Validated voucher info */}
                    <div className="flex items-center justify-between rounded-xl border border-amber-300 dark:border-amber-600 bg-amber-100 dark:bg-amber-900/40 px-3 py-2.5">
                      <div>
                        <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
                          {appliedVoucher.voucherCode} — ₹{appliedVoucher.amount.toLocaleString("en-IN")} credit
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          {appliedVoucher.customerName} · Expires {new Date(appliedVoucher.expiresAt).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                      <button type="button" onClick={handleRemoveVoucher} className="text-xs text-rose-500 hover:underline ml-3">Remove</button>
                    </div>

                    {/* Balance payment mode — only shown if voucher doesn't cover full amount */}
                    {appliedVoucher.amount < grandTotal && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                          Balance ₹{(grandTotal - appliedVoucher.amount).toLocaleString("en-IN")} — collect via:
                        </p>
                        <div className="flex gap-2">
                          {(["CASH", "UPI", "BANK", "CARD"] as PaymentMode[]).map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setTcvBalanceMode(m)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                                tcvBalanceMode === m
                                  ? "bg-teal-500 text-white border-teal-400"
                                  : "bg-white dark:bg-black/40 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-white/10 hover:bg-slate-100"
                              }`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

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
                          newSplits[idx].mode = e.target.value as Exclude<PaymentMode, "MIXED" | "TCV">;
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

          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-gradient-to-br from-slate-100 via-white to-slate-50 dark:from-white/10 dark:via-white/5 dark:to-transparent p-4 shadow-lg dark:shadow-[0_20px_60px_rgba(0,0,0,0.4)] h-fit">
            {/* Invoice Totals — GST on FULL price always (voucher is payment, not discount) */}
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
              <span className="text-teal-600 dark:text-teal-300">₹{grandTotal.toFixed(2)}</span>
            </div>

            {/* Payment Breakdown — voucher is a payment mode, not a deduction */}
            {appliedVoucher && (() => {
              const voucherCredit = Math.min(appliedVoucher.amount, grandTotal);
              const cashDue = Math.max(0, grandTotal - voucherCredit);
              return (
                <div className="mt-4 rounded-xl border border-amber-300 dark:border-amber-600/50 bg-amber-50 dark:bg-amber-900/20 p-3 space-y-2 text-sm">
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wide">
                    Payment Breakdown
                  </p>
                  <div className="flex justify-between text-amber-900 dark:text-amber-200">
                    <span>🎟 Trade Credit ({appliedVoucher.voucherCode})</span>
                    <span className="font-semibold">₹{voucherCredit.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-slate-700 dark:text-slate-300 border-t border-amber-200 dark:border-amber-700/40 pt-2">
                    <span>Cash / UPI to collect</span>
                    <span className="font-bold text-teal-700 dark:text-teal-300">₹{cashDue.toLocaleString("en-IN")}</span>
                  </div>
                  <p className="text-[10px] text-amber-600 dark:text-amber-500 leading-tight pt-1">
                    GST is charged on full invoice value (₹{grandTotal.toFixed(2)}). Trade-in credit is a payment instrument, not a discount — per CBIC Circular 243/2024.
                  </p>
                </div>
              );
            })()}

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

        {isProductModalOpen && selectedShop && (
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
