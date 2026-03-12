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
  mergeInsight,
  deleteInsight,
  updateInsight,
  toggleFavorite,
  searchInsightsByText,
  getAllTags,
  getAllInsightsWithEmbeddings,
} from "@/db/operations";
import { generateTags } from "@/services/ai/tagging";
import { generateEmbedding } from "@/services/ai/embedding";
import { checkSimilarity } from "@/services/ai/similarity";
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
    ): Promise<{ insight: unknown; wasThreaded: boolean; mergeReason?: string }> => {
      setError(null);
      setSaving(true);
      try {
        let aiTags: string[] = [];
        let embedding: number[] = [];

        if (isGeminiReady()) {
          const [tagResult, embResult] = await Promise.allSettled([
            generateTags(content),
            generateEmbedding(content),
          ]);
          aiTags = tagResult.status === "fulfilled" ? tagResult.value : [];
          embedding = embResult.status === "fulfilled" ? embResult.value : [];

          if (tagResult.status === "rejected") {
            console.warn("[InsightVault] Tag generation failed:", tagResult.reason);
          }
          if (embResult.status === "rejected") {
            console.warn("[InsightVault] Embedding generation failed:", embResult.reason);
          }

          // Smart merge: embedding pre-filter → LLM verification
          if (embedding.length > 0) {
            try {
              const existing = await getAllInsightsWithEmbeddings();
              // Lower threshold to catch more candidates; LLM will verify
              const candidates = topKSearch(embedding, existing, 5, 0.55);

              if (candidates.length > 0) {
                const similarity = await checkSimilarity(
                  content,
                  candidates.map((c) => ({
                    id: c.id,
                    content: c.content,
                    tags: c.tags,
                  }))
                );

                if (similarity.matchId) {
                  const merged = await mergeInsight(
                    similarity.matchId,
                    content,
                    aiTags
                  );
                  return {
                    insight: merged,
                    wasThreaded: true,
                    mergeReason: similarity.reason,
                  };
                }
              }
            } catch (err) {
              console.warn("[InsightVault] Smart merge check failed:", err);
            }
          }
        }

        const insight = await addInsight(content, type, aiTags, embedding, source);
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

  const edit = useCallback(
    async (
      id: string,
      updates: { content: string; type: InsightType; source?: string }
    ) => {
      await updateInsight(id, updates);
    },
    []
  );

  const remove = useCallback(async (id: string) => {
    await deleteInsight(id);
  }, []);

  const toggleFav = useCallback(async (id: string) => {
    await toggleFavorite(id);
  }, []);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) return insights;
    return searchInsightsByText(q);
  }, [insights]);

  return { insights, tags, saving, error, addNew, edit, remove, toggleFav, search };
}
