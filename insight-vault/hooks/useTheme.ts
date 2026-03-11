/**
 * hooks/useTheme.ts
 * Manages dark/light theme with persistence to IndexedDB.
 */
"use client";
import { useState, useEffect, useCallback } from "react";
import { getTheme, setTheme as saveTheme } from "@/db/operations";

export function useTheme() {
  const [theme, setThemeState] = useState<"dark" | "light">("dark");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await getTheme();
        setThemeState(saved);
        applyTheme(saved);
      } catch {
        applyTheme("dark");
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const toggle = useCallback(async () => {
    const next = theme === "dark" ? "light" : "dark";
    setThemeState(next);
    applyTheme(next);
    try {
      await saveTheme(next);
    } catch (err) {
      console.error("[InsightVault] Failed to persist theme:", err);
    }
  }, [theme]);

  return { theme, toggle, loaded };
}

function applyTheme(theme: "dark" | "light") {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  if (theme === "dark") {
    html.classList.add("dark");
    html.classList.remove("light");
  } else {
    html.classList.add("light");
    html.classList.remove("dark");
  }
}
