"use client";
import { AppShell } from "@/components/layout/AppShell";
import { InsightFeed } from "@/components/insights/InsightFeed";
import { AddInsightModal } from "@/components/insights/AddInsightModal";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { useInsights } from "@/hooks/useInsights";
import { useApiKey } from "@/hooks/useApiKey";
import { useConversation } from "@/hooks/useConversation";
import { Layers } from "lucide-react";

export default function HomePage() {
  const { insights, saving, addNew, remove } = useInsights();
  const { ready } = useApiKey();
  const {
    messages,
    streaming,
    streamBuffer,
    error,
    send,
    newConversation,
    activeConvId,
  } = useConversation();

  // Ensure there's always an active conversation for the sidebar panel
  async function handleAsk(question: string) {
    if (!activeConvId) await newConversation();
    await send(question);
  }

  // Pass messages directly — ChatPanel only uses role/id/content
  const flatMessages = messages;

  return (
    <AppShell>
      <div className="flex h-full">
        {/* Main panel */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <header className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-muted-foreground" />
              <h1 className="font-semibold text-sm text-muted-foreground">
                Insights
              </h1>
              <span className="text-xs bg-muted rounded-full px-2 py-0.5 text-muted-foreground">
                {insights.length}
              </span>
            </div>
            <AddInsightModal onAdd={addNew} saving={saving} aiReady={ready} />
          </header>

          {/* Feed */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <InsightFeed insights={insights} onDelete={remove} />
          </div>
        </div>

        {/* Right panel — AI chat */}
        <aside className="hidden lg:flex flex-col w-80 xl:w-96 shrink-0 border-l border-border">
          <ChatPanel
            messages={flatMessages}
            streaming={streaming}
            streamBuffer={streamBuffer}
            error={error}
            onAsk={handleAsk}
            onClear={async () => {}}
            aiReady={ready}
          />
        </aside>
      </div>
    </AppShell>
  );
}
