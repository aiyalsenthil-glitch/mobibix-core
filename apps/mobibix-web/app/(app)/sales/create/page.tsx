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
import { InvoiceProductTable } from "@/components/sales/InvoiceProductTable";
import { UpsellSidebar } from "@/components/sales/UpsellSidebar";
import { getCustomerLoyaltyBalance } from "@/services/loyalty.api";
import { getQuotation } from "@/services/quotations.api";
import { getParty } from "@/services/parties.api";
import { InvoiceSidebar } from "@/components/sales/InvoiceSidebar";
import { PaymentPanel } from "@/components/sales/PaymentPanel";
import { ScanLine, ArrowLeft } from "lucide-react";

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

  useEffect(() => {
    if (shopIdParam && selectedShopId !== shopIdParam) {
      selectShop(shopIdParam);
    }
  }, [shopIdParam, selectedShopId, selectShop]);

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
    shopState: selectedShop?.state,
  });

  const quotationId = searchParams.get("quotationId");

  useEffect(() => {
    if (quotationId && selectedShopId) {
      const loadQuotation = async () => {
        try {
          const q = await getQuotation(selectedShopId, quotationId);
          if (q.customerId) {
            const customer = await getParty(q.customerId);
            setSelectedCustomer(customer);
          } else {
            setSelectedCustomer({ name: q.customerName, phone: q.customerPhone || "", partyType: "CUSTOMER" } as any);
          }
          const invoiceItems = (q.items || []).map((qi: any) => ({
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
            costPrice: null,
          }));
          setItems(invoiceItems);
          setPricesIncludeTax(false);
        } catch (err) {
          console.error("Failed to load quotation:", err);
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

  // TCV Voucher
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherLookupLoading, setVoucherLookupLoading] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState<TradeInVoucher | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [tcvBalanceMode, setTcvBalanceMode] = useState<PaymentMode>("CASH");

  // Global IMEI scan
  const [globalScan, setGlobalScan] = useState("");
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (selectedShopId) loadProducts(selectedShopId);
  }, [selectedShopId]);

  // Prevent scroll on number inputs
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" && (t as HTMLInputElement).type === "number") e.preventDefault();
    };
    document.addEventListener("wheel", handleWheel, { passive: false });
    return () => document.removeEventListener("wheel", handleWheel);
  }, []);

  const loadProducts = async (shopId: string) => {
    try {
      const [productsResponse, balances] = await Promise.all([listProducts(shopId), getStockBalances(shopId)]);
      const productList = Array.isArray(productsResponse) ? productsResponse : productsResponse.data;
      const balanceMap = new Map(balances.map((b) => [b.productId, b]));
      const merged: ShopProduct[] = productList.map((p) => {
        const b = balanceMap.get(p.id);
        const stockQty = b?.stockQty ?? p.stockQty ?? 0;
        const isNegative = b?.isNegative ?? stockQty < 0;
        return { ...p, stockQty, isNegative };
      });
      setShopProducts(merged);
    } catch (err) {
      console.error("Failed to load products:", err);
    }
  };

  useEffect(() => {
    if (selectedCustomer?.id) {
      getCustomerLoyaltyBalance(selectedCustomer.id).then((balance) => loyalty.setBalance(balance));
    } else {
      loyalty.setBalance(0);
      loyalty.setPoints(0);
      loyalty.setDiscount(0);
    }
  }, [selectedCustomer?.id]);

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
    setError(null);
    if (!selectedShop) return setError("Please select a shop");
    if (!selectedCustomer) return setError("Please select a customer");
    if (items.length === 0) return setError("Add at least one product");
    if (items.some((i) => !i.shopProductId || i.quantity <= 0 || i.rate < 0)) return setError("Complete all product details");
    if (selectedShop?.gstEnabled && items.some((i) => !i.hsnSac || i.hsnSac.trim() === "")) {
      return setError("HSN/SAC code is mandatory for all items in a GST invoice.");
    }
    const serializedMissing = items.some((i) => {
      const p = shopProducts.find((pp) => pp.id === i.shopProductId);
      return p?.isSerialized && (!i.imeis || i.imeis.length === 0);
    });
    if (serializedMissing) { setImeiHighlight(true); return setError("Enter IMEI/Serial for all serialized products"); }
    const serializedCountMismatch = items.some((i) => {
      const p = shopProducts.find((pp) => pp.id === i.shopProductId);
      return p?.isSerialized && i.imeis && i.imeis.length !== i.quantity;
    });
    if (serializedCountMismatch) { setImeiHighlight(true); return setError("Quantity must match IMEI count"); }
    const itemsMissingCost = items.filter((i) => i.shopProductId && (i.costPrice === null || i.costPrice <= 0));
    if (itemsMissingCost.length > 0) return setError(`${itemsMissingCost[0].productName} is missing a cost price. Set it in the table below.`);

    setLoading(true);
    setImeiHighlight(false);
    try {
      type ApiMode = import("@/services/sales.api").PaymentMode;
      const payload: CreateInvoiceDto = {
        shopId: selectedShop.id,
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerPhone: selectedCustomer.phone,
        customerState: selectedCustomer.state,
        customerGstin: selectedCustomer.gstNumber,
        invoiceDate,
        pricesIncludeTax,
        items: items.map((item) => ({
          shopProductId: item.shopProductId,
          quantity: item.quantity,
          rate: item.rate,
          gstRate: item.gstRate,
          imeis: item.imeis && item.imeis.length > 0 ? item.imeis : undefined,
          serialNumbers: item.serialNumbers && item.serialNumbers.length > 0 ? item.serialNumbers : undefined,
          warrantyDays: item.warrantyDays,
          hsnCode: item.hsnSac,
        })),
        loyaltyPointsRedeemed: loyalty.points > 0 ? loyalty.points : undefined,
        quotationId: quotationId || undefined,
      };

      if (paymentMode === "TCV" && appliedVoucher) {
        const vc = Math.min(appliedVoucher.amount, grandTotal);
        const cb = Math.max(0, grandTotal - vc);
        if (cb === 0) {
          payload.paymentMode = "CREDIT";
          payload.paymentMethods = [{ mode: "CREDIT", amount: grandTotal }];
        } else {
          payload.paymentMode = tcvBalanceMode as ApiMode;
          payload.paymentMethods = [{ mode: tcvBalanceMode as ApiMode, amount: cb }, { mode: "CREDIT", amount: vc }];
        }
      } else if (paymentMode === "MIXED") {
        payload.paymentMode = splitPayments[0].mode as ApiMode;
        payload.paymentMethods = splitPayments.map((p) => ({ mode: p.mode as ApiMode, amount: parseFloat(p.amount) }));
      } else {
        payload.paymentMode = paymentMode as ApiMode;
      }

      const invoice = await createInvoice(payload);
      if (paymentMode === "TCV" && appliedVoucher && invoice?.id) {
        try { await redeemVoucher(appliedVoucher.voucherCode, selectedShopId!, invoice.id); } catch { /* silent */ }
      }
      router.push(`/sales?shopId=${selectedShopId}`);
    } catch (err: unknown) {
      const msg = (err instanceof Error ? err.message : "Failed to create invoice") as string;
      if (msg.includes("Cannot sell product") && msg.includes("without a valid cost price")) {
        const match = msg.match(/Cannot sell product "([^"]+)"/);
        setError(`${match ? match[1] : "One or more products"} is missing a cost price. Set it in the table below.`);
      } else if (msg.includes("Insufficient stock")) {
        setError("Insufficient stock. Add purchase or reduce quantity.");
      } else if (msg.includes("Serialized products require IMEI")) {
        setError("Serialized products require IMEI numbers.");
        setImeiHighlight(true);
      } else if (msg.includes("IMEI is not available")) {
        setError("One or more IMEIs are already sold or unavailable.");
        setImeiHighlight(true);
      } else {
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
      setShopProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, costPrice: cost } : p)));
      if (error?.includes("missing a")) setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to update product cost");
      throw err;
    }
  };

  const handleGlobalScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalScan.trim()) return;
    try {
      setIsScanning(true);
      setError(null);
      const imeiData = await getImeiDetails(globalScan.trim());
      if (imeiData.product) {
        addItemWithDetails(imeiData.product, globalScan.trim());
        setGlobalScan("");
      }
    } catch (err: any) {
      setError(err.message || "Could not find this IMEI in stock.");
    } finally {
      setIsScanning(false);
    }
  };

  // ─── Loading / Error States ───
  if (isLoadingShops) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f14] flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-teal-400/40 border-t-teal-400 animate-spin" />
          <p className="text-xs uppercase tracking-[0.35em] text-teal-600 dark:text-teal-300/70">Loading</p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Preparing invoice workspace...</p>
        </div>
      </div>
    );
  }
  if (!selectedShop) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f14] flex items-center justify-center px-6">
        <div className="max-w-sm text-center rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-8 shadow-xl">
          <p className="text-xs uppercase tracking-[0.35em] text-rose-500 mb-3">Missing shop</p>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">No shop selected</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">Choose a shop to create invoices.</p>
          <button onClick={() => router.push("/sales")} className="px-6 py-2.5 rounded-xl bg-teal-500 text-white font-semibold text-sm hover:bg-teal-600 transition">
            Back to Sales
          </button>
        </div>
      </div>
    );
  }

  // ─── Main 3-Panel Layout ───
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f14] text-slate-900 dark:text-slate-100">
      <div className="max-w-[1600px] mx-auto h-screen flex flex-col">
        {/* ── Top Header Bar ── */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/3 backdrop-blur-xl flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-base font-black uppercase tracking-wider text-slate-900 dark:text-white leading-none">
                New Invoice
              </h1>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                {selectedShop.name}
                {selectedShop.gstEnabled && <span className="ml-2 text-emerald-500">GST Enabled</span>}
              </p>
            </div>
          </div>
          {shopError && (
            <div className="text-xs text-rose-600 dark:text-rose-400">⚠ {shopError}</div>
          )}
        </header>

        {/* ── Error Banner ── */}
        {error && (
          <div className="mx-6 mt-3 rounded-xl border border-rose-400/40 bg-rose-50 dark:bg-rose-500/10 px-4 py-2.5 text-sm text-rose-700 dark:text-rose-300 flex-shrink-0">
            ⚠ {error}
          </div>
        )}

        {/* ── 3-Panel Grid ── */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr_360px] gap-0 overflow-hidden">

          {/* ━━━ Panel 1: Sidebar ━━━ */}
          <div className="hidden lg:flex flex-col gap-0 border-r border-slate-200 dark:border-white/10 overflow-y-auto">
            <div className="p-4 flex flex-col gap-4">
              <InvoiceSidebar
                shop={selectedShop}
                selectedCustomer={selectedCustomer}
                onSelectCustomer={setSelectedCustomer}
                onClearCustomer={() => setSelectedCustomer(null)}
                onNewCustomer={() => setIsCustomerModalOpen(true)}
                invoiceDate={invoiceDate}
                onDateChange={setInvoiceDate}
                isInterState={isInterState}
                loyaltyBalance={loyalty.balance}
                loyaltyDiscount={loyalty.discount}
                customerId={selectedCustomer?.id}
                invoiceSubTotal={Math.round(subtotal * 100)}
                onLoyaltyPointsChange={loyalty.setPoints}
                onLoyaltyDiscountChange={(p) => loyalty.setDiscount(p / 100)}
              />
            </div>
          </div>

          {/* ━━━ Panel 2: Invoice Builder ━━━ */}
          <div className="flex flex-col overflow-hidden">
            {/* Mobile: Customer + Date (only on small screens) */}
            <div className="lg:hidden p-4 border-b border-slate-200 dark:border-white/10 flex flex-col gap-4">
              <InvoiceSidebar
                shop={selectedShop}
                selectedCustomer={selectedCustomer}
                onSelectCustomer={setSelectedCustomer}
                onClearCustomer={() => setSelectedCustomer(null)}
                onNewCustomer={() => setIsCustomerModalOpen(true)}
                invoiceDate={invoiceDate}
                onDateChange={setInvoiceDate}
                isInterState={isInterState}
                loyaltyBalance={loyalty.balance}
                loyaltyDiscount={loyalty.discount}
                customerId={selectedCustomer?.id}
                invoiceSubTotal={Math.round(subtotal * 100)}
                onLoyaltyPointsChange={loyalty.setPoints}
                onLoyaltyDiscountChange={(p) => loyalty.setDiscount(p / 100)}
              />
            </div>

            {/* IMEI Global Scan Bar — sticky */}
            <div className="flex-shrink-0 px-4 pt-4 pb-2">
              <form onSubmit={handleGlobalScan} className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                  <ScanLine className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  placeholder="⚡ Quick Scan: Enter IMEI or Serial to add product instantly"
                  value={globalScan}
                  onChange={(e) => setGlobalScan(e.target.value)}
                  disabled={isScanning}
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-teal-500/20 bg-teal-500/5 dark:bg-teal-500/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-teal-500/60 focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition font-medium text-sm"
                />
                {isScanning && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="h-4 w-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </form>
            </div>

            {/* Product Table — scrollable */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-xl shadow-sm overflow-hidden">
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

              {/* Upsell Strip (compact horizontal) */}
              {items.length > 0 && selectedShopId && (
                <div className="mt-4">
                  <UpsellSidebar
                    shopId={selectedShopId}
                    items={items}
                    onAddItem={addItem}
                    products={shopProducts}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ━━━ Panel 3: Payment ━━━ */}
          <div className="border-l border-slate-200 dark:border-white/10 overflow-y-auto">
            <div className="p-4 flex flex-col gap-4 min-h-full">
              <PaymentPanel
                shop={selectedShop}
                subtotal={subtotal}
                totalGst={totalGst}
                grandTotal={grandTotal}
                loyaltyDiscount={loyalty.discount}
                paymentMode={paymentMode}
                onPaymentModeChange={(m) => { setPaymentMode(m); }}
                splitPayments={splitPayments}
                onSplitChange={setSplitPayments}
                appliedVoucher={appliedVoucher}
                tcvBalanceMode={tcvBalanceMode}
                onTcvBalanceModeChange={setTcvBalanceMode}
                voucherCode={voucherCode}
                onVoucherCodeChange={setVoucherCode}
                voucherLookupLoading={voucherLookupLoading}
                voucherError={voucherError}
                onVoucherLookup={handleVoucherLookup}
                onRemoveVoucher={handleRemoveVoucher}
                loading={loading}
                onSubmit={handleSubmit}
                hasCustomer={!!selectedCustomer}
                hasItems={items.length > 0}
              />
            </div>
          </div>
        </div>

        {/* ── Mobile: Fixed Confirm Footer ── */}
        <div className="lg:hidden flex-shrink-0 border-t border-slate-200 dark:border-white/10 bg-white/90 dark:bg-[#0b0f14]/90 backdrop-blur-xl px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">Grand Total</span>
            <span className="text-xl font-black text-teal-600 dark:text-teal-400">₹{grandTotal.toFixed(2)}</span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading || !selectedCustomer || items.length === 0}
            className="w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating...</>
            ) : "Confirm & Create Invoice"}
          </button>
        </div>
      </div>

      {/* ── Modals ── */}
      {isCustomerModalOpen && (
        <CustomerModal
          onClose={() => setIsCustomerModalOpen(false)}
          onSuccess={(customer) => { setIsCustomerModalOpen(false); setSelectedCustomer(customer); }}
        />
      )}
      {isProductModalOpen && selectedShop && (
        <ProductModal
          onClose={() => { setIsProductModalOpen(false); if (selectedShopId) loadProducts(selectedShopId); }}
          onProductCreated={(product) => { setShopProducts((p) => [...p, product]); setIsProductModalOpen(false); if (selectedShopId) loadProducts(selectedShopId); }}
          shopId={selectedShop.id}
        />
      )}
    </div>
  );
}
