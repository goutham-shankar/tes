"use client";
import { useState, useMemo } from "react";
import { Search, Inbox, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { InsightCard } from "./InsightCard";
import { type Insight } from "@/db/schema";
import { clusterInsights, clusterByTags } from "@/lib/vector";
import { cn } from "@/lib/utils";

interface InsightFeedProps {
  insights: Insight[];
  onDelete: (id: string) => void;
  filterTag?: string;
}

export function InsightFeed({ insights, onDelete, filterTag }: InsightFeedProps) {
  const [query, setQuery] = useState("");

  const filtered = insights.filter((i) => {
    const matchesTag = filterTag ? i.tags.includes(filterTag) : true;
    const matchesQuery =
      !query ||
      i.content.toLowerCase().includes(query.toLowerCase()) ||
      i.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()));
    return matchesTag && matchesQuery;
  });

  // Group semantically related insights — use embedding clusters if available,
  // fall back to tag-based clustering when embeddings are empty
  const clusters = useMemo(() => {
    const hasEmbeddings = filtered.some((i) => i.embedding && i.embedding.length > 0);
    return hasEmbeddings
      ? clusterInsights(filtered, 0.72)
      : clusterByTags(filtered, 1);
  }, [filtered]);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search insights or tags…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <Inbox className="w-10 h-10 opacity-30" />
          <p className="text-sm">
            {query || filterTag
              ? "No insights match your search."
              : "No insights yet. Add your first one!"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {clusters.map((cluster, ci) =>
            cluster.length === 1 ? (
              // Single insight — normal card
              <div key={cluster[0].id} className="grid gap-4 grid-cols-1 xl:grid-cols-2">
                <InsightCard insight={cluster[0]} onDelete={onDelete} />
              </div>
            ) : (
              // Cluster — grouped under a header
              <div key={ci} className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs text-primary font-medium">
                  <Layers className="w-3.5 h-3.5" />
                  {cluster.length} related insights
                </div>
                <div className="grid gap-3 grid-cols-1 xl:grid-cols-2">
                  {cluster.map((insight) => (
                    <InsightCard key={insight.id} insight={insight} onDelete={onDelete} />
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
