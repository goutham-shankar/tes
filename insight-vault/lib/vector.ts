/**
 * lib/vector.ts
 * Lightweight cosine-similarity vector search — no external dependencies.
 */

// ─── Cosine Similarity ────────────────────────────────────────────────────────

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ─── Top-K Search ─────────────────────────────────────────────────────────────

export interface VectorDocument {
  id: string;
  content: string;
  tags: string[];
  embedding: number[];
}

export interface SearchResult {
  id: string;
  content: string;
  tags: string[];
  score: number;
}

/**
 * Find the top-k most similar documents to a query embedding.
 * @param queryEmbedding  Embedding vector for the user's question.
 * @param documents       All stored documents with embeddings.
 * @param k               Number of results to return (default 5).
 * @param threshold       Minimum cosine similarity to include (default 0.3).
 */
export function topKSearch(
  queryEmbedding: number[],
  documents: VectorDocument[],
  k = 5,
  threshold = 0.3
): SearchResult[] {
  const scored = documents
    .filter((d) => d.embedding && d.embedding.length > 0)
    .map((d) => ({
      id: d.id,
      content: d.content,
      tags: d.tags,
      score: cosineSimilarity(queryEmbedding, d.embedding),
    }))
    .filter((r) => r.score >= threshold)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, k);
}
// ─── Greedy Clustering ────────────────────────────────────────────────────

export type Cluster<T extends { embedding: number[] }> = T[];

/**
 * Group items into clusters where every item is >= threshold similar
 * to the first item of its cluster (greedy single-linkage).
 * Items with no embedding are each placed in their own cluster.
 */
export function clusterInsights<T extends { id: string; embedding: number[] }>(
  items: T[],
  threshold = 0.72
): Cluster<T>[] {
  const clusters: Cluster<T>[] = [];

  for (const item of items) {
    if (!item.embedding || item.embedding.length === 0) {
      clusters.push([item]);
      continue;
    }

    let placed = false;
    for (const cluster of clusters) {
      const rep = cluster[0];
      if (!rep.embedding || rep.embedding.length === 0) continue;
      const sim = cosineSimilarity(item.embedding, rep.embedding);
      if (sim >= threshold) {
        cluster.push(item);
        placed = true;
        break;
      }
    }
    if (!placed) clusters.push([item]);
  }

  return clusters;
}

/**
 * Tag-based clustering fallback when embeddings are unavailable.
 * Two items join the same cluster if they share at least `minShared` tags.
 */
export function clusterByTags<T extends { id: string; tags: string[] }>(
  items: T[],
  minShared = 1
): T[][] {
  const clusters: T[][] = [];

  for (const item of items) {
    if (!item.tags || item.tags.length === 0) {
      clusters.push([item]);
      continue;
    }
    let placed = false;
    for (const cluster of clusters) {
      const rep = cluster[0];
      const shared = item.tags.filter((t) => rep.tags.includes(t)).length;
      if (shared >= minShared) {
        cluster.push(item);
        placed = true;
        break;
      }
    }
    if (!placed) clusters.push([item]);
  }

  return clusters;
}
