"use client";

import { useEffect, useState } from "react";
import { Sparkles, Plus, Info, ShoppingCart } from "lucide-react";
import { getUpsellRecommendations, type CompatiblePart } from "@/services/compatibility.api";

interface UpsellSidebarProps {
  shopId: string;
  items: any[];
  onAddItem: (product: any) => void;
  products: any[]; // List of all local products to find the full object for adding
}

export function UpsellSidebar({ shopId, items, onAddItem, products }: UpsellSidebarProps) {
  const [recommendations, setRecommendations] = useState<CompatiblePart[]>([]);
  const [lastAnalyzedModel, setLastAnalyzedModel] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Analyze items to find the "Main Device" (most recent phone)
  useEffect(() => {
    // Only look at the latest item if it's a phone (heuristic: name or category)
    const latestItem = items[items.length - 1];
    if (!latestItem) {
      setRecommendations([]);
      return;
    }

    // Heuristic for model name extraction from product name
    // e.g. "iPhone 15 128GB Black" -> "iPhone 15"
    const modelMatch = latestItem.productName?.match(/(iPhone \d+|Samsung S\d+|Pixel \d+|Redmi Note \d+|OnePlus \d+)/i);
    const modelToSearch = modelMatch ? modelMatch[0] : latestItem.productName;

    if (modelToSearch && modelToSearch !== lastAnalyzedModel) {
      fetchRecommendations(modelToSearch);
    }
  }, [items, shopId]);

  const fetchRecommendations = async (model: string) => {
    try {
      setIsLoading(true);
      setLastAnalyzedModel(model);
      const data = await getUpsellRecommendations(shopId, model);
      
      // Filter out items already in the cart
      const filtered = data.filter(rec => !items.some(item => item.shopProductId === rec.id));
      setRecommendations(filtered.slice(0, 5)); // Show top 5
    } catch (err) {
      console.error("Failed to load upsells:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = (rec: CompatiblePart) => {
    // We need the full ShopProduct object to add it to the cart correctly
    const fullProduct = products.find(p => p.id === rec.id);
    if (fullProduct) {
      onAddItem(fullProduct);
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-4 sticky top-4">
      <div className="rounded-2xl border border-teal-500/20 bg-teal-500/5 dark:bg-teal-500/10 p-5 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-teal-500 text-white shadow-lg shadow-teal-500/20">
            <Sparkles size={16} />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">Recommended for you</h3>
        </div>

        {isLoading ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 rounded-xl bg-slate-200 dark:bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : recommendations.length > 0 ? (
          <div className="space-y-2">
            {recommendations.map(rec => (
              <div 
                key={rec.id}
                className="group flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-white/5 hover:border-teal-500/50 hover:shadow-md transition-all cursor-pointer"
                onClick={() => handleAdd(rec)}
              >
                <div className="flex flex-col gap-0.5 max-w-[70%]">
                  <span className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate line-clamp-1">
                    {rec.name}
                  </span>
                  <div className="flex items-center gap-1.5">
                     <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold">
                      ₹{rec.price?.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      • {rec.quantity} left
                    </span>
                  </div>
                </div>
                <button 
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 group-hover:bg-teal-500 group-hover:text-white transition"
                  title="Add to cart"
                >
                  <Plus size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center">
            <div className="opacity-20 flex justify-center mb-3">
              <ShoppingCart size={32} />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No specific items found for this model yet.
            </p>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
          <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400 italic">
             Suggestions are based on historical compatibility data and your current stock.
          </p>
        </div>
      </div>
    </div>
  );
}
