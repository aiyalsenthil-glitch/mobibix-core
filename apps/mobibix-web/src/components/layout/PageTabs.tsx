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
                ? "border-indigo-500 text-indigo-400" 
                : "border-indigo-600 text-indigo-600"
              : theme === "dark"
                ? "border-transparent text-gray-400 hover:text-gray-200"
                : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
