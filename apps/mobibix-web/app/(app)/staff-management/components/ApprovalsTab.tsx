"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getPendingApprovals, resolveApproval, ApprovalRequest } from "@/services/approvals.api";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function ApprovalsTab() {
  const { authUser } = useAuth();
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Resolution state
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveAction, setResolveAction] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const data = await getPendingApprovals();
      setApprovals(data);
    } catch (err) {
      console.error("Failed to fetch approvals:", err);
    } finally {
      setLoading(false);
    }
  };

  const submitResolution = async () => {
    if (!resolvingId || !resolveAction) return;

    try {
      setError(null);
      await resolveApproval(resolvingId, resolveAction, comment || undefined);
      setApprovals(prev => prev.filter(r => r.id !== resolvingId));
      closeResolutionModal();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resolve approval");
    }
  };

  const closeResolutionModal = () => {
    setResolvingId(null);
    setResolveAction(null);
    setComment("");
    setError(null);
  };

  // Helper to format action string into something readable
  const formatAction = (action: string) => {
    return action.split('.').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };
  
  // Helper to format metadata details
  const formatDetails = (meta?: Record<string, unknown>) => {
    if (!meta) return "No additional details provided.";
    return Object.entries(meta)
      .map(([k, v]) => `${k}: ${v}`)
      .join(" | ");
  };

  if (!authUser?.isSystemOwner && !authUser?.permissions?.includes("approval.override")) {
    return (
      <div className="max-w-5xl mx-auto flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-4">
          <div className="text-4xl">🔒</div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Access Denied</h2>
          <p className="text-gray-500 dark:text-stone-400">
            You do not have permission to view or manage the approval inbox.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
     return (
       <div className="flex justify-center py-12">
         <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
       </div>
     );
  }

  return (
    <div className="space-y-4 pb-24 relative">
      <div className="space-y-4">
        {approvals.length === 0 ? (
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-12 text-center border border-gray-100 dark:border-stone-800 shadow-sm transition-colors">
            <div className="text-5xl mb-4 opacity-50">✨</div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">All Caught Up!</h3>
            <p className="text-gray-500 dark:text-stone-400">There are no pending approval requests.</p>
          </div>
        ) : (
          approvals.map(req => (
            <div key={req.id} className="bg-white dark:bg-stone-900 rounded-2xl border border-orange-100 dark:border-orange-500/20 shadow-sm overflow-hidden flex flex-col md:flex-row md:items-center p-6 gap-6 relative transition-colors">
              <div className="absolute top-0 left-0 w-1 h-full bg-orange-400" />
              
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                    Approval Required
                  </span>
                  <span className="text-xs text-gray-400 dark:text-stone-500">
                    {new Date(req.createdAt).toLocaleString()}
                  </span>
                </div>
                
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {req.requester?.fullName || req.requester?.email || "Unknown Staff"} <span className="text-gray-400 font-normal">requests to</span> {formatAction(req.action)}
                </h3>
                
                <div className="text-sm text-gray-600 dark:text-stone-400 font-medium">
                  Details: <span className="text-gray-900 dark:text-stone-200">{formatDetails(req.meta)}</span>
                </div>
              </div>

              <div className="flex flex-row md:flex-col gap-3 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t border-gray-100 dark:border-stone-800 md:border-t-0 md:border-l md:pl-6">
                <button
                  onClick={() => { setResolvingId(req.id); setResolveAction("APPROVED"); }}
                  className="flex-1 md:flex-none px-6 py-2.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold rounded-xl whitespace-nowrap transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={18} /> Authorize
                </button>
                <button
                  onClick={() => { setResolvingId(req.id); setResolveAction("REJECTED"); }}
                  className="flex-1 md:flex-none px-6 py-2.5 bg-gray-100 dark:bg-stone-800 hover:bg-gray-200 dark:hover:bg-stone-700 text-gray-700 dark:text-stone-300 font-bold rounded-xl whitespace-nowrap transition-colors flex items-center justify-center gap-2"
                >
                  <XCircle size={18} /> Deny
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {resolvingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-800">
             <h3 className={`text-xl font-bold mb-4 ${resolveAction === "APPROVED" ? "text-green-600" : "text-red-500"}`}>
               {resolveAction === "APPROVED" ? "Authorize Request" : "Deny Request"}
             </h3>
             <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
               Please provide an optional reason or comment for your action. This will be logged for auditing.
             </p>

             {error && (
               <div className="mb-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                 {error}
               </div>
             )}

             <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Enter comment (optional)"
                className="w-full p-3 border border-gray-300 dark:border-slate-700 rounded-xl mb-4 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-50 focus:ring-2 focus:ring-orange-500 outline-none resize-none"
             />

             <div className="flex gap-3">
               <button
                  onClick={closeResolutionModal}
                  className="flex-1 py-2 rounded-xl border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
               >
                 Cancel
               </button>
               <button
                  onClick={submitResolution}
                  className={`flex-1 py-2 rounded-xl text-white font-medium flex items-center justify-center gap-2 transition-colors ${
                    resolveAction === "APPROVED" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                  }`}
               >
                 Confirm {resolveAction === "APPROVED" ? "Approval" : "Denial"}
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
