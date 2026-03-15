"use client";

import { useState } from "react";
import { 
  type FaultDiagnosis, 
  type FaultType 
} from "@/services/knowledge.api";
import { FaultTypeMismatchBanner } from "./FaultTypeMismatchBanner";

interface DiagnosisGuideProps {
  checklist: FaultDiagnosis | null;
  suggestedFaultTypes: FaultType[] | null;
  onFaultTypeSelect: (id: string) => void;
}

export function DiagnosisGuide({ 
  checklist, 
  suggestedFaultTypes,
  onFaultTypeSelect 
}: DiagnosisGuideProps) {
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});

  const totalSteps = checklist?.steps?.length || 0;
  const completedCount = Object.values(checkedSteps).filter(Boolean).length;
  const progressPercent = totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0;

  const toggleStep = (id: string) => {
    setCheckedSteps(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  if (!checklist) {
    return (
      <div className="space-y-4 py-2">
        {suggestedFaultTypes && suggestedFaultTypes.length > 0 && (
          <FaultTypeMismatchBanner 
            suggestions={suggestedFaultTypes} 
            onSelect={onFaultTypeSelect} 
          />
        )}
        
        {!suggestedFaultTypes?.length && (
          <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No diagnosis guide found for this fault.
            </p>
            <p className="text-[10px] text-gray-400 mt-1">
              Refine the "Customer Complaint" to match standard fault types.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5 py-2">
      {/* Progress Header */}
      <div className="relative pt-1">
        <div className="flex mb-2 items-center justify-between">
          <div>
            <span className="text-xs font-bold inline-block py-1 px-2 uppercase rounded-full text-indigo-600 bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300">
              Technical Guide
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold inline-block text-indigo-600 dark:text-indigo-400">
              {completedCount}/{totalSteps} complete
            </span>
          </div>
        </div>
        <div className="overflow-hidden h-1.5 mb-1 text-xs flex rounded bg-gray-200 dark:bg-gray-800">
          <div
            style={{ width: `${progressPercent}%` }}
            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500 transition-all duration-500"
          ></div>
        </div>
      </div>

      <p className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-2">
        Standard Troubleshooting Steps
      </p>

      {/* Steps List */}
      <div className="space-y-2">
        {checklist.steps?.map((step, idx) => (
          <div 
            key={step.id}
            onClick={() => toggleStep(step.id)}
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
              checkedSteps[step.id] 
                ? "bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-900/50" 
                : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-indigo-200 dark:hover:border-indigo-900/50"
            }`}
          >
            <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
              checkedSteps[step.id]
                ? "bg-indigo-600 border-indigo-600 text-white"
                : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
            }`}>
              {checkedSteps[step.id] && <span className="text-[10px] font-bold">✓</span>}
            </div>
            <div className="flex-1">
              <p className={`text-sm ${checkedSteps[step.id] ? "text-gray-900 dark:text-white line-through opacity-50" : "text-gray-700 dark:text-gray-300"}`}>
                <span className="font-bold mr-2 text-indigo-600 dark:text-indigo-400 opacity-50">
                  {idx + 1}.
                </span>
                {step.stepText}
              </p>
            </div>
          </div>
        ))}
      </div>

      {completedCount === totalSteps && totalSteps > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-100 dark:border-green-900/50 text-center animate-bounce-short">
          <p className="text-xs text-green-800 dark:text-green-300 font-bold">
            🎉 Troubleshooting Complete!
          </p>
          <p className="text-[10px] text-green-700 dark:text-green-400 mt-1">
            Did this fix the issue? Add a repair note to help others.
          </p>
        </div>
      )}
    </div>
  );
}
