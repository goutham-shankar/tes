"use client";
import { Trash2, Quote, Lightbulb, Eye, BookMarked, StickyNote, GitBranch, Star } from "lucide-react";
import { type Insight, type InsightType } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditInsightModal } from "./EditInsightModal";
import { formatDate, INSIGHT_TYPE_LABELS, INSIGHT_TYPE_COLORS } from "@/lib/utils";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<string, React.ElementType> = {
  quote:          Quote,
  idea:           Lightbulb,
  observation:    Eye,
  book_highlight: BookMarked,
  note:           StickyNote,
};

interface InsightCardProps {
  insight: Insight;
  onDelete?: (id: string) => void;
  onEdit?: (id: string, updates: { content: string; type: InsightType; source?: string }) => Promise<void>;
  onToggleFavorite?: (id: string) => void;
}

export function InsightCard({ insight, onDelete, onEdit, onToggleFavorite }: InsightCardProps) {
  const Icon = TYPE_ICONS[insight.type] ?? StickyNote;
  const typeColor = INSIGHT_TYPE_COLORS[insight.type] ?? INSIGHT_TYPE_COLORS.note;

  return (
    <article className="card-glow group relative rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", typeColor)}>
          <Icon className="w-3 h-3" />
          {INSIGHT_TYPE_LABELS[insight.type]}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-xs text-muted-foreground mr-1">
            {formatDate(insight.createdAt)}
          </span>
          {onToggleFavorite && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={insight.favorite ? "Remove from favorites" : "Add to favorites"}
              className={cn(
                "h-7 w-7",
                insight.favorite
                  ? "text-amber-400 hover:text-amber-300"
                  : "text-muted-foreground hover:text-amber-400"
              )}
              onClick={() => onToggleFavorite(insight.id)}
            >
              <Star className={cn("w-3.5 h-3.5", insight.favorite && "fill-current")} />
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
              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(insight.id)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Favorite indicator */}
      {insight.favorite && (
        <div className="absolute top-3 right-3 opacity-100 group-hover:opacity-0 transition-opacity">
          <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
        </div>
      )}

      {/* Content */}
      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap mb-4">
        {insight.content}
      </p>

      {/* Source */}
      {insight.source && (
        <p className="text-xs text-muted-foreground mb-3 italic">
          — {insight.source}
        </p>
      )}

      {/* Tags */}
      {insight.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {insight.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs px-2 py-0.5">
              #{tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Threads — follow-up notes */}
      {insight.threads && insight.threads.length > 0 && (
        <div className="mt-4 border-l-2 border-primary/20 pl-3 flex flex-col gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <GitBranch className="w-3 h-3" />
            {insight.threads.length} follow-up{insight.threads.length > 1 ? "s" : ""}
          </div>
          {insight.threads.map((thread, idx) => (
            <div key={idx} className="text-xs text-foreground/80 leading-relaxed">
              <span className="text-muted-foreground mr-2">
                {formatDate(thread.addedAt)}
              </span>
              {thread.content}
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
