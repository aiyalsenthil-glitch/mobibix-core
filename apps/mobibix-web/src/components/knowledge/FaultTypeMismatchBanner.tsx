"use client";

import { type FaultType } from "@/services/knowledge.api";

interface FaultTypeMismatchBannerProps {
  suggestions: FaultType[];
  onSelect: (id: string) => void;
}

export function FaultTypeMismatchBanner({ 
  suggestions, 
  onSelect 
}: FaultTypeMismatchBannerProps) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/50 rounded-xl p-4">
      <div className="flex items-start gap-3 mb-3">
        <span className="text-lg">🧭</span>
        <div>
          <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
            No exact guide found for this complaint
          </p>
          <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80">
            Did you mean one of these standard fault types?
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className="px-2.5 py-1 text-[10px] font-bold bg-white dark:bg-gray-900 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/30 transition shadow-xs"
          >
            {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}
