"use client";
import { AppShell } from "@/components/layout/AppShell";
import { GptChat } from "@/components/chat/GptChat";
import { useConversation } from "@/hooks/useConversation";
import { useApiKey } from "@/hooks/useApiKey";

export default function AskPage() {
  const { ready } = useApiKey();
  const {
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
  } = useConversation();

  return (
    <AppShell>
      <div className="h-full flex flex-col overflow-hidden">
        <GptChat
          conversations={conversations}
          activeConvId={activeConvId}
          messages={messages}
          streaming={streaming}
          streamBuffer={streamBuffer}
          error={error}
          aiReady={ready}
          onNew={newConversation}
          onSelect={selectConversation}
          onSend={send}
          onDelete={removeConversation}
          onSaveSuggestion={saveSuggestion}
        />
      </div>
    </AppShell>
  );
}
