"use client";

import { useTheme } from "@/context/ThemeContext";

interface Tab {
  id: string;
  label: string;
}

interface PageTabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export default function PageTabs({ tabs, activeTab, onChange, className = "" }: PageTabsProps) {
  const { theme } = useTheme();
  
  return (
    <div className={`flex gap-2 border-b mb-6 overflow-x-auto ${
      theme === "dark" ? "border-white/10" : "border-gray-200"
    } ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === tab.id
              ? theme === "dark" 
                ? "border-teal-500 text-teal-400" 
                : "border-teal-600 text-teal-600"
              : theme === "dark"
                ? "border-transparent text-stone-500 hover:text-stone-200"
                : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
