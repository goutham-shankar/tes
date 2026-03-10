/**
 * hooks/useChat.ts
 * @deprecated Use useConversation instead for full GPT-style chat.
 * This thin wrapper remains for the sidebar quick-chat panel on the home page.
 */
"use client";
export { useConversation as useChat } from "./useConversation";
