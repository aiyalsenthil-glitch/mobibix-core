"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

// Mock data to simulate pending approvals
const mockApprovals = [
  {
    id: "req_001",
    staffName: "Alex Mercer",
    role: "Sales Executive",
    branch: "Downtown Branch",
    action: "sale.refund",
    uiLabel: "Refund Invoices",
    details: "Invoice #INV-9284 ($120.00)",
    status: "PENDING",
    createdAt: "10 mins ago"
  },
  {
    id: "req_002",
    staffName: "Sarah Chen",
    role: "Gym Trainer",
    branch: "Northside Branch",
    action: "member.view_financials",
    uiLabel: "View Member Payments",
    details: "Member #MEM-102 (John Doe)",
    status: "PENDING",
    createdAt: "2 hours ago"
  }
];

export default function ApprovalInboxPage() {
  const { authUser } = useAuth();
  const [approvals, setApprovals] = useState(mockApprovals);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleDecision = async (id: string, approved: boolean) => {
    setLoadingId(id);
    // Simulate network latency
    await new Promise(r => setTimeout(r, 800));
    setApprovals(prev => prev.filter(r => r.id !== id));
    setLoadingId(null);
  };

  if (!authUser?.isSystemOwner && !authUser?.permissions?.includes("approval.override")) {
    return (
      <div className="max-w-5xl mx-auto flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-4">
          <div className="text-4xl">🔒</div>
          <h2 className="text-xl font-bold dark:text-white">Access Denied</h2>
          <p className="text-gray-500 dark:text-stone-400">
            You do not have permission to view or manage the approval inbox.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-24">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Approval Inbox
        </h1>
        <p className="text-gray-500 dark:text-slate-400">
          Review and authorize pending sensitive requests from your staff.
        </p>
      </div>

      <div className="space-y-4">
        {approvals.length === 0 ? (
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-12 text-center border border-gray-100 dark:border-stone-800 shadow-sm">
            <div className="text-5xl mb-4 opacity-50">✨</div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">All Caught Up!</h3>
            <p className="text-gray-500 dark:text-stone-400">There are no pending approval requests.</p>
          </div>
        ) : (
          approvals.map(req => (
            <div key={req.id} className="bg-white dark:bg-stone-900 rounded-2xl border border-orange-100 dark:border-orange-500/20 shadow-sm overflow-hidden flex flex-col md:flex-row md:items-center p-6 gap-6 relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-orange-400" />
              
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                    Authorization Required
                  </span>
                  <span className="text-xs text-gray-400 dark:text-stone-500">
                    {req.createdAt}
                  </span>
                </div>
                
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {req.staffName} <span className="text-gray-400 font-normal">requests to</span> {req.uiLabel}
                </h3>
                
                <div className="text-sm text-gray-600 dark:text-stone-400 font-medium">
                  Details: <span className="text-gray-900 dark:text-stone-200">{req.details}</span>
                </div>
                
                <div className="text-sm text-gray-500 flex items-center gap-2 pt-2">
                  <span className="truncate">👤 {req.role}</span>
                  <span className="text-gray-300 dark:text-stone-600">•</span>
                  <span className="truncate">🏬 {req.branch}</span>
                </div>
              </div>

              <div className="flex flex-row md:flex-col gap-3 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t border-gray-100 dark:border-stone-800 md:border-t-0 md:border-l md:pl-6">
                <button
                  onClick={() => handleDecision(req.id, true)}
                  disabled={loadingId !== null}
                  className="flex-1 md:flex-none px-6 py-2.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold rounded-xl whitespace-nowrap transition disabled:opacity-50"
                >
                  {loadingId === req.id ? "Processing..." : "Authorize"}
                </button>
                <button
                  onClick={() => handleDecision(req.id, false)}
                  disabled={loadingId !== null}
                  className="flex-1 md:flex-none px-6 py-2.5 bg-gray-100 dark:bg-stone-800 hover:bg-gray-200 dark:hover:bg-stone-700 text-gray-700 dark:text-stone-300 font-bold rounded-xl whitespace-nowrap transition disabled:opacity-50"
                >
                  Deny
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
