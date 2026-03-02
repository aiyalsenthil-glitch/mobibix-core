"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { listShops, type Shop } from "@/services/shops.api";
import { 
  createPurchaseOrder, 
  type CreatePODto 
} from "@/services/purchase-orders.api";
import { listProducts, type ShopProduct } from "@/services/products.api";
import { listSuppliers, type Supplier } from "@/services/suppliers.api";
import { useTheme } from "@/context/ThemeContext";
import { useShop } from "@/context/ShopContext";
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Search, 
  FileText, 
  Store, 
  User, 
  Calendar,
  AlertCircle
} from "lucide-react";

export default function NewPurchaseOrderPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const { shops, selectedShopId, selectShop } = useShop();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreatePODto>({
    shopId: selectedShopId || "",
    globalSupplierId: "",
    poNumber: `PO-${Date.now().toString().slice(-6)}`,
    orderDate: new Date().toISOString().split("T")[0],
    expectedDeliveryDate: "",
    currency: "INR",
    exchangeRate: 1.0,
    paymentDueDays: 30,
    items: [],
  });

  // Current item being added
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null);
  const [itemQty, setItemQty] = useState(1);
  const [itemPrice, setItemPrice] = useState(0);

  // Load initial data
  useEffect(() => {
    const loadInit = async () => {
      try {
        const suppliersData = await listSuppliers();
        setSuppliers(suppliersData);
      } catch (err) {
        console.error("Failed to load initial data", err);
      }
    };
    loadInit();
  }, []);

  // Fetch products when shop changes
  useEffect(() => {
    if (!selectedShopId) return;
    const fetchProducts = async () => {
      try {
        const prodData = await listProducts(selectedShopId);
        setProducts(Array.isArray(prodData) ? prodData : prodData.data);
      } catch (err) {
        console.error("Failed to fetch products", err);
      }
    };
    fetchProducts();
    setFormData(prev => ({ ...prev, shopId: selectedShopId }));
  }, [selectedShopId]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return [];
    return products.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 5);
  }, [products, searchQuery]);

  const handleAddProduct = () => {
    if (!selectedProduct) return;
    
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          shopProductId: selectedProduct.id,
          description: selectedProduct.name,
          quantity: itemQty,
          price: itemPrice,
          uom: selectedProduct.uom || 'pcs'
        }
      ]
    }));

    // Reset
    setSelectedProduct(null);
    setSearchQuery("");
    setItemQty(1);
    setItemPrice(0);
  };

  const removeItem = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.globalSupplierId) return setError("Please select a supplier");
    if (formData.items.length === 0) return setError("Please add at least one item");

    try {
      setIsSubmitting(true);
      setError(null);
      await createPurchaseOrder(formData);
      router.push("/purchase-orders");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create PO");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDark = theme === "dark";

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto pb-24">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className={`p-2 rounded-full border ${isDark ? "border-gray-800 hover:bg-gray-800" : "border-gray-200 hover:bg-gray-100"}`}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-bold">New Purchase Order</h1>
          <p className="opacity-60 text-sm">Issue a formal intent to purchase from your supplier</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Header Section */}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 p-6 rounded-2xl border ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
          <div className="space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-widest opacity-50 flex items-center gap-2">
              <User size={14} /> Relationship
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 opacity-80 text-blue-500">Supplier</label>
                <select
                  value={formData.globalSupplierId}
                  onChange={(e) => {
                    const s = suppliers.find(sup => sup.id === e.target.value);
                    setFormData(prev => ({ 
                      ...prev, 
                      globalSupplierId: e.target.value,
                      paymentDueDays: s?.paymentDueDays || 30,
                      currency: s?.preferredCurrency || "INR"
                    }));
                  }}
                  className={`w-full px-4 py-2.5 rounded-xl border appearance-none focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDark ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}
                >
                  <option value="">-- Search Supplier --</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 opacity-80">Shop / Warehouse</label>
                <select
                  value={selectedShopId || ""}
                  onChange={(e) => selectShop(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl border appearance-none focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDark ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}
                >
                  {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-widest opacity-50 flex items-center gap-2">
              <Calendar size={14} /> Timeline & Logic
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 opacity-80">PO Date</label>
                <input 
                  type="date"
                  value={formData.orderDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, orderDate: e.target.value }))}
                  className={`w-full px-4 py-2 rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none ${isDark ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 opacity-80">Exp. Receipt</label>
                <input 
                  type="date"
                  value={formData.expectedDeliveryDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, expectedDeliveryDate: e.target.value }))}
                  className={`w-full px-4 py-2 rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none ${isDark ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 opacity-80 text-amber-500">Payment Terms</label>
                <div className="relative">
                  <input 
                    type="number"
                    value={formData.paymentDueDays}
                    onChange={(e) => setFormData(prev => ({ ...prev, paymentDueDays: parseInt(e.target.value) || 0 }))}
                    className={`w-full px-4 py-2 rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none ${isDark ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-50">Days</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 opacity-80">Ref. PO Number</label>
                <input 
                  type="text"
                  value={formData.poNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, poNumber: e.target.value }))}
                  className={`w-full px-4 py-2 rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none pb-placeholder ${isDark ? "bg-gray-800 border-gray-700 font-mono" : "bg-gray-50 border-gray-200 font-mono"}`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Item Selector Section */}
        <div className={`p-6 rounded-2xl border ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
          <h3 className="text-sm font-bold mb-6 flex items-center gap-2">
            <Plus size={16} className="text-blue-500" /> Add Products to Order
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-end bg-blue-500/5 p-4 rounded-xl border border-dashed border-blue-500/20">
            <div className="lg:col-span-2 relative">
              <label className="block text-xs font-bold uppercase opacity-50 mb-1">Search Product</label>
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:text-blue-500 group-focus-within:opacity-100 transition-all" size={16} />
                <input 
                  type="text"
                  placeholder="Type name or SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-blue-500 ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
                />
                
                {searchQuery && !selectedProduct && filteredProducts.length > 0 && (
                  <div className={`absolute top-full left-0 w-full mt-2 rounded-xl border shadow-2xl z-50 overflow-hidden ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
                    {filteredProducts.map(p => (
                      <button 
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedProduct(p);
                          setSearchQuery(p.name);
                          setItemPrice((p.costPrice || 0) / 100);
                        }}
                        className={`w-full px-4 py-3 text-left flex justify-between items-center transition-colors ${isDark ? "hover:bg-gray-700 border-b border-gray-700 last:border-0" : "hover:bg-gray-50 border-b border-gray-100 last:border-0"}`}
                      >
                        <div>
                          <p className="font-semibold text-sm">{p.name}</p>
                          <p className="text-[10px] opacity-50 font-mono tracking-tighter uppercase">{p.sku || 'No SKU'}</p>
                        </div>
                        <p className="text-xs font-bold text-blue-500">LPP: ₹{(p.costPrice || 0) / 100}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase opacity-50 mb-1">Quantity</label>
              <input 
                type="number"
                min="1"
                value={itemQty}
                onChange={(e) => setItemQty(parseInt(e.target.value) || 0)}
                className={`w-full px-4 py-2.5 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase opacity-50 mb-1">Unit Cost</label>
              <div className="flex gap-2">
                <input 
                  type="number"
                  step="0.01"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(parseFloat(e.target.value) || 0)}
                  className={`flex-1 px-4 py-2.5 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
                />
                <button 
                  type="button"
                  onClick={handleAddProduct}
                  disabled={!selectedProduct}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-30 text-white rounded-xl transition-all"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          {formData.items.length > 0 && (
            <div className="mt-8 overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
              <table className="w-full text-left">
                <thead className={`text-[10px] uppercase font-bold tracking-widest ${isDark ? "bg-gray-800/50 text-gray-500" : "bg-gray-50 text-gray-400"}`}>
                  <tr>
                    <th className="px-6 py-3">Product Description</th>
                    <th className="px-6 py-3 text-center">Qty</th>
                    <th className="px-6 py-3 text-center">Unit Price</th>
                    <th className="px-6 py-3 text-right">Subtotal</th>
                    <th className="px-6 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {formData.items.map((item, idx) => (
                    <tr key={idx} className={isDark ? "hover:bg-gray-800/30" : "hover:bg-gray-50"}>
                      <td className="px-6 py-4 font-medium text-sm">{item.description}</td>
                      <td className="px-6 py-4 text-center text-sm font-bold">{item.quantity} {item.uom}</td>
                      <td className="px-6 py-4 text-center text-sm">₹{item.price.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right font-bold text-sm">₹{(item.quantity * item.price).toFixed(2)}</td>
                      <td className="px-6 py-4 text-right">
                        <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className={`font-bold ${isDark ? "bg-gray-800/50" : "bg-gray-50"}`}>
                    <td colSpan={3} className="px-6 py-4 text-right opacity-60">Estimated Total:</td>
                    <td className="px-6 py-4 text-right text-lg text-blue-600">
                      ₹{formData.items.reduce((sum, i) => sum + (i.quantity * i.price), 0).toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center gap-3">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {/* Action Bar */}
        <div className="flex gap-4">
          <button 
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <FileText size={20} />
                Create Purchase Order
              </>
            )}
          </button>
          <button 
            type="button"
            onClick={() => router.back()}
            className={`px-8 py-4 rounded-2xl font-bold transition-all ${isDark ? "bg-gray-800 hover:bg-gray-700 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900"}`}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
