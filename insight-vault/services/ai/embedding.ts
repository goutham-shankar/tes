/**
 * services/ai/embedding.ts
 * Generate Gemini text embeddings.
 * Returns [] silently if the model is unavailable — app still works without embeddings.
 */
import { getGeminiClient, GEMINI_EMBED_MODEL } from "./gemini";

export async function generateEmbedding(
  text: string,
  _isQuery = false
): Promise<number[]> {
  try {
    const client = getGeminiClient();
    // Try v1beta first, fall back gracefully on any 404
    const model = client.getGenerativeModel({ model: GEMINI_EMBED_MODEL });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (err) {
    // Embedding model unavailable (404, quota, etc.) — degrade gracefully
    console.warn("[InsightVault] Embedding unavailable, skipping:", err instanceof Error ? err.message : err);
    return [];
  }
}

export async function generateEmbeddingsBatch(
  texts: string[],
  delayMs = 200
): Promise<number[][]> {
  const embeddings: number[][] = [];
  for (const text of texts) {
    embeddings.push(await generateEmbedding(text));
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  }
  return embeddings;
}
