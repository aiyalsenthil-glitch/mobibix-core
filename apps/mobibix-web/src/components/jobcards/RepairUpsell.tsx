"use client";

import { useEffect, useState } from "react";
import { Lightbulb, Plus, Check } from "lucide-react";
import { getUpsellRecommendations, type CompatiblePart } from "@/services/compatibility.api";

interface RepairUpsellProps {
  shopId: string;
  modelName: string;
  onSelect: (part: CompatiblePart) => void;
  selectedParts: string[];
}

export function RepairUpsell({ shopId, modelName, onSelect, selectedParts }: RepairUpsellProps) {
  const [recommendations, setRecommendations] = useState<CompatiblePart[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (modelName && modelName.length > 2) {
      fetchRecommendations();
    } else {
      setRecommendations([]);
    }
  }, [modelName, shopId]);

  const fetchRecommendations = async () => {
    try {
      setIsLoading(true);
      // For repairs, we specifically want SPARE parts (e.g. Battery, Charging port, etc.)
      const data = await getUpsellRecommendations(shopId, modelName, 'SPARE');
      setRecommendations(data.slice(0, 4));
    } catch (err) {
      console.error("Failed to load repair upsells:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!modelName || recommendations.length === 0) return null;

  return (
    <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-amber-500 text-white">
          <Lightbulb size={14} />
        </div>
        <h4 className="text-xs font-bold text-amber-900 dark:text-amber-100 uppercase tracking-wider">
          Common Repair Add-ons
        </h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {recommendations.map(rec => {
          const isSelected = selectedParts.includes(rec.id);
          return (
            <div 
              key={rec.id}
              onClick={() => onSelect(rec)}
              className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${
                isSelected 
                  ? 'border-amber-500 bg-amber-500/10 shadow-sm' 
                  : 'border-slate-200 dark:border-white/5 bg-white dark:bg-white/5 hover:border-amber-500/50'
              }`}
            >
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                  {rec.name}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  Stock: {rec.quantity} • Suggest to customer
                </span>
              </div>
              <div className={`p-1 rounded-md ${isSelected ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>
                {isSelected ? <Check size={12} /> : <Plus size={12} />}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[10px] text-amber-700/70 dark:text-amber-400/60 leading-tight">
        Technician: These parts are frequently replaced together for {modelName}. Adding them to the estimate can prevent return repairs and increase ticket value.
      </p>
    </div>
  );
}
