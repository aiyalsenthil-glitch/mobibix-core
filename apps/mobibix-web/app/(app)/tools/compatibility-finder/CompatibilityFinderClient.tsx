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
  CheckCircle2,
  Database,
  Layers,
  ShieldCheck,
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
  const isOwner = authUser?.role === 'owner' || authUser?.isSystemOwner;
  const isMobibix = authUser?.tenantType === 'MOBILE_SHOP' || authUser?.planCode?.startsWith("MOBIBIX");
  const isAccountant = authUser?.role === 'accountant' || authUser?.role === 'shop_accountant';
  const hasPermission = authUser?.permissions?.includes("mobile_shop.compatibility.view") || authUser?.permissions?.includes("*") || isOwner;

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
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      {/* 🚀 Professional Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold tracking-tight">
            <div className="p-1.5 bg-indigo-500/10 rounded-lg">
              <Cpu size={18} />
            </div>
            <span className="uppercase text-[10px] tracking-[0.2em] font-black">Universal Reference (Beta)</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            Compatibility <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-500">Finder</span>
          </h1>
          <p className="text-slate-500 font-medium max-w-lg leading-relaxed">
            Instantly identify shared parts across <span className="text-slate-900 dark:text-slate-200 font-bold">30,000+</span> models. Optimize your inventory by finding cross-model fits.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
            <Database size={15} className="text-indigo-500" />
            <div className="flex flex-col">
              <span className="text-[12px] font-black text-slate-900 dark:text-white">32,491</span>
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Models Linked</span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
            <ShieldCheck size={15} className="text-amber-500" />
            <div className="flex flex-col">
              <span className="text-[12px] font-black text-slate-900 dark:text-white">Beta Phase</span>
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Manual Verification Reqd</span>
            </div>
          </div>
        </div>
      </div>

      {/* 🔍 Universal Search Spotlight */}
      <div className="relative z-20 group">
        <div className="absolute -inset-1.5 bg-gradient-to-r from-indigo-500/20 to-purple-600/20 rounded-[2.5rem] blur-xl opacity-0 group-focus-within:opacity-100 transition duration-700"></div>
        <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-2xl shadow-indigo-500/5 overflow-hidden ring-1 ring-slate-900/5 dark:ring-white/5">
          <div className="flex items-center h-20 md:h-24 px-8">
            <Search className="h-7 w-7 text-slate-300 group-focus-within:text-indigo-500 transition-all duration-300" />
            <Input 
              placeholder="Start typing a model (e.g. Samsung M01, iPhone 13...)"
              className="flex-1 h-full border-none shadow-none focus-visible:ring-0 text-xl md:text-2xl font-black placeholder:text-slate-300 dark:placeholder:text-slate-700 bg-transparent"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onFocus={() => query.trim().length >= 2 && setShowSuggestions(true)}
            />
            {isSearching && (
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500 ml-4" />
            )}
            <div className="hidden lg:flex items-center gap-2.5 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl ml-4 border border-slate-100 dark:border-slate-800">
               <div className="p-1 bg-amber-500 rounded-md">
                 <Zap size={10} className="text-white fill-current" />
               </div>
               <span className="text-[10px] font-black text-slate-500 tracking-widest">AI SEARCH ACTIVE</span>
            </div>
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div 
              ref={suggestionRef}
              className="border-t border-slate-100 dark:border-slate-800/50 max-h-[22rem] overflow-y-auto"
            >
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  onClick={() => handleSelectModel(suggestion)}
                  className="w-full flex items-center gap-5 p-5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all group/item border-b border-slate-50 dark:border-slate-800/30 last:border-0"
                >
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl group-hover/item:bg-indigo-600 group-hover/item:text-white group-hover/item:shadow-lg group-hover/item:shadow-indigo-500/30 transition-all duration-300">
                    <Smartphone size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="font-extrabold text-slate-900 dark:text-white text-lg tracking-tight leading-none mb-1.5">{suggestion.fullName}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] uppercase font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">Mobile Device</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                      <p className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400">Reveal Compatibility Groups</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover/item:text-indigo-500 group-hover/item:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 📊 Content View Area */}
      <div className="min-h-[45vh] relative px-2">
        {isSearching ? (
          <div className="flex flex-col items-center justify-center py-28 gap-6">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500/15 rounded-full blur-3xl animate-pulse scale-150" />
              <div className="relative h-20 w-20 flex items-center justify-center">
                 <Loader2 className="h-14 w-14 animate-spin text-indigo-600" />
                 <Search className="absolute h-5 w-5 text-indigo-400" />
              </div>
            </div>
            <div className="text-center space-y-1">
              <p className="text-slate-900 dark:text-white font-black text-lg tracking-tight">Accessing Neural Database</p>
              <p className="text-slate-400 font-bold text-sm">Matching model signatures with 4.2M cross-references...</p>
            </div>
          </div>
        ) : results ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {Object.entries(results.compatibleParts).map(([category, parts]) => {
              const Icon = CATEGORY_ICONS[category.toUpperCase()] || Grid;
              const categoryName = CATEGORY_NAMES[category.toUpperCase()] || category;

              return (
                <Card key={category} className="group flex flex-col hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 border-slate-200/60 dark:border-slate-800/60 overflow-hidden rounded-[2rem] bg-white dark:bg-slate-900/50 backdrop-blur-sm">
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-800 group-hover:bg-gradient-to-r group-hover:from-indigo-500 group-hover:to-purple-500 transition-all duration-500" />
                  <CardHeader className="pb-5 pt-7 px-7 flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/10">
                        <Icon size={22} />
                      </div>
                      <CardTitle className="text-xl font-black tracking-tight">{categoryName}</CardTitle>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[18px] font-black text-indigo-600 leading-none">{parts.length}</span>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Fits Found</span>
                    </div>
                  </CardHeader>
                  <CardContent className="px-7 pb-8 flex-1 flex flex-col">
                    {parts.length > 0 ? (
                      <div className="space-y-5">
                        {parts.map((part: CompatiblePart, idx: number) => (
                          <div key={idx} className="group/part relative p-5 rounded-[1.5rem] bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 hover:border-indigo-500/30 hover:bg-white dark:hover:bg-slate-900 transition-all duration-300">
                            <h4 className="font-black text-slate-900 dark:text-white text-[15px] mb-3 leading-tight">
                              {part.name}
                            </h4>
                            
                            {part.otherModels && part.otherModels.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {part.otherModels.slice(0, 6).map((model, midx) => (
                                  <Badge key={midx} className="text-[10px] px-2.5 py-0.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 font-bold rounded-lg group-hover/part:border-indigo-500/20 shadow-sm transition-all">
                                    {model}
                                  </Badge>
                                ))}
                                {part.otherModels.length > 6 && (
                                  <div className="flex items-center justify-center px-1.5">
                                    <span className="text-[10px] font-black text-indigo-500 ml-1">
                                      +{part.otherModels.length - 6} MORE
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-200/50 dark:border-slate-800/50 opacity-60 group-hover/part:opacity-100 transition-opacity">
                               <div className="flex items-center gap-2">
                                  <Info size={14} className="text-amber-500" />
                                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-tight">Crowdsourced Reference</span>
                               </div>
                               <button 
                                 onClick={() => setFeedbackTarget({ category, type: 'REPORT_ERROR' })}
                                 className="p-1 px-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[9px] font-black text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all uppercase tracking-tighter"
                               >
                                 Mistake?
                               </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center py-10 border-2 border-dashed border-slate-100 dark:border-slate-800/60 rounded-[2rem] bg-slate-50/50 dark:bg-transparent">
                        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full mb-3">
                           <Info size={18} className="text-slate-400" />
                        </div>
                        <p className="text-[11px] text-slate-400 font-black text-center max-w-[12rem] uppercase tracking-wider">No cross-reference matches indexed</p>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="mt-4 h-8 px-4 text-[10px] font-black text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-xl uppercase tracking-widest"
                          onClick={() => setFeedbackTarget({ category, type: 'SUGGEST_LINK' })}
                        >
                          + Propose Match
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : selectedModel ? (
          <div className="max-w-2xl mx-auto flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] shadow-xl text-center px-10 animate-in zoom-in-95 duration-500">
             <div className="relative mb-6">
               <div className="absolute inset-0 bg-amber-500/10 rounded-full blur-2xl scale-125" />
               <div className="p-5 bg-amber-50 dark:bg-amber-900/20 rounded-[2rem] ring-1 ring-amber-500/10">
                 <AlertCircle className="w-10 h-10 text-amber-500" />
               </div>
             </div>
             <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">Sync Status: Pending Analysis</h3>
             <p className="text-slate-500 max-w-sm mt-3 text-[15px] font-medium leading-relaxed">
               We haven't fully indexed the <span className="text-indigo-600 font-bold">{selectedModel.fullName}</span> yet. Help us grow by contributing confirmed fits.
             </p>
             <div className="flex gap-4 mt-10">
                <Button 
                  variant="outline" 
                   className="h-12 px-8 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-black text-[13px] rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm flex gap-2"
                   onClick={() => setSelectedModel(null)}
                >
                   Try Another
                </Button>
                <Button 
                  className="h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[13px] rounded-2xl transition-all shadow-lg shadow-indigo-500/20 flex gap-2"
                  onClick={() => setFeedbackTarget({ category: 'GENERAL', type: 'SUGGEST_LINK' })}
                >
                   <Send size={16} /> Contribute Link
                </Button>
             </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="relative mb-10 group">
              <div className="absolute inset-0 bg-indigo-500/5 rounded-full blur-3xl scale-[2.5] animate-pulse" />
              <div className="relative p-8 px-10 bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 group-hover:-translate-y-2 transition-transform duration-500">
                <Layers className="w-14 h-14 text-indigo-600/20 group-hover:text-indigo-600 transition-colors" />
                <div className="absolute -bottom-3 -right-3 p-3 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-500/30 text-white animate-bounce-subtle">
                   <Search size={22} strokeWidth={3} />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Ready to cross-reference</h3>
              <p className="text-slate-400 font-bold text-[14px] max-w-xs mx-auto leading-relaxed">
                Connect your inventory logic by finding shared part groups across brands in seconds.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 📝 Premium Feedback Modal Overlay */}
      {feedbackTarget && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-500">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] border border-white/20 overflow-hidden animate-in zoom-in-95 duration-300">
            {feedbackSuccess ? (
              <div className="p-12 text-center space-y-5">
                <div className="relative">
                   <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl scale-125" />
                   <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-[2rem] flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 relative border border-emerald-500/10">
                     <CheckCircle2 size={36} />
                   </div>
                </div>
                <div className="space-y-1">
                   <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Community Contribution Sent</h3>
                   <p className="text-slate-500 font-medium">Our technical team will verify and sync this link with the global DB.</p>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="p-8 pb-10 space-y-8">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-5">
                      <div className={cn("p-4 rounded-[1.5rem] shadow-sm", feedbackTarget.type === 'REPORT_ERROR' ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-indigo-50 text-indigo-600 border border-indigo-100")}>
                        <MessageSquareWarning size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                          {feedbackTarget.type === 'REPORT_ERROR' ? 'Data Quality Report' : 'Technical Contribution'}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                           <div className="p-0.5 px-1.5 bg-slate-100 dark:bg-slate-800 rounded font-black text-[9px] text-slate-500 uppercase tracking-widest">
                             Cat: {feedbackTarget.category}
                           </div>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => setFeedbackTarget(null)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                      <X size={20} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contribution Details</label>
                       <span className="text-[10px] font-bold text-indigo-500">Required Field</span>
                    </div>
                    <textarea 
                      autoFocus
                      placeholder={feedbackTarget.type === 'REPORT_ERROR' 
                        ? "What did we miss? (e.g. 'Vivo V20 display does NOT fit Vivo V20 SE')"
                        : "Which other models use this part? (e.g. 'Oppo F15 also fits this tempered glass')"
                      }
                      className="w-full h-40 p-6 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[1.5rem] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-[15px] font-semibold text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700 resize-none shadow-inner transition-all"
                      value={feedbackDetails}
                      onChange={(e) => setFeedbackDetails(e.target.value)}
                    />
                    <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/30">
                       <Info size={14} className="text-amber-500 shrink-0" />
                       <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold leading-tight">Your technical expertise helps 5,000+ repair shops worldwide. Thank you.</p>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-2">
                    <Button variant="outline" className="flex-1 rounded-2xl h-14 font-black text-slate-600 dark:text-slate-400 border-none bg-slate-100 dark:bg-slate-800 hover:bg-slate-200" onClick={() => setFeedbackTarget(null)}>Cancel</Button>
                    <Button 
                      className="flex-1 rounded-2xl h-14 bg-indigo-600 hover:bg-neutral-900 text-white font-black text-[15px] gap-2 shadow-xl shadow-indigo-500/20 active:scale-95 transition-all"
                      disabled={isSubmittingFeedback || !feedbackDetails.trim()}
                      onClick={handleSubmitFeedback}
                    >
                      {isSubmittingFeedback ? <Loader2 className="animate-spin h-5 w-5" /> : <Send size={18} />}
                      Verify & Send
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
