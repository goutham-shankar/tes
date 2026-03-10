/**
 * hooks/useConversation.ts
 * GPT-style multi-turn conversation manager.
 */
"use client";
import { useState, useCallback, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type ChatMessage } from "@/db/schema";
import {
  createConversation,
  addChatMessage,
  getMessagesForConversation,
  updateConversationTitle,
  deleteConversation,
  markSuggestionSaved,
} from "@/db/operations";
import {
  streamConversation,
  generateConversationTitle,
  parseSaveSuggestion,
  stripSaveLine,
  type ConversationMessage,
} from "@/services/ai/conversation";
import { isGeminiReady } from "@/services/ai/gemini";
import { useInsights } from "./useInsights";

export function useConversation() {
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const isFirstReply = useRef(false);
  const { addNew: addInsight } = useInsights();

  // Live conversations list (sidebar)
  const conversations = useLiveQuery(() =>
    db.conversations.orderBy("updatedAt").reverse().toArray()
  ) ?? [];

  // Live messages for the active conversation
  const messages = useLiveQuery<ChatMessage[]>(
    () =>
      activeConvId
        ? db.chatMessages
            .where("conversationId")
            .equals(activeConvId)
            .sortBy("createdAt")
        : Promise.resolve([] as ChatMessage[]),
    [activeConvId]
  ) ?? [];

  // ── Start a new conversation ───────────────────────────────────────────────

  const newConversation = useCallback(async () => {
    const conv = await createConversation("New conversation");
    setActiveConvId(conv.id);
    setError(null);
    isFirstReply.current = true;
    return conv.id;
  }, []);

  // ── Select existing conversation ───────────────────────────────────────────

  const selectConversation = useCallback((id: string) => {
    setActiveConvId(id);
    setError(null);
    isFirstReply.current = false;
  }, []);

  // ── Send a message ─────────────────────────────────────────────────────────

  const send = useCallback(
    async (userMessage: string) => {
      if (!isGeminiReady()) {
        setError("Add your Gemini API key in Settings to start chatting.");
        return;
      }
      setError(null);

      // Create a new conversation if none is active
      let convId = activeConvId;
      if (!convId) {
        const conv = await createConversation("New conversation");
        convId = conv.id;
        setActiveConvId(convId);
        isFirstReply.current = true;
      }

      // Persist user message
      await addChatMessage(convId, "user", userMessage);

      // Build history for the AI (exclude the message we just added — it's the new one)
      const history = (await getMessagesForConversation(convId))
        .slice(0, -1) // exclude the just-added user message
        .map((m): ConversationMessage => ({ role: m.role, content: m.content }));

      // Stream the reply
      setStreaming(true);
      setStreamBuffer("");
      let fullReply = "";

      try {
        const gen = streamConversation(history, userMessage);
        let result = await gen.next();

        while (!result.done) {
          const chunk = result.value as string;
          fullReply += chunk;
          setStreamBuffer(fullReply);
          result = await gen.next();
        }

        // final value from generator return
        if (!fullReply && typeof result.value === "string") {
          fullReply = result.value;
        }
      } catch (err) {
        fullReply = "Sorry, something went wrong. Please try again.";
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setStreaming(false);
        setStreamBuffer("");
      }

      // Parse optional save suggestion
      const suggestion = parseSaveSuggestion(fullReply);
      const displayText = stripSaveLine(fullReply);

      // Persist assistant reply
      await addChatMessage(
        convId,
        "assistant",
        displayText,
        suggestion
          ? { content: suggestion.content, tags: suggestion.tags, saved: false }
          : undefined
      );

      // Auto-title after first exchange
      if (isFirstReply.current) {
        isFirstReply.current = false;
        try {
          const title = await generateConversationTitle(
            userMessage,
            displayText
          );
          if (title) await updateConversationTitle(convId, title);
        } catch {
          // title generation is optional
        }
      }
    },
    [activeConvId]
  );

  // ── Save a suggestion to the vault ────────────────────────────────────────

  const saveSuggestion = useCallback(
    async (messageId: string, content: string, tags: string[]) => {
      await addInsight(content, "idea", undefined);
      await markSuggestionSaved(messageId);
    },
    [addInsight]
  );

  // ── Delete conversation ───────────────────────────────────────────────────

  const removeConversation = useCallback(
    async (id: string) => {
      await deleteConversation(id);
      if (activeConvId === id) setActiveConvId(null);
    },
    [activeConvId]
  );

  return {
    conversations,
    activeConvId,
    messages,
    streaming,
    streamBuffer,
    error,
    newConversation,
    selectConversation,
    send,
    saveSuggestion,
    removeConversation,
  };
}
