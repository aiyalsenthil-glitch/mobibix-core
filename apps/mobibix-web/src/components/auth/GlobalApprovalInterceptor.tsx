"use client";

import { useEffect, useState } from "react";
import { approvalEventTarget } from "@/lib/events/approval.events";
import { PERMISSION_DICTIONARY } from "@/lib/permissions.dict";

export function GlobalApprovalInterceptor() {
  const [request, setRequest] = useState<{ action: string; params: Record<string, unknown>; resolve: () => void; reject: (reason?: any) => void } | null>(null);
  const [managerPin, setManagerPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleApproval = (e: Event) => {
      const customEvent = e as CustomEvent;
      setRequest(customEvent.detail);
      setManagerPin("");
      setError(null);
    };

    approvalEventTarget.addEventListener("approval_required", handleApproval);
    return () => approvalEventTarget.removeEventListener("approval_required", handleApproval);
  }, []);

  if (!request) return null;

  // Look up the friendly name
  const permDef = PERMISSION_DICTIONARY.flatMap(m => m.resources).flatMap(r => r.permissions).find(p => p.actionId === request.action);
  const actionName = permDef?.uiLabel || request.action;

  const handleCancel = () => {
    request.reject(new Error("Approval cancelled by user."));
    setRequest(null);
  };

  const handleApprove = async () => {
    if (!managerPin) {
      setError("Please enter the Manager PIN.");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // In a real implementation this would pass the manager PIN to an approval endpoint
      // and then re-attempt the original request with an Approval-Token header.
      // For this MVP UI scaffolding we simulate the network delay.
      await new Promise(r => setTimeout(r, 800));
      
      if (managerPin !== "1234" && managerPin !== "0000") { // Mock validation
        throw new Error("Invalid Manager PIN.");
      }
      
      // Success! Resolve the intercepted promise
      request.resolve();
      setRequest(null);
    } catch (err: unknown) {
      setError((err as any)?.message || "Approval failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-stone-900 border-2 border-orange-200 dark:border-orange-500/30 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative overflow-hidden">
        
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-red-500" />
        
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center mb-4 text-3xl shadow-inner">
            🛡️
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Manager Approval Required</h2>
          <p className="text-gray-500 dark:text-stone-400 text-sm mb-6">
            Your current role does not have permission to <strong className="text-gray-700 dark:text-stone-200">{actionName}</strong>. 
            A manager must enter their PIN to authorize this single action.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg mb-4 text-center border border-red-200 dark:border-red-500/30">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-stone-400 mb-2">
              Manager PIN
            </label>
            <input
              type="password"
              maxLength={4}
              pattern="\d*"
              value={managerPin}
              onChange={(e) => setManagerPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              disabled={loading}
              className="w-full text-center text-2xl tracking-[0.5em] px-4 py-3 bg-gray-50 dark:bg-stone-950 border border-gray-200 dark:border-stone-800 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              autoFocus
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleCancel}
              disabled={loading}
              className="flex-1 py-2.5 text-sm font-bold text-gray-600 dark:text-stone-300 bg-gray-100 hover:bg-gray-200 dark:bg-stone-800 dark:hover:bg-stone-700 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              onClick={handleApprove}
              disabled={loading || managerPin.length < 4}
              className="flex-1 py-2.5 text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-orange-500/20 transition"
            >
              {loading ? "Verifying..." : "Authorize"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
