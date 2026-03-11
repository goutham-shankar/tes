"use client";
import { useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Brain,
  MessageSquare,
  Tags,
  GitBranch,
  Flame,
  Star,
  BookOpen,
  Lightbulb,
  Quote,
  Eye,
  BookMarked,
  StickyNote,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { type DashboardStats } from "@/hooks/useDashboard";
import { INSIGHT_TYPE_COLORS, INSIGHT_TYPE_LABELS, formatDate } from "@/lib/utils";
import { type InsightType } from "@/db/schema";

// ── Stat Card ──────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendLabel,
  className,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  trend?: number;
  trendLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5 space-y-3", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold tracking-tight">{value}</span>
        {trend !== undefined && (
          <span
            className={cn(
              "flex items-center gap-0.5 text-xs font-medium pb-1",
              trend > 0
                ? "text-emerald-400"
                : trend < 0
                ? "text-red-400"
                : "text-muted-foreground"
            )}
          >
            {trend > 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : trend < 0 ? (
              <TrendingDown className="w-3 h-3" />
            ) : (
              <Minus className="w-3 h-3" />
            )}
            {trend > 0 ? "+" : ""}
            {trend}%
          </span>
        )}
      </div>
      {trendLabel && (
        <p className="text-xs text-muted-foreground">{trendLabel}</p>
      )}
    </div>
  );
}

// ── Activity Chart (CSS-only bar chart) ────────────────────────────────────────

function ActivityChart({
  data,
}: {
  data: { date: string; count: number }[];
}) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Activity (30 days)</h3>
        <BarChart3 className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex items-end gap-[3px] h-28" aria-label="Activity chart showing insights per day">
        {data.map((d) => {
          const height = d.count > 0 ? Math.max((d.count / max) * 100, 8) : 4;
          const dayOfWeek = new Date(d.date).getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          return (
            <div
              key={d.date}
              className="group relative flex-1 flex flex-col justify-end"
            >
              <div
                className={cn(
                  "rounded-t-sm transition-all cursor-default",
                  d.count > 0
                    ? "bg-primary/60 hover:bg-primary"
                    : isWeekend
                    ? "bg-muted/30"
                    : "bg-muted/50"
                )}
                style={{ height: `${height}%` }}
              />
              {/* Tooltip */}
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                <div className="bg-popover border border-border rounded-md px-2 py-1 text-xs whitespace-nowrap shadow-lg">
                  {d.count} insight{d.count !== 1 ? "s" : ""} · {new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{new Date(data[0]?.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
        <span>Today</span>
      </div>
    </div>
  );
}

// ── Type Breakdown ─────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, React.ElementType> = {
  quote: Quote,
  idea: Lightbulb,
  observation: Eye,
  book_highlight: BookMarked,
  note: StickyNote,
};

function TypeBreakdown({
  data,
}: {
  data: { type: InsightType; label: string; count: number; pct: number }[];
}) {
  const sorted = useMemo(() => [...data].sort((a, b) => b.count - a.count), [data]);

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h3 className="text-sm font-semibold">Insight Types</h3>
      <div className="space-y-3">
        {sorted.map((item) => {
          const Icon = TYPE_ICONS[item.type] ?? StickyNote;
          return (
            <div key={item.type} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className={cn("w-5 h-5 rounded flex items-center justify-center", INSIGHT_TYPE_COLORS[item.type])}>
                    <Icon className="w-3 h-3" />
                  </div>
                  <span className="text-muted-foreground">{item.label}</span>
                </div>
                <span className="font-medium tabular-nums">{item.count}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary/60 transition-all duration-500"
                  style={{ width: `${item.pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Top Tags ───────────────────────────────────────────────────────────────────

function TopTagsCard({ tags }: { tags: { tag: string; count: number }[] }) {
  const max = Math.max(...tags.map((t) => t.count), 1);

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Top Tags</h3>
        <Link
          href="/tags"
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      {tags.length === 0 ? (
        <p className="text-xs text-muted-foreground">No tags yet. Add insights with AI enabled.</p>
      ) : (
        <div className="space-y-2.5">
          {tags.map((t) => (
            <div key={t.tag} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-20 truncate">#{t.tag}</span>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary/40"
                  style={{ width: `${(t.count / max) * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium tabular-nums w-6 text-right">{t.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Recent Insights ────────────────────────────────────────────────────────────

function RecentInsightsCard({
  insights,
}: {
  insights: { id: string; content: string; type: InsightType; createdAt: Date }[];
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Recent Insights</h3>
        <Link
          href="/"
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      {insights.length === 0 ? (
        <p className="text-xs text-muted-foreground">No insights yet. Add your first one!</p>
      ) : (
        <div className="space-y-3">
          {insights.map((ins) => {
            const Icon = TYPE_ICONS[ins.type] ?? StickyNote;
            return (
              <div
                key={ins.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className={cn("w-6 h-6 rounded flex items-center justify-center shrink-0 mt-0.5", INSIGHT_TYPE_COLORS[ins.type])}>
                  <Icon className="w-3 h-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground line-clamp-2 leading-relaxed">
                    {ins.content}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatDate(ins.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────

export function DashboardView({ stats }: { stats: DashboardStats }) {
  return (
    <div className="space-y-6">
      {/* Stat cards row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Insights"
          value={stats.totalInsights}
          icon={Brain}
          trend={stats.weeklyGrowth}
          trendLabel={`${stats.insightsThisWeek} this week`}
        />
        <StatCard
          label="Conversations"
          value={stats.totalConversations}
          icon={MessageSquare}
        />
        <StatCard
          label="Unique Tags"
          value={stats.totalTags}
          icon={Tags}
        />
        <StatCard
          label="Streak"
          value={`${stats.streakDays}d`}
          icon={Flame}
          trendLabel={stats.streakDays > 0 ? "Keep it going!" : "Start today!"}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ActivityChart data={stats.activityByDay} />
        </div>
        <TypeBreakdown data={stats.typeBreakdown} />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopTagsCard tags={stats.topTags} />
        <RecentInsightsCard insights={stats.recentInsights} />
      </div>

      {/* Extra stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="This Month"
          value={stats.insightsThisMonth}
          icon={BookOpen}
          trendLabel="Insights added"
        />
        <StatCard
          label="Threads"
          value={stats.totalThreads}
          icon={GitBranch}
          trendLabel="Follow-up notes"
        />
        <StatCard
          label="Favorites"
          value={stats.favoriteCount}
          icon={Star}
          trendLabel="Bookmarked insights"
        />
        <StatCard
          label="This Week"
          value={stats.insightsThisWeek}
          icon={TrendingUp}
          trendLabel="New insights"
        />
      </div>
    </div>
  );
}
