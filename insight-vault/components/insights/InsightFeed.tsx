"use client";
import { useState, useMemo } from "react";
import {
  Search,
  Inbox,
  Layers,
  SlidersHorizontal,
  X,
  Star,
  Calendar,
  ArrowUpDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { InsightCard } from "./InsightCard";
import { type Insight, type InsightType } from "@/db/schema";
import { clusterInsights, clusterByTags } from "@/lib/vector";
import { cn } from "@/lib/utils";

type SortOption = "newest" | "oldest" | "favorites";

interface InsightFeedProps {
  insights: Insight[];
  onDelete: (id: string) => void;
  onEdit?: (id: string, updates: { content: string; type: InsightType; source?: string }) => Promise<void>;
  onToggleFavorite?: (id: string) => void;
  filterTag?: string;
}

export function InsightFeed({ insights, onDelete, onEdit, onToggleFavorite, filterTag }: InsightFeedProps) {
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState<InsightType | "all">("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const hasActiveFilters = typeFilter !== "all" || favoritesOnly || dateFrom || dateTo;

  const filtered = useMemo(() => {
    let result = insights.filter((i) => {
      // Tag filter
      if (filterTag && !i.tags.includes(filterTag)) return false;

      // Text search
      if (query) {
        const q = query.toLowerCase();
        const matchesContent = i.content.toLowerCase().includes(q);
        const matchesTags = i.tags.some((t) => t.toLowerCase().includes(q));
        const matchesSource = i.source?.toLowerCase().includes(q);
        if (!matchesContent && !matchesTags && !matchesSource) return false;
      }

      // Type filter
      if (typeFilter !== "all" && i.type !== typeFilter) return false;

      // Favorites only
      if (favoritesOnly && !i.favorite) return false;

      // Date range
      if (dateFrom) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        if (new Date(i.createdAt) < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(i.createdAt) > to) return false;
      }

      return true;
    });

    // Sort
    if (sortBy === "oldest") {
      result = [...result].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    } else if (sortBy === "favorites") {
      result = [...result].sort((a, b) => {
        if (a.favorite && !b.favorite) return -1;
        if (!a.favorite && b.favorite) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }
    // "newest" is default order from DB

    return result;
  }, [insights, query, filterTag, typeFilter, sortBy, favoritesOnly, dateFrom, dateTo]);

  // Group semantically related insights
  const clusters = useMemo(() => {
    const hasEmbeddings = filtered.some((i) => i.embedding && i.embedding.length > 0);
    return hasEmbeddings
      ? clusterInsights(filtered, 0.72)
      : clusterByTags(filtered, 1);
  }, [filtered]);

  function clearFilters() {
    setTypeFilter("all");
    setFavoritesOnly(false);
    setDateFrom("");
    setDateTo("");
  }

  return (
    <div className="space-y-4">
      {/* Search + Filter toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search insights, tags, or sources…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            aria-label="Search insights"
          />
        </div>
        <Button
          variant={showFilters || hasActiveFilters ? "default" : "outline"}
          size="icon"
          onClick={() => setShowFilters(!showFilters)}
          aria-label="Toggle filters"
          className="shrink-0"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </Button>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Filters</span>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Clear all
              </button>
            )}
          </div>

          {/* Type filter */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Type</label>
            <div className="flex flex-wrap gap-1.5">
              {(["all", "note", "quote", "idea", "observation", "book_highlight"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={cn(
                    "px-2.5 py-1 rounded-md border text-xs font-medium transition-colors",
                    typeFilter === t
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  )}
                >
                  {t === "all" ? "All" : t === "book_highlight" ? "Highlight" : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Date range */}
          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" /> From
              </label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" /> To
              </label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          {/* Sort + Favorites */}
          <div className="flex items-center gap-3">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3" /> Sort
              </label>
              <div className="flex gap-1.5">
                {(["newest", "oldest", "favorites"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSortBy(s)}
                    className={cn(
                      "px-2.5 py-1 rounded-md border text-xs font-medium transition-colors",
                      sortBy === s
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">&nbsp;</label>
              <Button
                variant={favoritesOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setFavoritesOnly(!favoritesOnly)}
                className="gap-1.5"
              >
                <Star className={cn("w-3.5 h-3.5", favoritesOnly && "fill-current")} />
                Favorites
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Results count */}
      {(query || hasActiveFilters) && (
        <p className="text-xs text-muted-foreground">
          {filtered.length} insight{filtered.length !== 1 ? "s" : ""} found
        </p>
      )}

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <Inbox className="w-10 h-10 opacity-30" />
          <p className="text-sm">
            {query || filterTag || hasActiveFilters
              ? "No insights match your search."
              : "No insights yet. Add your first one!"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {clusters.map((cluster, ci) =>
            cluster.length === 1 ? (
              <div key={cluster[0].id} className="grid gap-4 grid-cols-1 xl:grid-cols-2">
                <InsightCard
                  insight={cluster[0]}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onToggleFavorite={onToggleFavorite}
                />
              </div>
            ) : (
              <div key={ci} className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs text-primary font-medium">
                  <Layers className="w-3.5 h-3.5" />
                  {cluster.length} related insights
                </div>
                <div className="grid gap-3 grid-cols-1 xl:grid-cols-2">
                  {cluster.map((insight) => (
                    <InsightCard
                      key={insight.id}
                      insight={insight}
                      onDelete={onDelete}
                      onEdit={onEdit}
                      onToggleFavorite={onToggleFavorite}
                    />
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
