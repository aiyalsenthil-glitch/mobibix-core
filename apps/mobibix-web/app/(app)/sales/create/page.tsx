"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { type Party } from "@/services/parties.api";
import {
  listProducts,
  type ShopProduct,
  ProductType,
} from "@/services/products.api";
import { getStockBalances } from "@/services/stock.api";
import { createInvoice, collectPayment } from "@/services/sales.api";
import { useTheme } from "@/context/ThemeContext";
import { useShop } from "@/context/ShopContext";
import { CustomerModal } from "../../customers/CustomerModal";
import { ProductModal } from "../../products/ProductModal";
import { PartySelector } from "@/components/common/PartySelector";

interface ProductItem {
  id: string;
  shopProductId: string;
  productName: string;
  hsnSac: string;
  quantity: number;
  rate: number;
  gstRate: number;
  gstAmount: number;
  total: number;
  imeis: string[];
  costPrice: number | null; // Cost tracking for visibility
}

export default function CreateInvoicePage() {
  const { theme } = useTheme();
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

  const [selectedCustomer, setSelectedCustomer] = useState<Party | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [items, setItems] = useState<ProductItem[]>([]);
  const [pricesIncludeTax, setPricesIncludeTax] = useState(true);
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  // Payment handling
  const [paymentMode, setPaymentMode] = useState<
    "CASH" | "UPI" | "CARD" | "BANK" | "CREDIT" | "MIXED"
  >("CASH");

  // Split payment state (for MIXED mode)
  const [splitPayments, setSplitPayments] = useState<
    Array<{
      id: string;
      mode: "CASH" | "UPI" | "CARD" | "BANK";
      amount: string;
    }>
  >([{ id: crypto.randomUUID(), mode: "CASH", amount: "" }]);

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  // Product search states (per item)
  const [productSearches, setProductSearches] = useState<{
    [key: string]: string;
  }>({});
  const [productDropdowns, setProductDropdowns] = useState<{
    [key: string]: boolean;
  }>({});
  const [productDropdownPositions, setProductDropdownPositions] = useState<{
    [key: string]: { top: number; left: number; width: number };
  }>({});
  const productInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>(
    {},
  );

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

  // Update dropdown positions on scroll/resize
  useEffect(() => {
    if (Object.values(productDropdowns).some((isOpen) => isOpen)) {
      const handleScroll = () => {
        Object.keys(productDropdowns).forEach((itemId) => {
          if (productDropdowns[itemId]) {
            updateDropdownPosition(itemId);
          }
        });
      };

      const handleResize = () => {
        Object.keys(productDropdowns).forEach((itemId) => {
          if (productDropdowns[itemId]) {
            updateDropdownPosition(itemId);
          }
        });
      };

      window.addEventListener("scroll", handleScroll, true);
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("scroll", handleScroll, true);
        window.removeEventListener("resize", handleResize);
      };
    }
  }, [productDropdowns]);

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

  const selectCustomer = (party: Party) => {
    setSelectedCustomer(party);
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
  };

  const handleCustomerModalClose = () => {
    setIsCustomerModalOpen(false);
    // Refresh customer search after creation
    // Refresh customer search logic if needed
  };

  const handleProductModalClose = () => {
    setIsProductModalOpen(false);
    // Ensure all dropdowns are closed when modal closes
    setProductDropdowns({});
    setProductDropdownPositions({});
    if (selectedShopId) loadProducts(selectedShopId);
  };

  const handleProductCreated = (product: ShopProduct) => {
    // Add new product to the list
    setProducts([...products, product]);
    // Close modal and ensure dropdowns are closed
    setIsProductModalOpen(false);
    setProductDropdowns({});
    setProductDropdownPositions({});
    if (selectedShopId) loadProducts(selectedShopId);
  };

  // Calculate dropdown position
  const updateDropdownPosition = (itemId: string) => {
    const inputElement = productInputRefs.current[itemId];
    if (inputElement) {
      const rect = inputElement.getBoundingClientRect();
      setProductDropdownPositions((prev) => ({
        ...prev,
        [itemId]: {
          top: rect.bottom + window.scrollY + 2,
          left: rect.left + window.scrollX,
          width: rect.width,
        },
      }));
    }
  };

  // Product search handler
  const handleProductSearch = (itemId: string, searchTerm: string) => {
    setProductSearches((prev) => ({
      ...prev,
      [itemId]: searchTerm,
    }));

    if (searchTerm.length > 0) {
      setProductDropdowns((prev) => ({
        ...prev,
        [itemId]: true,
      }));
      // Update position after state update
      setTimeout(() => updateDropdownPosition(itemId), 0);
    } else {
      setProductDropdowns((prev) => ({
        ...prev,
        [itemId]: false,
      }));
    }
  };

  const selectProduct = (itemId: string, product: ShopProduct) => {
    // Update all fields at once with calculations
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === itemId) {
          const rate = product.salePrice || 0;
          const gstRate = selectedShop?.gstEnabled ? product.gstRate || 18 : 0;
          const quantity = item.quantity;
          const baseAmount = quantity * rate;

          let gstAmount = 0;
          let total = 0;

          if (pricesIncludeTax) {
            // Price includes GST, extract base
            const divisor = 1 + gstRate / 100;
            const base = baseAmount / divisor;
            gstAmount = Math.round((baseAmount - base) * 100) / 100;
            total = baseAmount;
          } else {
            // Price excludes GST, add it - keep 2 decimal precision
            gstAmount = Math.round(((baseAmount * gstRate) / 100) * 100) / 100;
            total = Math.round((baseAmount + gstAmount) * 100) / 100;
          }

          return {
            ...item,
            shopProductId: product.id,
            productName: product.name,
            hsnSac: product.hsnCode || "",
            rate,
            gstRate,
            gstAmount,
            total,
            costPrice: product.costPrice ?? null, // Capture cost for visibility
          };
        }
        return item;
      }),
    );
    setProductSearches((prev) => ({
      ...prev,
      [itemId]: product.name,
    }));
    setProductDropdowns((prev) => ({
      ...prev,
      [itemId]: false,
    }));
    setProductDropdownPositions((prev) => {
      const updated = { ...prev };
      delete updated[itemId];
      return updated;
    });
  };

  const getFilteredProducts = (itemId: string): ShopProduct[] => {
    const searchTerm = productSearches[itemId] || "";
    if (!searchTerm) return [];
    return products.filter((p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  };

  // Add product item
  const addItem = () => {
    setItems([
      ...items,
      {
        id: Math.random().toString(),
        shopProductId: "",
        productName: "",
        hsnSac: "",
        quantity: 1,
        rate: 0,
        gstRate: selectedShop?.gstEnabled ? 18 : 0,
        gstAmount: 0,
        total: 0,
        imeis: [],
        costPrice: null, // Initialize cost tracking
      },
    ]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: string, value: any) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };

          // If product selected, auto-fill
          if (field === "shopProductId") {
            const product = products.find((p) => p.id === value);
            if (product) {
              updated.productName = product.name;
              updated.rate = product.salePrice;
              // Reset IMEIs when product changes
              (updated as any).imeis = [];
            }
          }

          // Recalculate totals
          if (
            field === "quantity" ||
            field === "rate" ||
            field === "gstRate" ||
            field === "shopProductId"
          ) {
            const baseAmount = updated.quantity * updated.rate;
            if (pricesIncludeTax) {
              // Price includes GST, extract base
              const divisor = 1 + updated.gstRate / 100;
              const base = baseAmount / divisor;
              updated.gstAmount = Math.round((baseAmount - base) * 100) / 100;
              updated.total = baseAmount;
            } else {
              // Price excludes GST, add it - keep 2 decimal precision
              updated.gstAmount =
                Math.round(((baseAmount * updated.gstRate) / 100) * 100) / 100;
              updated.total =
                Math.round((baseAmount + updated.gstAmount) * 100) / 100;
            }
          }

          // If IMEI text updated, sync imeis array
          if (field === "imeisText") {
            const text: string = value || "";
            const imeis = text
              .split(/\r?\n|,/)
              .map((s) => s.trim())
              .filter(Boolean);
            (updated as any).imeis = imeis;
          }

          return updated;
        }
        return item;
      }),
    );
  };

  // Calculate summary
  const subtotal = items.reduce((sum, item) => {
    const base = pricesIncludeTax
      ? item.quantity * item.rate - item.gstAmount
      : item.quantity * item.rate;
    return sum + base;
  }, 0);

  const isInterState =
    selectedShop &&
    selectedCustomer &&
    selectedShop.state !== selectedCustomer.state;

  const cgst = isInterState || !selectedShop?.gstEnabled
    ? 0
    : items.reduce((sum, item) => sum + item.gstAmount / 2, 0);
  const sgst = cgst;
  const igst = (isInterState && selectedShop?.gstEnabled)
    ? items.reduce((sum, item) => sum + item.gstAmount, 0)
    : 0;
  const totalTax = cgst + sgst + igst;
  const grandTotal = subtotal + totalTax;
  const displayPayments = [{ mode: paymentMode, amount: grandTotal }];

  // Check IMEI issues for serialized products
  const hasImeiIssues = items.some((i) => {
    const p = products.find((pp) => pp.id === i.shopProductId);
    if (!p || !p.isSerialized) return false;
    const isMissing = !i.imeis || i.imeis.length === 0;
    const isMismatch = i.imeis && i.imeis.length !== i.quantity;
    return isMissing || isMismatch;
  });

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
    if (items.some((i) => !i.shopProductId || i.quantity <= 0 || i.rate <= 0)) {
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

      // Navigate on success (no need for second collectPayment call)

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

      {/* Customer & Invoice Details */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-8 mb-8 shadow-sm">
        <div className="flex items-start justify-between mb-8 border-b border-gray-100 dark:border-gray-800 pb-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Customer & Invoice Details
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Customer Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Customer
            </label>
            <div className="relative">
              {selectedCustomer ? (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50/50 dark:bg-gray-800/50 flex items-start justify-between group">
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white">
                      {selectedCustomer.name}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {selectedCustomer.phone}
                    </div>
                    {(selectedCustomer.gstNumber || selectedCustomer.state) && (
                      <div className="text-xs text-gray-400 mt-2 flex gap-3">
                        {selectedCustomer.gstNumber && (
                          <span>GST: {selectedCustomer.gstNumber}</span>
                        )}
                        {selectedCustomer.state && (
                          <span>State: {selectedCustomer.state}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={clearCustomer}
                    className="text-gray-400 hover:text-red-500 transition px-2 py-1"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <PartySelector
                    type="CUSTOMER"
                    onSelect={selectCustomer}
                    placeholder="Search customer by name or phone..."
                    className="flex-1"
                  />
                  <button
                    onClick={() => setIsCustomerModalOpen(true)}
                    className="px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg font-semibold transition border border-teal-200"
                  >
                    + New
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Invoice Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Invoice Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white dark:focus:bg-gray-800 transition shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* Inter-State Notice - Only show if GST is enabled */}
        {isInterState && selectedShop?.gstEnabled && (
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 px-4 py-3 rounded-lg text-sm border border-blue-100 dark:border-blue-800 flex items-center gap-2">
            <span>ℹ️</span>
            <strong>Inter-State Sale:</strong> IGST will be applied as customer
            state is different from shop state.
          </div>
        )}
      </div>

      {/* Product Items */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-8 mb-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Product Items
          </h2>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              className={`w-5 h-5 rounded border flex items-center justify-center transition ${pricesIncludeTax ? "bg-blue-600 border-blue-600" : "bg-white border-gray-300"}`}
            >
              <input
                type="checkbox"
                checked={pricesIncludeTax}
                onChange={(e) => setPricesIncludeTax(e.target.checked)}
                className="hidden"
              />
              {pricesIncludeTax && (
                <span className="text-white text-xs">✓</span>
              )}
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Prices are Tax Inclusive
            </span>
          </label>
        </div>

        <div className="overflow-visible rounded-lg border border-gray-100 dark:border-gray-800 mb-6">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-800/50 text-left">
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase w-12 text-center">
                  #
                </th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase">
                  Product / Description
                </th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase w-32">
                  HSN/SAC
                </th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase w-24">
                  Qty
                </th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase w-32">
                  Price
                </th>
                {selectedShop?.gstEnabled && (
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase w-24">
                    GST %
                  </th>
                )}
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase w-40 text-right">
                  Total
                </th>
                <th className="px-4 py-4 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {items.map((item, index) => (
                <tr
                  key={item.id}
                  className="group hover:bg-gray-50/30 dark:hover:bg-gray-800/30 transition"
                >
                  <td className="px-4 py-4 text-sm text-gray-400 text-center">
                    {index + 1}
                  </td>
                  <td className="px-4 py-4 relative">
                    <input
                      ref={(el) => {
                        productInputRefs.current[item.id] = el;
                      }}
                      type="text"
                      placeholder="Search product..."
                      value={productSearches[item.id] || ""}
                      onChange={(e) =>
                        handleProductSearch(item.id, e.target.value)
                      }
                      onFocus={() => {
                        const searchTerm = productSearches[item.id] || "";
                        if (searchTerm.length > 0) {
                          setProductDropdowns((prev) => ({
                            ...prev,
                            [item.id]: true,
                          }));
                          setTimeout(() => updateDropdownPosition(item.id), 0);
                        }
                      }}
                      className="w-full bg-transparent border-b border-transparent focus:border-teal-500 outline-none py-1.5 text-gray-900 dark:text-white placeholder-gray-400 transition"
                    />

                    {/* Simplified Inline Dropdown since position calculation is complex and we want it simple */}
                    {productDropdowns[item.id] && (
                      <div className="absolute left-0 top-full mt-1 w-72 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl flex flex-col overflow-hidden ring-1 ring-black/5">
                        <div className="max-h-48 overflow-y-auto">
                          {getFilteredProducts(item.id).length > 0 ? (
                            getFilteredProducts(item.id).map((p) => (
                              <button
                                key={p.id}
                                onClick={() => selectProduct(item.id, p)}
                                className="w-full text-left px-4 py-3 hover:bg-teal-50 dark:hover:bg-teal-900/20 border-b border-gray-50 dark:border-gray-700 last:border-0 transition group"
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <div className="font-medium text-gray-900 dark:text-white text-sm group-hover:text-teal-700 dark:group-hover:text-teal-300">
                                    {p.name}
                                  </div>
                                  {/* Cost Status Badge */}
                                  {p.costPrice && p.costPrice > 0 ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300 whitespace-nowrap">
                                      ✓ Ready
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300 whitespace-nowrap">
                                      ⚠ Cost Missing
                                    </span>
                                  )}
                                </div>
                                <div className="flex justify-between items-center mt-1">
                                  {p.type !== ProductType.SERVICE && (
                                    <div className="text-xs text-gray-500">
                                      Stock: {p.stockQty ?? 0}
                                    </div>
                                  )}
                                  <div className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                    ₹{p.salePrice}
                                  </div>
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-8 text-center text-sm text-gray-500">
                              <p>
                                No products found matching "
                                {productSearches[item.id]}"
                              </p>
                            </div>
                          )}
                        </div>
                        <button
                          onMouseDown={(e) => {
                            e.preventDefault(); // Prevent blur
                            setIsProductModalOpen(true);
                          }}
                          className="w-full text-center px-4 py-3 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 text-sm font-bold border-t border-teal-100 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/40 transition"
                        >
                          + Create New Product
                        </button>
                      </div>
                    )}

                    {/* Cost Missing Warning - Show if product selected but has no cost */}
                    {item.shopProductId &&
                      (!item.costPrice || item.costPrice <= 0) && (
                        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded text-xs text-red-700 dark:text-red-300 font-medium">
                          ⚠️ This product cannot be sold until cost is set. Add
                          a purchase or update cost manually.
                        </div>
                      )}
                  </td>
                  <td className="px-4 py-4">
                    <input
                      value={item.hsnSac}
                      onChange={(e) =>
                        updateItem(item.id, "hsnSac", e.target.value)
                      }
                      className="w-full bg-transparent text-sm text-gray-600 outline-none"
                    />
                  </td>
                  <td className="px-4 py-4 relative">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(
                          item.id,
                          "quantity",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      className="w-full bg-gray-50 dark:bg-gray-800 rounded px-2 py-1.5 text-sm text-center outline-none focus:ring-1 focus:ring-teal-500"
                    />
                    {/* Negative stock warning for non-serialized, non-service */}
                    {(() => {
                      const p = products.find(
                        (pp) => pp.id === item.shopProductId,
                      );
                      const shouldWarn =
                        !!p &&
                        p.type !== ProductType.SERVICE &&
                        !p.isSerialized &&
                        typeof p.stockQty === "number" &&
                        item.quantity > (p.stockQty || 0);
                      return shouldWarn ? (
                        <div className="absolute right-2 top-2 group">
                          <span className="text-lg cursor-help">⚠️</span>
                          <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-yellow-50 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 text-xs rounded shadow-lg border border-yellow-200 dark:border-yellow-700 hidden group-hover:block z-50">
                            <strong>Warning: Negative Stock</strong>
                            <br />
                            Stock will drop below zero. You can correct
                            inventory later.
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </td>
                  <td className="px-4 py-4">
                    <input
                      type="number"
                      min="0"
                      value={item.rate}
                      onChange={(e) =>
                        updateItem(
                          item.id,
                          "rate",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      className="w-full bg-transparent border-b border-transparent focus:border-gray-300 outline-none py-1.5 text-sm"
                    />
                    {/* Serialized IMEI input under product cell when applicable */}
                    {(() => {
                      const p = products.find(
                        (pp) => pp.id === item.shopProductId,
                      );
                      if (!p || !p.isSerialized) return null;
                      const mismatch =
                        item.imeis.length > 0 &&
                        item.imeis.length !== item.quantity;
                      return (
                        <div className="mt-3">
                          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                            IMEIs (one per line)
                          </label>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded px-2 py-1.5">
                            📌 Enter exactly one IMEI per quantity (
                            {item.quantity} needed)
                          </p>
                          <textarea
                            value={item.imeis.join("\n")}
                            onChange={(e) =>
                              updateItem(item.id, "imeisText", e.target.value)
                            }
                            className={
                              "w-full min-h-[90px] rounded border px-3 py-2 text-sm outline-none " +
                              (mismatch || imeiHighlight
                                ? "border-red-300 bg-red-50 dark:bg-red-900/20 ring-1 ring-red-300"
                                : "border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50")
                            }
                            placeholder="Enter IMEIs, one per line"
                          />
                          {mismatch && (
                            <div className="mt-1 text-xs text-red-600 dark:text-red-300 font-medium">
                              ⚠️ IMEI count ({item.imeis.length}) must equal
                              quantity ({item.quantity})
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  {selectedShop?.gstEnabled && (
                    <td className="px-4 py-4">
                      <select
                        value={item.gstRate}
                        onChange={(e) =>
                          updateItem(
                            item.id,
                            "gstRate",
                            parseFloat(e.target.value),
                          )
                        }
                        className="w-full bg-transparent text-sm outline-none cursor-pointer"
                      >
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    </td>
                  )}
                  <td className="px-4 py-4 text-right font-medium text-gray-900 dark:text-white">
                    ₹{item.total.toFixed(2)}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-gray-300 hover:text-red-500 transition"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="py-12 text-center text-gray-400 text-sm bg-gray-50/30 dark:bg-gray-800/20 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 m-4"
                  >
                    No items added yet. Search products above or click 'Add
                    Item'.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <button
          onClick={addItem}
          className="px-5 py-2.5 bg-gray-100/80 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold transition border border-gray-200 dark:border-gray-700"
        >
          + Add Item
        </button>
      </div>

      {/* Summary & Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div className="space-y-6">
          {/* Payment Method */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
              Payment Method
            </h3>
            <div className="flex flex-col gap-4">
              <select
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 transition"
                value={paymentMode}
                onChange={(e) => {
                  const newMode = e.target.value as any;
                  setPaymentMode(newMode);
                  // Reset split payments when switching to/from MIXED
                  if (newMode === "MIXED") {
                    setSplitPayments([
                      { id: crypto.randomUUID(), mode: "CASH", amount: "" },
                    ]);
                  }
                }}
              >
                <option value="CASH">Cash</option>
                <option value="UPI">UPI / Online</option>
                <option value="CARD">Card</option>
                <option value="BANK">Bank Transfer</option>
                <option value="CREDIT">Credit (Pay Later)</option>
                <option value="MIXED">Mixed Payment (Split)</option>
              </select>

              {/* Split Payment UI - shown when MIXED is selected */}
              {paymentMode === "MIXED" && (
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                    Split payment across multiple methods:
                  </p>

                  {splitPayments.map((payment, index) => (
                    <div key={payment.id} className="flex items-center gap-2">
                      <select
                        className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded outline-none focus:ring-2 focus:ring-teal-500"
                        value={payment.mode}
                        onChange={(e) => {
                          const newPayments = [...splitPayments];
                          newPayments[index].mode = e.target.value as any;
                          setSplitPayments(newPayments);
                        }}
                      >
                        <option value="CASH">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="CARD">Card</option>
                        <option value="BANK">Bank</option>
                      </select>

                      <input
                        type="number"
                        placeholder="Amount"
                        step="0.01"
                        min="0"
                        className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded outline-none focus:ring-2 focus:ring-teal-500"
                        value={payment.amount}
                        onChange={(e) => {
                          const newPayments = [...splitPayments];
                          newPayments[index].amount = e.target.value;
                          setSplitPayments(newPayments);
                        }}
                      />

                      {splitPayments.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newPayments = splitPayments.filter(
                              (_, i) => i !== index,
                            );
                            setSplitPayments(newPayments);
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"
                          title="Remove"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      setSplitPayments([
                        ...splitPayments,
                        { id: crypto.randomUUID(), mode: "CASH", amount: "" },
                      ]);
                    }}
                    className="w-full px-3 py-2 text-sm text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-700 rounded hover:bg-teal-50 dark:hover:bg-teal-900/20 transition"
                  >
                    + Add Payment Method
                  </button>

                  {/* Split Payment Summary */}
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded text-sm">
                    <div className="flex justify-between font-medium text-blue-900 dark:text-blue-200">
                      <span>Split Total:</span>
                      <span>
                        ₹
                        {splitPayments
                          .reduce(
                            (sum, p) => sum + (parseFloat(p.amount) || 0),
                            0,
                          )
                          .toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-blue-700 dark:text-blue-300 mt-1">
                      <span>Invoice Total:</span>
                      <span>₹{grandTotal.toFixed(2)}</span>
                    </div>
                    {(() => {
                      const splitTotal = splitPayments.reduce(
                        (sum, p) => sum + (parseFloat(p.amount) || 0),
                        0,
                      );
                      const diff = Math.abs(grandTotal - splitTotal);
                      return diff > 0.01 ? (
                        <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-700 text-xs">
                          {splitTotal < grandTotal ? (
                            <span className="text-amber-700 dark:text-amber-300">
                              ⚠️ Partial payment - Balance: ₹
                              {(grandTotal - splitTotal).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-red-700 dark:text-red-300">
                              ❌ Split exceeds total by ₹
                              {(splitTotal - grandTotal).toFixed(2)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-700 text-xs text-green-700 dark:text-green-300">
                          ✓ Split matches invoice total
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-8 shadow-sm">
          <div className="space-y-3">
            <div className="flex justify-between text-gray-500">
              <span className="font-medium">Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            {selectedShop?.gstEnabled && (
              <>
                <div className="flex justify-between text-gray-500">
                  <span className="font-medium">CGST</span>
                  <span>₹{cgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span className="font-medium">SGST</span>
                  <span>₹{sgst.toFixed(2)}</span>
                </div>
                {igst > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span className="font-medium">IGST</span>
                    <span>₹{igst.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-900 dark:text-white pt-2 border-t border-gray-100 dark:border-gray-800">
                  <span className="font-medium">Total Tax</span>
                  <span>₹{totalTax.toFixed(2)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between items-end pt-4 border-t border-gray-100 dark:border-gray-800 mt-2">
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                Grand Total:
              </span>
              <span className="text-3xl font-bold text-teal-600">
                ₹{grandTotal.toFixed(2)}
              </span>
            </div>

            {/* Payment Type Display */}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Payment Type:
                </span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {paymentMode === "CASH"
                    ? "CASH"
                    : paymentMode === "UPI"
                      ? "UPI"
                      : paymentMode === "CARD"
                        ? "CARD"
                        : paymentMode === "BANK"
                          ? "BANK TRANSFER"
                          : paymentMode === "MIXED"
                            ? "MIXED PAYMENT"
                            : "CREDIT"}
                </span>
              </div>

              {/* MIXED Payment Summary */}
              {paymentMode === "MIXED" && splitPayments.length > 0 && (
                <div className="mt-3 p-3 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700 rounded-lg">
                  <p className="text-xs font-semibold text-teal-900 dark:text-teal-200 mb-2">
                    Payment Split:
                  </p>
                  {splitPayments.map((p, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between text-xs text-teal-800 dark:text-teal-300"
                    >
                      <span>{p.mode}</span>
                      <span className="font-mono">
                        ₹{parseFloat(p.amount || "0").toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {paymentMode === "CREDIT" && (
                <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                    💡 This invoice will be marked as unpaid. Collect payment
                    later.
                  </p>
                  <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-700">
                    <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                      Balance Due: ₹{grandTotal.toFixed(2)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4">
            <button
              onClick={() => router.back()}
              className="px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Cancel
            </button>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleSubmit}
                disabled={loading || hasImeiIssues}
                className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold shadow-lg shadow-teal-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Generating..." : "Generate Invoice"}
              </button>
              {hasImeiIssues && (
                <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded px-2 py-1.5">
                  ⚠️ Fix IMEI issues before submitting
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {isCustomerModalOpen && (
        <CustomerModal onClose={handleCustomerModalClose} />
      )}

      {isProductModalOpen && (
        <ProductModal
          shopId={selectedShopId!}
          onClose={handleProductModalClose}
          onProductCreated={handleProductCreated}
        />
      )}
    </div>
  );
}
