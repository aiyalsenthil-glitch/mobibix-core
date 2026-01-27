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

  // Payment handling
  const [paymentMode, setPaymentMode] = useState<
    "CASH" | "UPI" | "CARD" | "BANK" | "CREDIT"
  >("CASH");
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
  const displayPayments = [{ mode: paymentMode, amount: grandTotal }];

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
        paymentMode,
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
                <>
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => handleCustomerSearch(e.target.value)}
                    onFocus={() =>
                      customerResults.length > 0 &&
                      setShowCustomerDropdown(true)
                    }
                    placeholder="Select customer..."
                    className="w-full px-4 py-3 bg-gray-50/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white dark:focus:bg-gray-800 transition shadow-sm"
                  />

                  {showCustomerDropdown && (
                    <div className="absolute z-20 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl max-h-80 overflow-auto">
                      {customerResults.length > 0 ? (
                        <>
                          {customerResults.map((customer) => (
                            <button
                              key={customer.id}
                              onClick={() => selectCustomer(customer)}
                              className="w-full px-5 py-3 text-left hover:bg-teal-50 dark:hover:bg-teal-900/20 border-b border-gray-50 dark:border-gray-700 last:border-0 transition"
                            >
                              <div className="font-medium text-gray-900 dark:text-white">
                                {customer.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {customer.phone}
                              </div>
                            </button>
                          ))}
                          <button
                            onClick={() => {
                              setShowCustomerDropdown(false);
                              setIsCustomerModalOpen(true);
                            }}
                            className="w-full px-5 py-3 text-center text-teal-600 font-semibold hover:bg-teal-50 dark:hover:bg-teal-900/20 transition border-t border-gray-100 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800"
                          >
                            + Add New Customer
                          </button>
                        </>
                      ) : (
                        <div className="px-5 py-8 text-center">
                          <p className="text-gray-500 mb-4">
                            No customers found
                          </p>
                          <button
                            onClick={() => {
                              setShowCustomerDropdown(false);
                              setIsCustomerModalOpen(true);
                            }}
                            className="px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg font-semibold transition"
                          >
                            Create New Customer
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
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

        {/* Inter-State Notice */}
        {isInterState && (
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

        <div className="overflow-hidden rounded-lg border border-gray-100 dark:border-gray-800 mb-6">
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
                                <div className="font-medium text-gray-900 dark:text-white text-sm group-hover:text-teal-700 dark:group-hover:text-teal-300">
                                  {p.name}
                                </div>
                                <div className="flex justify-between items-center mt-1">
                                  <div className="text-xs text-gray-500">
                                    Stock: {p.stock}
                                  </div>
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
                  <td className="px-4 py-4">
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
                onChange={(e) => setPaymentMode(e.target.value as any)}
              >
                <option value="CASH">Cash</option>
                <option value="UPI">UPI / Online</option>
                <option value="CARD">Card</option>
                <option value="BANK">Bank Transfer</option>
                <option value="CREDIT">Credit (Pay Later)</option>
              </select>
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
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4">
            <button
              onClick={() => router.back()}
              className="px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold shadow-lg shadow-teal-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Generating..." : "Generate Invoice"}
            </button>
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
