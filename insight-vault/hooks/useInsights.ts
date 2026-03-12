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
  assignTopic,
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
import { extractMemories } from "@/services/ai/memory";
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
    ): Promise<{
      insight: unknown;
      wasThreaded: boolean;
      wasGrouped: boolean;
      mergeReason?: string;
      topicLabel?: string;
    }> => {
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

          // Smart organization: embedding pre-filter → LLM 3-way decision
          if (embedding.length > 0) {
            try {
              const existing = await getAllInsightsWithEmbeddings();
              const candidates = topKSearch(embedding, existing, 5, 0.55);

              if (candidates.length > 0) {
                const result = await checkSimilarity(
                  content,
                  candidates.map((c) => ({
                    id: c.id,
                    content: c.content,
                    tags: c.tags,
                    topicId: c.topicId,
                    topicLabel: c.topicLabel,
                  }))
                );

                if (result.action === "merge" && result.matchId) {
                  // Same idea → thread into existing insight
                  const merged = await mergeInsight(result.matchId, content, aiTags);
                  extractMemories(content, result.matchId, candidates.find((c) => c.id === result.matchId)?.content, result.matchId).catch(() => {});
                  return {
                    insight: merged,
                    wasThreaded: true,
                    wasGrouped: false,
                    mergeReason: result.reason,
                  };
                }

                if (result.action === "group" && result.matchId) {
                  // Same topic → save as separate insight with shared topicId
                  const topicId = result.topicId || crypto.randomUUID();
                  const topicLabel = result.topicLabel;

                  const insight = await addInsight(
                    content, type, aiTags, embedding, source, topicId, topicLabel
                  );

                  // If the matched insight doesn't have a topicId yet, assign it
                  if (!result.topicId) {
                    assignTopic(result.matchId, topicId, topicLabel).catch(() => {});
                  }

                  extractMemories(content, insight.id).catch(() => {});
                  return {
                    insight,
                    wasThreaded: false,
                    wasGrouped: true,
                    topicLabel,
                    mergeReason: result.reason,
                  };
                }
              }
            } catch (err) {
              console.warn("[InsightVault] Smart organization failed:", err);
            }
          }
        }

        const insight = await addInsight(content, type, aiTags, embedding, source);
        if (isGeminiReady()) {
          extractMemories(content, insight.id).catch(() => {});
        }
        return { insight, wasThreaded: false, wasGrouped: false };
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
