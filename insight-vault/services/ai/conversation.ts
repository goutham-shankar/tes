/**
 * services/ai/conversation.ts
 * Multi-turn, vault-aware conversational AI (GPT-style).
 *
 * The assistant:
 *   – Maintains full conversation history
 *   – Knows the user's entire vault via semantic RAG
 *   – Surfaces related notes, clusters ideas, finds patterns
 *   – Suggests saving anything worth keeping
 */
import { getGeminiClient, GEMINI_TEXT_MODEL } from "./gemini";
import { generateEmbedding } from "./embedding";
import { buildMemoryContext } from "./memory";
import { getAllInsightsWithEmbeddings, getAllInsights } from "@/db/operations";
import { topKSearch } from "@/lib/vector";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SaveSuggestion {
  content: string;
  tags: string[];
}

// ── System prompt builder ──────────────────────────────────────────────────────

function buildSystemPrompt(notesContext: string, memoriesContext: string): string {
  return `You are InsightVault AI — a brilliant, warm, conversational personal knowledge assistant, like a supercharged ChatGPT that has read every note the user has ever saved.

Your personality: curious, thoughtful, intellectually stimulating. You make the user feel like they're talking to the smartest friend they have.

Your capabilities:
- Answer ANY question conversationally, not just about their notes
- Reference the vault notes when relevant, quoting them as [Note: "..."]
- Cluster and connect ideas: "This reminds me of what you saved about X..."
- Surface patterns the user hasn't noticed
- Suggest new angles, related concepts, and actionable next steps
- When the user says something insightful, suggest saving it

USER'S KNOWLEDGE MEMORIES (patterns and themes you've observed):
────────────────────────────────────────────────────────
${memoriesContext || "No memories yet — the user is just getting started."}
────────────────────────────────────────────────────────

USER'S VAULT NOTES (use these as context when relevant):
────────────────────────────────────────────────────────
${notesContext || "The vault is empty. Encourage the user to start capturing ideas!"}
────────────────────────────────────────────────────────

IMPORTANT RULES:
1. Always be helpful — answer even if there are no relevant vault notes
2. Cite vault notes with: [Note: "exact quote here"]
3. Use bullet points, headers, and structure when it aids clarity
4. When you detect something worth saving, end your reply with exactly this format on a new line:
   💾 SAVE: <the insight text> | tags: tag1, tag2, tag3
5. If the user explicitly asks to save something, always output the 💾 SAVE: line`.trim();
}

// ── Build semantic notes context ───────────────────────────────────────────────

async function buildNotesContext(query: string): Promise<string> {
  try {
    const queryEmbedding = await generateEmbedding(query, true);
    if (queryEmbedding.length > 0) {
      const allDocs = await getAllInsightsWithEmbeddings();
      if (allDocs.length > 0) {
        const top = topKSearch(queryEmbedding, allDocs, 10, 0.2);
        if (top.length > 0) {
          return top
            .map(
              (r, i) =>
                `[${i + 1}] tags: ${r.tags.join(", ") || "untagged"}\n"${r.content}"`
            )
            .join("\n\n");
        }
      }
    }
  } catch (err) {
    console.warn("[InsightVault] Semantic context build failed, using recency fallback:", err);
  }

  // Fallback to recency-based load
  const all = await getAllInsights();
  return all
    .slice(0, 15)
    .map(
      (r, i) =>
        `[${i + 1}] tags: ${r.tags.join(", ") || "untagged"}\n"${r.content}"`
    )
    .join("\n\n");
}

// ── Parse / strip save suggestion ─────────────────────────────────────────────

export function parseSaveSuggestion(text: string): SaveSuggestion | null {
  const match = text.match(/💾 SAVE:\s*(.+?)\s*\|\s*tags:\s*(.+?)(\n|$)/i);
  if (!match) return null;
  return {
    content: match[1].trim(),
    tags: match[2]
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean),
  };
}

export function stripSaveLine(text: string): string {
  return text.replace(/💾 SAVE:.+?(\n|$)/gi, "").trim();
}

// ── Streaming multi-turn conversation ─────────────────────────────────────────

/**
 * Stream a response given full conversation history + new user message.
 * Yields text chunks as they arrive. Returns the full text when done.
 */
export async function* streamConversation(
  history: ConversationMessage[],
  userMessage: string
): AsyncGenerator<string, string, unknown> {
  const [notesContext, memoriesContext] = await Promise.all([
    buildNotesContext(userMessage),
    buildMemoryContext(userMessage).catch(() => ""),
  ]);
  const systemPrompt = buildSystemPrompt(notesContext, memoriesContext);

  // Flatten history into a readable transcript
  const transcript = history
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n\n");

  const fullPrompt = `${systemPrompt}

${transcript ? `CONVERSATION SO FAR:\n${transcript}\n\n` : ""}User: ${userMessage}
Assistant:`;

  const client = getGeminiClient();
  const model = client.getGenerativeModel({ model: GEMINI_TEXT_MODEL });

  let full = "";
  try {
    const stream = await model.generateContentStream(fullPrompt);
    for await (const chunk of stream.stream) {
      const text = chunk.text();
      if (text) {
        full += text;
        yield text;
      }
    }
  } catch (err) {
    console.error("[InsightVault] Stream error:", err);
    if (!full) {
      throw err;
    }
    // If we already have partial content, return what we got
  }

  return full;
}

// ── Auto-title a conversation from its first exchange ─────────────────────────

export async function generateConversationTitle(
  firstUserMessage: string,
  firstAssistantReply: string
): Promise<string> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({ model: GEMINI_TEXT_MODEL });

  const prompt = `Given this chat exchange, generate a short 3-6 word title for the conversation.
Return ONLY the title text, no quotes, no punctuation at the end.

User: ${firstUserMessage.slice(0, 200)}
Assistant: ${firstAssistantReply.slice(0, 200)}

Title:`;

  const result = await model.generateContent(prompt);
  const title = result.response.text().trim().slice(0, 60);
  // Sanitize: remove any non-printable characters or excessive whitespace
  return title.replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, "").trim();
}
