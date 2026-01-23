"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type ThemeContextType = {
  setPrimary: (value: string) => void;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [primary, setPrimary] = useState("0.488 0.243 264.376"); // violet-blue

  useEffect(() => {
    const saved = localStorage.getItem("mobibix-primary");
    if (saved) setPrimary(saved);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--primary",
      `oklch(${primary})`,
    );
    localStorage.setItem("mobibix-primary", primary);
  }, [primary]);

  return (
    <ThemeContext.Provider value={{ setPrimary }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeColor() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeColor must be used inside ThemeProvider");
  }
  return ctx;
}
