"use client";

import { useState, useEffect } from "react";
import {
  listCustomerNotes,
  createCustomerNote,
  deleteCustomerNote,
  type CustomerNote,
} from "@/services/customers.api";
import { Trash2, Plus } from "lucide-react";

interface CustomerNotesProps {
  customerId: string;
}

export function CustomerNotes({ customerId }: CustomerNotesProps) {
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listCustomerNotes(customerId)
      .then(setNotes)
      .finally(() => setLoading(false));
  }, [customerId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    try {
      const note = await createCustomerNote(customerId, content.trim());
      setNotes((prev) => [note, ...prev]);
      setContent("");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(noteId: string) {
    await deleteCustomerNote(customerId, noteId);
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  }

  return (
    <div className="space-y-4">
      {/* Quick-add */}
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a note..."
          className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-teal-400"
        />
        <button
          type="submit"
          disabled={!content.trim() || saving}
          className="flex items-center gap-1.5 px-3 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </form>

      {/* Notes list */}
      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[1, 2].map((i) => (
            <div key={i} className="h-14 bg-gray-100 dark:bg-white/5 rounded-lg" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">
          No notes yet. Add one above.
        </p>
      ) : (
        <ul className="space-y-2">
          {notes.map((note) => (
            <li
              key={note.id}
              className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-lg px-4 py-3 flex items-start justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  {note.content}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {note.author.fullName} ·{" "}
                  {new Date(note.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <button
                onClick={() => handleDelete(note.id)}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                title="Delete note"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
