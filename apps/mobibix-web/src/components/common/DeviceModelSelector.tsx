"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, ChevronDown, Smartphone, AlertTriangle, PlusCircle } from "lucide-react";
import { authenticatedFetch } from "@/services/auth.api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost_REPLACED:3000/api";

export interface DeviceModel {
  id: string;
  modelName: string;
  brandName: string;
  fullName: string;
  unverified?: boolean;
}

interface DeviceModelSelectorProps {
  value: { brand: string; model: string };
  onChange: (brand: string, model: string) => void;
  className?: string;
  required?: boolean;
}

export function DeviceModelSelector({
  value,
  onChange,
  className = "",
  required,
}: DeviceModelSelectorProps) {
  const [query, setQuery] = useState(
    value.brand && value.model ? `${value.brand} ${value.model}` : ""
  );
  const [results, setResults] = useState<DeviceModel[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<DeviceModel | null>(null);
  const [notFound, setNotFound] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClear = useCallback(() => {
    setSelected(null);
    setQuery("");
    setNotFound(false);
    onChange("", "");
    setResults([]);
    setOpen(false);
  }, [onChange]);

  // Allow user to proceed with unregistered device + notify admin
  const handleUseAnyway = useCallback(async () => {
    if (!query.trim()) return;
    const parts = query.trim().split(/\s+/);
    const brand = parts[0] ?? query;
    const model = parts.slice(1).join(" ") || query;

    const unverifiedModel: DeviceModel = {
      id: "unregistered",
      brandName: brand,
      modelName: model,
      fullName: query,
      unverified: true,
    };

    setSelected(unverifiedModel);
    setNotFound(false);
    setOpen(false);
    onChange(brand, model);

    // Fire-and-forget: notify admin
    try {
      await authenticatedFetch("/compatibility/request-model", {
        method: "POST",
        body: JSON.stringify({ rawInput: query }),
      });
    } catch {
      // silent — don't block the user
    }
  }, [query, onChange]);

  const handleSelect = useCallback((model: DeviceModel) => {
    setSelected(model);
    setQuery(model.fullName);
    setNotFound(false);
    onChange(model.brandName, model.modelName);
    setOpen(false);
    setResults([]);
  }, [onChange]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        if (!selected && query.trim().length >= 2) {
          // Modern UX: If user blurs without selecting, and there's text, 
          // just auto-use it as a new device instead of wiping their work.
          handleUseAnyway(); 
        } else if (!selected) {
          setQuery("");
          onChange("", "");
          setNotFound(false);
        } else {
          setQuery(selected.fullName);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selected, query, handleUseAnyway, onChange]);
  const handleInput = useCallback((val: string) => {
    setQuery(val);
    setSelected(null);
    setNotFound(false);
    onChange("", "");

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE}/compatibility/autocomplete?query=${encodeURIComponent(val)}`
        );
        const json = await res.json();
        const data: DeviceModel[] = Array.isArray(json) ? json : (json?.data ?? []);
        setResults(data);
        setNotFound(data.length === 0);
        setOpen(data.length > 0);
      } catch {
        setResults([]);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [onChange]);

  const isValid = !!selected;
  const isUnverified = selected?.unverified === true;

  return (
    <div className={`relative ${className}`} ref={ref}>
      <div
        className={`flex items-center gap-2 w-full px-3 py-2 text-sm border rounded-lg transition-colors
          ${isUnverified
            ? "border-amber-400 bg-amber-50/40 dark:bg-amber-900/10 dark:border-amber-600"
            : isValid
            ? "border-teal-500 bg-teal-50/40 dark:bg-teal-900/10 dark:border-teal-600"
            : "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
          }
          focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-transparent`}
      >
        <Search className="w-4 h-4 text-gray-400 dark:text-slate-500 shrink-0" />
        <input
          className="flex-1 bg-transparent outline-none text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
          placeholder="Search device e.g. Samsung A54, iPhone 13..."
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !selected && query.length >= 2) {
              e.preventDefault();
              handleUseAnyway();
            }
          }}
          onFocus={() => {
            if (results.length > 0 || (query.length >= 2 && !selected)) setOpen(true);
          }}
          required={required && !isValid}
        />
        {selected && (
          <button
            type="button"
            onClick={handleClear}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 text-xs shrink-0"
          >
            ✕
          </button>
        )}
        {!selected && <ChevronDown className="w-4 h-4 text-gray-400 dark:text-slate-500 shrink-0" />}
      </div>


      {/* Selected badge — verified */}
      {selected && !isUnverified && (
        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-teal-600 dark:text-teal-400">
          <Smartphone className="w-3 h-3" />
          <span className="font-medium">{selected.brandName}</span>
          <span className="text-teal-500">·</span>
          <span>{selected.modelName}</span>
        </div>
      )}

      {/* Selected badge — unverified */}
      {selected && isUnverified && (
        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-3 h-3" />
          <span className="font-medium">{selected.brandName}</span>
          <span className="text-amber-500">·</span>
          <span>{selected.modelName}</span>
          <span className="ml-1 text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-600 px-1 rounded">
            Admin notified
          </span>
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden animate-in fade-in-0 zoom-in-95">
          {loading ? (
            <div className="px-4 py-3 text-sm text-gray-400 dark:text-slate-500 text-center">
              Searching...
            </div>
          ) : (
            <div className="max-h-[240px] overflow-y-auto">
              {results.length > 0 ? (
                results.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className="w-full text-left px-4 py-2.5 hover:bg-teal-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-3 border-b dark:border-slate-800 last:border-0"
                    onMouseDown={(e) => { e.preventDefault(); handleSelect(m); }}
                  >
                    <div className="w-7 h-7 rounded-md bg-gray-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                      <Smartphone className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{m.modelName}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{m.brandName}</p>
                    </div>
                  </button>
                ))
              ) : notFound && query.length >= 2 ? (
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleUseAnyway(); }}
                  className="w-full text-left px-4 py-4 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                    <PlusCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">Add as new device</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 italic">" {query} " not in database</p>
                  </div>
                </button>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
