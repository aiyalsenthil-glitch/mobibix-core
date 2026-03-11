import { useState, useRef, useEffect } from "react";
import { type ShopProduct } from "@/services/products.api";
import { type ProductItem } from "@/hooks/useInvoiceForm";
import { useShop } from "@/context/ShopContext";
import { CurrencyText } from "@/components/ui/currency-text";

interface InvoiceProductTableProps {
  items: ProductItem[];
  products: ShopProduct[];
  pricesIncludeTax: boolean;
  onPricesIncludeTaxChange: (checked: boolean) => void;
  onUpdateItem: (
    id: string,
    field: keyof ProductItem | "imeisText" | "serialNumbersText",
    value: string | number | string[] | undefined,
    products: ShopProduct[],
  ) => void;
  onAddItem: () => void;
  onRemoveItem: (id: string) => void;
  onNewProduct: () => void;
  imeiHighlight?: boolean;
}

export function InvoiceProductTable({
  items,
  products,
  pricesIncludeTax,
  onPricesIncludeTaxChange,
  onUpdateItem,
  onAddItem,
  onRemoveItem,
  onNewProduct,
  imeiHighlight = false,
}: InvoiceProductTableProps) {
  const { selectedShop } = useShop();

  // Product Search State
  const [productSearches, setProductSearches] = useState<{
    [key: string]: string;
  }>({});
  const [productDropdowns, setProductDropdowns] = useState<{
    [key: string]: boolean;
  }>({});
  const [_productDropdownPositions, setProductDropdownPositions] = useState<{
    [key: string]: { top: number; left: number; width: number };
  }>({})
  const productInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>(
    {},
  );

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

  // Sync searches with items on mount/update (fill in product names)
  useEffect(() => {
    const newSearches: { [key: string]: string } = {};
    items.forEach((item) => {
      // Only set if not already set or if it matches the product name exactly
      // (to avoid overwriting user typing, but ensuring names are shown)
      // Actually, we just want to set it if it's not being typed in currently
      // Simplification: just rely on the prop for display?
      // No, we need a separate search state for the input field.
      // Let's initialize it if empty and item has a product name
      if (!productSearches[item.id] && item.productName) {
        newSearches[item.id] = item.productName;
      }
    });
    if (Object.keys(newSearches).length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProductSearches((prev) => ({ ...prev, ...newSearches }));
    }
  }, [items]);

  // Handle Scroll/Resize for Dropdowns
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



  const handleProductSearch = (itemId: string, searchTerm: string) => {
    setProductSearches((prev) => ({ ...prev, [itemId]: searchTerm }));

    if (searchTerm.length > 0) {
      setProductDropdowns((prev) => ({ ...prev, [itemId]: true }));
      setTimeout(() => updateDropdownPosition(itemId), 0);
    } else {
      setProductDropdowns((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  const selectProduct = (itemId: string, product: ShopProduct) => {
    onUpdateItem(itemId, "shopProductId", product.id, products);
    setProductSearches((prev) => ({ ...prev, [itemId]: product.name }));
    setProductDropdowns((prev) => ({ ...prev, [itemId]: false }));
  };

  const getFilteredProducts = (itemId: string): ShopProduct[] => {
    const searchTerm = productSearches[itemId] || "";
    if (!searchTerm) return [];
    return products.filter((p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-8 mb-8 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Product Items
        </h2>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div
            className={`w-5 h-5 rounded border flex items-center justify-center transition ${
              pricesIncludeTax
                ? "bg-blue-600 border-blue-600"
                : "bg-white border-gray-300"
            }`}
          >
            <input
              type="checkbox"
              checked={pricesIncludeTax}
              onChange={(e) => onPricesIncludeTaxChange(e.target.checked)}
              className="hidden"
            />
            {pricesIncludeTax && <span className="text-white text-xs">✓</span>}
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
                HSN/SAC {selectedShop?.gstEnabled && <span className="text-red-500">*</span>}
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
            {items.map((item, index) => {
              const product = products.find((p) => p.id === item.shopProductId);
              const isSerialized = product?.isSerialized;
              const isDevice = product?.type === "DEVICE";
              const currentTrackingArray = isDevice ? (item.imeis || []) : (item.serialNumbers || []);
              
              const hasIMEMismatch =
                isSerialized &&
                currentTrackingArray.length !== item.quantity;

              return (
                <tr
                  key={item.id}
                  className="group hover:bg-gray-50/30 dark:hover:bg-gray-800/30 transition"
                >
                  <td className="px-4 py-4 text-sm text-gray-400 text-center align-top pt-5">
                    {index + 1}
                  </td>
                  <td className="px-4 py-4 relative align-top">
                    {/* Product Search Input */}
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
                      onBlur={() => {
                        // Delay closing to allow click event on dropdown item
                        setTimeout(() => {
                          setProductDropdowns((prev) => ({
                            ...prev,
                            [item.id]: false,
                          }));
                        }, 200);
                      }}
                      className="w-full bg-transparent border-b border-gray-200 dark:border-gray-700 focus:border-teal-500 outline-none py-1.5 text-gray-900 dark:text-white placeholder-gray-400 transition"
                    />

                    {/* Dropdown */}
                    {productDropdowns[item.id] && (
                      <div className="absolute left-0 top-full mt-1 w-72 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl flex flex-col overflow-hidden ring-1 ring-black/5">
                        <div className="max-h-48 overflow-y-auto">
                          {getFilteredProducts(item.id).length > 0 ? (
                            getFilteredProducts(item.id).map((p) => (
                              <button
                                key={p.id}
                                onMouseDown={(e) => {
                                  e.preventDefault(); // Prevent blur
                                  selectProduct(item.id, p);
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-teal-50 dark:hover:bg-teal-900/20 border-b border-gray-50 dark:border-gray-700 last:border-0 transition group"
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <div className="font-medium text-gray-900 dark:text-white text-sm group-hover:text-teal-700 dark:group-hover:text-teal-300">
                                    {p.name}
                                  </div>
                                  {p.costPrice !== undefined &&
                                    p.costPrice <= 0 && (
                                      <span className="text-[10px] bg-red-100 text-red-600 px-1.5 rounded">
                                        No Cost
                                      </span>
                                    )}
                                </div>
                                <div className="text-xs text-gray-500 mt-1 flex justify-between">
                                  <CurrencyText amount={p.salePrice || 0} />
                                  <span
                                    className={
                                      p.isNegative
                                        ? "text-red-500 font-medium"
                                        : "text-gray-400"
                                    }
                                  >
                                    Qty: {p.stockQty}
                                  </span>
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-3 text-sm text-gray-500">
                              No products found
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Cost Warning */}
                    {item.costPrice === null || item.costPrice <= 0
                      ? product?.id && (
                          <div className="text-[10px] text-red-500 mt-1">
                            ⚠️ Missing cost price
                          </div>
                        )
                      : null}

                    {/* Tracking Input for Serialized Products */}
                    {isSerialized && (
                      <div className="mt-2">
                        <label
                          className={`text-[10px] font-bold uppercase tracking-wider mb-1 block ${hasIMEMismatch && imeiHighlight ? "text-red-600" : "text-gray-500"}`}
                        >
                          {isDevice ? "IMEIs" : "Serial Numbers"} (Enter {item.quantity})
                        </label>
                        <textarea
                          className={`w-full text-xs p-2 rounded border focus:outline-none focus:ring-1 ${
                            hasIMEMismatch && imeiHighlight
                              ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200"
                              : "border-gray-200 bg-gray-50 focus:border-blue-500 focus:ring-blue-200"
                          }`}
                          rows={Math.min(item.quantity, 4) || 2}
                          placeholder={`Enter/Scan ${isDevice ? "IMEIs" : "Serial Numbers"} (one per line or comma separated)`}
                          value={currentTrackingArray.join("\n") || ""}
                          onChange={(e) =>
                            onUpdateItem(
                              item.id,
                              isDevice ? "imeisText" : "serialNumbersText",
                              e.target.value,
                              products,
                            )
                          }
                        />
                        <div className="flex justify-between mt-1">
                          <span
                            className={`text-[10px] ${currentTrackingArray.length === item.quantity ? "text-green-600" : "text-orange-500"}`}
                          >
                            Count: {currentTrackingArray.length} / {item.quantity}
                          </span>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 align-top">
                    <input
                      type="text"
                      value={item.hsnSac}
                      onChange={(e) =>
                        onUpdateItem(
                          item.id,
                          "hsnSac",
                          e.target.value,
                          products,
                        )
                      }
                      className={`w-full bg-transparent border-b outline-none text-sm py-1 text-gray-900 dark:text-white transition ${
                        selectedShop?.gstEnabled && (!item.hsnSac || item.hsnSac.trim() === "")
                          ? "border-amber-400 focus:border-amber-500"
                          : "border-gray-200 dark:border-gray-700 focus:border-teal-500"
                      }`}
                      placeholder={selectedShop?.gstEnabled ? "Required" : ""}
                    />
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div className="flex flex-col gap-2">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          onUpdateItem(
                            item.id,
                            "quantity",
                            parseFloat(e.target.value) || 0,
                            products,
                          )
                        }
                        className="w-full bg-transparent border-b border-gray-200 dark:border-gray-700 outline-none text-sm py-1 text-gray-900 dark:text-white"
                      />
                      <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-1">
                         <span>Wrty (Days):</span>
                         <input 
                           type="number"
                           value={item.warrantyDays ?? ""}
                           onChange={(e) => 
                             onUpdateItem(
                               item.id,
                               "warrantyDays",
                               e.target.value ? parseInt(e.target.value) : undefined,
                               products
                             )
                           }
                           placeholder="0"
                           className="w-12 bg-gray-50 dark:bg-gray-800 border-none outline-none rounded text-center"
                         />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <input
                      type="number"
                      min="0"
                      value={item.rate}
                      onChange={(e) =>
                        onUpdateItem(
                          item.id,
                          "rate",
                          parseFloat(e.target.value) || 0,
                          products,
                        )
                      }
                      className="w-full bg-transparent border-b border-gray-200 dark:border-gray-700 outline-none text-sm py-1 text-gray-900 dark:text-white"
                    />
                  </td>
                  {selectedShop?.gstEnabled && (
                    <td className="px-4 py-4 align-top">
                      <select
                        value={item.gstRate}
                        onChange={(e) =>
                          onUpdateItem(
                            item.id,
                            "gstRate",
                            parseFloat(e.target.value) || 0,
                            products,
                          )
                        }
                        className="w-full bg-transparent dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 outline-none text-sm py-1 text-gray-900 dark:text-white"
>
                          <option value="0" className="dark:bg-gray-800">0%</option>
                          <option value="5" className="dark:bg-gray-800">5%</option>
                          <option value="12" className="dark:bg-gray-800">12%</option>
                          <option value="18" className="dark:bg-gray-800">18%</option>
                          <option value="28" className="dark:bg-gray-800">28%</option>
                        </select>
                    </td>
                  )}
                  <td className="px-4 py-4 text-right align-top font-medium text-gray-900 dark:text-white">
                    <CurrencyText amount={item.total} isPaise={false} />
                  </td>
                  <td className="px-4 py-4 align-top">
                    <button
                      onClick={() => {
                        onRemoveItem(item.id);
                      }}
                      className="text-gray-400 hover:text-red-500 transition px-2 py-1"
                    >
                      ✕
                    </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onAddItem}
          className="text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 text-sm font-semibold flex items-center gap-2 transition"
        >
          <span>+</span> Add Another Product
        </button>
        <button
          onClick={onNewProduct}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-semibold flex items-center gap-2 transition"
        >
          <span>+</span> New Product
        </button>
      </div>

      {/* Missing Tracking Arrays Alert */}
      {imeiHighlight &&
        items.some(
          (i) => {
            const p = products.find((prod) => prod.id === i.shopProductId);
            if (!p?.isSerialized) return false;
            const tracking = p.type === "DEVICE" ? i.imeis : i.serialNumbers;
            return !tracking || tracking.length !== i.quantity;
          }
        ) && (
          <div className="mt-4 bg-amber-50 text-amber-800 text-xs px-3 py-2 rounded">
            ⚠️ Please ensure all serialized products have the correct number of
            IMEIs or Serial Numbers entered.
          </div>
        )}
    </div>
  );
}
