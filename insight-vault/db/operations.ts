/**
 * db/operations.ts
 * CRUD helpers for InsightVault DB
 */
import { db, type Insight, type InsightType, type ChatMessage, type Conversation } from "./schema";

// ─── Insights ─────────────────────────────────────────────────────────────────

export async function addInsight(
  content: string,
  type: InsightType,
  tags: string[],
  embedding: number[],
  source?: string
): Promise<Insight> {
  const now = new Date();
  const insight: Insight = {
    id: crypto.randomUUID(),
    content,
    type,
    tags,
    embedding,
    source,
    createdAt: now,
    updatedAt: now,
  };
  await db.insights.add(insight);
  return insight;
}

export async function getAllInsights(): Promise<Insight[]> {
  return db.insights.orderBy("createdAt").reverse().toArray();
}

export async function getInsightsByTag(tag: string): Promise<Insight[]> {
  return db.insights.where("tags").equals(tag).toArray();
}

export async function getInsightById(id: string): Promise<Insight | undefined> {
  return db.insights.get(id);
}

export async function updateInsight(
  id: string,
  updates: Partial<Pick<Insight, "content" | "type" | "tags" | "source">>
): Promise<void> {
  await db.insights.update(id, { ...updates, updatedAt: new Date() });
}

export async function updateInsightTags(
  id: string,
  tags: string[]
): Promise<void> {
  await db.insights.update(id, { tags, updatedAt: new Date() });
}

export async function toggleFavorite(id: string): Promise<boolean> {
  const insight = await db.insights.get(id);
  if (!insight) throw new Error("Insight not found");
  const newVal = !insight.favorite;
  await db.insights.update(id, { favorite: newVal, updatedAt: new Date() });
  return newVal;
}

export async function deleteInsight(id: string): Promise<void> {
  await db.insights.delete(id);
}

export async function searchInsightsByText(query: string): Promise<Insight[]> {
  const lower = query.toLowerCase();
  return db.insights
    .filter(
      (i) =>
        i.content.toLowerCase().includes(lower) ||
        i.tags.some((t) => t.toLowerCase().includes(lower))
    )
    .toArray();
}

export async function getAllInsightsWithEmbeddings(): Promise<
  Pick<Insight, "id" | "content" | "tags" | "embedding">[]
> {
  return db.insights
    .filter((i) => i.embedding && i.embedding.length > 0)
    .toArray()
    .then((rows) =>
      rows.map(({ id, content, tags, embedding }) => ({
        id,
        content,
        tags,
        embedding,
      }))
    );
}

/** Append a follow-up note to an existing insight's thread list */
export async function appendThread(
  insightId: string,
  content: string
): Promise<Insight> {
  const insight = await db.insights.get(insightId);
  if (!insight) throw new Error("Insight not found");
  const threads = [...(insight.threads ?? []), { content, addedAt: new Date() }];
  await db.insights.update(insightId, { threads, updatedAt: new Date() });
  return { ...insight, threads };
}

/**
 * Merge a new insight into an existing one: appends as a thread AND
 * combines tags (deduplicated).
 */
export async function mergeInsight(
  insightId: string,
  content: string,
  newTags: string[]
): Promise<Insight> {
  const insight = await db.insights.get(insightId);
  if (!insight) throw new Error("Insight not found");

  const threads = [...(insight.threads ?? []), { content, addedAt: new Date() }];
  const mergedTags = [...new Set([...insight.tags, ...newTags])];
  const now = new Date();

  await db.insights.update(insightId, {
    threads,
    tags: mergedTags,
    updatedAt: now,
  });

  return { ...insight, threads, tags: mergedTags, updatedAt: now };
}

export async function getAllTags(): Promise<string[]> {
  const insights = await db.insights.toArray();
  const tagSet = new Set<string>();
  for (const insight of insights) {
    for (const tag of insight.tags) {
      tagSet.add(tag);
    }
  }
  return Array.from(tagSet).sort();
}

/** Import insights from a JSON export */
export async function importInsights(
  data: Partial<Insight>[]
): Promise<number> {
  let imported = 0;
  for (const item of data) {
    if (!item.content || !item.type) continue;
    const now = new Date();
    const insight: Insight = {
      id: item.id || crypto.randomUUID(),
      content: item.content,
      type: item.type,
      tags: item.tags || [],
      embedding: item.embedding || [],
      source: item.source,
      threads: item.threads,
      favorite: item.favorite,
      createdAt: item.createdAt ? new Date(item.createdAt) : now,
      updatedAt: now,
    };
    try {
      await db.insights.add(insight);
      imported++;
    } catch {
      // Duplicate ID — skip
      try {
        insight.id = crypto.randomUUID();
        await db.insights.add(insight);
        imported++;
      } catch {
        // skip entirely
      }
    }
  }
  return imported;
}

// ─── Theme ──────────────────────────────────────────────────────────────────

export async function getTheme(): Promise<"dark" | "light"> {
  const settings = await db.appSettings.get(1);
  return settings?.theme || "dark";
}

export async function setTheme(theme: "dark" | "light"): Promise<void> {
  const existing = await db.appSettings.get(1);
  if (existing) {
    await db.appSettings.update(1, { theme, updatedAt: new Date() });
  } else {
    await db.appSettings.add({
      id: 1,
      geminiKeyHash: null,
      geminiKeyIv: null,
      theme,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

// ─── Conversations ─────────────────────────────────────────────────────────────

export async function createConversation(title = "New conversation"): Promise<Conversation> {
  const now = new Date();
  const conv: Conversation = { id: crypto.randomUUID(), title, createdAt: now, updatedAt: now };
  await db.conversations.add(conv);
  return conv;
}

export async function getAllConversations(): Promise<Conversation[]> {
  return db.conversations.orderBy("updatedAt").reverse().toArray();
}

export async function updateConversationTitle(id: string, title: string): Promise<void> {
  await db.conversations.update(id, { title, updatedAt: new Date() });
}

export async function touchConversation(id: string): Promise<void> {
  await db.conversations.update(id, { updatedAt: new Date() });
}

export async function deleteConversation(id: string): Promise<void> {
  await db.chatMessages.where("conversationId").equals(id).delete();
  await db.conversations.delete(id);
}

// ─── Chat Messages ─────────────────────────────────────────────────────────────

export async function addChatMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  saveSuggestion?: ChatMessage["saveSuggestion"]
): Promise<ChatMessage> {
  const msg: ChatMessage = {
    id: crypto.randomUUID(),
    conversationId,
    role,
    content,
    saveSuggestion,
    createdAt: new Date(),
  };
  await db.chatMessages.add(msg);
  await touchConversation(conversationId);
  return msg;
}

export async function getMessagesForConversation(conversationId: string): Promise<ChatMessage[]> {
  return db.chatMessages
    .where("conversationId")
    .equals(conversationId)
    .sortBy("createdAt");
}

export async function markSuggestionSaved(messageId: string): Promise<void> {
  const msg = await db.chatMessages.get(messageId);
  if (msg?.saveSuggestion) {
    await db.chatMessages.update(messageId, {
      saveSuggestion: { ...msg.saveSuggestion, saved: true },
    });
  }
}

export async function clearChatHistory(): Promise<void> {
  await db.chatMessages.clear();
  await db.conversations.clear();
}
