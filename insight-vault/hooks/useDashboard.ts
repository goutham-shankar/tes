/**
 * hooks/useDashboard.ts
 * Computes dashboard analytics from insights and conversations.
 */
"use client";
import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Insight, type InsightType } from "@/db/schema";

export interface DashboardStats {
  totalInsights: number;
  totalConversations: number;
  totalTags: number;
  totalThreads: number;
  insightsThisWeek: number;
  insightsThisMonth: number;
  favoriteCount: number;
  streakDays: number;
  typeBreakdown: { type: InsightType; label: string; count: number; pct: number }[];
  topTags: { tag: string; count: number }[];
  activityByDay: { date: string; count: number }[];
  recentInsights: Insight[];
  weeklyGrowth: number; // percentage change
}

const TYPE_LABELS: Record<InsightType, string> = {
  note: "Notes",
  quote: "Quotes",
  idea: "Ideas",
  observation: "Observations",
  book_highlight: "Highlights",
};

function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(now);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function getLastWeekStart(): Date {
  const weekStart = getWeekStart();
  const lastWeek = new Date(weekStart);
  lastWeek.setDate(lastWeek.getDate() - 7);
  return lastWeek;
}

function calculateStreak(insights: Insight[]): number {
  if (insights.length === 0) return 0;
  const days = new Set(
    insights.map((i) => new Date(i.createdAt).toISOString().slice(0, 10))
  );
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (days.has(key)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

export function useDashboard(): DashboardStats | null {
  const insights = useLiveQuery(() =>
    db.insights.orderBy("createdAt").reverse().toArray()
  );
  const conversations = useLiveQuery(() => db.conversations.count());

  return useMemo(() => {
    if (!insights || conversations === undefined) return null;

    const weekStart = getWeekStart();
    const monthStart = getMonthStart();
    const lastWeekStart = getLastWeekStart();

    const insightsThisWeek = insights.filter(
      (i) => new Date(i.createdAt) >= weekStart
    ).length;
    const insightsLastWeek = insights.filter(
      (i) => {
        const d = new Date(i.createdAt);
        return d >= lastWeekStart && d < weekStart;
      }
    ).length;

    // Tag frequency
    const tagCounts = new Map<string, number>();
    for (const ins of insights) {
      for (const t of ins.tags) {
        tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
      }
    }
    const topTags = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Type breakdown
    const typeCounts = new Map<InsightType, number>();
    for (const ins of insights) {
      typeCounts.set(ins.type, (typeCounts.get(ins.type) || 0) + 1);
    }
    const total = insights.length || 1;
    const typeBreakdown = (Object.keys(TYPE_LABELS) as InsightType[]).map((type) => ({
      type,
      label: TYPE_LABELS[type],
      count: typeCounts.get(type) || 0,
      pct: Math.round(((typeCounts.get(type) || 0) / total) * 100),
    }));

    // Activity last 30 days
    const activityByDay: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const count = insights.filter(
        (ins) => new Date(ins.createdAt).toISOString().slice(0, 10) === key
      ).length;
      activityByDay.push({ date: key, count });
    }

    // Thread count
    const totalThreads = insights.reduce(
      (sum, i) => sum + (i.threads?.length || 0),
      0
    );

    // Favorites
    const favoriteCount = insights.filter(
      (i) => (i as Insight & { favorite?: boolean }).favorite
    ).length;

    // Weekly growth
    const weeklyGrowth =
      insightsLastWeek > 0
        ? Math.round(((insightsThisWeek - insightsLastWeek) / insightsLastWeek) * 100)
        : insightsThisWeek > 0
        ? 100
        : 0;

    return {
      totalInsights: insights.length,
      totalConversations: conversations,
      totalTags: tagCounts.size,
      totalThreads,
      insightsThisWeek,
      insightsThisMonth: insights.filter(
        (i) => new Date(i.createdAt) >= monthStart
      ).length,
      favoriteCount,
      streakDays: calculateStreak(insights),
      typeBreakdown,
      topTags,
      activityByDay,
      recentInsights: insights.slice(0, 5),
      weeklyGrowth,
    };
  }, [insights, conversations]);
}
