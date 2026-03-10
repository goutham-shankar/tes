/**
 * hooks/useInsights.ts
 * Insight CRUD + AI enrichment (tagging + embedding).
 */
"use client";
import { useState, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type InsightType } from "@/db/schema";
import {
  addInsight,
  appendThread,
  deleteInsight,
  searchInsightsByText,
  getAllTags,
  getAllInsightsWithEmbeddings,
} from "@/db/operations";
import { generateTags } from "@/services/ai/tagging";
import { generateEmbedding } from "@/services/ai/embedding";
import { isGeminiReady } from "@/services/ai/gemini";
import { topKSearch } from "@/lib/vector";

export function useInsights() {
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  // Live-reactive list of all insights
  const insights = useLiveQuery(() =>
    db.insights.orderBy("createdAt").reverse().toArray()
  ) ?? [];

  const tags = useLiveQuery(() => getAllTags()) ?? [];

  const addNew = useCallback(
    async (
      content: string,
      type: InsightType,
      source?: string
    ) => {
      setError(null);
      setSaving(true);
      try {
        let tags: string[] = [];
        let embedding: number[] = [];

        if (isGeminiReady()) {
          // Run tagging and embedding in parallel
          const [aiTags, emb] = await Promise.all([
            generateTags(content),
            generateEmbedding(content),
          ]);
          tags = aiTags;
          embedding = emb;

          // ── Auto-threading: if very similar to an existing insight, append as thread ──
          if (embedding.length > 0) {
            const existing = await getAllInsightsWithEmbeddings();
            const matches = topKSearch(embedding, existing, 1, 0.75);
            if (matches.length > 0) {
              // Thread to the existing insight instead of creating a duplicate
              const updated = await appendThread(matches[0].id, content);
              return { insight: updated, wasThreaded: true };
            }
          }
        }

        const insight = await addInsight(content, type, tags, embedding, source);
        return { insight, wasThreaded: false };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const remove = useCallback(async (id: string) => {
    await deleteInsight(id);
  }, []);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) return insights;
    return searchInsightsByText(q);
  }, [insights]);

  return { insights, tags, saving, error, addNew, remove, search };
}
