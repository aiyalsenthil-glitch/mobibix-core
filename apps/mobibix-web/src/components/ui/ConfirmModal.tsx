"use client";

import { AlertTriangle } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: "bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400",
      btn: "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/30",
    },
    warning: {
      icon: "bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
      btn: "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-400/30",
    },
    info: {
      icon: "bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400",
      btn: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/30",
    },
  };

  const s = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-2xl p-6 animate-in zoom-in-95 duration-150">
        <div className="flex gap-4">
          <div className={`flex-shrink-0 p-2.5 rounded-xl ${s.icon}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-slate-900 dark:text-white text-base mb-1">
              {title}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {message}
            </p>
          </div>
        </div>
        <div className="flex gap-3 mt-6 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2 rounded-xl text-sm font-bold shadow-lg transition hover:scale-[1.01] ${s.btn}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
