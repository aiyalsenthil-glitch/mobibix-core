"use client";

import { useState, useEffect, useRef } from "react";
import { listProducts, type ShopProduct, createProduct, ProductType } from "@/services/products.api";
import { getStockBalances } from "@/services/stock.api";
import { InvoiceItem } from "@/services/sales.api";
import { createPurchase } from "@/services/purchases.api";

interface InvoiceItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: InvoiceItem) => Promise<void>;
  shopId: string;
  gstEnabled: boolean;
}

export function InvoiceItemModal({
  isOpen,
  onClose,
  onAdd,
  shopId,
  gstEnabled,
}: InvoiceItemModalProps) {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  
  // Form State
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [rate, setRate] = useState(0);
  const [gstRate, setGstRate] = useState(gstEnabled ? 18 : 0);
  const [pricesIncludeTax, setPricesIncludeTax] = useState(true); // Default to true
  
  // Dropdown state
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Creation Mode State
  const [createMode, setCreateMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newSalePrice, setNewSalePrice] = useState<number | "">("");  // Empty string instead of 0
  const [newCostPrice, setNewCostPrice] = useState<number | "">("");  // Empty string instead of 0
  const [createPurchaseEntry, setCreatePurchaseEntry] = useState(false);
  const [supplierName, setSupplierName] = useState("");

  // Load products on mount
  useEffect(() => {
    if (isOpen && shopId) {
      loadShopProducts();
    }
  }, [isOpen, shopId]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadShopProducts = async () => {
    try {
      setLoadingProducts(true);
      const [productList, balances] = await Promise.all([
        listProducts(shopId),
        getStockBalances(shopId),
      ]);
      const balanceMap = new Map(balances.map((b) => [b.productId, b]));
      const merged = productList.map((p) => {
        const b = balanceMap.get(p.id);
        const stockQty = b?.stockQty ?? p.stockQty ?? 0;
        return { ...p, stockQty };
      });
      setProducts(merged);
    } catch (e) {
      console.error("Failed to load products", e);
    } finally {
      setLoadingProducts(false);
    }
  };

  const filteredProducts = search
    ? products.filter((p) => 
        p.name.toLowerCase().includes(search.toLowerCase()) && 
        p.type === 'SPARE'
      )
    : products.filter(p => p.type === 'SPARE'); // Show spares by default even without search? Or keep empty? 
    // Usually empty is better for large lists, but user wants to see "only spare parts".
    // Let's stick to search-based but also maybe allow listing all if search is empty?
    // Current logic returns [] if search is empty.
    // The user said "add product must list only spare parts".
    // I will keep it search based for performance, but enforce the type filter.

  const handleSelectProduct = (product: ShopProduct) => {
    setSelectedProduct(product);
    setSearch(product.name);
    setRate(product.salePrice);
    setGstRate(gstEnabled ? (product.gstRate || 18) : 0);
    setShowDropdown(false);
  };

  const handleSubmit = async () => {
    let finalProduct = selectedProduct;
    setIsSubmitting(true);
    
    try {
        if (createMode) {
           const salePriceNum = typeof newSalePrice === 'number' ? newSalePrice : parseFloat(newSalePrice || '0');
           const costPriceNum = typeof newCostPrice === 'number' ? newCostPrice : parseFloat(newCostPrice || '0');
           
           if (!newProductName || salePriceNum <= 0) {
              alert("Name and Selling Price are required.");
              setIsSubmitting(false);
              return;
           }
           
           if (createPurchaseEntry) {
              if (costPriceNum <= 0 || !supplierName) {
                 alert("Cost Price and Supplier Name are required for Purchase Entry.");
                 setIsSubmitting(false);
                 return;
              }
           }

           // 1. Create Product (Force type SPARE)
           const newProduct = await createProduct(shopId, {
              name: newProductName,
              type: ProductType.SPARE, 
              salePrice: salePriceNum,
              costPrice: costPriceNum > 0 ? costPriceNum : undefined,
              isSerialized: false,
              gstRate: gstEnabled ? gstRate : 0, 
           });
           
           finalProduct = { ...newProduct, stockQty: 0 }; // Locally mock stock

           // 2. Create Purchase Entry (Optional)
           if (createPurchaseEntry) {
               await createPurchase({
                  shopId,
                  supplierName: supplierName,
                  invoiceNumber: `JOB-AUTO-${Date.now().toString().slice(-6)}`, 
                  paymentMethod: "CASH",
                  items: [{
                     shopProductId: newProduct.id,
                     description: newProductName,
                     quantity: quantity,
                     purchasePrice: costPriceNum,
                  }]
               });
               // After purchase, strictly speaking stock is +quantity, but for invoice item addition
               // we just need the product ID.
           }
        }

        if (!finalProduct) {
             setIsSubmitting(false);
             return;
        }
        
        // Calculate GST Amount
        const effectiveRate = createMode ? (typeof newSalePrice === 'number' ? newSalePrice : parseFloat(newSalePrice || '0')) : rate;
        const effectiveGstRate = gstEnabled ? gstRate : 0;
        
        let finalGstAmount = 0;
        const actualBase = quantity * effectiveRate;
        
        if (pricesIncludeTax) {
            const divisor = 1 + effectiveGstRate / 100;
            const base = actualBase / divisor;
            finalGstAmount = Math.round((actualBase - base) * 100) / 100;
        } else {
            finalGstAmount = Math.round(((actualBase * effectiveGstRate) / 100) * 100) / 100;
        }

        const item: InvoiceItem = {
          shopProductId: finalProduct.id,
          quantity,
          rate: pricesIncludeTax ? (effectiveRate / (1 + effectiveGstRate / 100)) : effectiveRate,
          gstRate: effectiveGstRate,
          gstAmount: finalGstAmount,
          imeis: finalProduct.isSerialized ? [] : undefined 
        };

        await onAdd(item);
        handleClose();
    } catch (e: any) {
        alert(e.message || "Failed to add item");
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSearch("");
    setSelectedProduct(null);
    setQuantity(1);
    setRate(0);
    setCreateMode(false);
    setNewProductName("");
    setNewSalePrice("");
    setNewCostPrice("");
    setCreatePurchaseEntry(false);
    setSupplierName("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
             {createMode ? "Create Item" : "Add Item"}
          </h3>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded text-sm mb-4">
            <strong>Note:</strong> Spare parts only visible in this invoice. For other products, use sales invoice.
          </div>

          {!createMode ? (
             <>
                {/* Product Search */}
                <div className="relative" ref={dropdownRef}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product</label>
                <div className="relative">
                    <input
                        type="text"
                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                        placeholder="Search product..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setShowDropdown(true);
                            if (!e.target.value) setSelectedProduct(null);
                        }}
                        onFocus={() => setShowDropdown(true)}
                    />
                    {/* Inline Create Button */}
                    {!selectedProduct && search.length > 0 && (
                        <button
                            type="button"
                            onClick={() => {
                                setCreateMode(true);
                                setNewProductName(search);
                            }}
                            className="absolute right-2 top-2 text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded hover:bg-teal-200"
                        >
                            + Create
                        </button>
                    )}
                </div>
                
                {showDropdown && filteredProducts.length > 0 && (
                    <div className="w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto z-10">
                    {loadingProducts && <div className="p-2 text-center text-sm text-gray-500">Loading...</div>}
                    {filteredProducts.map((p) => (
                        <button
                        key={p.id}
                        className="w-full text-left px-4 py-2 hover:bg-teal-50 dark:hover:bg-teal-900/30 transition flex justify-between items-center"
                        onClick={() => handleSelectProduct(p)}
                        >
                        <span className="text-gray-900 dark:text-white">{p.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${(p.stockQty ?? 0) > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            Stock: {p.stockQty ?? 0}
                        </span>
                        </button>
                    ))}
                    </div>
                )}
                
                {/* Fallback "Item not found" */}
                {showDropdown && filteredProducts.length === 0 && search.length > 1 && !selectedProduct && (
                    <div className="mt-2 text-center p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <p className="text-sm text-gray-500 mb-2">Item not found.</p>
                        <button
                            type="button"
                            onClick={() => {
                                setCreateMode(true);
                                setNewProductName(search);
                            }}
                            className="text-teal-600 hover:text-teal-700 font-bold text-sm"
                        >
                            Create "{search}"
                        </button>
                    </div>
                )}
                </div>

                {selectedProduct && (
                <>
                    <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
                        <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rate (₹)</label>
                        <input
                        type="number"
                        min="0"
                        value={rate}
                        onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                    </div>
                    </div>
                </>
                )}
             </>
          ) : (
             /* CREATE MODE FORM */
             <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                 <div className="flex justify-between items-center mb-2">
                   <label className="block text-sm font-semibold dark:text-gray-300">New Product Name</label>
                   <button 
                      type="button" 
                      onClick={() => setCreateMode(false)}
                      className="text-xs text-blue-500 hover:underline"
                   >
                      Back to Search
                   </button>
                 </div>
                 <input 
                   type="text" 
                   required
                   className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                   value={newProductName}
                   onChange={e => setNewProductName(e.target.value)}
                 />

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-sm font-semibold mb-2 dark:text-gray-300">Selling Price</label>
                       <input 
                          type="number" 
                          required
                          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          value={newSalePrice}
                          onChange={e => setNewSalePrice(Number(e.target.value))}
                          onWheel={(e) => e.currentTarget.blur()}
                       />
                    </div>
                    <div>
                       <label className="block text-sm font-semibold mb-2 dark:text-gray-300">Cost Price</label>
                       <input 
                          type="number" 
                          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          value={newCostPrice}
                          onChange={e => setNewCostPrice(Number(e.target.value))}
                          onWheel={(e) => e.currentTarget.blur()}
                       />
                    </div>
                 </div>

                 <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border dark:border-gray-700">
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                       <input 
                          type="checkbox" 
                          checked={createPurchaseEntry}
                          onChange={e => setCreatePurchaseEntry(e.target.checked)}
                          className="w-4 h-4 text-teal-600 rounded"
                       />
                       <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Create Purchase Entry?</span>
                    </label>
                    
                    {createPurchaseEntry && (
                       <div className="mt-2 animate-in fade-in slide-in-from-top-1">
                           <label className="block text-xs font-semibold mb-1 text-gray-500 dark:text-gray-400">Supplier Name</label>
                           <input 
                              type="text" 
                              placeholder="e.g. Local Market"
                              className="w-full px-3 py-1.5 text-sm border rounded dark:bg-gray-700 dark:border-gray-500 dark:text-white"
                              value={supplierName}
                              onChange={e => setSupplierName(e.target.value)}
                           />
                       </div>
                    )}
                 </div>
                 
                 <div>
                    <label className="block text-sm font-semibold mb-2 dark:text-gray-300">Quantity</label>
                    <input 
                      type="number" 
                      min="1" 
                      value={quantity}
                      onChange={e => setQuantity(Number(e.target.value))}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                 </div>
             </div>
          )}

          {/* GST Toggle - Show for both modes if product selected or creating */}
          {(selectedProduct || createMode) && gstEnabled && (
            <div className="flex items-center gap-4 py-2 border-t dark:border-gray-800 mt-4 pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                    type="checkbox"
                    checked={pricesIncludeTax}
                    onChange={(e) => setPricesIncludeTax(e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Rate includes Tax</span>
                </label>
                <div className="flex-1 text-right">
                    <label className="text-xs font-medium text-gray-500 mr-2">GST Rate %</label>
                    <input
                    type="number"
                    value={gstRate}
                    onChange={(e) => setGstRate(parseFloat(e.target.value) || 0)}
                    className="w-16 px-2 py-1 border border-gray-200 rounded text-sm bg-gray-50 dark:bg-gray-800 dark:text-white text-right"
                    />
                </div>
            </div>
          )}

          {/* Total Calculation Preview */}
          {(selectedProduct || createMode) && (
            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg flex justify-between items-center text-sm">
                <span className="text-gray-500">Total Amount:</span>
                <span className="font-bold text-gray-900 dark:text-white">
                ₹{(() => {
                    const price = createMode ? (typeof newSalePrice === 'number' ? newSalePrice : parseFloat(newSalePrice || '0')) : rate;
                    return pricesIncludeTax 
                        ? (quantity * price).toFixed(2) 
                        : (quantity * price * (1 + gstRate/100)).toFixed(2);
                })()}
                </span>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex gap-3 justify-end bg-gray-50/50">
          <button 
             onClick={handleClose}
             className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition"
          >
            Cancel
          </button>
          <button
             onClick={handleSubmit}
             disabled={isSubmitting || (createMode && (!newProductName || newSalePrice === "" || newSalePrice === 0)) || (!createMode && !selectedProduct)}
             className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isSubmitting ? "Processing..." : (createMode ? "Create & Add" : "Add Item")}
          </button>
        </div>
      </div>
    </div>
  );
}
