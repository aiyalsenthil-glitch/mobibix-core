"use client";

import { useEffect, useState } from "react";
import { 
  moderateNote, 
  type RepairNote, 
  type RepairKnowledgeStatus 
} from "@/services/knowledge.api";
import { authenticatedFetch, extractData } from "@/services/auth.api";
import { formatDistanceToNow } from "date-fns";
import { Check, X, Search, Globe, Shield } from "lucide-react";

export function KnowledgeModerationSection() {
  const [pendingNotes, setPendingNotes] = useState<RepairNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPendingNotes = async () => {
    setIsLoading(true);
    try {
      // Note: We need a backend route for this.
      // For now, let's assume getRepairNotes can take a status filter if we update the backend, 
      // or we use a specific moderation endpoint.
      // Based on my previous Task 7 note: "Add an admin-only listPendingNotes method".
      // Let's call the generic notes endpoint with status=PENDING.
      const response = await authenticatedFetch(`/mobileshop/knowledge/notes?status=PENDING`);
      if (!response.ok) {
        const err = await extractData(response);
        throw new Error((err as any).message || "Failed to fetch pending notes");
      }
      const data = await extractData(response);
      setPendingNotes(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingNotes();
  }, []);

  const handleModerate = async (noteId: string, status: RepairKnowledgeStatus) => {
    try {
      await moderateNote(noteId, status);
      setPendingNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (err: any) {
      alert("Failed to moderate note: " + err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-800 rounded-2xl p-8 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-500 text-sm">Loading pending repair notes...</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-800 rounded-2xl p-8 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Globe className="text-indigo-500" size={24} /> Repair Knowledge Moderation
          </h2>
          <p className="text-xs text-gray-500 mt-1">Review and approve community-submitted repair notes to improve the global database.</p>
        </div>
        <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 rounded-lg text-xs font-bold">
          {pendingNotes.length} Pending
        </div>
      </div>

      {error ? (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm border border-red-100">
          ⚠️ {error}
        </div>
      ) : pendingNotes.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl">
          <Check className="mx-auto w-12 h-12 text-green-500/50 mb-4" />
          <h3 className="font-bold text-gray-700 dark:text-gray-300">Inbox Clear!</h3>
          <p className="text-xs text-gray-500 mt-2">No community notes are awaiting moderation right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pendingNotes?.map(note => (
            <div key={note.id} className="flex flex-col bg-gray-50/50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div>
                     {/* Note: In a real app we'd fetch the brand/model/fault names here if not included in response */}
                     <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                       Fault ID: {note.faultTypeId}
                     </p>
                     <p className="text-xs text-gray-400">
                       Submitted {formatDistanceToNow(new Date(note.createdAt))} ago
                     </p>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-100 dark:border-gray-800 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed shadow-xs">
                  {note.content}
                </div>
                
                {note.videoUrl && (
                  <div className="mt-3 text-[10px] text-indigo-500 font-bold truncate">
                    Video: {note.videoUrl}
                  </div>
                )}
              </div>

              <div className="flex border-t dark:border-gray-800">
                <button 
                  onClick={() => handleModerate(note.id, "REJECTED")}
                  className="flex-1 py-3 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors flex items-center justify-center gap-2"
                >
                  <X size={14} /> Reject Note
                </button>
                <div className="w-px bg-gray-100 dark:bg-gray-800"></div>
                <button 
                  onClick={() => handleModerate(note.id, "APPROVED")}
                  className="flex-1 py-3 text-xs font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors flex items-center justify-center gap-2"
                >
                  <Check size={14} /> Approve Note
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
