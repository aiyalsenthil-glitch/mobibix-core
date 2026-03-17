"use client";

import { useState, useEffect, useCallback } from "react";
import { MyFollowUpsWidget, AddFollowUpModal } from "@/components/crm";
import { CustomerTabs } from "@/components/crm/CustomerTabs";
import {
  getAllFollowUps,
  updateFollowUpStatus,
  type FollowUp,
  type FollowUpStatus,
} from "@/services/crm.api";
import { useAuth } from "@/hooks/useAuth";
import { Phone, MessageSquare, CheckCircle2, Clock, MoreVertical } from "lucide-react";

type ViewTab = "mine" | "all";

export default function FollowUpsPage() {
  const { authUser: user } = useAuth();
  const isOwner = user?.role === "owner";

  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<ViewTab>("mine");
  const [allFollowUps, setAllFollowUps] = useState<FollowUp[]>([]);
  const [allTotal, setAllTotal] = useState(0);
  const [allLoading, setAllLoading] = useState(false);

  const loadAll = useCallback(async () => {
    setAllLoading(true);
    try {
      const result = await getAllFollowUps({ take: 100 });
      setAllFollowUps(result.data);
      setAllTotal(result.total);
    } catch {
      // silently fail
    } finally {
      setAllLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOwner && activeTab === "all") {
      loadAll();
    }
  }, [isOwner, activeTab, loadAll]);

  async function handleStatusChange(id: string, status: FollowUpStatus) {
    await updateFollowUpStatus(id, status);
    loadAll();
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-700">
      <CustomerTabs />

      {/* Header Section */}
      <div className="bg-white dark:bg-stone-900 border border-gray-100 dark:border-white/5 p-8 rounded-[2.5rem] shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Follow-up Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium max-w-md">
            Track and manage your customer relationships through systematic follow-up tasks.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-teal-500 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-teal-500/25 hover:bg-teal-600 hover:shadow-teal-500/40 transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap"
        >
          <span className="text-xl">+</span> Add New Task
        </button>
      </div>

      {/* Navigation & Content Area */}
      <div className="space-y-6">
        {/* View Switcher for Owners */}
        {isOwner && (
          <div className="flex p-1.5 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl w-fit">
            {(["mine", "all"] as ViewTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-8 py-2.5 text-sm font-bold rounded-xl transition-all ${
                  activeTab === t
                    ? "bg-white dark:bg-teal-500 shadow-md text-teal-600 dark:text-white"
                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {t === "mine" ? "My Tasks" : `All Organization Tasks ${allTotal ? `(${allTotal})` : ""}`}
              </button>
            ))}
          </div>
        )}

        {/* Content Render */}
        <div className="min-h-[600px]">
          {activeTab === "mine" || !isOwner ? (
            <MyFollowUpsWidget />
          ) : (
            <div className="bg-white dark:bg-stone-900 border border-gray-100 dark:border-white/5 rounded-[2rem] overflow-hidden shadow-sm">
              {allLoading ? (
                <div className="p-8 space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-20 bg-gray-50 dark:bg-white/5 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : allFollowUps.length === 0 ? (
                <div className="py-24 text-center">
                   <div className="w-20 h-20 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Clock className="w-10 h-10 text-gray-300" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Clear Workspace</h3>
                  <p className="text-gray-500 mt-2">No organization-wide follow-ups found.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50 dark:divide-white/5">
                  {allFollowUps.map((fu) => (
                    <AllFollowUpRow
                      key={fu.id}
                      followUp={fu}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <AddFollowUpModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setShowAddModal(false);
          if (activeTab === "all") loadAll();
        }}
      />
    </div>
  );
}

function AllFollowUpRow({
  followUp,
  onStatusChange,
}: {
  followUp: FollowUp;
  onStatusChange: (id: string, status: FollowUpStatus) => void;
}) {
  const isPending = followUp.status === "PENDING";
  const isOverdue = isPending && new Date(followUp.followUpAt) < new Date();

  return (
    <div className={`group flex items-center gap-4 p-5 hover:bg-gray-50/80 dark:hover:bg-white/5 transition-all ${!isPending ? 'opacity-60' : ''}`}>
      {/* Visual Indicator of Type */}
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border border-transparent bg-gray-100 dark:bg-white/5 text-gray-400 group-hover:scale-110 transition-transform`}>
        {followUp.type === "PHONE_CALL" ? <Phone className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
      </div>

      {/* Info Cluster */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
            {followUp.customerName || "Private Customer"}
          </h4>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 font-bold uppercase tracking-tighter">
            {followUp.type?.replace("_", " ")}
          </span>
          {isOverdue && (
            <span className="px-2 py-0.5 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-[10px] font-black rounded-full italic">LATE</span>
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
          {followUp.purpose}
        </p>
        <div className="flex items-center gap-3 mt-1.5 overflow-hidden">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium">
            <Clock className="w-3 h-3" />
            <span>{new Date(followUp.followUpAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          {followUp.assignedToUserName && (
            <div className="flex items-center gap-2 text-[11px] text-gray-400 border-l border-gray-200 dark:border-white/10 pl-3">
              <span className="shrink-0 w-4 h-4 rounded-full bg-teal-500/20 flex items-center justify-center text-[8px] text-teal-600 font-bold">
                {followUp.assignedToUserName[0]}
              </span>
              <span>Owner: <span className="text-gray-700 dark:text-gray-300 font-bold">{followUp.assignedToUserName}</span></span>
            </div>
          )}
        </div>
      </div>

      {/* Interaction Corner */}
      <div className="flex items-center gap-3 shrink-0">
        {isPending ? (
          <>
            {followUp.customerPhone && (
              <div className="hidden md:flex items-center gap-1">
                 <a 
                  href={`tel:${followUp.customerPhone}`}
                  className="p-2 hover:bg-teal-50 dark:hover:bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl transition-colors"
                  title={`Call ${followUp.customerPhone}`}
                >
                  <Phone className="w-4 h-4" />
                </a>
                <a 
                  href={`https://wa.me/${followUp.customerPhone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-teal-50 dark:hover:bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl transition-colors"
                  title="WhatsApp"
                >
                  <MessageSquare className="w-4 h-4" />
                </a>
              </div>
            )}
            <button
              onClick={() => onStatusChange(followUp.id, "DONE")}
              className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-6 py-2.5 rounded-xl text-xs font-black ring-1 ring-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all active:scale-95"
            >
              RESOLVE
            </button>
          </>
        ) : (

          <div className="flex items-center gap-1.5 text-gray-400 bg-gray-50 dark:bg-white/5 px-4 py-2 rounded-xl text-xs font-bold border border-gray-100 dark:border-white/5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Archived</span>
          </div>
        )}
        <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

