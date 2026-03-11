"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Keyboard,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  description: string;
  action: () => void;
}

export function KeyboardShortcuts() {
  const router = useRouter();
  const [showHelp, setShowHelp] = useState(false);

  const shortcuts: Shortcut[] = [
    { key: "k", ctrl: true, description: "Go to Insights", action: () => router.push("/") },
    { key: "d", ctrl: true, shift: true, description: "Go to Dashboard", action: () => router.push("/dashboard") },
    { key: "/", ctrl: true, description: "Go to Ask AI", action: () => router.push("/ask") },
    { key: "t", ctrl: true, shift: true, description: "Go to Tags", action: () => router.push("/tags") },
    { key: ",", ctrl: true, description: "Go to Settings", action: () => router.push("/settings") },
    { key: "?", ctrl: true, shift: true, description: "Show keyboard shortcuts", action: () => setShowHelp(true) },
  ];

  const handleKeyDown = useCallback(
    (e: globalThis.KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl
          ? e.metaKey || e.ctrlKey
          : !e.metaKey && !e.ctrlKey;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;

        if (e.key === shortcut.key && ctrlMatch && shiftMatch) {
          e.preventDefault();
          shortcut.action();
          return;
        }
      }

      // Escape closes help
      if (e.key === "Escape" && showHelp) {
        setShowHelp(false);
      }
    },
    [shortcuts, showHelp]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!showHelp) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={() => setShowHelp(false)}
    >
      <div
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={() => setShowHelp(false)}
            className="p-1 rounded-lg text-muted-foreground hover:bg-accent"
            aria-label="Close shortcuts help"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          {shortcuts.map((s) => (
            <div
              key={s.description}
              className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/50"
            >
              <span className="text-sm text-foreground">{s.description}</span>
              <kbd className="inline-flex items-center gap-0.5 text-xs font-mono bg-muted px-2 py-1 rounded-md border border-border text-muted-foreground">
                {s.ctrl && (
                  <>
                    <span className="text-[10px]">⌘</span>
                  </>
                )}
                {s.shift && (
                  <>
                    <span className="text-[10px]">⇧</span>
                  </>
                )}
                <span>{s.key.toUpperCase()}</span>
              </kbd>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-muted-foreground text-center mt-4">
          Press <kbd className="bg-muted px-1 py-0.5 rounded text-[10px] border border-border">Esc</kbd> to close
        </p>
      </div>
    </div>
  );
}
