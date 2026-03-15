"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  listProducts,
  type ShopProduct,
  createProduct,
  ProductType,
  getStockLevels,
} from "@/services/products.api";
import {
  createPurchase,
  type PaymentMode,
  type PurchaseStatus,
} from "@/services/purchases.api";
import { addJobCardPart } from "@/services/jobcard.api";
import { 
  listSuppliers, 
  createSupplier, 
  type Supplier 
} from "@/services/suppliers.api";
import { Search, UserPlus, X } from "lucide-react";

interface AddPartModalProps {
  shopId: string;
  jobId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddPartModal({
  shopId,
  jobId,
  onClose,
  onSuccess,
}: AddPartModalProps) {
  type ProductsResponse =
    | ShopProduct[]
    | { data: ShopProduct[]; total: number; skip: number; take: number };

  const normalizeProducts = useCallback(
    (response: ProductsResponse): ShopProduct[] =>
      Array.isArray(response) ? response : response.data,
    [],
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(
    null,
  );
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Creation Mode State
  const [createMode, setCreateMode] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newSalePrice, setNewSalePrice] = useState(0);
  const [newCostPrice, setNewCostPrice] = useState(0);
  const [newHsnCode, setNewHsnCode] = useState("");
  const [createPurchaseEntry, setCreatePurchaseEntry] = useState(false);
  
  // Supplier State
  const [supplierSearch, setSupplierSearch] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [isQuickAddSupplier, setIsQuickAddSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierPhone, setNewSupplierPhone] = useState("");
  const [newSupplierGstin, setNewSupplierGstin] = useState("");

  const qtyInputRef = useRef<HTMLInputElement>(null);
  const supplierDropdownRef = useRef<HTMLDivElement>(null);

  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click outside listener for product and supplier dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
      if (
        supplierDropdownRef.current &&
        !supplierDropdownRef.current.contains(event.target as Node)
      ) {
        setShowSupplierDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Supplier Search Logic
  useEffect(() => {
    if (supplierSearch.length > 0 && !isQuickAddSupplier) {
      listSuppliers().then((allSuppliers) => {
        const filtered = allSuppliers.filter(s => 
          s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
          s.gstin?.toLowerCase().includes(supplierSearch.toLowerCase())
        );
        setSuppliers(filtered);
        setShowSupplierDropdown(true);
      });
    } else {
      setShowSupplierDropdown(false);
    }
  }, [supplierSearch, isQuickAddSupplier]);

  useEffect(() => {
    if (searchTerm.length > 1 && !createMode) {
      // 🛡️ Fetch stock levels separately for accurate display
      Promise.all([listProducts(shopId), getStockLevels(shopId)]).then(
        ([prodResponse, stockResponse]) => {
          const allProds = normalizeProducts(prodResponse);
          const allStock = normalizeProducts(stockResponse);

          const stockMap = new Map(
            allStock.map((s) => [s.id, s.stockQty || 0]),
          );

          setProducts(
            allProds
              .filter(
                (p) =>
                  p.type !== ProductType.SERVICE &&
                  p.name.toLowerCase().includes(searchTerm.toLowerCase()),
              )
              .map((p) => ({
                ...p,
                stock: stockMap.get(p.id) || 0,
              })),
          );
          setShowDropdown(true);
        },
      );
    } else {
      setShowDropdown(false);
    }
  }, [searchTerm, shopId, createMode, normalizeProducts]);

  // UX: Focus quantity when product is selected
  useEffect(() => {
    if (selectedProduct || createMode) {
      setTimeout(() => qtyInputRef.current?.focus(), 100);
    }
  }, [selectedProduct, createMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let productId = selectedProduct?.id;

      if (createMode) {
        if (!newProductName || newSalePrice <= 0) {
          alert("Name and Selling Price are required.");
          setIsSubmitting(false);
          return;
        }

        // 1. Create Product
        const newProduct = await createProduct(shopId, {
          name: newProductName,
          type: ProductType.SPARE, // Default to SPARE for Job Cards
          salePrice: newSalePrice,
          costPrice: newCostPrice > 0 ? newCostPrice : undefined,
          hsnSac: newHsnCode,
          isSerialized: false,
        });
        productId = newProduct.id;

        // 2. Create Purchase Entry (Optional)
        if (createPurchaseEntry) {
          let finalSupplierId = selectedSupplier?.id;
          let finalSupplierName = selectedSupplier?.name || "";

          if (isQuickAddSupplier) {
            if (!newSupplierName) {
              alert("Supplier Name is required.");
              setIsSubmitting(false);
              return;
            }
            const newSupp = await createSupplier({
              name: newSupplierName,
              phone: newSupplierPhone,
              gstin: newSupplierGstin,
            });
            finalSupplierId = newSupp.id;
            finalSupplierName = newSupp.name;
          }

          if (!finalSupplierName && !finalSupplierId) {
            alert("Please select or create a supplier.");
            setIsSubmitting(false);
            return;
          }

          await createPurchase({
            shopId,
            globalSupplierId: finalSupplierId,
            supplierName: finalSupplierName,
            invoiceNumber: `JOB-AUTO-${Date.now().toString().slice(-6)}`,
            paymentMethod: "CASH" as PaymentMode,
            status: "SUBMITTED" as PurchaseStatus, // 🛡️ CRITICAL FIX: Mark as submitted to update stock
            items: [
              {
                shopProductId: productId,
                description: newProductName,
                hsnSac: newHsnCode,
                quantity: quantity,
                purchasePrice: newCostPrice, // Purchase API expects Rupees (it converts to Paisa)
              },
            ],
          });
        }
      }

      if (!productId) {
        alert("Please select or create a product.");
        setIsSubmitting(false);
        return;
      }

      await addJobCardPart(shopId, jobId, productId, quantity);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to add part");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4 dark:text-white">
          {createMode ? "Create Part" : "Add Part"}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!createMode ? (
            <>
              {/* SEARCH MODE */}
              <div>
                <label className="block text-sm font-semibold mb-2 dark:text-gray-300">
                  Search Product
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Only physical parts shown. Service charges are calculated
                  separately.
                </p>
                <div className="relative">
                  <input
                    autoFocus
                    type="text"
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Type product name..."
                    value={selectedProduct ? selectedProduct.name : searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setSelectedProduct(null);
                    }}
                  />
                  {searchTerm.length > 0 && !selectedProduct && (
                    <button
                      type="button"
                      onClick={() => {
                        setCreateMode(true);
                        setNewProductName(searchTerm);
                      }}
                      className="absolute right-2 top-2 text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded hover:bg-teal-200"
                    >
                      + Create New
                    </button>
                  )}
                  {selectedProduct && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProduct(null);
                        setSearchTerm("");
                      }}
                      className="absolute right-12 top-2 text-gray-500 hover:text-red-500 px-2"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Dropdown Results */}
                {showDropdown && products.length > 0 && (
                  <div
                    ref={dropdownRef}
                    className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                  >
                    {products.map((product) => (
                      <div
                        key={product.id}
                        className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                        onClick={() => {
                          setSelectedProduct(product);
                          setSearchTerm(product.name);
                          setShowDropdown(false);
                        }}
                      >
                        <div className="font-semibold dark:text-white">
                          {product.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Stock: {product.stock || 0} • Price: ₹
                          {(product.salePrice / 100).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Create New Prompt (if no results) */}
                {!selectedProduct &&
                  searchTerm.length > 1 &&
                  products.length === 0 && (
                    <div className="mt-2 text-center p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <p className="text-sm text-gray-500 mb-2">
                        Item not found.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setCreateMode(true);
                          setNewProductName(searchTerm);
                        }}
                        className="text-teal-600 hover:text-teal-700 font-bold text-sm"
                      >
                        Create &quot;{searchTerm}&quot;
                      </button>
                    </div>
                  )}
              </div>
            </>
          ) : (
            <>
              {/* CREATE MODE */}
              <div className="bg-teal-50 dark:bg-teal-900/20 p-4 rounded-lg border border-teal-100 dark:border-teal-800">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-bold text-teal-800 dark:text-teal-300">
                    New Product Details
                  </span>
                  <button
                    type="button"
                    onClick={() => setCreateMode(false)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Back to Search
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold block mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-1.5 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                      value={newProductName}
                      onChange={(e) => setNewProductName(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold block mb-1">
                        Sale Price
                      </label>
                      <input
                        type="number"
                        className="w-full px-3 py-1.5 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                        value={newSalePrice}
                        onChange={(e) =>
                          setNewSalePrice(parseFloat(e.target.value))
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold block mb-1">
                        Cost Price
                      </label>
                      <input
                        type="number"
                        className="w-full px-3 py-1.5 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                        value={newCostPrice}
                        onChange={(e) =>
                          setNewCostPrice(parseFloat(e.target.value))
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1">
                      HSN Code (Optional)
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-1.5 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                      value={newHsnCode}
                      onChange={(e) => setNewHsnCode(e.target.value)}
                      placeholder="e.g. 8517"
                    />
                  </div>
                </div>
              </div>

              {/* INTEGRATED PURCHASE ENTRY */}
              <div className="flex items-center gap-2 mt-4 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                <input
                  type="checkbox"
                  id="createPurchase"
                  checked={createPurchaseEntry}
                  onChange={(e) => setCreatePurchaseEntry(e.target.checked)}
                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <label
                  htmlFor="createPurchase"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Create Purchase Entry (Add Stock)
                </label>
              </div>

              {createPurchaseEntry && (
                <div className="space-y-3 bg-gray-50 dark:bg-gray-800/80 p-4 rounded-lg border dark:border-gray-700">
                  {!isQuickAddSupplier ? (
                    <div className="relative">
                      <label className="block text-sm font-semibold mb-1 dark:text-gray-300">
                        Supplier
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder="Search existing supplier..."
                          value={selectedSupplier ? selectedSupplier.name : supplierSearch}
                          onChange={(e) => {
                            setSupplierSearch(e.target.value);
                            setSelectedSupplier(null);
                          }}
                        />
                        {selectedSupplier && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSupplier(null);
                              setSupplierSearch("");
                            }}
                            className="absolute right-3 top-2.5"
                          >
                            <X size={16} className="text-gray-400 hover:text-red-500" />
                          </button>
                        )}
                      </div>

                      {/* Supplier Dropdown */}
                      {showSupplierDropdown && (
                        <div
                          ref={supplierDropdownRef}
                          className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-lg shadow-xl max-h-48 overflow-y-auto"
                        >
                          <div
                            className="px-4 py-2 hover:bg-teal-50 dark:hover:bg-teal-900/20 cursor-pointer flex items-center gap-2 text-teal-600 font-medium text-sm"
                            onClick={() => {
                              setIsQuickAddSupplier(true);
                              setNewSupplierName(supplierSearch);
                              setShowSupplierDropdown(false);
                            }}
                          >
                            <UserPlus size={16} />
                            Create new &quot;{supplierSearch || "Supplier"}&quot;
                          </div>
                          {suppliers.map((s) => (
                            <div
                              key={s.id}
                              className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer border-t dark:border-gray-600"
                              onClick={() => {
                                setSelectedSupplier(s);
                                setSupplierSearch(s.name);
                                setShowSupplierDropdown(false);
                              }}
                            >
                              <div className="text-sm font-semibold dark:text-white">{s.name}</div>
                              {s.gstin && <div className="text-xs text-gray-500">{s.gstin}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3 animate-in fade-in duration-300">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-500 uppercase">New Supplier Details</span>
                        <button 
                          type="button"
                          onClick={() => setIsQuickAddSupplier(false)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Show List
                        </button>
                      </div>
                      <div>
                        <input
                          type="text"
                          required
                          className="w-full px-3 py-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                          placeholder="Supplier Name *"
                          value={newSupplierName}
                          onChange={(e) => setNewSupplierName(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          className="w-full px-3 py-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                          placeholder="Phone"
                          value={newSupplierPhone}
                          onChange={(e) => setNewSupplierPhone(e.target.value)}
                        />
                        <input
                          type="text"
                          className="w-full px-3 py-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                          placeholder="GSTIN"
                          value={newSupplierGstin}
                          onChange={(e) => setNewSupplierGstin(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* QUANTITY (Common) */}
          <div>
            <label className="block text-sm font-semibold mb-2 dark:text-gray-300">
              Quantity
            </label>
            <input
              ref={qtyInputRef}
              type="number"
              min="1"
              required
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value))}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold transition disabled:opacity-50"
            >
              {isSubmitting
                ? "Adding..."
                : createMode
                  ? "Create & Add"
                  : "Add Part"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
