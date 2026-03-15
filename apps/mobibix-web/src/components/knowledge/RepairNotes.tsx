"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { 
  type RepairNote, 
  voteOnNote,
  type RepairKnowledgeSource 
} from "@/services/knowledge.api";
import { AddRepairNoteForm } from "./AddRepairNoteForm";

interface RepairNotesProps {
  notes: RepairNote[];
  faultTypeId: string;
  phoneModelId?: string;
  onNoteAdded: () => void;
}

const SOURCE_COLORS: Record<RepairKnowledgeSource, string> = {
  SYSTEM: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  ADMIN: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  COMMUNITY: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

export function RepairNotes({ 
  notes, 
  faultTypeId, 
  phoneModelId,
  onNoteAdded 
}: RepairNotesProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [localNotes, setLocalNotes] = useState(notes || []);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());

  const handleVote = async (noteId: string, vote: "helpful" | "notHelpful") => {
    if (votedIds.has(noteId)) return;

    // Optimistic update
    setLocalNotes(prev => prev.map(note => {
      if (note.id === noteId) {
        return {
          ...note,
          helpfulCount: vote === "helpful" ? note.helpfulCount + 1 : note.helpfulCount,
          notHelpfulCount: vote === "notHelpful" ? note.notHelpfulCount + 1 : note.notHelpfulCount,
        };
      }
      return note;
    }));
    
    setVotedIds(prev => new Set(prev).add(noteId));

    try {
      await voteOnNote(noteId, vote);
    } catch (err) {
      console.error("Voting failed", err);
      // Revert if needed, but optimistic is usually fine for votes
    }
  };

  return (
    <div className="space-y-4 py-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
          Technical Intelligence
        </p>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            + Add Note
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
          <AddRepairNoteForm 
            faultTypeId={faultTypeId}
            phoneModelId={phoneModelId}
            onSuccess={() => {
              setIsAdding(false);
              onNoteAdded();
            }}
            onCancel={() => setIsAdding(false)}
          />
        </div>
      )}

      {localNotes.length === 0 && !isAdding && (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No technical notes for this model yet.
          </p>
          <button 
            onClick={() => setIsAdding(true)}
            className="mt-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Submit the first repair note
          </button>
        </div>
      )}

      <div className="space-y-3">
        {localNotes?.map(note => (
          <div key={note.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-bold uppercase tracking-tight px-1.5 py-0.5 rounded ${SOURCE_COLORS[note.source]}`}>
                  {note.source}
                </span>
                <span className="text-[10px] text-gray-400">
                  {formatDistanceToNow(new Date(note.createdAt))} ago
                </span>
              </div>
              {note.status === "PENDING" && (
                <span className="text-[9px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded">
                  Pending Review
                </span>
              )}
            </div>

            <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-4 whitespace-pre-wrap">
              {note.content}
            </div>

            {note.videoUrl && (
              <a 
                href={note.videoUrl} 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400 mb-4 hover:underline"
              >
                <span>📺</span> Watch Repair Video
              </a>
            )}

            <div className="flex items-center gap-3 border-t dark:border-gray-800 pt-3">
              <button 
                onClick={() => handleVote(note.id, "helpful")}
                disabled={votedIds.has(note.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold transition ${
                  votedIds.has(note.id)
                    ? "bg-gray-50 dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 opacity-60"
                    : "bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400"
                }`}
              >
                👍 Works ({note.helpfulCount})
              </button>
              <button 
                onClick={() => handleVote(note.id, "notHelpful")}
                disabled={votedIds.has(note.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold transition ${
                  votedIds.has(note.id)
                    ? "bg-gray-50 dark:bg-gray-800 text-gray-400 opacity-60"
                    : "bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 dark:hover:text-rose-400"
                }`}
              >
                👎 Not Useful ({note.notHelpfulCount})
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
