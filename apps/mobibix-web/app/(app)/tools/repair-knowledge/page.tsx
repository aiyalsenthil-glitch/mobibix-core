"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  listFaultTypes, 
  getChecklist, 
  getRepairNotes,
  type FaultType,
  type FaultDiagnosis,
  type RepairNote
} from "@/services/knowledge.api";
import { autocompletePhoneModels, type PhoneModelSuggestion } from "@/services/compatibility.api";
import { DiagnosisGuide } from "@/components/knowledge/DiagnosisGuide";
import { RepairNotes } from "@/components/knowledge/RepairNotes";
import { Search, BookOpen, Smartphone, Zap, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function RepairKnowledgePortal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State from URL
  const initialModelId = searchParams.get("modelId") || "";
  const initialModelName = searchParams.get("modelName") || "";
  const initialFaultTypeId = searchParams.get("faultTypeId") || "";

  const [faultTypes, setFaultTypes] = useState<FaultType[]>([]);
  const [selectedFaultType, setSelectedFaultType] = useState<string>(initialFaultTypeId);
  
  // Model Search
  const [modelSearch, setModelSearch] = useState(initialModelName);
  const [suggestions, setSuggestions] = useState<PhoneModelSuggestion[]>([]);
  const [selectedModel, setSelectedModel] = useState<PhoneModelSuggestion | null>(
    initialModelId ? { id: initialModelId, modelName: initialModelName, brandName: "", fullName: initialModelName } : null
  );
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Results
  const [checklist, setChecklist] = useState<FaultDiagnosis | null>(null);
  const [notes, setNotes] = useState<RepairNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchStatus, setSearchStatus] = useState<"IDLE" | "SPECIFIC" | "GENERAL">("IDLE");

  // Load Fault Types
  useEffect(() => {
    listFaultTypes().then(setFaultTypes).catch(console.error);
  }, []);

  // Handle Model Search
  useEffect(() => {
    if (modelSearch.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await autocompletePhoneModels(modelSearch);
        setSuggestions(res);
      } catch (err) {
        console.error(err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [modelSearch]);

  const fetchKnowledge = useCallback(async (mId: string | null, fId: string) => {
    if (!fId) return;
    setIsLoading(true);
    setSearchStatus(mId ? "SPECIFIC" : "GENERAL");
    try {
      const [checkRes, notesRes] = await Promise.all([
        getChecklist(fId),
        getRepairNotes({ phoneModelId: mId || undefined, faultTypeId: fId })
      ]);
      setChecklist(checkRes);
      setNotes(notesRes);
      
      // Update URL
      const params = new URLSearchParams();
      if (mId) {
        params.set("modelId", mId);
        if (selectedModel) params.set("modelName", selectedModel.modelName);
      } else if (modelSearch) {
        params.set("modelName", modelSearch);
      }
      params.set("faultTypeId", fId);
      router.replace(`?${params.toString()}`, { scroll: false });
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [router, selectedModel, modelSearch]);

  useEffect(() => {
    if (selectedFaultType) {
      fetchKnowledge(selectedModel?.id || null, selectedFaultType);
    }
  }, [selectedFaultType, selectedModel?.id, fetchKnowledge]);

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
          <Zap className="w-6 h-6 fill-current" />
        </div>
        <div>
          <h1 className="text-3xl font-black dark:text-white tracking-tight italic uppercase leading-none">
            Repair <span className="text-amber-500">Intelligence</span> Portal
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-bold text-sm">
            Instant troubleshooting & board-level solutions for 100+ models.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* SIDEBAR: Filters */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
              <Search className="w-3 h-3" /> Select Device
            </h3>
            
            <div className="relative mb-6">
              <Input
                placeholder="Search Model (e.g. Note 10)"
                value={modelSearch}
                onChange={(e) => {
                  setModelSearch(e.target.value);
                  setShowSuggestions(true);
                }}
                className="bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-800 font-bold"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl z-50 overflow-hidden">
                  {suggestions.length > 0 ? (
                    suggestions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSelectedModel(s);
                          setModelSearch(s.fullName);
                          setShowSuggestions(false);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-sm font-bold border-b dark:border-gray-800 last:border-0 transition"
                      >
                        <div className="text-gray-900 dark:text-white">{s.fullName}</div>
                        <div className="text-[10px] text-gray-500 uppercase">{s.brandName}</div>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center">
                      <p className="text-xs font-bold text-gray-500 mb-2">Device not in database?</p>
                      <button 
                        onClick={() => {
                          setSelectedModel(null);
                          setShowSuggestions(false);
                        }}
                        className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition"
                      >
                        Search as General Model
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-3 h-3" /> Common Faults
            </h3>
            <div className="space-y-1">
              {faultTypes.map((ft) => (
                <button
                  key={ft.id}
                  onClick={() => setSelectedFaultType(ft.id)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    selectedFaultType === ft.id
                      ? "bg-amber-500 text-white shadow-md scale-105"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  {ft.name}
                </button>
              ))}
            </div>
          </div>
          
          <div className="p-6 bg-linear-to-br from-indigo-600 to-blue-700 rounded-2xl text-white shadow-xl relative overflow-hidden group">
            <BookOpen className="w-16 h-16 absolute -bottom-4 -right-4 opacity-10 group-hover:scale-125 transition-transform" />
            <h4 className="text-sm font-black uppercase tracking-widest mb-2">Technical Guide</h4>
            <p className="text-xs font-bold leading-relaxed opacity-90">
              Can't find a solution? Share your fix with the community and earn reputation points.
            </p>
          </div>
        </div>

        {/* MAIN CONTENT: Results */}
        <div className="lg:col-span-3">
          {!selectedFaultType ? (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl text-center p-12">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6 text-gray-400">
                <BookOpen className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tight">Select a Fault Type to Start</h2>
              <p className="text-gray-500 dark:text-gray-400 font-bold max-w-sm">
                Choose a model and a common fault from the sidebar to view professional diagnosis guides and repair notes.
              </p>
            </div>
          ) : isLoading ? (
            <div className="space-y-8 animate-pulse">
              <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-3xl"></div>
              <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded-3xl"></div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Device Context Info */}
              {(selectedModel || (modelSearch && searchStatus === "GENERAL")) && (
                <div className={`flex items-center gap-4 p-4 border rounded-2xl ${
                  searchStatus === "SPECIFIC" 
                    ? "bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30"
                    : "bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-800"
                }`}>
                   <div className={`p-2 rounded-lg text-white ${searchStatus === "SPECIFIC" ? "bg-amber-500" : "bg-gray-400"}`}>
                      <Smartphone className="w-5 h-5" />
                   </div>
                   <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                        {searchStatus === "SPECIFIC" ? "Model-Specific Intelligence" : "General Knowledge (Model Not Linked)"}
                      </span>
                      <div className="text-lg font-black text-gray-900 dark:text-white leading-none tracking-tight">
                        {selectedModel ? selectedModel.fullName : modelSearch}
                      </div>
                   </div>
                   {searchStatus === "GENERAL" && (
                     <div className="ml-auto text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg border border-amber-100 dark:border-amber-900/30">
                        Showing standard solutions for {faultTypes.find(f => f.id === selectedFaultType)?.name}
                     </div>
                   )}
                   <button 
                     onClick={() => {
                        setSelectedModel(null);
                        setModelSearch("");
                        setSearchStatus("IDLE");
                     }}
                     className="ml-4 text-xs font-black text-gray-400 hover:text-red-500 uppercase tracking-widest"
                   >
                     Clear
                   </button>
                </div>
              )}

              {/* Diagnosis Checklist */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                   <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight italic">
                     <span className="text-blue-500">Professional</span> Diagnosis Guide
                   </h2>
                   <div className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-full">
                     Standard Protocol
                   </div>
                </div>
                {checklist ? (
                  <DiagnosisGuide 
                    checklist={checklist} 
                    suggestedFaultTypes={null}
                    onFaultTypeSelect={async () => {}}
                  />
                ) : (
                  <div className="py-12 border-2 border-dashed border-gray-100 dark:border-gray-800/50 rounded-2xl text-center">
                    <p className="text-gray-400 font-bold italic">Standard checklist not available for this fault yet.</p>
                  </div>
                )}
              </div>

              {/* Repair Notes */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                   <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight italic">
                     <span className="text-amber-500">Model-Specific</span> Repair Notes
                   </h2>
                   <div className="px-3 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-full">
                     Bench Secrets
                   </div>
                </div>
                <RepairNotes 
                  notes={notes} 
                  faultTypeId={selectedFaultType}
                  phoneModelId={selectedModel?.id || undefined}
                  onNoteAdded={() => fetchKnowledge(selectedModel?.id || null, selectedFaultType)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
