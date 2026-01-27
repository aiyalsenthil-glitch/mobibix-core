"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { searchCustomers, type Customer } from "@/services/customers.api";
import { listProducts, type ShopProduct } from "@/services/products.api";
import { createInvoice } from "@/services/sales.api";
import { useTheme } from "@/context/ThemeContext";
import { useShop } from "@/context/ShopContext";
import { CustomerModal } from "../../customers/CustomerModal";
import { ProductModal } from "../../products/ProductModal";

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

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [items, setItems] = useState<ProductItem[]>([]);
  const [pricesIncludeTax, setPricesIncludeTax] = useState(true);
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  // Mixed payment support
  const [paymentMethods, setPaymentMethods] = useState<
    Array<{ mode: "CASH" | "UPI" | "CARD" | "BANK" | "CREDIT"; amount: number }>
  >([{ mode: "CASH", amount: 0 }]);
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

  // Load products when shop is selected
  useEffect(() => {
    if (selectedShopId) {
      loadProducts(selectedShopId);
    }
  }, [selectedShopId]);

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
      const data = await listProducts(shopId);
      setProducts(data);
    } catch (err: any) {
      console.error("Failed to load products:", err);
    }
  };

  // Customer search
  const handleCustomerSearch = async (value: string) => {
    setCustomerSearch(value);
    if (value.length >= 3) {
      try {
        const results = await searchCustomers(value, 10);
        setCustomerResults(results);
        setShowCustomerDropdown(true); // Always show dropdown, even if empty
      } catch (err: any) {
        console.error("Customer search failed:", err);
        setCustomerResults([]);
        setShowCustomerDropdown(true); // Show dropdown even on error
      }
    } else {
      setCustomerResults([]);
      setShowCustomerDropdown(false);
    }
  };

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch(`${customer.name} (${customer.phone})`);
    setShowCustomerDropdown(false);
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerSearch("");
  };

  const handleCustomerModalClose = () => {
    setIsCustomerModalOpen(false);
    // Refresh customer search after creation
    if (customerSearch.length >= 3) {
      handleCustomerSearch(customerSearch);
    }
  };

  const handleProductModalClose = () => {
    setIsProductModalOpen(false);
    // Ensure all dropdowns are closed when modal closes
    setProductDropdowns({});
    setProductDropdownPositions({});
  };

  const handleProductCreated = (product: ShopProduct) => {
    // Add new product to the list
    setProducts([...products, product]);
    // Close modal and ensure dropdowns are closed
    setIsProductModalOpen(false);
    setProductDropdowns({});
    setProductDropdownPositions({});
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
            gstAmount = Math.round(baseAmount - base);
            total = baseAmount;
          } else {
            // Price excludes GST, add it
            gstAmount = Math.round((baseAmount * gstRate) / 100);
            total = baseAmount + gstAmount;
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
              updated.gstAmount = Math.round(baseAmount - base);
              updated.total = baseAmount;
            } else {
              // Price excludes GST, add it
              updated.gstAmount = Math.round(
                (baseAmount * updated.gstRate) / 100,
              );
              updated.total = baseAmount + updated.gstAmount;
            }
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

  const cgst = isInterState
    ? 0
    : items.reduce((sum, item) => sum + item.gstAmount / 2, 0);
  const sgst = cgst;
  const igst = isInterState
    ? items.reduce((sum, item) => sum + item.gstAmount, 0)
    : 0;
  const totalTax = cgst + sgst + igst;
  const grandTotal = subtotal + totalTax;

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

    // Validate payment methods
    const totalPaid = paymentMethods.reduce((sum, p) => sum + p.amount, 0);
    const paymentMethodsWithAmount = paymentMethods.filter((p) => p.amount > 0);

    if (paymentMethodsWithAmount.length === 0) {
      setError("Please add at least one payment method with amount");
      return;
    }

    // Check if total paid matches grand total (with small tolerance for floating point)
    if (Math.abs(totalPaid - grandTotal) > 0.01) {
      setError(
        `Total payment (₹${totalPaid.toFixed(2)}) must match invoice total (₹${grandTotal.toFixed(2)})`,
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        shopId: selectedShop.id,
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerPhone: selectedCustomer.phone,
        customerState: selectedCustomer.state,
        customerGstin: selectedCustomer.gstNumber,
        paymentMethods: paymentMethodsWithAmount, // Only include methods with amount > 0
        pricesIncludeTax,
        items: items.map((item) => ({
          shopProductId: item.shopProductId,
          quantity: item.quantity,
          rate: item.rate,
          gstRate: item.gstRate,
          gstAmount: item.gstAmount,
        })),
      };

      await createInvoice(payload);
      router.push(`/sales?shopId=${selectedShopId}`);
    } catch (err: any) {
      setError(err.message || "Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  if (isLoadingShops) {
    return (
      <div className="max-w-6xl mx-auto text-center py-12">
        <p
          className={`${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
        >
          Loading shop details...
        </p>
      </div>
    );
  }

  if (!selectedShop) {
    return (
      <div className="max-w-6xl mx-auto text-center py-12">
        <p
          className={`${theme === "dark" ? "text-red-400" : "text-red-600"} mb-4`}
        >
          No shop selected or shop not found.
        </p>
        <button
          onClick={() => router.push("/sales")}
          className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold transition"
        >
          Go to Sales
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1
          className={`text-3xl font-bold mb-2 ${theme === "dark" ? "text-white" : "text-black"}`}
        >
          Create New Sales Invoice
        </h1>
        <p
          className={`${theme === "dark" ? "text-gray-400" : "text-zinc-600"}`}
        >
          Fill in the details below to generate a new GST invoice.
        </p>
      </div>

      {shopError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 dark:bg-red-500/20 dark:border-red-500/50 dark:text-red-200 px-4 py-3 rounded-lg mb-4">
          {shopError}
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 dark:bg-red-500/20 dark:border-red-500/50 dark:text-red-200 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Customer & Invoice Details */}
      <div
        className={`border rounded-lg p-6 mb-6 shadow-sm ${theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-gray-200"}`}
      >
        <div className="flex items-start justify-between mb-4">
          <h2
            className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-black"}`}
          >
            Customer & Invoice Details
          </h2>
          <div className="text-right">
            <div
              className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-zinc-600"}`}
            >
              Invoice #:
            </div>
            <div
              className={`text-lg font-semibold ${theme === "dark" ? "text-white" : "text-black"}`}
            >
              AT-P-{new Date().getFullYear().toString().slice(2)}
              {(new Date().getMonth() + 1).toString().padStart(2, "0")}
              {new Date().getDate().toString().padStart(2, "0")}-0011
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer Selection */}
          <div className="relative">
            <label
              className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-black"}`}
            >
              Customer
            </label>
            {selectedCustomer ? (
              <div className="border border-gray-300 dark:border-white/20 rounded-lg p-4 bg-gray-50 dark:bg-white/5">
                <div className="flex items-start justify-between">
                  <div>
                    <div
                      className={`font-semibold ${theme === "dark" ? "text-white" : "text-black"}`}
                    >
                      {selectedCustomer.name} ({selectedCustomer.phone})
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      GSTIN: {selectedCustomer.gstNumber || "N/A"} | Address:{" "}
                      {selectedCustomer.gstNumber ? "N/A" : "N/A"} | State:{" "}
                      {selectedCustomer.state}
                    </div>
                  </div>
                  <button
                    onClick={clearCustomer}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => handleCustomerSearch(e.target.value)}
                  onFocus={() =>
                    customerResults.length > 0 && setShowCustomerDropdown(true)
                  }
                  placeholder="Search by name or phone (min 3 chars)..."
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                    theme === "dark"
                      ? "bg-white/10 border-white/20 text-white"
                      : "bg-white border-gray-300 text-black placeholder-gray-500"
                  }`}
                />
                {showCustomerDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-stone-900 border border-gray-200 dark:border-white/20 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {customerResults.length > 0 ? (
                      <>
                        {customerResults.map((customer) => (
                          <button
                            key={customer.id}
                            onClick={() => selectCustomer(customer)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-white/10 border-b border-gray-100 dark:border-white/10 last:border-0"
                          >
                            <div className="font-medium text-gray-900 dark:text-white">
                              {customer.name}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {customer.phone} • {customer.state}
                            </div>
                          </button>
                        ))}
                        <button
                          onClick={() => {
                            setShowCustomerDropdown(false);
                            setIsCustomerModalOpen(true);
                          }}
                          className="w-full px-4 py-3 text-center text-teal-600 dark:text-teal-400 hover:bg-gray-50 dark:hover:bg-white/5 font-medium border-t border-gray-200 dark:border-white/20"
                        >
                          ⊕ Create New Customer
                        </button>
                      </>
                    ) : (
                      <div className="px-4 py-6 text-center">
                        <p className="text-gray-600 dark:text-gray-400 mb-3">
                          No customers found
                        </p>
                        <button
                          onClick={() => {
                            setShowCustomerDropdown(false);
                            setIsCustomerModalOpen(true);
                          }}
                          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition"
                        >
                          ⊕ Create New Customer
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {customerSearch.length > 0 &&
                  customerSearch.length < 3 &&
                  !showCustomerDropdown && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
                      Type 3+ characters to search.
                    </div>
                  )}
              </>
            )}
          </div>

          {/* Invoice Date */}
          <div>
            <label
              className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-black"}`}
            >
              Invoice Date
            </label>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                theme === "dark"
                  ? "bg-white/5 border-white/20 text-white"
                  : "bg-white border-gray-300 text-black"
              }`}
            />
          </div>
        </div>

        {/* Inter-State Notice */}
        {isInterState && (
          <div className="mt-4 bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/30 rounded-lg p-4">
            <div className="flex items-start">
              <span className="text-teal-600 dark:text-teal-400 mr-2">ℹ️</span>
              <div>
                <div className="font-semibold text-teal-900 dark:text-teal-300">
                  Inter-State Sale
                </div>
                <div className="text-sm text-teal-700 dark:text-teal-400 mt-1">
                  IGST will be applied as customer state is different from shop
                  state.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Product Items */}
      <div
        className={`border rounded-lg p-6 mb-6 shadow-sm ${theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-gray-200"}`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2
            className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-black"}`}
          >
            Product Items
          </h2>
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={pricesIncludeTax}
              onChange={(e) => setPricesIncludeTax(e.target.checked)}
              className="w-4 h-4 text-teal-600 rounded focus:ring-2 focus:ring-teal-500"
            />
            <span className="text-teal-600 dark:text-teal-400 font-medium">
              Prices are Tax Inclusive
            </span>
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead
              className={`border-b ${theme === "dark" ? "bg-white/5 border-white/10" : "bg-gray-100 border-gray-300"}`}
            >
              <tr>
                <th
                  className={`text-left px-3 py-3 text-sm font-semibold w-8 ${theme === "dark" ? "text-gray-300" : "text-black"}`}
                >
                  #
                </th>
                <th
                  className={`text-left px-3 py-3 text-sm font-semibold ${theme === "dark" ? "text-gray-300" : "text-black"}`}
                >
                  Product / Description
                </th>
                <th
                  className={`text-left px-3 py-3 text-sm font-semibold w-32 ${theme === "dark" ? "text-gray-300" : "text-black"}`}
                >
                  HSN/SAC
                </th>
                <th
                  className={`text-left px-3 py-3 text-sm font-semibold w-24 ${theme === "dark" ? "text-gray-300" : "text-black"}`}
                >
                  Qty.
                </th>
                <th
                  className={`text-left px-3 py-3 text-sm font-semibold w-32 ${theme === "dark" ? "text-gray-300" : "text-black"}`}
                >
                  Price
                </th>
                {selectedShop?.gstEnabled && (
                  <th
                    className={`text-left px-3 py-3 text-sm font-semibold w-24 ${theme === "dark" ? "text-gray-300" : "text-black"}`}
                  >
                    GST %
                  </th>
                )}
                <th
                  className={`text-left px-3 py-3 text-sm font-semibold w-32 ${theme === "dark" ? "text-gray-300" : "text-black"}`}
                >
                  Total
                </th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr
                  key={item.id}
                  className="border-b border-gray-200 dark:border-white/10"
                >
                  <td className="px-3 py-3 text-sm text-gray-900 dark:text-white">
                    {index + 1}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <input
                        ref={(el) => {
                          productInputRefs.current[item.id] = el;
                        }}
                        type="text"
                        placeholder="Search..."
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
                            setTimeout(
                              () => updateDropdownPosition(item.id),
                              0,
                            );
                          }
                        }}
                        className={`flex-1 px-2 py-1.5 border rounded text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                          theme === "dark"
                            ? "bg-white/10 border-white/20 text-white placeholder-gray-400"
                            : "bg-white border-gray-300 text-black placeholder-gray-500"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          // Close dropdown when opening modal
                          setProductDropdowns((prev) => ({
                            ...prev,
                            [item.id]: false,
                          }));
                          setProductDropdownPositions((prev) => {
                            const updated = { ...prev };
                            delete updated[item.id];
                            return updated;
                          });
                          setIsProductModalOpen(true);
                        }}
                        title="Create new product"
                        className={`shrink-0 px-1.5 py-1.5 rounded transition text-sm ${
                          theme === "dark"
                            ? "text-teal-400 hover:bg-teal-500/20"
                            : "text-teal-600 hover:bg-teal-50"
                        }`}
                      >
                        🌐
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="text"
                      value={item.hsnSac}
                      onChange={(e) =>
                        updateItem(item.id, "hsnSac", e.target.value)
                      }
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                        theme === "dark"
                          ? "bg-white/10 border-white/20 text-white"
                          : "bg-white border-gray-300 text-black"
                      }`}
                      placeholder="8504"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(
                          item.id,
                          "quantity",
                          parseInt(e.target.value) || 0,
                        )
                      }
                      min="1"
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                        theme === "dark"
                          ? "bg-white/10 border-white/20 text-white"
                          : "bg-white border-gray-300 text-black"
                      }`}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="number"
                      value={item.rate}
                      onChange={(e) =>
                        updateItem(
                          item.id,
                          "rate",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      min="0"
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                        theme === "dark"
                          ? "bg-white/10 border-white/20 text-white"
                          : "bg-white border-gray-300 text-black"
                      }`}
                    />
                  </td>
                  {selectedShop?.gstEnabled && (
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        value={item.gstRate}
                        onChange={(e) =>
                          updateItem(
                            item.id,
                            "gstRate",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        min="0"
                        max="100"
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                          theme === "dark"
                            ? "bg-white/10 border-white/20 text-white"
                            : "bg-white border-gray-300 text-black"
                        }`}
                      />
                    </td>
                  )}
                  <td
                    className={`px-3 py-3 text-sm font-semibold ${theme === "dark" ? "text-white" : "text-black"}`}
                  >
                    ₹{item.total.toFixed(2)}
                  </td>
                  <td className="px-3 py-3">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
                      title="Delete item"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          onClick={addItem}
          className="mt-4 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg font-medium transition flex items-center"
        >
          <span className="mr-2">+</span>
          Add Item
        </button>
      </div>

      {/* Payment & Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payment Methods */}
        <div
          className={`border rounded-lg p-6 shadow-sm ${theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-gray-200"}`}
        >
          <label
            className={`block text-sm font-medium mb-4 ${theme === "dark" ? "text-gray-300" : "text-black"}`}
          >
            Payment Methods (Mixed Payments Allowed)
          </label>
          <div className="space-y-3">
            {paymentMethods.map((payment, index) => (
              <div key={index} className="flex gap-3 items-end">
                <div className="flex-1">
                  <label
                    className={`block text-xs font-medium mb-1 ${theme === "dark" ? "text-gray-400" : "text-gray-700"}`}
                  >
                    Method
                  </label>
                  <select
                    value={payment.mode}
                    onChange={(e) => {
                      const updated = [...paymentMethods];
                      updated[index].mode = e.target
                        .value as typeof payment.mode;
                      setPaymentMethods(updated);
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm ${
                      theme === "dark"
                        ? "bg-white/10 border-white/20 text-white"
                        : "bg-white border-gray-300 text-black"
                    }`}
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="CARD">Card</option>
                    <option value="BANK">Bank Transfer</option>
                    <option value="CREDIT">Credit</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label
                    className={`block text-xs font-medium mb-1 ${theme === "dark" ? "text-gray-400" : "text-gray-700"}`}
                  >
                    Amount
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={payment.amount === 0 ? "" : payment.amount}
                    onChange={(e) => {
                      const updated = [...paymentMethods];
                      updated[index].amount = parseFloat(e.target.value) || 0;
                      setPaymentMethods(updated);
                    }}
                    placeholder="0.00"
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm ${
                      theme === "dark"
                        ? "bg-white/10 border-white/20 text-white"
                        : "bg-white border-gray-300 text-black"
                    }`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (paymentMethods.length > 1) {
                      setPaymentMethods(
                        paymentMethods.filter((_, i) => i !== index),
                      );
                    }
                  }}
                  disabled={paymentMethods.length === 1}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setPaymentMethods([
                ...paymentMethods,
                { mode: "CASH", amount: 0 },
              ]);
            }}
            className="mt-3 w-full px-4 py-2 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-500/10 rounded-lg font-medium transition text-sm"
          >
            + Add Payment Method
          </button>

          {/* Payment validation indicator */}
          {(() => {
            const totalPaid = paymentMethods.reduce(
              (sum, p) => sum + p.amount,
              0,
            );
            const isBalanced = Math.abs(totalPaid - grandTotal) < 0.01;
            const paymentMethodsWithAmount = paymentMethods.filter(
              (p) => p.amount > 0,
            );

            return (
              <>
                {paymentMethodsWithAmount.length > 0 && (
                  <div
                    className={`mt-4 pt-3 border-t ${
                      theme === "dark" ? "border-white/10" : "border-gray-200"
                    }`}
                  >
                    <div
                      className={`flex items-center gap-2 text-sm font-medium ${
                        isBalanced
                          ? "text-green-600 dark:text-green-400"
                          : "text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {isBalanced ? (
                        <>
                          <span>✓</span>
                          <span>Payment Balanced</span>
                        </>
                      ) : (
                        <>
                          <span>!</span>
                          <span>
                            Difference: ₹{(grandTotal - totalPaid).toFixed(2)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {/* Summary */}
        <div
          className={`border rounded-lg p-6 shadow-sm ${theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-gray-200"}`}
        >
          <div className="space-y-3">
            <div
              className={`flex justify-between ${theme === "dark" ? "text-gray-300" : "text-black"}`}
            >
              <span>Subtotal</span>
              <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
            </div>
            {selectedShop?.gstEnabled && (
              <>
                {isInterState ? (
                  <div
                    className={`flex justify-between ${theme === "dark" ? "text-gray-300" : "text-black"}`}
                  >
                    <span>IGST</span>
                    <span className="font-semibold">₹{igst.toFixed(2)}</span>
                  </div>
                ) : (
                  <>
                    <div
                      className={`flex justify-between ${theme === "dark" ? "text-gray-300" : "text-black"}`}
                    >
                      <span>CGST</span>
                      <span className="font-semibold">₹{cgst.toFixed(2)}</span>
                    </div>
                    <div
                      className={`flex justify-between ${theme === "dark" ? "text-gray-300" : "text-black"}`}
                    >
                      <span>SGST</span>
                      <span className="font-semibold">₹{sgst.toFixed(2)}</span>
                    </div>
                  </>
                )}
                <div
                  className={`flex justify-between ${theme === "dark" ? "text-gray-300" : "text-black"}`}
                >
                  <span>Total Tax:</span>
                  <span className="font-semibold">₹{totalTax.toFixed(2)}</span>
                </div>
              </>
            )}
            <div
              className={`border-t pt-3 flex justify-between text-lg font-bold ${theme === "dark" ? "border-white/20 text-white" : "border-gray-200 text-black"}`}
            >
              <span>Grand Total:</span>
              <span>₹{grandTotal.toFixed(2)}</span>
            </div>

            {/* Payment Summary */}
            <div
              className={`border-t pt-3 ${theme === "dark" ? "border-white/20" : "border-gray-200"}`}
            >
              <div className="text-sm font-medium mb-2 text-gray-600 dark:text-gray-400">
                Payment Summary:
              </div>
              {paymentMethods
                .filter((p) => p.amount > 0)
                .map((payment, idx) => (
                  <div key={idx} className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">
                      {payment.mode}:
                    </span>
                    <span>₹{payment.amount.toFixed(2)}</span>
                  </div>
                ))}
              <div
                className={`flex justify-between text-sm font-semibold mt-2 pt-2 ${theme === "dark" ? "border-white/20 border-t" : "border-gray-200 border-t"}`}
              >
                <span>Total Paid:</span>
                <span>
                  ₹
                  {paymentMethods
                    .reduce((sum, p) => sum + p.amount, 0)
                    .toFixed(2)}
                </span>
              </div>
              {paymentMethods.reduce((sum, p) => sum + p.amount, 0) <
                grandTotal && (
                <div
                  className={`flex justify-between text-sm font-semibold mt-1 ${paymentMethods.reduce((sum, p) => sum + p.amount, 0) < grandTotal ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}`}
                >
                  <span>Remaining:</span>
                  <span>
                    ₹
                    {(
                      grandTotal -
                      paymentMethods.reduce((sum, p) => sum + p.amount, 0)
                    ).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4 mt-6">
        <button
          onClick={() => router.back()}
          className="px-6 py-2.5 border border-gray-300 dark:border-white/20 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-white/5 transition"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading || !selectedCustomer || items.length === 0}
          className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-lg font-semibold transition shadow-sm disabled:cursor-not-allowed"
        >
          {loading ? "Generating..." : "Generate Invoice"}
        </button>
      </div>

      {/* Customer Modal */}
      {isCustomerModalOpen && (
        <CustomerModal onClose={handleCustomerModalClose} />
      )}

      {/* Product Modal */}
      {isProductModalOpen && selectedShopId && (
        <ProductModal
          shopId={selectedShopId}
          onClose={handleProductModalClose}
          onProductCreated={handleProductCreated}
        />
      )}

      {/* Product Dropdowns - Rendered outside table using portals */}
      {Object.entries(productDropdowns).map(([itemId, isOpen]) => {
        if (!isOpen) return null;
        const position = productDropdownPositions[itemId];
        if (!position) return null;

        return (
          <div
            key={itemId}
            className={`fixed border rounded shadow-lg max-h-60 overflow-y-auto z-[10000] ${
              theme === "dark"
                ? "bg-gray-800 border-white/20"
                : "bg-white border-gray-300"
            }`}
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
              width: `${position.width}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {getFilteredProducts(itemId).length > 0 ? (
              getFilteredProducts(itemId).map((product) => {
                const currentItem = items.find((i) => i.id === itemId);
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => selectProduct(itemId, product)}
                    className={`w-full text-left px-3 py-2 hover:bg-teal-50 dark:hover:bg-teal-500/20 transition border-b border-gray-100 dark:border-white/10 text-xs ${
                      currentItem?.shopProductId === product.id
                        ? "bg-teal-100 dark:bg-teal-500/30"
                        : ""
                    }`}
                  >
                    <div
                      className={`truncate ${
                        theme === "dark" ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {product.name}
                    </div>
                    <div
                      className={`text-xs truncate ${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      HSN: {product.hsnCode || "N/A"} | Stock:{" "}
                      {product.stockQty || 0}
                    </div>
                  </button>
                );
              })
            ) : (
              <div
                className={`px-3 py-2 text-center text-xs ${
                  theme === "dark" ? "text-gray-400" : "text-gray-600"
                }`}
              >
                <div>No products found</div>
                <button
                  type="button"
                  onClick={() => {
                    // Close dropdown when opening modal
                    setProductDropdowns((prev) => ({
                      ...prev,
                      [itemId]: false,
                    }));
                    setProductDropdownPositions((prev) => {
                      const updated = { ...prev };
                      delete updated[itemId];
                      return updated;
                    });
                    setIsProductModalOpen(true);
                  }}
                  className="text-teal-600 dark:text-teal-400 hover:underline mt-1 text-xs"
                >
                  + Create
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Click outside handler to close dropdowns */}
      {Object.values(productDropdowns).some((isOpen) => isOpen) && (
        <div
          className="fixed inset-0 z-[9999]"
          onClick={() => {
            setProductDropdowns({});
            setProductDropdownPositions({});
          }}
        />
      )}
    </div>
  );
}
