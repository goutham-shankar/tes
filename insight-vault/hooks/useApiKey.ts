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
    (async () => {
      const ok = await loadAndInitApiKey();
      setReady(ok);
      if (ok) setPreview(getKeyPreview());
      setLoading(false);
    })();
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
