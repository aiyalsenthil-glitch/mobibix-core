"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { b2bApi, WholesaleCatalogItem } from "@/services/b2b.api";
import { Loader2 } from "lucide-react";

export default function RestockPage() {
  const [filter, setFilter] = useState("All");
  const [catalog, setCatalog] = useState<WholesaleCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOrdering, setIsOrdering] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchCatalog();
  }, []);

  const fetchCatalog = async () => {
    try {
      setIsLoading(true);
      const data = await b2bApi.getCatalog();
      setCatalog(data || []);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch wholesale catalog");
    } finally {
      setIsLoading(false);
    }
  };

  const categories = ["All", ...Array.from(new Set(catalog.map((i) => i.category)))];
  
  const filteredItems = filter === "All" ? catalog : catalog.filter((i) => i.category === filter);

  // Quick Order
  const handleQuickOrder = async (item: WholesaleCatalogItem) => {
    try {
      setIsOrdering(prev => ({ ...prev, [item.id]: true }));
      await b2bApi.placeOrder({
        distributorId: item.distributorId,
        items: [{
          catalogItemId: item.id,
          quantity: item.moq,
          unitPrice: item.wholesalePrice
        }]
      });
      alert(`Purchase Order for ${item.moq}x ${item.productName} Placed Successfully!`);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Failed to place order");
    } finally {
      setIsOrdering(prev => ({ ...prev, [item.id]: false }));
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto pb-24">
      {/* Header Area */}
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-3 italic leading-none">
                Wholesale <span className="text-primary italic tracking-normal">Distributor Network</span>
            </h1>
            <p className="text-muted-foreground font-bold text-lg max-w-xl">
                Restock your shop instantly. Browse live inventory from your connected local distributors and place digital Purchase Orders.
            </p>
        </div>
        <div className="flex gap-2 text-[10px] font-black uppercase tracking-[0.2em] bg-muted/30 p-1.5 rounded-2xl border border-border">
            <div className="px-4 py-2 bg-primary text-primary-foreground rounded-xl shadow-lg">Network: Active</div>
            <div className="px-4 py-2 text-muted-foreground">Connected Providers</div>
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : catalog.length === 0 ? (
        <div className="text-center p-12 bg-muted/30 rounded-3xl border border-border">
            <h3 className="text-xl font-black uppercase mb-4">No Distributors Linked</h3>
            <p className="text-muted-foreground mb-6">You haven't been approved by any distributors in our network yet. Please contact your local vendor to activate your wholesale pipeline.</p>
        </div>
      ) : (
        <>
          {/* Categories Bar */}
          <div className="flex flex-wrap gap-3 mb-10">
            {categories.map((c) => (
                <button 
                    key={c}
                    onClick={() => setFilter(c)}
                    className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${filter === c ? 'bg-primary text-black' : 'bg-muted/50 text-muted-foreground border border-border hover:border-primary/50'}`}
                >
                    {c}
                </button>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredItems.map((item: WholesaleCatalogItem, idx: number) => (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group relative p-8 rounded-[3rem] border border-border bg-card/40 backdrop-blur-3xl hover:bg-card hover:border-primary/30 transition-all duration-500 shadow-xl shadow-black/5 flex flex-col"
              >
                {/* Visual Placeholder */}
                <div className="w-full aspect-[4/3] bg-muted/20 rounded-[2rem] mb-8 overflow-hidden relative border border-border/50 group-hover:border-primary/20 transition-colors">
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/10 font-black text-4xl uppercase tracking-tighter italic text-center leading-none p-4">
                      {item.sku}
                  </div>
                  <div className="absolute top-4 right-4 px-3 py-1 bg-black/50 backdrop-blur-md rounded-lg text-[8px] font-black uppercase tracking-widest text-primary border border-primary/20">
                      {item.category}
                  </div>
                </div>

                <h3 className="text-2xl font-black uppercase tracking-tighter mb-2 group-hover:text-primary transition-colors leading-tight">{item.productName}</h3>
                <p className="text-xs font-bold text-muted-foreground mb-6 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    {item.distributor?.name || "Independent Distributor"}
                </p>
                
                <div className="flex items-end justify-between mb-8 border-t border-border/50 pt-6 mt-auto">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50 mb-1">Wholesale Price</div>
                      <span className="text-3xl font-black leading-none italic">₹{item.wholesalePrice}</span>
                      <span className="text-[10px] text-muted-foreground uppercase ml-1 font-bold">/ pc</span>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50 mb-1">Min Order</div>
                        <div className="text-sm font-black text-foreground">{item.moq} pcs</div>
                    </div>
                </div>

                <button 
                  onClick={() => handleQuickOrder(item)}
                  disabled={isOrdering[item.id]}
                  className="w-full py-5 rounded-2xl bg-foreground text-background text-[10px] font-black uppercase tracking-[0.2em] hover:bg-primary hover:text-black transition-all duration-300 shadow-2xl active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isOrdering[item.id] ? "Submitting..." : `Quick Order (${item.moq} pcs)`}
                </button>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
