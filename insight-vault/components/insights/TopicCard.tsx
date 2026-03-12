"use client";
import { useState } from "react";
import {
  Trash2,
  Quote,
  Lightbulb,
  Eye,
  BookMarked,
  StickyNote,
  FolderOpen,
  Star,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { type Insight, type InsightType } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditInsightModal } from "./EditInsightModal";
import { formatDate, INSIGHT_TYPE_LABELS, INSIGHT_TYPE_COLORS } from "@/lib/utils";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<string, React.ElementType> = {
  quote: Quote,
  idea: Lightbulb,
  observation: Eye,
  book_highlight: BookMarked,
  note: StickyNote,
};

interface TopicCardProps {
  topicLabel: string;
  insights: Insight[];
  onDelete?: (id: string) => void;
  onEdit?: (id: string, updates: { content: string; type: InsightType; source?: string }) => Promise<void>;
  onToggleFavorite?: (id: string) => void;
}

export function TopicCard({ topicLabel, insights, onDelete, onEdit, onToggleFavorite }: TopicCardProps) {
  const [expanded, setExpanded] = useState(true);

  // Collect all unique tags across insights in this topic
  const allTags = [...new Set(insights.flatMap((i) => i.tags))];
  const hasFavorite = insights.some((i) => i.favorite);

  return (
    <article className="card-glow group relative rounded-xl border border-primary/25 bg-card overflow-hidden transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 animate-fade-in">
      {/* Topic header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-primary/5 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <FolderOpen className="w-4.5 h-4.5 text-primary shrink-0" />
          <span className="text-sm font-semibold text-primary truncate">
            {topicLabel}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">
            {insights.length} insight{insights.length !== 1 ? "s" : ""}
          </span>
          {hasFavorite && (
            <Star className="w-3 h-3 text-amber-400 fill-current shrink-0" />
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {/* Collapsed preview */}
      {!expanded && (
        <div className="px-5 pb-4">
          <p className="text-xs text-muted-foreground line-clamp-2">
            {insights.map((i) => i.content.slice(0, 80)).join(" · ")}
          </p>
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {allTags.slice(0, 5).map((tag) => (
                <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                  #{tag}
                </Badge>
              ))}
              {allTags.length > 5 && (
                <span className="text-[10px] text-muted-foreground">+{allTags.length - 5}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Expanded: all insights stacked */}
      {expanded && (
        <div className="divide-y divide-border">
          {insights.map((insight, idx) => {
            const Icon = TYPE_ICONS[insight.type] ?? StickyNote;
            const typeColor = INSIGHT_TYPE_COLORS[insight.type] ?? INSIGHT_TYPE_COLORS.note;

            return (
              <div
                key={insight.id}
                className={cn(
                  "group/entry px-5 py-4 transition-colors hover:bg-muted/30",
                  idx === 0 && "border-t border-border"
                )}
              >
                {/* Entry header */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <div className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium", typeColor)}>
                      <Icon className="w-2.5 h-2.5" />
                      {INSIGHT_TYPE_LABELS[insight.type]}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDate(insight.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover/entry:opacity-100 transition-opacity">
                    {onToggleFavorite && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={insight.favorite ? "Remove from favorites" : "Add to favorites"}
                        className={cn(
                          "h-6 w-6",
                          insight.favorite
                            ? "text-amber-400 hover:text-amber-300"
                            : "text-muted-foreground hover:text-amber-400"
                        )}
                        onClick={() => onToggleFavorite(insight.id)}
                      >
                        <Star className={cn("w-3 h-3", insight.favorite && "fill-current")} />
                      </Button>
                    )}
                    {onEdit && (
                      <EditInsightModal insight={insight} onSave={onEdit} />
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete insight: ${insight.content.slice(0, 30)}`}
                        className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => onDelete(insight.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Content */}
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {insight.content}
                </p>

                {/* Source */}
                {insight.source && (
                  <p className="text-xs text-muted-foreground mt-1.5 italic">
                    — {insight.source}
                  </p>
                )}

                {/* Per-entry tags */}
                {insight.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {insight.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Merged threads within this insight */}
                {insight.threads && insight.threads.length > 0 && (
                  <div className="mt-3 border-l-2 border-primary/20 pl-3 space-y-2">
                    {insight.threads.map((thread, ti) => (
                      <div key={ti}>
                        <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">
                          {thread.content}
                        </p>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDate(thread.addedAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}
