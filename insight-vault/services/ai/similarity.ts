/**
 * services/ai/similarity.ts
 * Uses Gemini LLM to semantically verify whether insights are about the same
 * idea and, if so, produces a merged summary.
 */
import { getGeminiClient, GEMINI_TEXT_MODEL } from "./gemini";
import { buildMemoryContext } from "./memory";

export interface SimilarityCandidate {
  id: string;
  content: string;
  tags: string[];
}

export interface SimilarityResult {
  /** The ID of the matched existing insight (null if no match) */
  matchId: string | null;
  /** Short reason explaining the merge decision */
  reason: string;
  /** Combined tags from both insights (deduplicated) */
  mergedTags: string[];
}

/**
 * Ask the LLM whether a new insight is semantically related to any of the
 * candidate insights.  Returns the best match (if any) along with merged tags.
 */
export async function checkSimilarity(
  newContent: string,
  candidates: SimilarityCandidate[]
): Promise<SimilarityResult> {
  if (candidates.length === 0) {
    return { matchId: null, reason: "", mergedTags: [] };
  }

  const client = getGeminiClient();
  const model = client.getGenerativeModel({ model: GEMINI_TEXT_MODEL });

  const candidateList = candidates
    .map(
      (c, i) =>
        `[${i + 1}] (id: ${c.id})\n${c.content}\nTags: ${c.tags.join(", ") || "none"}`
    )
    .join("\n\n");

  // Include memory context for better understanding of the user's knowledge patterns
  let memorySection = "";
  try {
    const memCtx = await buildMemoryContext(newContent);
    if (memCtx) {
      memorySection = `\nUSER'S KNOWLEDGE PATTERNS (memories from past insights):\n${memCtx}\n`;
    }
  } catch {
    // Non-critical, continue without memories
  }

  const prompt = `You are an insight deduplication assistant.

A user is adding a NEW insight to their vault. Below are existing insights that are potentially similar (found via embedding search).
${memorySection}
NEW INSIGHT:
${newContent}

EXISTING CANDIDATES:
${candidateList}

Your task:
1. Determine if the NEW insight is about the **same core idea** as any candidate.
   - "Same core idea" means they discuss the same concept, topic, or conclusion — not just share a keyword.
   - Complementary thoughts on the same topic COUNT as related.
   - Merely sharing a broad category (e.g. both about "productivity") does NOT count.
2. If a match exists, pick the BEST matching candidate.

Respond with ONLY valid JSON (no markdown fences):
{
  "matchIndex": <1-based index of best match, or null if none truly match>,
  "reason": "<one sentence explaining why they match or why none match>"
}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Strip potential markdown fences
    const cleaned = text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(cleaned);

    const idx = parsed.matchIndex;
    if (idx == null || idx < 1 || idx > candidates.length) {
      return { matchId: null, reason: parsed.reason ?? "", mergedTags: [] };
    }

    const matched = candidates[idx - 1];
    // Deduplicate tags from both the new insight's AI tags and the matched insight's tags
    // (new insight tags will be merged by the caller)
    return {
      matchId: matched.id,
      reason: parsed.reason ?? "Related ideas detected",
      mergedTags: [...new Set([...matched.tags])],
    };
  } catch (err) {
    console.warn("[InsightVault] LLM similarity check failed:", err);
    return { matchId: null, reason: "", mergedTags: [] };
  }
}
