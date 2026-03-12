/**
 * db/schema.ts
 * Dexie (IndexedDB) schema for InsightVault
 */
import Dexie, { type EntityTable } from "dexie";

// ─── Types ────────────────────────────────────────────────────────────────────

export type InsightType =
  | "quote"
  | "idea"
  | "observation"
  | "book_highlight"
  | "note";

/** A follow-up note threaded onto an existing insight */
export interface InsightThread {
  content: string;
  addedAt: Date;
}

export interface Insight {
  id: string;            // crypto.randomUUID()
  content: string;
  type: InsightType;
  tags: string[];
  embedding: number[];   // Gemini text-embedding-004
  source?: string;       // optional book title / URL / person
  threads?: InsightThread[]; // follow-up notes on the same idea
  favorite?: boolean;    // bookmarked insight
  createdAt: Date;
  updatedAt: Date;
}

export interface Conversation {
  id: string;
  title: string;            // auto-generated or "New conversation"
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  conversationId: string;  // FK → Conversation.id
  role: "user" | "assistant";
  content: string;
  saveSuggestion?: {        // parsed 💾 SAVE block
    content: string;
    tags: string[];
    saved: boolean;
  };
  createdAt: Date;
}

/** Persistent memory entry for LLM context across sessions */
export interface Memory {
  id: string;
  /** The extracted pattern, theme, or summary */
  content: string;
  /** Which insight IDs contributed to this memory */
  sourceInsightIds: string[];
  /** Memory category: theme, pattern, summary, connection */
  category: "theme" | "pattern" | "summary" | "connection";
  /** Embedding for semantic retrieval */
  embedding: number[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AppSettings {
  id: 1;              // singleton row
  geminiKeyHash: string | null;  // AES-GCM encrypted key
  geminiKeyIv: string | null;
  theme: "dark" | "light";
  createdAt: Date;
  updatedAt: Date;
}

// ─── Database ─────────────────────────────────────────────────────────────────

class InsightVaultDB extends Dexie {
  insights!: EntityTable<Insight, "id">;
  memories!: EntityTable<Memory, "id">;
  conversations!: EntityTable<Conversation, "id">;
  chatMessages!: EntityTable<ChatMessage, "id">;
  appSettings!: EntityTable<AppSettings, "id">;

  constructor() {
    super("InsightVaultDB");

    this.version(1).stores({
      insights: "id, type, createdAt, *tags",
      chatMessages: "id, role, createdAt",
      appSettings: "id",
    });

    // v2: add conversations table + conversationId index on chatMessages
    this.version(2)
      .stores({
        insights: "id, type, createdAt, *tags",
        conversations: "id, createdAt, updatedAt",
        chatMessages: "id, conversationId, role, createdAt",
        appSettings: "id",
      })
      .upgrade(async (tx) => {
        // Migrate existing flat messages into a default conversation
        const existing = await tx.table("chatMessages").toArray();
        if (existing.length > 0) {
          const convId = crypto.randomUUID();
          await tx.table("conversations").add({
            id: convId,
            title: "Previous conversations",
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          for (const msg of existing) {
            await tx
              .table("chatMessages")
              .update(msg.id, { conversationId: convId });
          }
        }
      });

    // v3: add updatedAt index on conversations
    this.version(3).stores({
      insights: "id, type, createdAt, *tags",
      conversations: "id, createdAt, updatedAt",
      chatMessages: "id, conversationId, role, createdAt",
      appSettings: "id",
    });

    // v4: add favorite field support (no schema index change needed)
    this.version(4).stores({
      insights: "id, type, createdAt, *tags",
      conversations: "id, createdAt, updatedAt",
      chatMessages: "id, conversationId, role, createdAt",
      appSettings: "id",
    });

    // v5: add memories table for persistent LLM context
    this.version(5).stores({
      insights: "id, type, createdAt, *tags",
      memories: "id, category, createdAt, *sourceInsightIds",
      conversations: "id, createdAt, updatedAt",
      chatMessages: "id, conversationId, role, createdAt",
      appSettings: "id",
    });
  }
}

export const db = new InsightVaultDB();
