import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function truncate(text: string, maxLen = 200): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + "…";
}

export const INSIGHT_TYPE_LABELS: Record<string, string> = {
  quote: "Quote",
  idea: "Idea",
  observation: "Observation",
  book_highlight: "Book Highlight",
  note: "Note",
};

export const INSIGHT_TYPE_COLORS: Record<string, string> = {
  quote:          "bg-violet-500/20 text-violet-300 border-violet-500/30",
  idea:           "bg-amber-500/20  text-amber-300  border-amber-500/30",
  observation:    "bg-sky-500/20    text-sky-300    border-sky-500/30",
  book_highlight: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  note:           "bg-slate-500/20  text-slate-300  border-slate-500/30",
};
