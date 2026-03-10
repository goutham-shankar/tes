"use client";
import { useState } from "react";
import { Plus, Sparkles, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type InsightType } from "@/db/schema";
import { useToast } from "@/components/ui/toast";

const TYPES: { value: InsightType; label: string }[] = [
  { value: "note",           label: "Note" },
  { value: "quote",          label: "Quote" },
  { value: "idea",           label: "Idea" },
  { value: "observation",    label: "Observation" },
  { value: "book_highlight", label: "Book Highlight" },
];

interface AddInsightModalProps {
  onAdd: (
    content: string,
    type: InsightType,
    source?: string
  ) => Promise<unknown>;
  saving: boolean;
  aiReady: boolean;
}

export function AddInsightModal({ onAdd, saving, aiReady }: AddInsightModalProps) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [type, setType] = useState<InsightType>("note");
  const [source, setSource] = useState("");
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      const result = await onAdd(content.trim(), type, source.trim() || undefined) as
        | { insight: unknown; wasThreaded: boolean }
        | undefined;
      const threaded = result?.wasThreaded ?? false;
      toast(
        threaded
          ? "Added as a follow-up to a related insight!"
          : aiReady
          ? "Insight saved! AI has classified and stored it."
          : "Insight saved locally (add API key to enable AI features).",
        "success"
      );
      // Reset
      setContent("");
      setSource("");
      setType("note");
      setOpen(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save insight.", "error");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Insight
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Capture New Insight
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Type selector */}
          <div className="space-y-1.5">
            <Label>Type</Label>
            <div className="flex flex-wrap gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    type === t.value
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              placeholder="Enter your insight, quote, or idea…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px]"
              required
            />
          </div>

          {/* Source */}
          <div className="space-y-1.5">
            <Label htmlFor="source">Source (optional)</Label>
            <Input
              id="source"
              placeholder="Book title, URL, person…"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
          </div>

          {aiReady && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-primary" />
              AI will automatically classify and tag this insight.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !content.trim()}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save Insight"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
