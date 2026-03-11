"use client";
import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[InsightVault] Route error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground px-6">
      <div className="max-w-md text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-destructive/15 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7 text-destructive" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            An unexpected error occurred. Your data is safe in your browser&apos;s storage.
          </p>
          {error.message && (
            <pre className="text-xs text-destructive bg-muted/50 rounded-lg p-3 overflow-auto text-left mt-3">
              {error.message}
            </pre>
          )}
        </div>

        <div className="flex gap-3 justify-center">
          <Button onClick={reset} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Try Again
          </Button>
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <Home className="w-4 h-4" />
              Go Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
