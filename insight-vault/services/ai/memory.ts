/**
 * services/ai/memory.ts
 * Extracts and manages persistent LLM memories from insights.
 * Memories capture patterns, themes, and connections across the user's vault
 * so the LLM can "remember" context across sessions.
 */
import { getGeminiClient, GEMINI_TEXT_MODEL } from "./gemini";
import { generateEmbedding } from "./embedding";
import {
  addMemory,
  getAllMemories,
  getAllMemoriesWithEmbeddings,
} from "@/db/operations";
import { topKSearch } from "@/lib/vector";
import type { Memory } from "@/db/schema";

interface ExtractedMemory {
  content: string;
  category: Memory["category"];
}

/**
 * Use LLM to extract memorable patterns/themes from a new insight
 * (optionally considering the insight it was merged with).
 */
export async function extractMemories(
  newContent: string,
  insightId: string,
  mergedWithContent?: string,
  mergedWithId?: string
): Promise<void> {
  try {
    const client = getGeminiClient();
    const model = client.getGenerativeModel({ model: GEMINI_TEXT_MODEL });

    const existingMemories = await getAllMemories();
    const memoryContext =
      existingMemories.length > 0
        ? existingMemories
            .slice(0, 20)
            .map((m) => `- [${m.category}] ${m.content}`)
            .join("\n")
        : "No existing memories yet.";

    const mergedSection = mergedWithContent
      ? `\nMERGED WITH EXISTING INSIGHT:\n${mergedWithContent}`
      : "";

    const prompt = `You are a knowledge management assistant. A user just saved a new insight to their vault.

NEW INSIGHT:
${newContent}
${mergedSection}

EXISTING MEMORIES (patterns/themes already captured):
${memoryContext}

Your task: Extract 0-2 high-level memories worth remembering. Memories should capture:
- **theme**: A recurring topic or interest (e.g., "User is interested in stoic philosophy")
- **pattern**: A behavioral or thinking pattern (e.g., "User often connects productivity ideas to morning routines")
- **connection**: A link between different ideas (e.g., "User's reading on psychology connects to their management insights")
- **summary**: A synthesis of multiple related thoughts (e.g., "User has built a framework around mindful decision-making")

Rules:
- Do NOT create a memory if the insight is too generic or trivial
- Do NOT duplicate existing memories — if one already covers this, return empty
- Keep each memory concise (1 sentence)
- If this was a merge, focus on what the CONNECTION between the ideas reveals

Respond with ONLY valid JSON (no markdown fences):
{ "memories": [{ "content": "...", "category": "theme|pattern|connection|summary" }] }
Return { "memories": [] } if nothing worth remembering.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const cleaned = text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(cleaned) as { memories: ExtractedMemory[] };

    if (!parsed.memories || parsed.memories.length === 0) return;

    const sourceIds = mergedWithId
      ? [insightId, mergedWithId]
      : [insightId];

    for (const mem of parsed.memories.slice(0, 2)) {
      if (!mem.content || !mem.category) continue;

      // Check for duplicate via embedding similarity
      const embedding = await generateEmbedding(mem.content);
      if (embedding.length > 0) {
        const existingEmbedded = await getAllMemoriesWithEmbeddings();
        if (existingEmbedded.length > 0) {
          const dupes = topKSearch(embedding, existingEmbedded, 1, 0.85);
          if (dupes.length > 0) continue; // Skip near-duplicate memory
        }
      }

      await addMemory(mem.content, sourceIds, mem.category, embedding);
    }
  } catch (err) {
    console.warn("[InsightVault] Memory extraction failed:", err);
  }
}

/**
 * Build a compact memory context string for LLM prompts.
 * Optionally filtered by semantic relevance to a query.
 */
export async function buildMemoryContext(query?: string): Promise<string> {
  const memories = await getAllMemories();
  if (memories.length === 0) return "";

  // If we have a query, try semantic filtering
  if (query) {
    try {
      const queryEmb = await generateEmbedding(query, true);
      if (queryEmb.length > 0) {
        const allEmbedded = await getAllMemoriesWithEmbeddings();
        if (allEmbedded.length > 0) {
          const relevant = topKSearch(queryEmb, allEmbedded, 10, 0.3);
          if (relevant.length > 0) {
            return relevant
              .map((m) => `[${m.category}] ${m.content}`)
              .join("\n");
          }
        }
      }
    } catch {
      // Fall through to recency
    }
  }

  // Fallback: most recent memories
  return memories
    .slice(0, 15)
    .map((m) => `[${m.category}] ${m.content}`)
    .join("\n");
}
