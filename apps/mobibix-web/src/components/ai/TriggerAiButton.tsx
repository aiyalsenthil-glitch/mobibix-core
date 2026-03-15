"use client";

import React from "react";
import { SparklesIcon } from "lucide-react";

export function TriggerAiButton({
  prompt,
  label = "Ask AI",
  className = "",
}: {
  prompt: string;
  label?: string;
  className?: string;
}) {
  const handleClick = () => {
    window.dispatchEvent(
      new CustomEvent("open-ai-chat", {
        detail: { prompt },
      })
    );
  };

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 rounded-md transition-colors ${className}`}
    >
      <SparklesIcon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
