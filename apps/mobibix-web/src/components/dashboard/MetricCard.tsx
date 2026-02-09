"use client";

import { useTheme } from "@/context/ThemeContext";
import { ReactNode } from "react";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  subtext?: string;
  accentColor?: "teal" | "amber" | "emerald" | "cyan" | "yellow" | "orange" | "blue" | "purple" | "red";
  onClick?: () => void;
  isLoading?: boolean;
}

export function MetricCard({
  label,
  value,
  icon,
  subtext,
  accentColor = "teal",
  onClick,
  isLoading,
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
    <div
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xl bg-card dark:bg-card/50 border border-border p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
        onClick ? "cursor-pointer hover:border-primary/50" : "cursor-default"
      }`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative z-10 flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase text-[10px]">{label}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
          </div>
          {subtext && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-primary/50 inline-block"></span>
            {subtext}
          </p>}
        </div>
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${colors.bg} ${colors.text} text-xl transition-transform group-hover:scale-110 duration-300 shadow-sm`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
