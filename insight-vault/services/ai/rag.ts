/**
 * services/ai/rag.ts
 * Retrieval-Augmented Generation: answer user questions using stored insights.
 *
 * Pipeline:
 *  1. Embed the user question
 *  2. Retrieve top-K semantically similar insights from IndexedDB
 *  3. Build a grounded prompt with those insights as context
 *  4. Stream the Gemini response back via an AsyncGenerator
 */
import { getGeminiClient, GEMINI_TEXT_MODEL } from "./gemini";
import { generateEmbedding } from "./embedding";
import { getAllInsightsWithEmbeddings } from "@/db/operations";
import { topKSearch, type SearchResult } from "@/lib/vector";

const SYSTEM_PROMPT = `You are InsightVault's AI assistant. You answer questions 
using ONLY the user's personal knowledge notes provided below. 
If the notes do not contain enough information to answer, say so honestly — 
do NOT invent information. Be concise and reference specific notes when helpful.`;

function buildContextBlock(results: SearchResult[]): string {
  return results
    .map(
      (r, i) =>
        `[Note ${i + 1}] (tags: ${r.tags.join(", ")})\n${r.content}`
    )
    .join("\n\n---\n\n");
}

export interface RAGResult {
  answer: string;
  sourceIds: string[];
}

/** Non-streaming RAG answer (simpler for MVP). */
export async function askInsights(question: string): Promise<RAGResult> {
  // 1. Embed the question (use RETRIEVAL_QUERY task type)
  const queryEmbedding = await generateEmbedding(question, true);

  // 2. Retrieve similar notes
  const allDocs = await getAllInsightsWithEmbeddings();
  const topResults = topKSearch(queryEmbedding, allDocs, 5, 0.3);

  if (topResults.length === 0) {
    return {
      answer:
        "I couldn't find any relevant notes in your vault. Try adding some insights first!",
      sourceIds: [],
    };
  }

  // 3. Build prompt
  const contextBlock = buildContextBlock(topResults);
  const fullPrompt = `${SYSTEM_PROMPT}

--- USER'S NOTES ---
${contextBlock}
--- END OF NOTES ---

User question: ${question}`;

  // 4. Call Gemini
  const client = getGeminiClient();
  const model = client.getGenerativeModel({ model: GEMINI_TEXT_MODEL });
  const result = await model.generateContent(fullPrompt);

  return {
    answer: result.response.text(),
    sourceIds: topResults.map((r) => r.id),
  };
}

/** Streaming variant — yields text chunks as they arrive. */
export async function* askInsightsStream(
  question: string
): AsyncGenerator<string, { sourceIds: string[] }, unknown> {
  const queryEmbedding = await generateEmbedding(question, true);
  const allDocs = await getAllInsightsWithEmbeddings();
  const topResults = topKSearch(queryEmbedding, allDocs, 5, 0.3);

  if (topResults.length === 0) {
    yield "I couldn't find any relevant notes in your vault. Try adding some insights first!";
    return { sourceIds: [] };
  }

  const contextBlock = buildContextBlock(topResults);
  const fullPrompt = `${SYSTEM_PROMPT}

--- USER'S NOTES ---
${contextBlock}
--- END OF NOTES ---

User question: ${question}`;

  const client = getGeminiClient();
  const model = client.getGenerativeModel({ model: GEMINI_TEXT_MODEL });
  const stream = await model.generateContentStream(fullPrompt);

  for await (const chunk of stream.stream) {
    const text = chunk.text();
    if (text) yield text;
  }

  return { sourceIds: topResults.map((r) => r.id) };
}
