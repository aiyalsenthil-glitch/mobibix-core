"use client";

import { useState } from "react";
import { addStaff } from "@/services/staff.api";

interface InviteStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function InviteStaffModal({ isOpen, onClose, onSuccess }: InviteStaffModalProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await addStaff({ email, name, phone });
      onSuccess();
      onClose();
      // Reset form
      setEmail("");
      setName("");
      setPhone("");
    } catch (err: any) {
      setError(err.message || "Failed to invite staff");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-stone-900 border border-slate-200 dark:border-white/10 rounded-xl w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Invite Staff</h2>
        <p className="text-slate-500 dark:text-stone-400 text-sm mb-6">
          Send an invitation email to add a new staff member.
        </p>

        {error && (
          <div className="bg-red-50 dark:bg-red-500/20 border border-red-200 dark:border-red-500/50 text-red-600 dark:text-red-300 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-600 dark:text-stone-400 mb-1">
              Email Address <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
              placeholder="colleague@example.com"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-600 dark:text-stone-400 mb-1">
              Full Name <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-600 dark:text-stone-400 mb-1">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
              placeholder="+91 98765 43210"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-500 dark:text-stone-400 hover:text-slate-800 dark:hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white font-medium rounded-lg transition"
            >
              {isLoading ? "Sending Invite..." : "Send Invite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
