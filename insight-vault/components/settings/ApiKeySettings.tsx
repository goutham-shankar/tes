"use client";
import { useState } from "react";
import { Eye, EyeOff, Key, CheckCircle, AlertCircle, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";

interface ApiKeySettingsProps {
  ready: boolean;
  preview: string;
  onSave: (key: string) => Promise<void>;
  onClear: () => Promise<void>;
}

export function ApiKeySettings({
  ready,
  preview,
  onSave,
  onClear,
}: ApiKeySettingsProps) {
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  async function handleSave() {
    if (!key.trim()) return;
    setSaving(true);
    try {
      await onSave(key.trim());
      setKey("");
      toast("API key saved and encrypted locally.", "success");
    } catch {
      toast("Failed to save API key. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    await onClear();
    toast("API key removed.", "info");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Key className="w-4 h-4 text-primary" />
          Gemini API Key
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {ready ? (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-emerald-300">API key configured</p>
              <p className="text-xs text-muted-foreground font-mono">{preview}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={handleClear}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <p className="text-sm text-amber-300">No API key set — AI features disabled.</p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="apiKey">{ready ? "Update Key" : "Enter Your Key"}</Label>
          <div className="relative">
            <Input
              id="apiKey"
              type={show ? "text" : "password"}
              placeholder="AIza…"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="pr-10 font-mono text-sm"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <Button onClick={handleSave} disabled={!key.trim() || saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save API Key"
          )}
        </Button>

        <div className="rounded-lg bg-muted/50 border border-border p-3 space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Security notes</p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Your key is encrypted with AES-GCM using the Web Crypto API.</li>
            <li>The key is stored only in your browser's IndexedDB — never sent to any server.</li>
            <li>AI requests go directly from your browser to Google's Gemini API.</li>
          </ul>
        </div>

        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-xs text-primary hover:underline text-center"
        >
          Get a free Gemini API key at ai.google.dev →
        </a>
      </CardContent>
    </Card>
  );
}
