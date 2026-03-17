"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import type { ReactNode } from "react";
import {
  listProducts,
  type ShopProduct,
} from "@/services/products.api";
import { useTheme } from "@/context/ThemeContext";
import { useShop } from "@/context/ShopContext";
import { NoShopsAlert } from "../components/NoShopsAlert";
import { StockInModal } from "@/components/inventory/StockInModal";
import { useProductCost } from "@/hooks/useProductCost";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Search, 
  Package, 
  AlertTriangle, 
  DollarSign, 
  Plus, 
  Store,
  Box,
  Printer
} from "lucide-react";
import { TriggerAiButton } from "@/components/ai/TriggerAiButton";

export default function InventoryPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const {
    shops,
    selectedShopId,
    isLoadingShops,
    error: shopsError,
    selectShop,
    hasMultipleShops,
  } = useShop();

  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Modal control
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const {
    editingCostId,
    setEditingCostId,
    editingCostValue,
    setEditingCostValue,
    updatingCostId,
    handleUpdateCost,
  } = useProductCost({
    selectedShopId,
    setProducts,
    setError,
    setSuccessMessage,
  });

  // Fetch products
  useEffect(() => {
    if (!selectedShopId) return;

    const fetchProducts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await listProducts(selectedShopId);
        const productList = Array.isArray(data) ? data : data.data;
        setProducts(productList);
      } catch (err: unknown) {
        console.error("Failed to fetch products:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load inventory",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [selectedShopId, refreshTrigger]);

  // Derived state for filtered products
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    return products.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  // Derived stats
  const stats = useMemo(() => {
    const totalProducts = products.length;
    const lowStock = products.filter(p => (p.stockQty || 0) <= (p.reorderLevel || 0)).length;
    const totalValue = products.reduce((sum, p) => sum + ((p.costPrice || 0) * (p.stockQty || 0)), 0);
    return { totalProducts, lowStock, totalValue };
  }, [products]);

  const isDark = theme === "dark";

  return (
    <div className={`min-h-screen pb-20`}>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
              Inventory Management
            </h1>
            <TriggerAiButton 
              prompt="Analyze my inventory and tell me which items need restocking urgently." 
              label="✨ AI Stock Advice"
            />
          </div>
          <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            Track stock levels, manage costs, and monitor inventory health
          </p>
        </div>
        
        {shops.length > 0 && selectedShopId && (
          <div className="flex gap-3">
             <button
              onClick={() => router.push("/tools/barcode-labels")}
              className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border transition-all hover:shadow-lg active:scale-95 font-bold text-sm ${
                isDark ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm"
              }`}
            >
              <Printer size={18} />
              <span>Barcode Labels</span>
            </button>
            <button
              onClick={() => setShowAddStockModal(true)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md transition-all hover:shadow-lg active:scale-95"
            >
              <Plus size={18} />
              <span>Add Stock</span>
            </button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      {selectedShopId && !isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard 
            title="Total Products" 
            value={stats.totalProducts} 
            icon={<Package className="text-blue-500" size={24} />}
            theme={theme}
          />
          <StatCard 
            title="Low Stock Items" 
            value={stats.lowStock} 
            icon={<AlertTriangle className="text-amber-500" size={24} />}
            theme={theme}
            isWarning={stats.lowStock > 0}
          />
          <StatCard 
            title="Inventory Value" 
            value={`₹${stats.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} 
            icon={<DollarSign className="text-green-500" size={24} />}
            theme={theme}
          />
        </div>
      )}

      {/* Main Content Area */}
      <div className={`rounded-xl border shadow-sm overflow-hidden ${
        isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
      }`}>
        
        {/* Toolbar */}
        <div className={`p-4 border-b flex flex-col md:flex-row gap-4 justify-between items-center ${
           isDark ? "border-gray-700 bg-gray-800/50" : "border-gray-100 bg-gray-50"
        }`}>
          {/* Shop Selector */}
          <div className="w-full md:w-auto min-w-[250px]">
             {isLoadingShops ? (
                <div className="h-10 w-full animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
             ) : hasMultipleShops ? (
               <div className="relative">
                 <Store className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
                 <select
                  value={selectedShopId || ""}
                  onChange={(e) => selectShop(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none transition-all ${
                    isDark 
                      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" 
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                  }`}
                >
                  {shops.map((shop) => (
                    <option key={shop.id} value={shop.id}>{shop.name}</option>
                  ))}
                </select>
               </div>
             ) : shops.length > 0 ? (
                <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border ${
                   isDark ? "bg-gray-700/50 border-gray-600 text-gray-200" : "bg-white border-gray-200 text-gray-700"
                }`}>
                   <Store size={16} />
                   <span className="font-medium text-sm">{shops[0]?.name}</span>
                </div>
             ) : (
                <NoShopsAlert variant="compact" />
             )}
          </div>

          {/* Search Bar */}
          <div className="w-full md:w-auto relative group">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
              isDark ? "text-gray-500 group-focus-within:text-teal-400" : "text-gray-400 group-focus-within:text-teal-600"
            }`} />
            <input 
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full md:w-[300px] pl-10 pr-4 py-2.5 rounded-lg border text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all ${
                isDark 
                  ? "bg-gray-900/50 border-gray-600 text-white placeholder-gray-500 focus:border-teal-500/50" 
                  : "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-teal-500"
              }`}
            />
          </div>
        </div>

        {/* Error State */}
        {(error || shopsError) && (
          <div className={`m-4 p-4 rounded-lg flex items-center gap-3 ${
            isDark ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-red-50 text-red-700 border border-red-100"
          }`}>
            <AlertTriangle size={20} />
            <span className="text-sm font-medium">{error || shopsError}</span>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
             <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
             <p className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>Loading inventory...</p>
          </div>
        ) : !selectedShopId || products.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
             <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                isDark ? "bg-gray-700 text-gray-500" : "bg-gray-100 text-gray-400"
             }`}>
                <Box size={32} />
             </div>
             <h3 className={`text-lg font-medium mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>
                {products.length === 0 && selectedShopId ? "No products found" : "No shops selected"}
             </h3>
             <p className={`text-sm max-w-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                {products.length === 0 && selectedShopId 
                   ? "Get started by adding stock to your inventory."
                   : "Select a shop to view and manage your inventory."}
             </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className={isDark ? "border-gray-700 hover:bg-transparent" : "border-gray-100 hover:bg-transparent"}>
                  <TableHead className="w-[30%]">Product Name</TableHead>
                  <TableHead>Stock Level</TableHead>
                  <TableHead>Sale Price</TableHead>
                  <TableHead>Cost Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                   <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center">
                         <p className={isDark ? "text-gray-400" : "text-gray-500"}>
                            No products match &quot;{searchQuery}&quot;
                         </p>
                      </TableCell>
                   </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id} className={`group ${isDark ? "border-gray-700 hover:bg-gray-700/30" : "border-gray-100 hover:bg-gray-50"}`}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                           <span className={isDark ? "text-gray-200" : "text-gray-900"}>{product.name}</span>
                           {product.hsnCode && (
                             <span className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>HSN: {product.hsnCode}</span>
                           )}
                        </div>
                      </TableCell>
                      
                      {/* Stock Level with Visual Indicator */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                           <span className={`font-semibold ${
                             product.isNegative ? "text-red-500" : 
                             (product.stockQty || 0) <= (product.reorderLevel || 0) ? "text-amber-500" :
                             isDark ? "text-gray-300" : "text-gray-700"
                           }`}>
                              {product.stockQty || 0}
                           </span>
                           {product.isNegative && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                                 isDark ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-600"
                              }`}>Neg</span>
                           )}
                        </div>
                      </TableCell>

                      <TableCell>
                         <span className={isDark ? "text-gray-300" : "text-gray-700"}>
                            ₹{product.salePrice.toFixed(2)}
                         </span>
                      </TableCell>

                      <TableCell>
                        {editingCostId === product.id ? (
                          <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-200">
                            <input
                              type="number"
                              autoFocus
                              value={editingCostValue}
                              onChange={(e) => setEditingCostValue(e.target.value)}
                              min="0.01"
                              step="0.01"
                              className={`w-20 px-2 py-1 text-sm rounded border outline-none focus:ring-2 focus:ring-teal-500 ${
                                 isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900"
                              }`}
                            />
                            <button
                              onClick={() => handleUpdateCost(product.id, editingCostValue)}
                              disabled={updatingCostId === product.id}
                              className="p-1 rounded bg-teal-600 text-white hover:bg-teal-700 transition-colors"
                            >
                              {updatingCostId === product.id ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "✓"}
                            </button>
                            <button
                              onClick={() => {
                                setEditingCostId(null);
                                setEditingCostValue("");
                              }}
                              className={`p-1 rounded transition-colors ${
                                 isDark ? "bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white" : "bg-gray-200 text-gray-500 hover:bg-gray-300 hover:text-gray-800"
                              }`}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                             <div className={`font-medium ${
                                !(product.avgCost || product.costPrice) 
                                   ? "text-red-500" 
                                   : isDark ? "text-gray-300" : "text-gray-700"
                             }`}>
                                {(product.avgCost || product.costPrice) 
                                   ? `₹${(product.avgCost || product.costPrice || 0).toFixed(2)}` 
                                   : "—"}
                             </div>
                             {(product.avgCost || product.costPrice) && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                  product.avgCost 
                                    ? isDark ? "bg-blue-500/20 text-blue-300" : "bg-blue-100 text-blue-700"
                                    : isDark ? "bg-green-500/20 text-green-300" : "bg-green-100 text-green-700"
                                }`}>
                                  {product.avgCost ? "WAC" : "Set"}
                                </span>
                             )}
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        <StatusBadge 
                           isSet={!!(product.avgCost || product.costPrice)} 
                           isDark={isDark} 
                        />
                      </TableCell>
                      
                      <TableCell className="text-right">
                         {editingCostId !== product.id && (
                            <button
                               onClick={() => {
                                 setEditingCostId(product.id);
                                 setEditingCostValue(
                                   (product.avgCost || product.costPrice || 0)?.toString() || ""
                                 );
                               }}
                               className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 ${
                                  isDark 
                                     ? "bg-gray-700 hover:bg-gray-600 text-teal-400" 
                                     : "bg-gray-100 hover:bg-gray-200 text-teal-700"
                               }`}
                            >
                               Edit Cost
                            </button>
                         )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Success Toast */}
      {successMessage && (
        <div className="fixed bottom-6 right-6 px-6 py-3 bg-teal-600 text-white rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-right duration-300 z-50">
          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">✓</div>
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {/* Add Stock Modal */}
      <StockInModal
        open={showAddStockModal}
        onOpenChange={setShowAddStockModal}
        shopId={selectedShopId || ""}
        filteredProducts={products}
        onSuccess={() => {
           if (selectedShopId) {
             setRefreshTrigger(prev => prev + 1);
           }
           setSuccessMessage("Stock added successfully!");
           setTimeout(() => setSuccessMessage(null), 3000);
        }}
      />
    </div>
  );
}

// Helper Components

type StatCardProps = {
  title: string;
  value: string | number;
  icon: ReactNode;
  theme: string;
  isWarning?: boolean;
};

function StatCard({ title, value, icon, theme, isWarning }: StatCardProps) {
   const isDark = theme === "dark";
   return (
     <div className={`p-5 rounded-xl border shadow-sm flex items-center gap-4 transition-transform hover:scale-[1.01] ${
        isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
     }`}>
        <div className={`p-3 rounded-lg ${isDark ? "bg-gray-700/50" : "bg-gray-50"}`}>
           {icon}
        </div>
        <div>
           <p className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>{title}</p>
           <p className={`text-2xl font-bold ${
              isWarning ? "text-amber-500" : isDark ? "text-white" : "text-gray-900"
           }`}>
              {value}
           </p>
        </div>
     </div>
   )
}

function StatusBadge({ isSet, isDark }: { isSet: boolean, isDark: boolean }) {
   if (isSet) {
      return (
         <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
            isDark ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-green-50 text-green-700 border border-green-100"
         }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            Ready
         </span>
      )
   }
   return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
         isDark ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-amber-50 text-amber-700 border border-amber-100"
      }`}>
         <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
         Incomplete
      </span>
   )
}
