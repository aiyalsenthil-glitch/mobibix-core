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
  AlertCircle,
  MessageSquareWarning,
  Send,
  X,
  CheckCircle2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  autocompletePhoneModels, 
  searchCompatibility, 
  submitCompatibilityFeedback,
  type PhoneModelSuggestion, 
  type SearchCompatibilityResponse,
  type CompatiblePart,
  type CompatibilityFeedbackInput
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
  FLEX_CABLE: "CC Board / Flex Cable",
  SPEAKER: "Ear / Loud Speaker",
  CAMERA: "Front / Main Camera",
};

export default function CompatibilityFinderClient() {
  const { authUser, isLoading } = useAuth();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PhoneModelSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedModel, setSelectedModel] = useState<PhoneModelSuggestion | null>(null);
  const [results, setResults] = useState<SearchCompatibilityResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="text-slate-500 font-medium">Verifying access...</p>
      </div>
    );
  }

  // 2. Access Control Validation
  const isMobibix = authUser?.tenantType === 'MOBILE_SHOP' || authUser?.planCode?.startsWith("MOBIBIX");
  const isAccountant = authUser?.role === 'accountant' || authUser?.role === 'shop_accountant';
  const hasPermission = authUser?.permissions?.includes("mobile_shop.compatibility.view") || authUser?.permissions?.includes("*");

  if (!authUser || !isMobibix || isAccountant || !hasPermission) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-4">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Access Restricted</h2>
        <p className="text-slate-500 max-w-md">
          This tool is only available for Mobibix users. Accountants and non-Mobibix staff do not have permission to access the Compatibility Finder.
        </p>
      </div>
    );
  }

  // Feedback State
  const [feedbackTarget, setFeedbackTarget] = useState<{ category: string; type: 'REPORT_ERROR' | 'SUGGEST_LINK' } | null>(null);
  const [feedbackDetails, setFeedbackDetails] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleQueryChange = async (val: string) => {
    setQuery(val);
    if (val.trim().length >= 2) {
      try {
        const data = await autocompletePhoneModels(val);
        setSuggestions(data);
        setShowSuggestions(true);
      } catch (err) {
        console.error("Autocomplete failed", err);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectModel = async (model: PhoneModelSuggestion) => {
    setQuery(model.fullName);
    setSelectedModel(model);
    setShowSuggestions(false);
    setIsSearching(true);
    setResults(null);
    setFeedbackSuccess(false);

    try {
      const data = await searchCompatibility(model.fullName);
      setResults(data);
    } catch (err) {
      console.error("Search failed", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!selectedModel || !feedbackTarget) return;
    setIsSubmittingFeedback(true);

    try {
      await submitCompatibilityFeedback({
        type: feedbackTarget.type,
        phoneModelId: selectedModel.id,
        partType: feedbackTarget.category as any,
        details: feedbackDetails,
      });
      setFeedbackSuccess(true);
      setTimeout(() => {
        setFeedbackTarget(null);
        setFeedbackDetails("");
        setFeedbackSuccess(false);
      }, 2000);
    } catch (err) {
      console.error("Feedback submission failed", err);
      alert("Failed to submit report. Please try again.");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Search Header */}
      <Card className="border-none shadow-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 relative">
        <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        </div>
        <CardHeader className="relative z-10 pt-10 pb-6">
          <div className="flex items-center gap-3 mb-4">
             <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
                <Cpu className="text-white h-6 w-6" />
             </div>
             <Badge className="bg-amber-400 text-slate-900 border-none font-black px-3 py-1">AI POWERED</Badge>
          </div>
          <CardTitle className="text-3xl md:text-5xl font-black text-white tracking-tight">
            Universal Compatibility <span className="text-indigo-200">Finder</span>
          </CardTitle>
          <CardDescription className="text-indigo-100 text-lg max-w-2xl font-medium opacity-90">
            Identify shared parts across 30,000+ models instantly. Find which tempered glass, display, or battery fits multiple devices.
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10 pb-12">
          <div className="relative group max-w-3xl">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-500">
              <Search className="h-6 w-6" />
            </div>
            <Input 
              placeholder="e.g. Samsung M01 Core, iPhone 15, Vivo V20..."
              className="h-16 pl-16 pr-24 text-lg md:text-xl rounded-2xl border-none shadow-2xl focus-visible:ring-4 focus-visible:ring-indigo-500/30 font-bold placeholder:text-slate-400 transition-all"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onFocus={() => query.trim().length >= 2 && setShowSuggestions(true)}
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
                className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-[100] overflow-hidden max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200"
              >
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    onClick={() => handleSelectModel(suggestion)}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors border-b last:border-0 border-slate-100 dark:border-slate-800"
                  >
                    <Smartphone className="h-4 w-4 text-slate-400" />
                    <span className="font-bold text-slate-900 dark:text-slate-100">
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
              <Card key={category} className="group hover:border-indigo-400 transition-all duration-300 shadow-sm relative overflow-hidden">
                <CardHeader className="pb-3 border-b border-slate-50 dark:border-slate-900">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-600">
                        <Icon size={20} />
                      </div>
                      <CardTitle className="text-xl">{categoryName}</CardTitle>
                    </div>
                    <Badge variant="outline" className="bg-slate-50 dark:bg-slate-950">
                      {parts.length} Items
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {parts.length > 0 ? (
                    parts.map((part: CompatiblePart, idx: number) => (
                      <div key={idx} className="flex flex-col gap-3 p-5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 group-hover:border-indigo-500/30 transition-all duration-300">
                        <div className="flex items-start justify-between gap-3">
                          <span className="font-black text-lg md:text-xl text-slate-900 dark:text-slate-100 leading-tight">
                            {part.name}
                          </span>
                        </div>
                        
                        {part.otherModels && part.otherModels.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-500 dark:text-indigo-400">Also Fits:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {part.otherModels.map((model, midx) => (
                                <Badge key={midx} variant="secondary" className="text-[11px] py-0 px-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-none font-bold">
                                  {model}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-slate-800/50">
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <Info className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Verified compatibility group</span>
                          </div>
                          <button 
                            onClick={() => setFeedbackTarget({ category, type: 'REPORT_ERROR' })}
                            className="text-[10px] uppercase font-black text-rose-500 hover:text-rose-600 transition-colors"
                          >
                            Report Error
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 space-y-3">
                      <p className="text-sm text-slate-400">No compatibility groups found</p>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs text-indigo-600 hover:text-indigo-700 font-bold"
                        onClick={() => setFeedbackTarget({ category, type: 'SUGGEST_LINK' })}
                      >
                        Suggest a link
                      </Button>
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
             Our AI is gathering data for this model. If you know what fits this phone, please help us!
           </p>
           <Button variant="outline" className="mt-8 border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-bold" onClick={() => setFeedbackTarget({ category: 'GENERAL', type: 'SUGGEST_LINK' })}>
              Help us improve
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

      {/* Feedback Modal Overlay */}
      {feedbackTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
            {feedbackSuccess ? (
              <div className="p-10 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Thank You!</h3>
                <p className="text-slate-500 text-sm">Your report has been sent to our technical team for verification.</p>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", feedbackTarget.type === 'REPORT_ERROR' ? "bg-rose-100 text-rose-600" : "bg-indigo-100 text-indigo-600")}>
                      <MessageSquareWarning size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">
                        {feedbackTarget.type === 'REPORT_ERROR' ? 'Report Incorrect Data' : 'Suggest a Link'}
                      </h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Category: {feedbackTarget.category}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setFeedbackTarget(null)} className="text-slate-400 hover:text-slate-600">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Details</label>
                  <textarea 
                    autoFocus
                    placeholder={feedbackTarget.type === 'REPORT_ERROR' 
                      ? "What exactly is wrong? (e.g. 'A20 uses AMOLED, A20s uses IPS, these are NOT compatible')"
                      : "Which model fits this device for this category? (e.g. 'M01s also fits the same A10 display')"
                    }
                    className="w-full h-32 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium resize-none shadow-inner"
                    value={feedbackDetails}
                    onChange={(e) => setFeedbackDetails(e.target.value)}
                  />
                  <p className="text-[10px] text-slate-400 italic">This will be reviewed by an administrator.</p>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 rounded-xl h-12 font-bold" onClick={() => setFeedbackTarget(null)}>Cancel</Button>
                  <Button 
                    className="flex-1 rounded-xl h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2 shadow-lg shadow-indigo-200"
                    disabled={isSubmittingFeedback || !feedbackDetails.trim()}
                    onClick={handleSubmitFeedback}
                  >
                    {isSubmittingFeedback ? <Loader2 className="animate-spin h-4 w-4" /> : <Send size={16} />}
                    Submit Report
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
