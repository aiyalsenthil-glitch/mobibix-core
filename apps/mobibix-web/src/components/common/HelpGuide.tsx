"use client";

import { useState } from "react";
import {
  HelpCircle,
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Lightbulb,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface GuideStep {
  title: string;
  description: string;
  tip?: string; // optional pro tip
}

interface HelpGuideProps {
  title: string;
  subtitle?: string;
  steps: GuideStep[];
  /** Popover side: default "left" */
  side?: "left" | "right" | "top" | "bottom";
  /** Additional class on the trigger button */
  className?: string;
}

/**
 * HelpGuide — a compact ? circle that opens a step-by-step guide popover.
 * Usage:
 *   <HelpGuide title="How Trade-In Works" steps={TRADEIN_GUIDE} />
 */
export function HelpGuide({
  title,
  subtitle,
  steps,
  side = "left",
  className = "",
}: HelpGuideProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const current = steps[step];
  const isFirst = step === 0;
  const isLast = step === steps.length - 1;

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (v) setStep(0); // reset to step 1 each time
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          aria-label="Help guide"
          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        side={side}
        align="start"
        sideOffset={8}
        className="w-80 p-0 rounded-xl shadow-xl border-0 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 flex items-start justify-between">
          <div>
            <p className="text-white font-semibold text-sm">{title}</p>
            {subtitle && (
              <p className="text-blue-100 text-xs mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-blue-200 hover:text-white mt-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step indicator dots */}
        <div className="flex items-center justify-center gap-1.5 pt-3 px-4">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`rounded-full transition-all ${
                i === step
                  ? "w-5 h-1.5 bg-blue-600"
                  : i < step
                  ? "w-1.5 h-1.5 bg-green-500"
                  : "w-1.5 h-1.5 bg-gray-200"
              }`}
            />
          ))}
          <span className="ml-2 text-xs text-gray-400">
            {step + 1}/{steps.length}
          </span>
        </div>

        {/* Step content */}
        <div className="px-4 pb-4 pt-3 min-h-[120px]">
          <div className="flex items-start gap-2 mb-2">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
              {isLast ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : step + 1}
            </div>
            <h4 className="text-sm font-semibold text-gray-900 leading-snug">
              {current.title}
            </h4>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed pl-8">
            {current.description}
          </p>
          {current.tip && (
            <div className="mt-3 ml-8 flex items-start gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <Lightbulb className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">{current.tip}</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-4 pb-4 pt-1 border-t">
          <button
            onClick={() => setStep((s) => s - 1)}
            disabled={isFirst}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Back
          </button>

          {isLast ? (
            <button
              onClick={() => setOpen(false)}
              className="flex items-center gap-1 text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 font-medium"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Got it!
            </button>
          ) : (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="flex items-center gap-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 font-medium"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
