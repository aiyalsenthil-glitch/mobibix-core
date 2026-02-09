"use client";

import { Ban, TriangleAlert, CheckCircle } from "lucide-react";

interface DowngradeBlockerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  blockers: string[];
  targetPlanName: string;
}

export default function DowngradeBlockerModal({
  isOpen,
  onClose,
  onConfirm,
  blockers,
  targetPlanName,
}: DowngradeBlockerModalProps) {
  if (!isOpen) return null;

  const hasBlockers = blockers.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-stone-200 dark:border-stone-800 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className={`p-6 border-b ${hasBlockers ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20' : 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-100 dark:border-yellow-900/20'}`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${hasBlockers ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400'}`}>
              {hasBlockers ? <Ban className="w-8 h-8" /> : <TriangleAlert className="w-8 h-8" />}
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {hasBlockers ? "Unable to Downgrade" : "Confirm Downgrade"}
              </h3>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                {hasBlockers 
                  ? `Your current usage exceeds the limits of the ${targetPlanName} plan.` 
                  : `Please review conflicts before switching to ${targetPlanName}.`
                }
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {hasBlockers ? (
            <div className="space-y-4">
              <p className="text-stone-600 dark:text-stone-300">
                You need to free up resources before you can switch to this plan.
              </p>
              <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-xl p-4">
                <ul className="space-y-3">
                  {blockers.map((blocker, idx) => (
                    <li key={idx} className="flex gap-3 text-sm text-red-700 dark:text-red-400">
                      <span className="shrink-0">•</span>
                      <span>{blocker}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-xs text-stone-500 italic">
                Deactivate staff or shops from their respective dashboards, then try again.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
               <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-xl">
                  <TriangleAlert className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    <p className="font-semibold mb-1">Warning</p>
                    <p>Downgrading may cause you to lose access to premium features immediately or at the next renewal date.</p>
                  </div>
               </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-stone-100 dark:border-stone-800 flex justify-end gap-3 bg-stone-50 dark:bg-stone-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-200 dark:text-stone-400 dark:hover:bg-stone-800 transition-colors"
          >
            {hasBlockers ? "Close" : "Cancel"}
          </button>
          
          {!hasBlockers && (
            <button
              onClick={onConfirm}
              className="px-6 py-2 rounded-lg text-sm font-bold text-white bg-yellow-600 hover:bg-yellow-700 shadow-lg shadow-yellow-900/20 transition-all active:scale-95"
            >
              Confirm Downgrade
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
