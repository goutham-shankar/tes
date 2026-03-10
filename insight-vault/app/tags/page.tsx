"use client";
import { useState } from "react";
import { Tag, X } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { InsightFeed } from "@/components/insights/InsightFeed";
import { Badge } from "@/components/ui/badge";
import { useInsights } from "@/hooks/useInsights";
import { cn } from "@/lib/utils";

export default function TagsPage() {
  const { insights, tags, remove } = useInsights();
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <AppShell>
      <div className="h-full overflow-y-auto px-6 py-5 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-muted-foreground" />
          <h1 className="font-semibold text-sm text-muted-foreground">Tags</h1>
        </div>

        {/* Tag Cloud */}
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => {
            const count = insights.filter((i) => i.tags.includes(tag)).length;
            return (
              <button
                key={tag}
                onClick={() => setSelected(selected === tag ? null : tag)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all",
                  selected === tag
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                #{tag}
                <span className="opacity-60">{count}</span>
                {selected === tag && (
                  <X className="w-3 h-3 opacity-60" />
                )}
              </button>
            );
          })}
          {tags.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No tags yet. Add some insights to see tags here.
            </p>
          )}
        </div>

        {/* Filtered Feed */}
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge>#{selected}</Badge>
              <span className="text-xs text-muted-foreground">
                {insights.filter((i) => i.tags.includes(selected)).length} insights
              </span>
            </div>
            <InsightFeed
              insights={insights}
              onDelete={remove}
              filterTag={selected}
            />
          </div>
        )}

        {!selected && tags.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Click a tag to filter insights.
          </p>
        )}
      </div>
    </AppShell>
  );
}
