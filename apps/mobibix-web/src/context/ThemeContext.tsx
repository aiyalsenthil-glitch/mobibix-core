"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

// Wrapper component to provide next-themes
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider 
      attribute="class" 
      defaultTheme="dark" 
      enableSystem={true} 
      disableTransitionOnChange
      storageKey="theme"
    >
      {children}
    </NextThemesProvider>
  );
}

// Custom hook that maintains backward compatibility with the existing interface
export function useTheme() {
  const { theme, setTheme, resolvedTheme } = useNextTheme();
  
  // Safe toggle function
  const toggleTheme = () => {
    // If theme is 'system', we use resolvedTheme to determine valid toggle target
    const current = theme === 'system' ? resolvedTheme : theme;
    setTheme(current === "dark" ? "light" : "dark");
  };

  return { 
    theme: (resolvedTheme || "light") as Theme, 
    toggleTheme 
  };
}
