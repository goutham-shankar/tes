"use client";
import { useState, useEffect } from "react";
import { Pencil, Loader2 } from "lucide-react";
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
import { type Insight, type InsightType } from "@/db/schema";
import { useToast } from "@/components/ui/toast";

const TYPES: { value: InsightType; label: string }[] = [
  { value: "note",           label: "Note" },
  { value: "quote",          label: "Quote" },
  { value: "idea",           label: "Idea" },
  { value: "observation",    label: "Observation" },
  { value: "book_highlight", label: "Book Highlight" },
];

interface EditInsightModalProps {
  insight: Insight;
  onSave: (id: string, updates: { content: string; type: InsightType; source?: string }) => Promise<void>;
}

export function EditInsightModal({ insight, onSave }: EditInsightModalProps) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState(insight.content);
  const [type, setType] = useState<InsightType>(insight.type);
  const [source, setSource] = useState(insight.source || "");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Reset form when insight changes
  useEffect(() => {
    setContent(insight.content);
    setType(insight.type);
    setSource(insight.source || "");
  }, [insight]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    try {
      await onSave(insight.id, {
        content: content.trim(),
        type,
        source: source.trim() || undefined,
      });
      toast("Insight updated.", "success");
      setOpen(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to update.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Edit insight"
          className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-primary" />
            Edit Insight
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Insight type">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={type === t.value}
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

          <div className="space-y-1.5">
            <Label htmlFor="edit-content">Content *</Label>
            <Textarea
              id="edit-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px]"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-source">Source (optional)</Label>
            <Input
              id="edit-source"
              placeholder="Book title, URL, person…"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !content.trim()}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
