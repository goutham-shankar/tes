/**
 * services/ai/similarity.ts
 * Uses Gemini LLM to determine whether a new insight should be:
 *   1. MERGED into an existing insight (same idea, thread it)
 *   2. GROUPED with an existing insight (same topic, keep separate but show together)
 *   3. Standalone (new topic entirely)
 */
import { getGeminiClient, GEMINI_TEXT_MODEL } from "./gemini";
import { buildMemoryContext } from "./memory";

export interface SimilarityCandidate {
  id: string;
  content: string;
  tags: string[];
  topicId?: string;
  topicLabel?: string;
}

export interface SimilarityResult {
  /** "merge" = same idea, thread it; "group" = same topic, keep separate; "new" = unrelated */
  action: "merge" | "group" | "new";
  /** The ID of the matched existing insight (null if "new") */
  matchId: string | null;
  /** Short reason explaining the decision */
  reason: string;
  /** Topic ID to assign (existing topicId from match, or null for new topic) */
  topicId: string | null;
  /** Topic label (existing or LLM-generated) */
  topicLabel: string;
}

/**
 * Ask the LLM whether a new insight should be merged, grouped, or standalone.
 */
export async function checkSimilarity(
  newContent: string,
  candidates: SimilarityCandidate[]
): Promise<SimilarityResult> {
  if (candidates.length === 0) {
    return { action: "new", matchId: null, reason: "", topicId: null, topicLabel: "" };
  }

  const client = getGeminiClient();
  const model = client.getGenerativeModel({ model: GEMINI_TEXT_MODEL });

  const candidateList = candidates
    .map(
      (c, i) =>
        `[${i + 1}] (id: ${c.id})${c.topicLabel ? ` [Topic: ${c.topicLabel}]` : ""}
${c.content}
Tags: ${c.tags.join(", ") || "none"}`
    )
    .join("\n\n");

  let memorySection = "";
  try {
    const memCtx = await buildMemoryContext(newContent);
    if (memCtx) {
      memorySection = `\nUSER'S KNOWLEDGE PATTERNS:\n${memCtx}\n`;
    }
  } catch {
    // Non-critical
  }

  const prompt = `You are an insight organization assistant.

A user is adding a NEW insight. Below are existing insights that may be related.
${memorySection}
NEW INSIGHT:
${newContent}

EXISTING CANDIDATES:
${candidateList}

Decide what to do with the new insight:

1. **MERGE** — The new insight says essentially the SAME thing as an existing one (duplicate or direct follow-up). The new content will be appended to the existing insight.
2. **GROUP** — The new insight is about the SAME TOPIC as an existing one but adds a DIFFERENT perspective, angle, or piece of information. They should be grouped together for easy tracking.
3. **NEW** — The new insight is about a different topic entirely.

Guidelines:
- "Same topic" means they discuss the same subject area or theme (e.g., two thoughts about morning routines, two observations about team communication)
- Broad categories like "productivity" or "life" do NOT count — topics should be specific
- When in doubt between MERGE and GROUP, prefer GROUP (keep both visible)
- If grouping, generate a short topic label (2-4 words) that describes the shared topic

Respond with ONLY valid JSON (no markdown fences):
{
  "action": "merge" | "group" | "new",
  "matchIndex": <1-based index of best match, or null if "new">,
  "reason": "<one sentence explanation>",
  "topicLabel": "<short 2-4 word topic label>"
}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const cleaned = text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(cleaned);

    const action = parsed.action as "merge" | "group" | "new";
    const idx = parsed.matchIndex;
    const topicLabel = parsed.topicLabel || "";

    if (action === "new" || idx == null || idx < 1 || idx > candidates.length) {
      return {
        action: "new",
        matchId: null,
        reason: parsed.reason ?? "",
        topicId: null,
        topicLabel,
      };
    }

    const matched = candidates[idx - 1];

    return {
      action,
      matchId: matched.id,
      reason: parsed.reason ?? "Related ideas detected",
      topicId: matched.topicId ?? null,
      topicLabel: matched.topicLabel || topicLabel,
    };
  } catch (err) {
    console.warn("[InsightVault] LLM similarity check failed:", err);
    return { action: "new", matchId: null, reason: "", topicId: null, topicLabel: "" };
  }
}
