"use client";
import {
  useRef,
  useEffect,
  useState,
  type KeyboardEvent,
} from "react";
import {
  Plus,
  Send,
  Loader2,
  Bot,
  User,
  Trash2,
  MessageSquare,
  BookMarked,
  Check,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type ChatMessage } from "@/db/schema";
import { type Conversation } from "@/db/schema";

// ── Sub-components ─────────────────────────────────────────────────────────────

function ConversationItem({
  conv,
  active,
  onSelect,
  onDelete,
}: {
  conv: Conversation;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      aria-label={`Open conversation: ${conv.title}`}
      className={cn(
        "group w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm transition-colors",
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" aria-hidden="true" />
      <span className="flex-1 truncate min-w-0">{conv.title}</span>
      <button
        type="button"
        aria-label={`Delete conversation: ${conv.title}`}
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity p-0.5 rounded"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </button>
  );
}

function MessageBubble({
  msg,
  onSave,
}: {
  msg: ChatMessage;
  onSave?: (msgId: string, content: string, tags: string[]) => void;
}) {
  const isUser = msg.role === "user";
  const hasSuggestion = !!msg.saveSuggestion && !msg.saveSuggestion.saved;
  const alreadySaved = msg.saveSuggestion?.saved;

  return (
    <div className={cn("flex gap-3 w-full", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="flex-shrink-0 mt-0.5 w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center" aria-hidden="true">
          <Bot className="w-3.5 h-3.5" />
        </div>
      )}

      <div
        className={cn(
          "flex flex-col gap-2 max-w-[80%]",
          isUser && "items-end"
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-primary/20 text-foreground rounded-tr-sm"
              : "bg-card border border-border text-foreground rounded-tl-sm"
          )}
        >
          <p className="whitespace-pre-wrap">{msg.content}</p>
        </div>

        {/* Save suggestion card */}
        {(hasSuggestion || alreadySaved) && msg.saveSuggestion && (
          <div
            className={cn(
              "rounded-xl border px-4 py-3 text-xs w-full max-w-sm space-y-2",
              alreadySaved
                ? "border-emerald-500/20 bg-emerald-500/5"
                : "border-primary/20 bg-primary/5"
            )}
          >
            <div className="flex items-center gap-1.5 font-medium">
              {alreadySaved ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Saved to vault</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span className="text-primary">Worth saving?</span>
                </>
              )}
            </div>

            <p className="text-muted-foreground line-clamp-2">
              {msg.saveSuggestion.content}
            </p>

            {msg.saveSuggestion.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {msg.saveSuggestion.tags.map((t) => (
                  <span
                    key={t}
                    className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-full text-[10px]"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {!alreadySaved && onSave && (
              <button
                onClick={() =>
                  onSave(
                    msg.id,
                    msg.saveSuggestion!.content,
                    msg.saveSuggestion!.tags
                  )
                }
                aria-label="Save suggestion to vault"
                className="flex items-center gap-1.5 text-primary hover:underline font-medium"
              >
                <BookMarked className="w-3.5 h-3.5" />
                Save to Vault
              </button>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0 mt-0.5 w-7 h-7 rounded-full bg-accent text-muted-foreground flex items-center justify-center" aria-hidden="true">
          <User className="w-3.5 h-3.5" />
        </div>
      )}
    </div>
  );
}

function StreamingBubble({ text }: { text: string }) {
  return (
    <div className="flex gap-3 justify-start" role="status" aria-live="polite">
      <div className="flex-shrink-0 mt-0.5 w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center" aria-hidden="true">
        <Bot className="w-3.5 h-3.5" />
      </div>
      <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed max-w-[80%]">
        {text ? (
          <>
            <p className="whitespace-pre-wrap">{text}</p>
            <span className="inline-block w-1.5 h-4 bg-primary/60 rounded-sm animate-pulse ml-0.5 align-middle" aria-hidden="true" />
          </>
        ) : (
          <span className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Thinking…
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface GptChatProps {
  conversations: Conversation[];
  activeConvId: string | null;
  messages: ChatMessage[];
  streaming: boolean;
  streamBuffer: string;
  error: string | null;
  aiReady: boolean;
  onNew: () => void;
  onSelect: (id: string) => void;
  onSend: (msg: string) => Promise<void>;
  onDelete: (id: string) => void;
  onSaveSuggestion: (msgId: string, content: string, tags: string[]) => void;
}

const STARTER_PROMPTS = [
  "What patterns do you see in my saved notes?",
  "Help me brainstorm ideas related to my recent insights",
  "What topics have I been thinking about most?",
  "Give me a summary of everything I've saved",
];

export function GptChat({
  conversations,
  activeConvId,
  messages,
  streaming,
  streamBuffer,
  error,
  aiReady,
  onNew,
  onSelect,
  onSend,
  onDelete,
  onSaveSuggestion,
}: GptChatProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamBuffer]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  async function handleSend() {
    const q = input.trim();
    if (!q || streaming || !aiReady) return;
    setInput("");
    await onSend(q);
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const showWelcome = !activeConvId || messages.length === 0;

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-56 shrink-0 border-r border-border flex flex-col bg-card/50" aria-label="Conversations">
        <div className="p-3 border-b border-border">
          <button
            onClick={onNew}
            aria-label="Start new conversation"
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Plus className="w-4 h-4" />
            New conversation
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {conversations.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6 px-3">
              Your conversations will appear here
            </p>
          )}
          {conversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conv={conv}
              active={activeConvId === conv.id}
              onSelect={() => onSelect(conv.id)}
              onDelete={() => onDelete(conv.id)}
            />
          ))}
        </div>
      </aside>

      {/* ── Main chat area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {showWelcome ? (
            /* Welcome screen */
            <div className="flex flex-col items-center justify-center h-full gap-8 px-6 pb-10">
              <div className="text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto">
                  <Bot className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">
                  InsightVault AI
                </h2>
                <p className="text-muted-foreground text-sm max-w-sm">
                  Your personal AI that knows everything you&apos;ve saved.
                  Ask anything — get ideas, find patterns, or just think out loud.
                </p>
              </div>

              {/* Starter prompts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {STARTER_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setInput(p);
                      textareaRef.current?.focus();
                    }}
                    disabled={!aiReady}
                    className="flex items-center gap-2 text-left px-4 py-3 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-primary/5 transition-all text-sm text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed group"
                  >
                    <span className="flex-1 leading-snug">{p}</span>
                    <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" aria-hidden="true" />
                  </button>
                ))}
              </div>

              {!aiReady && (
                <p className="text-xs text-amber-400 text-center">
                  Add your Gemini API key in Settings to start chatting
                </p>
              )}
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  onSave={onSaveSuggestion}
                />
              ))}
              {streaming && <StreamingBubble text={streamBuffer} />}
              {error && (
                <p className="text-xs text-destructive text-center" role="alert">{error}</p>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="border-t border-border px-4 py-4 bg-background">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-3 bg-card border border-border rounded-2xl px-4 py-3 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
              <textarea
                ref={textareaRef}
                rows={1}
                placeholder={
                  aiReady
                    ? "Message InsightVault AI… (Shift+Enter for new line)"
                    : "Add your Gemini API key in Settings to chat"
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                disabled={!aiReady || streaming}
                aria-label="Chat message input"
                className="flex-1 bg-transparent resize-none outline-none text-sm placeholder:text-muted-foreground leading-relaxed disabled:opacity-40 min-h-[24px]"
              />
              <button
                onClick={handleSend}
                disabled={!aiReady || streaming || !input.trim()}
                aria-label="Send message"
                className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                {streaming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <p className="text-center text-[10px] text-muted-foreground mt-2">
              Grounded in your vault · Your data never leaves your device
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
