"use client";

import { useTheme } from "@/context/ThemeContext";
import { ReactNode } from "react";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  subtext?: string;
  accentColor?: "teal" | "amber" | "emerald" | "cyan" | "yellow" | "orange" | "blue" | "purple" | "red";
  onClick?: () => void;
  isLoading?: boolean;
  trend?: string;
  trendLabel?: string;
}

export function MetricCard({
  label,
  value,
  icon,
  subtext,
  accentColor = "teal",
  onClick,
  isLoading,
  trend,
  trendLabel,
}: MetricCardProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const colorMap: Record<string, { bg: string; text: string }> = {
    primary: { bg: "bg-primary/10 dark:bg-primary/20", text: "text-primary" },
    teal: { bg: "bg-teal-50 dark:bg-teal-900/20", text: "text-teal-600 dark:text-teal-400" },
    amber: { bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-600 dark:text-amber-400" },
    emerald: { bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-600 dark:text-emerald-400" },
    cyan: { bg: "bg-cyan-50 dark:bg-cyan-900/20", text: "text-cyan-600 dark:text-cyan-400" },
    yellow: { bg: "bg-yellow-50 dark:bg-yellow-900/20", text: "text-yellow-600 dark:text-yellow-400" },
    orange: { bg: "bg-orange-50 dark:bg-orange-900/20", text: "text-orange-600 dark:text-orange-400" },
    blue: { bg: "bg-blue-50 dark:bg-blue-900/20", text: "text-blue-600 dark:text-blue-400" },
    purple: { bg: "bg-purple-50 dark:bg-purple-900/20", text: "text-purple-600 dark:text-purple-400" },
    red: { bg: "bg-red-50 dark:bg-red-900/20", text: "text-red-600 dark:text-red-400" },
  };

  const colors = colorMap[accentColor] || colorMap.primary;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 animate-pulse h-[110px]">
        <div className="flex items-start justify-between">
          <div className="space-y-3 w-full">
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-8 bg-muted rounded w-3/4" />
          </div>
          <div className="h-10 w-10 bg-muted rounded-lg shrink-0" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      onClick={onClick}
      className={`group relative overflow-hidden human-card p-6 ${
        onClick ? "cursor-pointer" : "cursor-default"
      }`}
    >
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{label}</p>
            <h3 className="text-3xl font-bold tracking-tighter text-zinc-900 dark:text-zinc-100">{value}</h3>
          </div>
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-[18px] ${colors.bg} ${colors.text} transition-all duration-500 group-hover:rotate-3 shadow-sm border border-black/5`}
          >
            {icon}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-zinc-100 dark:border-white/5 pt-4">
           {trend && (
             <div className={`flex items-center gap-1.5 ${trend.startsWith('-') ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
               {!trend.startsWith('-') && <TrendingUp size={12} />}
               <span className="text-[10px] font-bold">{trend}</span>
               {trendLabel && (
                 <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-medium">{trendLabel}</span>
               )}
             </div>
           )}
           {subtext && (
             <span className="text-[9px] font-bold text-zinc-300 dark:text-zinc-600 uppercase tracking-widest">{subtext}</span>
           )}
        </div>
      </div>
    </motion.div>
  );
}
