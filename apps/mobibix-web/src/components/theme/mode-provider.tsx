"use client";

import { useEffect, useState } from "react";

export function useDarkMode() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("mobibix-mode");
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDark(true);
    }
  }, []);

  const toggle = () => {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("mobibix-mode", isDark ? "dark" : "light");
    setDark(isDark);
  };

  return { dark, toggle };
}
