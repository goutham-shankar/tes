/**
 * hooks/useApiKey.ts
 * Manages Gemini API key lifecycle: load on mount, save, clear.
 */
"use client";
import { useState, useEffect, useCallback } from "react";
import { saveApiKey, loadAndInitApiKey, clearApiKey } from "@/services/storage/apiKey";
import { isGeminiReady, getKeyPreview, clearGeminiClient } from "@/services/ai/gemini";

export function useApiKey() {
  const [ready, setReady]     = useState(false);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState("");

  // On mount, attempt to restore the saved key
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ok = await loadAndInitApiKey();
        if (cancelled) return;
        setReady(ok);
        if (ok) setPreview(getKeyPreview());
      } catch (err) {
        console.error("[InsightVault] Failed to load API key on startup:", err);
        if (cancelled) return;
        setReady(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const save = useCallback(async (key: string) => {
    await saveApiKey(key);
    setReady(isGeminiReady());
    setPreview(getKeyPreview());
  }, []);

  const clear = useCallback(async () => {
    await clearApiKey();
    clearGeminiClient();
    setReady(false);
    setPreview("");
  }, []);

  return { ready, loading, preview, save, clear };
}
