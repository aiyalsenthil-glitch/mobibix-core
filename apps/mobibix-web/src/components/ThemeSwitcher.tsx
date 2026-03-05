"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";

export function ThemeSwitcher() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        className="px-3 py-2 rounded-lg bg-gray-200 text-slate-700 flex items-center justify-center gap-1 font-medium text-sm"
        disabled
      >
        <div className="h-4 w-4 rounded-full border border-slate-300"></div>
        <span>...</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={`px-3 py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-1 font-medium text-sm ${
        theme === "dark"
          ? "bg-white/10 hover:bg-white/20 text-yellow-300 hover:text-yellow-200"
          : "bg-gray-200 hover:bg-gray-300 text-slate-700 hover:text-slate-900"
      }`}
      aria-label="Toggle theme"
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <circle cx="12" cy="12" r="5"></circle>
            <line
              x1="12"
              y1="1"
              x2="12"
              y2="3"
              stroke="currentColor"
              strokeWidth="2"
            ></line>
            <line
              x1="12"
              y1="21"
              x2="12"
              y2="23"
              stroke="currentColor"
              strokeWidth="2"
            ></line>
            <line
              x1="4.22"
              y1="4.22"
              x2="5.64"
              y2="5.64"
              stroke="currentColor"
              strokeWidth="2"
            ></line>
            <line
              x1="18.36"
              y1="18.36"
              x2="19.78"
              y2="19.78"
              stroke="currentColor"
              strokeWidth="2"
            ></line>
            <line
              x1="1"
              y1="12"
              x2="3"
              y2="12"
              stroke="currentColor"
              strokeWidth="2"
            ></line>
            <line
              x1="21"
              y1="12"
              x2="23"
              y2="12"
              stroke="currentColor"
              strokeWidth="2"
            ></line>
            <line
              x1="4.22"
              y1="19.78"
              x2="5.64"
              y2="18.36"
              stroke="currentColor"
              strokeWidth="2"
            ></line>
            <line
              x1="18.36"
              y1="5.64"
              x2="19.78"
              y2="4.22"
              stroke="currentColor"
              strokeWidth="2"
            ></line>
          </svg>
          <span>Light</span>
        </>
      ) : (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
          <span>Dark</span>
        </>
      )}
    </button>
  );
}
