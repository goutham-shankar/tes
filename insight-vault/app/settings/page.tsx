"use client";
import { useState } from "react";
import { Settings, Database, Trash2, Upload, Download } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ApiKeySettings } from "@/components/settings/ApiKeySettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useApiKey } from "@/hooks/useApiKey";
import { useInsights } from "@/hooks/useInsights";
import { useToast } from "@/components/ui/toast";
import { db } from "@/db/schema";
import { importInsights } from "@/db/operations";

function DataManagement({
  insightCount,
}: {
  insightCount: number;
}) {
  const { toast } = useToast();
  const [importing, setImporting] = useState(false);

  async function handleClearAll() {
    if (
      !confirm(
        `This will permanently delete all ${insightCount} insights and chat history. Continue?`
      )
    )
      return;
    await db.insights.clear();
    await db.chatMessages.clear();
    await db.conversations.clear();
    toast("All data cleared.", "info");
  }

  async function handleExport() {
    const insights = await db.insights.toArray();
    const blob = new Blob([JSON.stringify(insights, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `insightvault-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`Exported ${insights.length} insights.`, "success");
  }

  async function handleImport() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setImporting(true);
      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!Array.isArray(data)) {
          toast("Invalid file format. Expected a JSON array of insights.", "error");
          return;
        }

        const count = await importInsights(data);
        toast(`Imported ${count} insight${count !== 1 ? "s" : ""} successfully.`, "success");
      } catch (err) {
        console.error("[InsightVault] Import error:", err);
        toast("Failed to import. Please check the file format.", "error");
      } finally {
        setImporting(false);
      }
    };
    input.click();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="w-4 h-4 text-primary" />
          Data Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
          <div>
            <p className="text-sm font-medium">Total Insights</p>
            <p className="text-2xl font-bold text-primary">{insightCount}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
              <Download className="w-3.5 h-3.5" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleImport}
              disabled={importing}
              className="gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              {importing ? "Importing…" : "Import"}
            </Button>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
          onClick={handleClearAll}
        >
          <Trash2 className="w-4 h-4" />
          Clear All Data
        </Button>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { ready, preview, save, clear } = useApiKey();
  const { insights } = useInsights();

  return (
    <AppShell>
      <div className="h-full overflow-y-auto px-6 py-5 max-w-xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-muted-foreground" />
          <h1 className="font-semibold text-sm text-muted-foreground">Settings</h1>
        </div>

        <ApiKeySettings
          ready={ready}
          preview={preview}
          onSave={save}
          onClear={clear}
        />

        <DataManagement insightCount={insights.length} />

        {/* About */}
        <Card>
          <CardContent className="pt-5 space-y-2">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">InsightVault</span>{" "}
              v0.2.0 — AI-powered personal knowledge journal.
            </p>
            <p className="text-xs text-muted-foreground">
              Built with Next.js · Dexie.js · Google Gemini · Tailwind CSS.
              All data stored locally in IndexedDB.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
