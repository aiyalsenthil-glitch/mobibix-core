"use client";

import { useState, useEffect, useMemo } from "react";
import { useShop } from "@/context/ShopContext";
import { useTheme } from "@/context/ThemeContext";
import { listProducts, type ShopProduct } from "@/services/products.api";
import { BarcodeLabel, type LabelSize } from "./BarcodeLabel";
import { 
  Search, 
  Printer, 
  Share2, 
  LayoutGrid, 
  Square, 
  Trash2, 
  Plus, 
  Settings2,
  ChevronRight,
  RefreshCw,
  Box,
  ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function BarcodeLabelStudio() {
  const { theme } = useTheme();
  const { selectedShopId, shops } = useShop();
  const isDark = theme === "dark";

  // Form State
  const [barcodeValue, setBarcodeValue] = useState("");
  const [productName, setProductName] = useState("");
  const [price, setPrice] = useState("");
  const [copies, setCopies] = useState(1);
  const [labelSize, setLabelSize] = useState<LabelSize>("MEDIUM");
  const [showShopName, setShowShopName] = useState(true);

  // App State
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [viewMode, setViewMode] = useState<"SINGLE" | "SHEET">("SINGLE");

  const selectedShop = useMemo(() => 
    shops.find(s => s.id === selectedShopId), 
  [shops, selectedShopId]);

  // Load products for search
  useEffect(() => {
    if (!selectedShopId) return;
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        const data = await listProducts(selectedShopId);
        setProducts(Array.isArray(data) ? data : data.data);
      } catch (err) {
        console.error("Failed to load products", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, [selectedShopId]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.sku?.toLowerCase().includes(q) || 
      p.barcode?.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [products, searchQuery]);

  const handleSelectProduct = (p: ShopProduct) => {
    setProductName(p.name);
    setBarcodeValue(p.sku || p.barcode || p.id.slice(0, 12).toUpperCase());
    setPrice((p.salePrice / 100).toString());
    setShowSearch(false);
    setSearchQuery("");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    setBarcodeValue("");
    setProductName("");
    setPrice("");
    setCopies(1);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 min-h-[80vh]">
      {/* Sidebar Controls */}
      <div className={`w-full lg:w-[400px] flex flex-col gap-6 print:hidden transition-all duration-300`}>
        {/* Search Section */}
        <section className={`p-6 rounded-2xl border ${
          isDark ? "bg-gray-800/40 border-gray-700 backdrop-blur-md" : "bg-white border-gray-100 shadow-sm"
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-sm font-bold flex items-center gap-2 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              <Settings2 size={16} /> Label Configuration
            </h3>
            <button 
              onClick={handleReset}
              className={`p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors ${isDark ? "text-gray-500" : "text-gray-400"}`}
              title="Reset Form"
            >
              <Trash2 size={16} />
            </button>
          </div>

          <div className="space-y-4">
            {/* Product Search Input */}
            <div className="relative">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 block px-1">
                Quick Find Product
              </label>
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? "text-gray-500" : "text-gray-400"}`} />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearch(true);
                  }}
                  onFocus={() => setShowSearch(true)}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none transition-all ${
                    isDark 
                      ? "bg-gray-900/50 border-gray-700 text-white focus:border-teal-500/50" 
                      : "bg-gray-50 border-gray-200 text-gray-900 focus:border-teal-500"
                  }`}
                />
              </div>

              {/* Search Dropdown */}
              <AnimatePresence>
                {showSearch && filteredProducts.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`absolute z-20 w-full mt-2 rounded-xl border shadow-xl overflow-hidden ${
                      isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"
                    }`}
                  >
                    {filteredProducts.map(p => (
                      <button
                        key={p.id}
                        onClick={() => handleSelectProduct(p)}
                        className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-teal-500/10 group transition-colors border-b last:border-0 ${
                          isDark ? "border-gray-700" : "border-gray-100"
                        }`}
                      >
                        <div>
                          <p className={`text-sm font-semibold truncate ${isDark ? "text-gray-200" : "text-gray-900"}`}>{p.name}</p>
                          <p className="text-[10px] text-gray-500">SKU: {p.sku || "-"}</p>
                        </div>
                        <ChevronRight size={14} className="text-gray-500 group-hover:text-teal-500 transition-colors" />
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-500/20 to-transparent my-4" />

            {/* Manual Edit Fields */}
            <div className="grid gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-1">
                  Product Display Name
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. iPhone 15 Pro Max"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all ${
                    isDark 
                      ? "bg-gray-900/30 border-gray-700 text-white focus:border-teal-500/50" 
                      : "bg-white border-gray-200 text-gray-900 focus:border-teal-500"
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-1">
                  Barcode Value / SKU
                </label>
                <input
                  type="text"
                  value={barcodeValue}
                  onChange={(e) => setBarcodeValue(e.target.value)}
                  placeholder="Value to encode..."
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm font-mono outline-none transition-all ${
                    isDark 
                      ? "bg-gray-900/30 border-gray-700 text-white focus:border-teal-500/50" 
                      : "bg-white border-gray-200 text-gray-900 focus:border-teal-500"
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-1">
                    Label Price (₹)
                  </label>
                  <input
                    type="text"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm font-bold outline-none transition-all ${
                      isDark 
                        ? "bg-gray-900/30 border-gray-700 text-teal-400 focus:border-teal-500/50" 
                        : "bg-white border-gray-200 text-teal-600 focus:border-teal-500"
                    }`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-1">
                    Copies
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={copies}
                      onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                      min="1"
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all ${
                        isDark 
                          ? "bg-gray-900/30 border-gray-700 text-white focus:border-teal-500/50" 
                          : "bg-white border-gray-200 text-gray-900 focus:border-teal-500"
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Styling section */}
        <section className={`p-6 rounded-2xl border ${
          isDark ? "bg-gray-800/40 border-gray-700" : "bg-white border-gray-100 shadow-sm"
        }`}>
          <h3 className={`text-sm font-bold mb-4 flex items-center gap-2 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
            <Box size={16} /> Dimensions & Layout
          </h3>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-1">
                Label Size Preset
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["SMALL", "MEDIUM", "LARGE"] as LabelSize[]).map(size => (
                  <button
                    key={size}
                    onClick={() => setLabelSize(size)}
                    className={`py-2 px-1 rounded-lg text-[10px] font-bold border transition-all ${
                      labelSize === size
                        ? "bg-teal-500 border-teal-500 text-white"
                        : isDark 
                          ? "bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600"
                          : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {size === "SMALL" ? "38x19mm" : size === "MEDIUM" ? "50x25mm" : "70x40mm"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-500/5 border border-transparent">
              <div>
                <p className={`text-xs font-bold ${isDark ? "text-gray-200" : "text-gray-700"}`}>Include Shop name</p>
                <p className="text-[10px] text-gray-500">{selectedShop?.name || "No shop selected"}</p>
              </div>
              <button 
                onClick={() => setShowShopName(!showShopName)}
                className={`w-10 h-5 rounded-full relative transition-colors ${showShopName ? "bg-teal-600" : "bg-gray-400"}`}
              >
                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${showShopName ? "right-1" : "left-1"}`} />
              </button>
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button 
            onClick={handlePrint}
            disabled={!barcodeValue}
            className={`flex-1 py-4 px-6 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center justify-center gap-3 shadow-lg shadow-teal-600/20 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none`}
          >
            <Printer size={20} />
            Print Labels
          </button>
          <button 
            className={`p-4 rounded-2xl border flex items-center justify-center transition-all active:scale-95 ${
              isDark ? "bg-gray-800 border-gray-700 text-white hover:bg-gray-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Share2 size={20} />
          </button>
        </div>
      </div>

      {/* Workspace / Preview Area */}
      <div className={`flex-1 flex flex-col gap-6 transition-all duration-300`}>
        {/* Toolbar */}
        <div className={`p-4 rounded-2xl border flex items-center justify-between print:hidden ${
          isDark ? "bg-gray-800/40 border-gray-700" : "bg-white border-gray-100 shadow-sm"
        }`}>
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${isDark ? "bg-teal-500/20 text-teal-400" : "bg-teal-100 text-teal-600"}`}>
              <LayoutGrid size={18} />
            </div>
            <div>
              <h2 className={`text-sm font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Live Preview</h2>
              <p className="text-[10px] text-gray-500">Real-time label workspace</p>
            </div>
          </div>

          <div className="flex items-center gap-1 p-1 bg-gray-500/10 rounded-xl">
            <button 
              onClick={() => setViewMode("SINGLE")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
                viewMode === "SINGLE" 
                  ? "bg-white shadow-sm text-teal-600" 
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Square size={14} /> Single
            </button>
            <button 
              onClick={() => setViewMode("SHEET")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
                viewMode === "SHEET" 
                  ? "bg-white shadow-sm text-teal-600" 
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <LayoutGrid size={14} /> Sheet
            </button>
          </div>
        </div>

        {/* Live Workspace */}
        <div className={`flex-1 rounded-3xl border-2 border-dashed flex items-center justify-center p-8 overflow-auto min-h-[500px] transition-all relative ${
          isDark ? "bg-black/20 border-gray-800" : "bg-gray-50/50 border-gray-200"
        } print:p-0 print:border-0 print:bg-white`}>
          
          <AnimatePresence mode="wait">
            {!barcodeValue ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center space-y-4"
              >
                <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${
                  isDark ? "bg-gray-800 text-gray-600" : "bg-gray-200 text-gray-400"
                }`}>
                  <Printer size={40} />
                </div>
                <div>
                  <h3 className={`text-lg font-bold ${isDark ? "text-gray-400" : "text-gray-500"}`}>Design your label</h3>
                  <p className="text-sm text-gray-500 max-w-[240px]">Search for a product or enter details manually to see the magic happen.</p>
                </div>
              </motion.div>
            ) : viewMode === "SINGLE" ? (
              <motion.div 
                key="single"
                initial={{ opacity: 0, scale: 0.8, rotate: -2 }}
                animate={{ opacity: 1, scale: 1.5, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="print:scale-100"
              >
                <BarcodeLabel 
                  value={barcodeValue}
                  name={productName}
                  price={price}
                  shopName={showShopName ? selectedShop?.name : undefined}
                  size={labelSize}
                  className="shadow-2xl border-0 !p-2"
                />
              </motion.div>
            ) : (
              <motion.div 
                key="sheet"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className={`flex flex-wrap gap-4 items-start justify-center max-w-[800px] print:grid print:grid-cols-4 print:gap-0 print:m-0 print:p-0`}
              >
                {Array.from({ length: copies }).map((_, i) => (
                  <BarcodeLabel 
                    key={i}
                    value={barcodeValue}
                    name={productName}
                    price={price}
                    shopName={showShopName ? selectedShop?.name : undefined}
                    size={labelSize}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Print specific styling for the sheet */}
          <style jsx global>{`
            @media print {
              @page {
                size: A4;
                margin: 0;
              }
              body * {
                visibility: hidden;
              }
              .label-container, .label-container * {
                visibility: visible;
              }
              .label-container {
                position: relative;
                float: left;
              }
              /* Ensure the sheet view takes over the whole page */
              div { border: none !important; box-shadow: none !important; }
            }
          `}</style>
        </div>
      </div>
    </div>
  );
}
