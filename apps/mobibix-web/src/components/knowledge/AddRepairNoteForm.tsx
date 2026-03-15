"use client";

import { useState } from "react";
import { submitRepairNote } from "@/services/knowledge.api";

interface AddRepairNoteFormProps {
  faultTypeId: string;
  phoneModelId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AddRepairNoteForm({ 
  faultTypeId, 
  phoneModelId,
  onSuccess,
  onCancel 
}: AddRepairNoteFormProps) {
  const [content, setContent] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await submitRepairNote({
        faultTypeId,
        phoneModelId,
        content: content.trim(),
        videoUrl: videoUrl.trim() || undefined,
      });
      onSuccess();
    } catch (err: any) {
      console.error("Submit note error:", err);
      setError(err.message || "Failed to submit note. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
          Technical Solution *
        </label>
        <textarea
          required
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Describe the fix details, component locations, or measurement values..."
          className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg outline-none focus:border-indigo-500 dark:focus:border-indigo-400 dark:text-gray-200 transition"
        />
      </div>

      <div>
        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
          YouTube / Video Link (Optional)
        </label>
        <input
          type="url"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://youtube.com/watch?v=..."
          className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg outline-none focus:border-indigo-500 dark:focus:border-indigo-400 dark:text-gray-200 transition"
        />
      </div>

      {error && (
        <p className="text-[10px] font-bold text-rose-500">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !content.trim()}
          className="flex-2 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-800 rounded-lg transition"
        >
          {isSubmitting ? "Submitting..." : "Submit for Review"}
        </button>
      </div>

      <p className="text-[9px] text-gray-400 italic text-center">
        Your contribution helps the whole community. All notes are moderated for quality.
      </p>
    </form>
  );
}
