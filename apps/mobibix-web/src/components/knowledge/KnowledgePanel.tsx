"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  getKnowledgeForJob, 
  type KnowledgeForJobResponse,
  type FaultType 
} from "@/services/knowledge.api";
import { DiagnosisGuide } from "./DiagnosisGuide";
import { RepairNotes } from "./RepairNotes";
import { FaultTypeMismatchBanner } from "./FaultTypeMismatchBanner";

interface KnowledgePanelProps {
  jobCardId: string;
}

export function KnowledgePanel({ jobCardId }: KnowledgePanelProps) {
  const [data, setData] = useState<KnowledgeForJobResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"diagnosis" | "notes" | "parts">("diagnosis");

  const loadKnowledge = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getKnowledgeForJob(jobCardId);
      setData(response);
      // If no checklist but there are notes, default to notes tab
      if (!response.checklist && response.notes.length > 0) {
        setActiveTab("notes");
      }
    } catch (err: any) {
      console.error("Knowledge fetch error:", err);
      setError("Failed to load knowledge assistant.");
    } finally {
      setIsLoading(false);
    }
  }, [jobCardId]);

  useEffect(() => {
    loadKnowledge();
  }, [loadKnowledge]);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm animate-pulse">
        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded mb-4"></div>
        <div className="flex gap-2 mb-6">
          <div className="h-8 w-24 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
          <div className="h-8 w-24 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
          <div className="h-8 w-24 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
        </div>
        <div className="space-y-3">
          <div className="h-4 w-full bg-gray-200 dark:bg-gray-800 rounded"></div>
          <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-800 rounded"></div>
          <div className="h-4 w-4/6 bg-gray-200 dark:bg-gray-800 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-900/50 rounded-xl p-6 shadow-sm">
        <p className="text-amber-700 dark:text-amber-400 text-sm flex items-center gap-2">
          <span>⚠️</span> {error || "No data available."}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
      <div className="p-4 bg-gray-50/50 dark:bg-gray-800/30 border-b dark:border-gray-800">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="text-lg">🧠</span> Repair Assistant
          </h2>
          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-tighter bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded">
            Pro
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
          {data.jobDetails.brand} {data.jobDetails.model} • {data.jobDetails.problem}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/20">
        <button
          onClick={() => setActiveTab("diagnosis")}
          className={`flex-1 py-3 text-xs font-bold transition-all relative ${
            activeTab === "diagnosis"
              ? "text-indigo-600 dark:text-indigo-400"
              : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Diagnosis
          {activeTab === "diagnosis" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab("notes")}
          className={`flex-1 py-3 text-xs font-bold transition-all relative ${
            activeTab === "notes"
              ? "text-indigo-600 dark:text-indigo-400"
              : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Repair Notes ({data.notes.length})
          {activeTab === "notes" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab("parts")}
          className={`flex-1 py-3 text-xs font-bold transition-all relative ${
            activeTab === "parts"
              ? "text-indigo-600 dark:text-indigo-400"
              : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Parts
          {activeTab === "parts" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400"></div>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 overflow-auto max-h-[500px]">
        {activeTab === "diagnosis" && (
          <DiagnosisGuide 
            checklist={data.checklist} 
            suggestedFaultTypes={data.suggestedFaultTypes}
            onFaultTypeSelect={async (id: string) => {
               // Reload knowledge with chosen fault type id
               // This would require a slightly different API call if we wanted to be efficient,
               // but for now re-calling getKnowledgeForJob is the simplest if the backend supports it,
               // or just manually updating local state if we fetch checklist separately.
               // Let's implement refreshing the specific checklist.
               loadKnowledge(); // Simplified for now
            }}
          />
        )}
        
        {activeTab === "notes" && (
          <RepairNotes 
            notes={data.notes} 
            faultTypeId={data.jobDetails.faultTypeId || ""}
            phoneModelId={data.jobDetails.phoneModelId || undefined}
            onNoteAdded={loadKnowledge}
          />
        )}

        {activeTab === "parts" && (
          <div className="space-y-4 py-2">
             <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-900/50">
               <p className="text-xs text-blue-800 dark:text-blue-300 font-medium mb-3">
                 Looking for parts for {data.jobDetails.model}? Use our Intelligent Compatibility Finder.
               </p>
               <a 
                 href={`/tools/compatibility-finder?model=${encodeURIComponent(data.jobDetails.model)}`}
                 className="block w-full text-center py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition"
               >
                 🔍 Find Compatible Parts
               </a>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
