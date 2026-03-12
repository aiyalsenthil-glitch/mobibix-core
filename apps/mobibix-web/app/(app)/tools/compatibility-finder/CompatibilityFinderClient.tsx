"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Search, 
  SearchCheck, 
  Cpu, 
  Smartphone, 
  Battery, 
  Zap, 
  Grid, 
  ChevronRight, 
  Info,
  Loader2,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  autocompletePhoneModels, 
  searchCompatibility, 
  type PhoneModelSuggestion, 
  type SearchCompatibilityResponse,
  type CompatiblePart
} from "@/services/compatibility.api";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<string, any> = {
  DISPLAY: Smartphone,
  TEMPERED_GLASS: Grid,
  TOUCH_GLASS: Grid,
  BATTERY: Battery,
  BACK_COVER: Smartphone,
  FRAME: Smartphone,
  CHARGING_BOARD: Zap,
  FLEX_CABLE: Zap,
  SPEAKER: Zap,
  CAMERA: Zap,
};

const CATEGORY_NAMES: Record<string, string> = {
  DISPLAY: "Display / Folder",
  TEMPERED_GLASS: "Tempered Glass",
  TOUCH_GLASS: "Touch / OCA Glass",
  BATTERY: "Battery",
  BACK_COVER: "Back Cover / Panel",
  FRAME: "Frame / Middle Frame",
  CHARGING_BOARD: "Charging Board",
  FLEX_CABLE: "Flex / CC Board",
  SPEAKER: "Speaker / Ringer",
  CAMERA: "Camera Glass",
};

export function CompatibilityFinderClient() {
  const { authUser } = useAuth();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PhoneModelSuggestion[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [results, setResults] = useState<SearchCompatibilityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestionRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle autocomplete
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length >= 2) {
        try {
          const data = await autocompletePhoneModels(query);
          setSuggestions(data);
          setShowSuggestions(true);
        } catch (err) {
          console.error("Autocomplete error", err);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectModel = async (model: PhoneModelSuggestion) => {
    setQuery(model.fullName);
    setSelectedModel(model.fullName);
    setShowSuggestions(false);
    await performSearch(model.fullName);
  };

  const performSearch = async (modelName: string) => {
    setIsSearching(true);
    setError(null);
    try {
      const data = await searchCompatibility(modelName);
      setResults(data);
    } catch (err: any) {
      console.error("Search error", err);
      setError(err.message || "Failed to find compatibility data");
      setResults(null);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
          <SearchCheck className="w-8 h-8 text-indigo-600" />
          Compatibility Finder
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Instantly find compatible tempered glass, combos, and parts for any mobile device.
        </p>
      </div>

      {/* Search Bar Section */}
      <Card className="border-indigo-100 dark:border-indigo-900/30 shadow-md bg-white dark:bg-slate-900 overflow-visible">
        <CardContent className="pt-6 relative">
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            </div>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Start typing phone model (e.g. Samsung A50)..."
              className="pl-12 h-14 text-lg rounded-xl border-slate-200 dark:border-slate-800 focus-visible:ring-indigo-500 shadow-sm"
              autoComplete="off"
            />
            {isSearching && (
              <div className="absolute inset-y-0 right-4 flex items-center">
                <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
              </div>
            )}

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div 
                ref={suggestionRef}
                className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
              >
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    onClick={() => handleSelectModel(suggestion)}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors border-b last:border-0 border-slate-100 dark:border-slate-800"
                  >
                    <Smartphone className="h-4 w-4 text-slate-400" />
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {suggestion.fullName}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      {isSearching ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
          <p className="text-slate-500 animate-pulse font-medium">Scanning our global compatibility database...</p>
        </div>
      ) : results ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(results.compatibleParts).map(([category, parts]) => {
            const Icon = CATEGORY_ICONS[category.toUpperCase()] || Grid;
            const categoryName = CATEGORY_NAMES[category.toUpperCase()] || category;

            return (
              <Card key={category} className="group hover:border-indigo-400 transition-all duration-300 shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-50 dark:border-slate-900">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-600">
                        <Icon size={20} />
                      </div>
                      <CardTitle className="text-lg">{categoryName}</CardTitle>
                    </div>
                    <Badge variant="outline" className="bg-slate-50 dark:bg-slate-950">
                      {parts.length} Items
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {parts.length > 0 ? (
                    parts.map((part: CompatiblePart, idx: number) => (
                      <div key={idx} className="flex flex-col gap-1.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-transparent group-hover:border-indigo-100 dark:group-hover:border-indigo-900/30 transition-colors">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-sm text-slate-900 dark:text-slate-200">
                            {part.name}
                          </span>
                          {part.price && (
                            <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                              ₹{part.price}
                            </span>
                          )}
                        </div>
                        {part.otherModels && part.otherModels.length > 0 && (
                          <div className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium">
                            Compatible with: {part.otherModels.join(", ")}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                          <Info className="w-3 h-3" />
                          <span>Same model as linked phones</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-sm text-slate-400">No compatibility groups found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : selectedModel ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
           <AlertCircle className="w-12 h-12 text-slate-400 mb-4" />
           <h3 className="text-xl font-bold text-slate-900 dark:text-white">No exact match found</h3>
           <p className="text-slate-500 max-w-md text-center mt-2 px-6">
             We are updating our database continuously. Our experts are gathering data for this model as we speak! Stay tuned.
           </p>
           <Button variant="outline" className="mt-8 border-indigo-200 text-indigo-600 hover:bg-indigo-50" onClick={() => setQuery("")}>
              Try another model
           </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
           <div className="relative">
             <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-3xl" />
             <SearchCheck className="w-20 h-20 text-indigo-600/30 relative" />
           </div>
           <p className="text-slate-400 text-lg font-medium">Enter a model name above to begin</p>
        </div>
      )}
    </div>
  );
}
